package com.telandi.recorder.media

import android.content.ContentResolver
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.provider.MediaStore
import java.io.FileDescriptor
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Arquivo MP4 na galeria (Filmes/TelaNDI), visível só quando a gravação termina. */
class RecordingFile private constructor(
    private val resolver: ContentResolver,
    private val uri: Uri,
    private val pfd: ParcelFileDescriptor,
    val displayName: String,
) {
    val fileDescriptor: FileDescriptor get() = pfd.fileDescriptor

    fun finish(success: Boolean) {
        try { pfd.close() } catch (_: Exception) {}
        if (success) {
            resolver.update(uri, ContentValues().apply { put(MediaStore.Video.Media.IS_PENDING, 0) }, null, null)
        } else {
            resolver.delete(uri, null, null)
        }
    }

    companion object {
        const val FOLDER = "TelaNDI"

        fun create(context: Context): RecordingFile {
            val name = "TelaNDI_" + SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date()) + ".mp4"
            val values = ContentValues().apply {
                put(MediaStore.Video.Media.DISPLAY_NAME, name)
                put(MediaStore.Video.Media.MIME_TYPE, "video/mp4")
                put(MediaStore.Video.Media.RELATIVE_PATH, "${Environment.DIRECTORY_MOVIES}/$FOLDER")
                put(MediaStore.Video.Media.IS_PENDING, 1)
            }
            val resolver = context.contentResolver
            val uri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values)
                ?: throw IllegalStateException("Não foi possível criar o arquivo de vídeo.")
            val pfd = resolver.openFileDescriptor(uri, "rw")
                ?: run {
                    resolver.delete(uri, null, null)
                    throw IllegalStateException("Não foi possível abrir o arquivo de vídeo.")
                }
            return RecordingFile(resolver, uri, pfd, name)
        }
    }
}
