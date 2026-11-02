package com.telandi.recorder.media

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.util.Log
import android.view.Surface
import com.telandi.recorder.VideoCodec

/** Codificador de vídeo H.264/H.265 por hardware, alimentado por uma Surface. */
class VideoEncoder(
    codecType: VideoCodec,
    width: Int,
    height: Int,
    fps: Int,
    bitrate: Int,
    private val muxer: Mp4Muxer,
) {
    private val codec: MediaCodec
    val inputSurface: Surface
    private var track = -1
    private val thread = Thread(::drainLoop, "TelaNDI-VideoEnc")

    init {
        val info = CodecSupport.findEncoder(codecType.mime)
            ?: throw IllegalStateException("Este celular não tem codificador ${codecType.label}.")
        codec = MediaCodec.createByCodecName(info.name)
        val format = MediaFormat.createVideoFormat(codecType.mime, width, height).apply {
            setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface)
            setInteger(MediaFormat.KEY_BIT_RATE, CodecSupport.clampBitrate(codecType, bitrate))
            setInteger(MediaFormat.KEY_FRAME_RATE, fps)
            setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1)
        }
        try {
            codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
        } catch (e: Exception) {
            codec.release()
            throw IllegalStateException("O codificador ${codecType.label} recusou ${width}x$height. Tente outra resolução.", e)
        }
        inputSurface = codec.createInputSurface()
    }

    fun start() {
        codec.start()
        thread.start()
    }

    private fun drainLoop() {
        val info = MediaCodec.BufferInfo()
        try {
            while (true) {
                val index = codec.dequeueOutputBuffer(info, 10_000)
                when {
                    index == MediaCodec.INFO_TRY_AGAIN_LATER -> Unit
                    index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> track = muxer.addTrack(codec.outputFormat)
                    index >= 0 -> {
                        val buffer = codec.getOutputBuffer(index)
                        val isConfig = info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0
                        if (buffer != null && !isConfig && info.size > 0 && track >= 0) {
                            muxer.writeSample(track, buffer, info)
                        }
                        codec.releaseOutputBuffer(index, false)
                        if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) break
                    }
                }
            }
        } catch (e: Exception) {
            Log.w("TelaNDI", "Codificador de vídeo encerrado", e)
        }
    }

    fun stop() {
        try { codec.signalEndOfInputStream() } catch (_: Exception) {}
        thread.join(3000)
        try { codec.stop() } catch (_: Exception) {}
        codec.release()
        inputSurface.release()
    }
}
