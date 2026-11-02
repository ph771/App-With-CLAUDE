package com.telandi.recorder.media

import android.media.MediaCodecInfo
import android.media.MediaCodecList
import com.telandi.recorder.VideoCodec
import com.telandi.recorder.VideoSize

/** Descobre quais codificadores de vídeo o aparelho possui. */
object CodecSupport {

    /** Codificador para o formato, dando preferência ao de hardware. */
    fun findEncoder(mime: String): MediaCodecInfo? =
        MediaCodecList(MediaCodecList.REGULAR_CODECS).codecInfos
            .filter { info -> info.isEncoder && info.supportedTypes.any { it.equals(mime, ignoreCase = true) } }
            .sortedByDescending { it.isHardwareAccelerated }
            .firstOrNull()

    fun isSupported(codec: VideoCodec): Boolean = findEncoder(codec.mime) != null

    fun chooseSize(codec: VideoCodec, displayW: Int, displayH: Int, shortSide: Int): Pair<Int, Int> {
        val caps = findEncoder(codec.mime)?.getCapabilitiesForType(codec.mime)?.videoCapabilities
        return VideoSize.choose(displayW, displayH, shortSide) { w, h -> caps?.isSizeSupported(w, h) ?: true }
    }

    fun clampBitrate(codec: VideoCodec, bitrate: Int): Int {
        val range = findEncoder(codec.mime)?.getCapabilitiesForType(codec.mime)?.videoCapabilities?.bitrateRange
        return range?.clamp(bitrate) ?: bitrate
    }
}
