package com.telandi.recorder

import android.content.Context
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.DisplayMetrics
import android.util.Log
import android.view.Display
import com.telandi.recorder.gl.GlFanoutRenderer
import com.telandi.recorder.media.AudioCapture
import com.telandi.recorder.media.AudioEncoder
import com.telandi.recorder.media.CodecSupport
import com.telandi.recorder.media.Mp4Muxer
import com.telandi.recorder.media.RecordingFile
import com.telandi.recorder.media.VideoEncoder
import com.telandi.recorder.ndi.NdiSender

/**
 * Liga tudo: tela → OpenGL → (NDI + gravação H.264/H.265) e áudio → (NDI + AAC).
 */
class CaptureSession(
    private val context: Context,
    private val projection: MediaProjection,
    private val config: RecorderConfig,
    private val onStopRequested: (String?) -> Unit,
) {
    private val mainHandler = Handler(Looper.getMainLooper())

    private var ndi: NdiSender? = null
    private var ndiThread: HandlerThread? = null
    private var ndiReader: ImageReader? = null
    private var recordingFile: RecordingFile? = null
    private var muxer: Mp4Muxer? = null
    private var videoEncoder: VideoEncoder? = null
    private var audioEncoder: AudioEncoder? = null
    private var audioCapture: AudioCapture? = null
    private var renderer: GlFanoutRenderer? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var stopped = false

    var width = 0
        private set
    var height = 0
        private set
    val recordingName: String? get() = recordingFile?.displayName

    private val projectionCallback = object : MediaProjection.Callback() {
        override fun onStop() {
            onStopRequested("A captura de tela foi encerrada pelo sistema.")
        }
    }

    private val statsRunnable = object : Runnable {
        override fun run() {
            val connections = try { ndi?.connections() ?: 0 } catch (_: Throwable) { 0 }
            RecorderState.update { it.copy(ndiConnections = connections) }
            mainHandler.postDelayed(this, 1000)
        }
    }

    fun start() {
        val (displayW, displayH, dpi) = displayInfo()
        val size = if (config.recordEnabled) {
            CodecSupport.chooseSize(config.codec, displayW, displayH, config.shortSide)
        } else {
            VideoSize.fit(displayW, displayH, config.shortSide)
        }
        width = size.first
        height = size.second
        Log.i(TAG, "Tela ${displayW}x$displayH → vídeo ${width}x$height @ ${config.fps} fps")

        // Áudio primeiro: se falhar, nada mais é criado.
        val capture = if (config.anyAudio) {
            AudioCapture(projection, config.internalAudio, config.micAudio, ::onAudio).also { audioCapture = it }
        } else {
            null
        }

        val outputs = mutableListOf<GlFanoutRenderer.Output>()

        if (config.ndiEnabled) {
            val sender = NdiSender(context, config.resolvedNdiName())
            ndi = sender
            val thread = HandlerThread("TelaNDI-NDIVideo").apply { start() }
            ndiThread = thread
            val reader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 5)
            reader.setOnImageAvailableListener({ sendNdiFrame(it) }, Handler(thread.looper))
            ndiReader = reader
            outputs += GlFanoutRenderer.Output(reader.surface, width, height)
        }

        if (config.recordEnabled) {
            val file = RecordingFile.create(context)
            recordingFile = file
            val mux = Mp4Muxer(file.fileDescriptor, if (config.anyAudio) 2 else 1, System.nanoTime() / 1000)
            muxer = mux
            val encoder = VideoEncoder(config.codec, width, height, config.fps, config.bitrateMbps * 1_000_000, mux)
            videoEncoder = encoder
            if (config.anyAudio) {
                audioEncoder = AudioEncoder(AudioCapture.SAMPLE_RATE, AudioCapture.CHANNELS, 192_000, mux)
            }
            encoder.start()
            outputs += GlFanoutRenderer.Output(encoder.inputSurface, width, height)
        }

        val gl = GlFanoutRenderer(width, height, config.fps)
        renderer = gl
        val inputSurface = gl.start(outputs)

        projection.registerCallback(projectionCallback, mainHandler)
        virtualDisplay = projection.createVirtualDisplay(
            "TelaNDI", width, height, dpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            inputSurface, null, null,
        )
        capture?.start()
        mainHandler.post(statsRunnable)
    }

    private fun onAudio(pcm: ShortArray, frames: Int, ptsUs: Long) {
        try {
            audioEncoder?.encode(pcm, frames * AudioCapture.CHANNELS, ptsUs)
        } catch (t: Throwable) {
            Log.w(TAG, "Falha no codificador de áudio", t)
        }
        try {
            ndi?.sendAudio(pcm, frames, AudioCapture.CHANNELS, AudioCapture.SAMPLE_RATE)
        } catch (t: Throwable) {
            Log.w(TAG, "Falha ao enviar áudio NDI", t)
        }
    }

    private fun sendNdiFrame(reader: ImageReader) {
        val image = try { reader.acquireLatestImage() } catch (_: Exception) { null } ?: return
        try {
            val plane = image.planes[0]
            ndi?.sendVideo(plane.buffer, image.width, image.height, plane.rowStride, config.fps)
        } catch (t: Throwable) {
            Log.w(TAG, "Falha ao enviar vídeo NDI", t)
        } finally {
            image.close()
        }
    }

    @Suppress("DEPRECATION")
    private fun displayInfo(): Triple<Int, Int, Int> {
        val display = context.getSystemService(DisplayManager::class.java).getDisplay(Display.DEFAULT_DISPLAY)
        val metrics = DisplayMetrics()
        display.getRealMetrics(metrics)
        return Triple(metrics.widthPixels, metrics.heightPixels, metrics.densityDpi)
    }

    /** Para tudo. Retorna o nome do vídeo salvo (ou null se não gravou). */
    fun stop(): String? {
        if (stopped) return null
        stopped = true
        mainHandler.removeCallbacks(statsRunnable)
        safely { audioCapture?.stop() }
        safely { virtualDisplay?.release() }
        safely { renderer?.stop() }
        safely { videoEncoder?.stop() }
        safely { audioEncoder?.finish() }
        val saved = muxer?.let { m -> try { m.stop() } catch (_: Throwable) { false } } ?: false
        val savedName = recordingFile?.let { file ->
            safely { file.finish(saved) }
            if (saved) file.displayName else null
        }
        safely { ndiReader?.setOnImageAvailableListener(null, null) }
        ndiThread?.let { t ->
            t.quitSafely()
            safely { t.join(1000) }
        }
        safely { ndiReader?.close() }
        safely { ndi?.close() }
        safely { projection.unregisterCallback(projectionCallback) }
        safely { projection.stop() }
        return savedName
    }

    private inline fun safely(block: () -> Unit) {
        try {
            block()
        } catch (t: Throwable) {
            Log.w(TAG, "Falha ao encerrar", t)
        }
    }

    private companion object {
        const val TAG = "TelaNDI"
    }
}
