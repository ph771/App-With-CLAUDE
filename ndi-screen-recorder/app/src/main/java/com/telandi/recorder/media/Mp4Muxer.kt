package com.telandi.recorder.media

import android.media.MediaCodec
import android.media.MediaFormat
import android.media.MediaMuxer
import android.util.Log
import java.io.FileDescriptor
import java.nio.ByteBuffer

/**
 * Junta vídeo e áudio em um arquivo MP4. Guarda as amostras que chegam antes de
 * todas as faixas estarem prontas e ajusta os tempos para começarem do zero.
 */
class Mp4Muxer(fd: FileDescriptor, private val expectedTracks: Int, private val baseUs: Long) {

    private class Pending(val track: Int, val data: ByteBuffer, val info: MediaCodec.BufferInfo)

    private val muxer = MediaMuxer(fd, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
    private var addedTracks = 0
    private var started = false
    private val pending = ArrayList<Pending>()
    private val lastPts = HashMap<Int, Long>()
    private val videoTracks = HashSet<Int>()

    @Synchronized
    fun addTrack(format: MediaFormat): Int {
        val track = muxer.addTrack(format)
        if (format.getString(MediaFormat.KEY_MIME)?.startsWith("video/") == true) videoTracks += track
        addedTracks++
        if (addedTracks == expectedTracks) {
            muxer.start()
            started = true
            pending.forEach { write(it.track, it.data, it.info) }
            pending.clear()
        }
        return track
    }

    @Synchronized
    fun writeSample(track: Int, buffer: ByteBuffer, info: MediaCodec.BufferInfo) {
        if (info.size <= 0) return
        if (started) {
            write(track, buffer, info)
            return
        }
        if (pending.size >= MAX_PENDING) return
        val copy = ByteBuffer.allocate(info.size)
        buffer.position(info.offset)
        buffer.limit(info.offset + info.size)
        copy.put(buffer)
        copy.flip()
        val copyInfo = MediaCodec.BufferInfo().apply { set(0, info.size, info.presentationTimeUs, info.flags) }
        pending += Pending(track, copy, copyInfo)
    }

    private fun write(track: Int, data: ByteBuffer, info: MediaCodec.BufferInfo) {
        var pts = (info.presentationTimeUs - baseUs).coerceAtLeast(0)
        if (track !in videoTracks) {
            val last = lastPts[track]
            if (last != null && pts <= last) pts = last + 1
        }
        lastPts[track] = pts
        data.position(info.offset)
        data.limit(info.offset + info.size)
        val out = MediaCodec.BufferInfo().apply { set(info.offset, info.size, pts, info.flags) }
        try {
            muxer.writeSampleData(track, data, out)
        } catch (e: Exception) {
            Log.w("TelaNDI", "Falha ao gravar amostra", e)
        }
    }

    /** Fecha o arquivo. Retorna true se o vídeo foi gravado corretamente. */
    @Synchronized
    fun stop(): Boolean {
        return try {
            if (started) {
                muxer.stop()
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.w("TelaNDI", "Falha ao finalizar MP4", e)
            false
        } finally {
            try { muxer.release() } catch (_: Exception) {}
        }
    }

    private companion object {
        const val MAX_PENDING = 500
    }
}
