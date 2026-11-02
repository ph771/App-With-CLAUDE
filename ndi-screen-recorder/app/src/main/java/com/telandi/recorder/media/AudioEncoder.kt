package com.telandi.recorder.media

import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import java.nio.ByteOrder

/** Codificador AAC. Usado sempre a partir de uma única thread (a de áudio). */
class AudioEncoder(
    private val sampleRate: Int,
    private val channels: Int,
    bitrate: Int,
    private val muxer: Mp4Muxer,
) {
    private val codec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC)
    private val info = MediaCodec.BufferInfo()
    private var track = -1

    init {
        val format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, channels).apply {
            setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC)
            setInteger(MediaFormat.KEY_BIT_RATE, bitrate)
            setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 16 * 1024)
        }
        codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
        codec.start()
    }

    /** [samples] = quantidade de valores (quadros × canais) em [pcm]. */
    fun encode(pcm: ShortArray, samples: Int, ptsUs: Long) {
        var offset = 0
        var attempts = 0
        while (offset < samples && attempts < 50) {
            val index = codec.dequeueInputBuffer(10_000)
            if (index < 0) {
                attempts++
                drain(false)
                continue
            }
            val buffer = codec.getInputBuffer(index) ?: continue
            buffer.clear()
            val count = minOf(samples - offset, buffer.capacity() / 2)
            buffer.order(ByteOrder.nativeOrder()).asShortBuffer().put(pcm, offset, count)
            val chunkPts = ptsUs + (offset / channels).toLong() * 1_000_000L / sampleRate
            codec.queueInputBuffer(index, 0, count * 2, chunkPts, 0)
            offset += count
        }
        drain(false)
    }

    fun finish() {
        try {
            val index = codec.dequeueInputBuffer(50_000)
            if (index >= 0) codec.queueInputBuffer(index, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
            drain(true)
        } catch (_: Exception) {
        } finally {
            try { codec.stop() } catch (_: Exception) {}
            codec.release()
        }
    }

    private fun drain(untilEos: Boolean) {
        val deadline = System.nanoTime() + 2_000_000_000L
        while (true) {
            val index = codec.dequeueOutputBuffer(info, if (untilEos) 10_000 else 0)
            when {
                index == MediaCodec.INFO_TRY_AGAIN_LATER -> {
                    if (!untilEos || System.nanoTime() > deadline) return
                }
                index == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> track = muxer.addTrack(codec.outputFormat)
                index >= 0 -> {
                    val buffer = codec.getOutputBuffer(index)
                    val isConfig = info.flags and MediaCodec.BUFFER_FLAG_CODEC_CONFIG != 0
                    if (buffer != null && !isConfig && info.size > 0 && track >= 0) {
                        muxer.writeSample(track, buffer, info)
                    }
                    codec.releaseOutputBuffer(index, false)
                    if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) return
                }
            }
        }
    }
}
