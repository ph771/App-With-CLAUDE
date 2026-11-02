package com.telandi.recorder.gl

import android.graphics.SurfaceTexture
import android.opengl.EGLSurface
import android.opengl.GLES20
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import android.view.Surface
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Recebe os quadros da tela (uma única VirtualDisplay) e redesenha cada quadro em
 * várias saídas ao mesmo tempo: o codificador de vídeo da gravação e o leitor do NDI.
 */
class GlFanoutRenderer(
    private val width: Int,
    private val height: Int,
    fps: Int,
) {
    class Output(val surface: Surface, val width: Int, val height: Int) {
        internal var eglSurface: EGLSurface? = null
    }

    private val thread = HandlerThread("TelaNDI-GL").apply { start() }
    private val handler = Handler(thread.looper)

    private val minFrameIntervalNs = (1_000_000_000L / fps) * 8 / 10
    private val repeatAfterNs = 100_000_000L // repete o último quadro se a tela ficar parada

    private var egl: EglCore? = null
    private var pbuffer: EGLSurface? = null
    private var program: ExternalTextureProgram? = null
    private var textureId = 0
    private var surfaceTexture: SurfaceTexture? = null
    private var inputSurface: Surface? = null
    private var outputs: List<Output> = emptyList()
    private val texMatrix = FloatArray(16)
    private var hasFrame = false
    private var lastDrawNs = 0L
    @Volatile private var released = false

    private val repeatRunnable = object : Runnable {
        override fun run() {
            if (released) return
            if (hasFrame && System.nanoTime() - lastDrawNs >= repeatAfterNs) drawAll()
            handler.postDelayed(this, 50)
        }
    }

    /** Prepara o OpenGL e devolve a Surface onde a tela deve ser desenhada. */
    fun start(outputs: List<Output>): Surface {
        val latch = CountDownLatch(1)
        var error: Throwable? = null
        handler.post {
            try {
                setup(outputs)
            } catch (t: Throwable) {
                error = t
            } finally {
                latch.countDown()
            }
        }
        check(latch.await(5, TimeUnit.SECONDS)) { "OpenGL não respondeu" }
        error?.let { throw it }
        return inputSurface!!
    }

    private fun setup(outs: List<Output>) {
        val core = EglCore().also { egl = it }
        val pb = core.createPbufferSurface(1, 1).also { pbuffer = it }
        core.makeCurrent(pb)
        val prog = ExternalTextureProgram().also { program = it }
        textureId = prog.createTexture()
        val st = SurfaceTexture(textureId).apply {
            setDefaultBufferSize(width, height)
            setOnFrameAvailableListener({ onFrameAvailable() }, handler)
        }
        surfaceTexture = st
        inputSurface = Surface(st)
        outs.forEach { it.eglSurface = core.createWindowSurface(it.surface) }
        outputs = outs
        handler.postDelayed(repeatRunnable, 50)
    }

    private fun onFrameAvailable() {
        if (released) return
        val core = egl ?: return
        try {
            core.makeCurrent(pbuffer!!)
            surfaceTexture!!.updateTexImage()
            surfaceTexture!!.getTransformMatrix(texMatrix)
            hasFrame = true
            if (System.nanoTime() - lastDrawNs >= minFrameIntervalNs) drawAll()
        } catch (t: Throwable) {
            Log.w(TAG, "Falha ao processar quadro", t)
        }
    }

    private fun drawAll() {
        val core = egl ?: return
        val prog = program ?: return
        val now = System.nanoTime()
        for (out in outputs) {
            val s = out.eglSurface ?: continue
            try {
                core.makeCurrent(s)
                GLES20.glViewport(0, 0, out.width, out.height)
                prog.draw(textureId, texMatrix)
                core.setPresentationTime(s, now)
                core.swapBuffers(s)
            } catch (t: Throwable) {
                Log.w(TAG, "Falha ao desenhar saída", t)
            }
        }
        lastDrawNs = now
    }

    fun stop() {
        val latch = CountDownLatch(1)
        handler.post {
            released = true
            handler.removeCallbacks(repeatRunnable)
            try {
                val core = egl
                if (core != null) {
                    outputs.forEach { o -> o.eglSurface?.let { core.releaseSurface(it) } }
                    pbuffer?.let { core.makeCurrent(it) }
                    program?.release()
                    pbuffer?.let { core.releaseSurface(it) }
                    surfaceTexture?.release()
                    inputSurface?.release()
                    core.release()
                }
            } catch (t: Throwable) {
                Log.w(TAG, "Falha ao liberar OpenGL", t)
            } finally {
                egl = null
                latch.countDown()
            }
        }
        latch.await(2, TimeUnit.SECONDS)
        thread.quitSafely()
    }

    private companion object {
        const val TAG = "TelaNDI-GL"
    }
}
