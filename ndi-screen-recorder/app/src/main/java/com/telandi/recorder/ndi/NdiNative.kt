package com.telandi.recorder.ndi

import android.util.Log
import java.nio.ByteBuffer

/** Funções nativas da ponte NDI (ver src/main/cpp/ndi_bridge.cpp). */
object NdiNative {
    private val bridgeLoaded: Boolean = try {
        System.loadLibrary("ndibridge")
        true
    } catch (t: Throwable) {
        Log.e("TelaNDI", "Ponte NDI indisponível", t)
        false
    }

    /** true se a biblioteca oficial libndi.so está no APK e inicializou. */
    fun isAvailable(): Boolean = bridgeLoaded && nativeLoad()

    fun version(): String? = if (isAvailable()) nativeVersion() else null

    external fun nativeLoad(): Boolean
    external fun nativeVersion(): String?
    external fun nativeCreateSender(name: String): Long
    external fun nativeDestroySender(handle: Long)
    external fun nativeSendVideo(
        handle: Long, buffer: ByteBuffer, width: Int, height: Int, stride: Int, fpsN: Int, fpsD: Int,
    )
    external fun nativeSendAudio(handle: Long, pcm: ShortArray, frames: Int, channels: Int, sampleRate: Int)
    external fun nativeConnections(handle: Long): Int
}
