package com.telandi.recorder

import android.content.Intent
import android.content.SharedPreferences
import android.media.MediaFormat
import android.os.Build

enum class VideoCodec(val mime: String, val label: String) {
    H264(MediaFormat.MIMETYPE_VIDEO_AVC, "H.264"),
    H265(MediaFormat.MIMETYPE_VIDEO_HEVC, "H.265"),
}

/** Todas as escolhas feitas pelo usuário na tela principal. */
data class RecorderConfig(
    val ndiEnabled: Boolean = true,
    val ndiName: String = "",
    val recordEnabled: Boolean = true,
    val codec: VideoCodec = VideoCodec.H264,
    /** Lado menor do vídeo em pixels (1080, 720…). 0 = resolução nativa da tela. */
    val shortSide: Int = 1080,
    val fps: Int = 30,
    val bitrateMbps: Int = 8,
    val internalAudio: Boolean = true,
    val micAudio: Boolean = false,
) {
    val anyAudio: Boolean get() = internalAudio || micAudio

    fun resolvedNdiName(): String = ndiName.trim().ifEmpty { "Android ${Build.MODEL}" }

    fun writeTo(intent: Intent) {
        intent.putExtra(K_NDI, ndiEnabled)
        intent.putExtra(K_NDI_NAME, ndiName)
        intent.putExtra(K_RECORD, recordEnabled)
        intent.putExtra(K_CODEC, codec.name)
        intent.putExtra(K_SHORT_SIDE, shortSide)
        intent.putExtra(K_FPS, fps)
        intent.putExtra(K_BITRATE, bitrateMbps)
        intent.putExtra(K_INTERNAL, internalAudio)
        intent.putExtra(K_MIC, micAudio)
    }

    fun save(prefs: SharedPreferences) {
        prefs.edit()
            .putBoolean(K_NDI, ndiEnabled)
            .putString(K_NDI_NAME, ndiName)
            .putBoolean(K_RECORD, recordEnabled)
            .putString(K_CODEC, codec.name)
            .putInt(K_SHORT_SIDE, shortSide)
            .putInt(K_FPS, fps)
            .putInt(K_BITRATE, bitrateMbps)
            .putBoolean(K_INTERNAL, internalAudio)
            .putBoolean(K_MIC, micAudio)
            .apply()
    }

    companion object {
        private const val K_NDI = "ndi"
        private const val K_NDI_NAME = "ndi_name"
        private const val K_RECORD = "record"
        private const val K_CODEC = "codec"
        private const val K_SHORT_SIDE = "short_side"
        private const val K_FPS = "fps"
        private const val K_BITRATE = "bitrate"
        private const val K_INTERNAL = "internal_audio"
        private const val K_MIC = "mic"

        private fun codecOf(name: String?) =
            VideoCodec.entries.firstOrNull { it.name == name } ?: VideoCodec.H264

        fun fromIntent(intent: Intent): RecorderConfig {
            val d = RecorderConfig()
            return RecorderConfig(
                ndiEnabled = intent.getBooleanExtra(K_NDI, d.ndiEnabled),
                ndiName = intent.getStringExtra(K_NDI_NAME) ?: d.ndiName,
                recordEnabled = intent.getBooleanExtra(K_RECORD, d.recordEnabled),
                codec = codecOf(intent.getStringExtra(K_CODEC)),
                shortSide = intent.getIntExtra(K_SHORT_SIDE, d.shortSide),
                fps = intent.getIntExtra(K_FPS, d.fps),
                bitrateMbps = intent.getIntExtra(K_BITRATE, d.bitrateMbps),
                internalAudio = intent.getBooleanExtra(K_INTERNAL, d.internalAudio),
                micAudio = intent.getBooleanExtra(K_MIC, d.micAudio),
            )
        }

        fun load(prefs: SharedPreferences): RecorderConfig {
            val d = RecorderConfig()
            return RecorderConfig(
                ndiEnabled = prefs.getBoolean(K_NDI, d.ndiEnabled),
                ndiName = prefs.getString(K_NDI_NAME, d.ndiName) ?: d.ndiName,
                recordEnabled = prefs.getBoolean(K_RECORD, d.recordEnabled),
                codec = codecOf(prefs.getString(K_CODEC, d.codec.name)),
                shortSide = prefs.getInt(K_SHORT_SIDE, d.shortSide),
                fps = prefs.getInt(K_FPS, d.fps),
                bitrateMbps = prefs.getInt(K_BITRATE, d.bitrateMbps),
                internalAudio = prefs.getBoolean(K_INTERNAL, d.internalAudio),
                micAudio = prefs.getBoolean(K_MIC, d.micAudio),
            )
        }
    }
}
