package com.telandi.recorder.ndi

import android.content.Context
import android.net.nsd.NsdManager
import android.net.wifi.WifiManager
import java.io.Closeable
import java.nio.ByteBuffer
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write

/** Uma fonte NDI na rede local. Vídeo e áudio podem ser enviados de threads diferentes. */
class NdiSender(context: Context, name: String) : Closeable {

    // O NDI no Android exige que o serviço de descoberta (NsdManager) esteja ativo.
    @Suppress("unused")
    private val nsdManager: NsdManager? = context.getSystemService(NsdManager::class.java)

    private val multicastLock: WifiManager.MulticastLock? =
        context.applicationContext.getSystemService(WifiManager::class.java)
            ?.createMulticastLock("TelaNDI")
            ?.apply {
                setReferenceCounted(false)
                acquire()
            }

    private val lock = ReentrantReadWriteLock()
    private var handle: Long = 0

    init {
        if (!NdiNative.isAvailable()) {
            multicastLock?.release()
            throw IllegalStateException("A biblioteca NDI não está incluída neste aplicativo.")
        }
        handle = NdiNative.nativeCreateSender(name)
        if (handle == 0L) {
            multicastLock?.release()
            throw IllegalStateException("Não foi possível criar a fonte NDI.")
        }
    }

    fun sendVideo(buffer: ByteBuffer, width: Int, height: Int, stride: Int, fps: Int) {
        lock.read {
            if (handle == 0L) return
            NdiNative.nativeSendVideo(handle, buffer, width, height, stride, fps, 1)
        }
    }

    fun sendAudio(pcm: ShortArray, frames: Int, channels: Int, sampleRate: Int) {
        lock.read {
            if (handle == 0L) return
            NdiNative.nativeSendAudio(handle, pcm, frames, channels, sampleRate)
        }
    }

    fun connections(): Int {
        lock.read {
            return if (handle != 0L) NdiNative.nativeConnections(handle) else 0
        }
    }

    override fun close() {
        lock.write {
            if (handle != 0L) {
                NdiNative.nativeDestroySender(handle)
                handle = 0
            }
        }
        multicastLock?.release()
    }
}
