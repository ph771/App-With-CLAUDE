package com.telandi.recorder.media

import android.annotation.SuppressLint
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioPlaybackCaptureConfiguration
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.projection.MediaProjection
import android.util.Log
import com.telandi.recorder.AudioMath

/**
 * Captura o áudio interno (som dos apps) e/ou o microfone e entrega blocos já
 * mixados em PCM 16 bits estéreo 48 kHz.
 */
@SuppressLint("MissingPermission") // a permissão é pedida pela MainActivity antes de iniciar
class AudioCapture(
    projection: MediaProjection,
    captureInternal: Boolean,
    captureMic: Boolean,
    private val listener: (pcm: ShortArray, frames: Int, ptsUs: Long) -> Unit,
) {
    private val internalRecord: AudioRecord? = if (captureInternal) buildInternal(projection) else null
    private val micRecord: AudioRecord? = if (captureMic) buildMic() else null
    @Volatile private var running = false
    private var thread: Thread? = null

    private fun buildInternal(projection: MediaProjection): AudioRecord {
        val config = AudioPlaybackCaptureConfiguration.Builder(projection)
            .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
            .addMatchingUsage(AudioAttributes.USAGE_GAME)
            .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
            .build()
        val record = AudioRecord.Builder()
            .setAudioFormat(format(AudioFormat.CHANNEL_IN_STEREO))
            .setBufferSizeInBytes(bufferSize(AudioFormat.CHANNEL_IN_STEREO))
            .setAudioPlaybackCaptureConfig(config)
            .build()
        if (record.state != AudioRecord.STATE_INITIALIZED) {
            record.release()
            throw IllegalStateException("Não foi possível capturar o áudio interno neste celular.")
        }
        return record
    }

    private fun buildMic(): AudioRecord {
        val record = AudioRecord.Builder()
            .setAudioSource(MediaRecorder.AudioSource.MIC)
            .setAudioFormat(format(AudioFormat.CHANNEL_IN_MONO))
            .setBufferSizeInBytes(bufferSize(AudioFormat.CHANNEL_IN_MONO))
            .build()
        if (record.state != AudioRecord.STATE_INITIALIZED) {
            record.release()
            internalRecord?.release()
            throw IllegalStateException("Não foi possível abrir o microfone.")
        }
        return record
    }

    fun start() {
        internalRecord?.startRecording()
        micRecord?.startRecording()
        running = true
        thread = Thread(::loop, "TelaNDI-Audio").apply {
            priority = Thread.MAX_PRIORITY
            start()
        }
    }

    private fun loop() {
        val mix = ShortArray(FRAMES_PER_CHUNK * CHANNELS)
        val micStereo = ShortArray(FRAMES_PER_CHUNK * CHANNELS)
        val micMono = ShortArray(FRAMES_PER_CHUNK)
        var startUs = -1L
        var framesTotal = 0L
        while (running) {
            var frames: Int
            val internal = internalRecord
            if (internal != null) {
                val read = internal.read(mix, 0, mix.size, AudioRecord.READ_BLOCKING)
                if (read < 0) {
                    Log.w(TAG, "Erro lendo áudio interno: $read")
                    break
                }
                frames = read / CHANNELS
            } else {
                mix.fill(0)
                frames = FRAMES_PER_CHUNK
            }
            val mic = micRecord
            if (mic != null) {
                val wanted = if (internal != null) frames else FRAMES_PER_CHUNK
                val mode = if (internal != null) AudioRecord.READ_NON_BLOCKING else AudioRecord.READ_BLOCKING
                val got = mic.read(micMono, 0, wanted, mode)
                if (got > 0) {
                    AudioMath.monoToStereo(micMono, got, micStereo)
                    AudioMath.mixInto(mix, micStereo, got * CHANNELS)
                }
                if (internal == null) {
                    if (got < 0) {
                        Log.w(TAG, "Erro lendo microfone: $got")
                        break
                    }
                    frames = got
                }
            }
            if (frames <= 0) continue
            if (startUs < 0) startUs = System.nanoTime() / 1000 - frames * 1_000_000L / SAMPLE_RATE
            try {
                listener(mix, frames, AudioMath.ptsUs(startUs, framesTotal, SAMPLE_RATE))
            } catch (t: Throwable) {
                Log.w(TAG, "Falha ao entregar áudio", t)
            }
            framesTotal += frames
        }
    }

    fun stop() {
        running = false
        thread?.join(1000)
        listOfNotNull(internalRecord, micRecord).forEach {
            try { it.stop() } catch (_: Exception) {}
            it.release()
        }
    }

    companion object {
        const val SAMPLE_RATE = 48_000
        const val CHANNELS = 2
        const val FRAMES_PER_CHUNK = 960 // 20 ms
        private const val TAG = "TelaNDI-Audio"

        private fun format(channelMask: Int) = AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(SAMPLE_RATE)
            .setChannelMask(channelMask)
            .build()

        private fun bufferSize(channelMask: Int): Int {
            val min = AudioRecord.getMinBufferSize(SAMPLE_RATE, channelMask, AudioFormat.ENCODING_PCM_16BIT)
            return maxOf(min * 4, SAMPLE_RATE * 2 * CHANNELS / 5) // pelo menos ~200 ms
        }
    }
}
