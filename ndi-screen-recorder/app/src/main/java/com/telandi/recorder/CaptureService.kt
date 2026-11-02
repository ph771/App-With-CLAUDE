package com.telandi.recorder

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import androidx.core.content.IntentCompat

/** Serviço em primeiro plano que mantém a captura rodando com a tela desligada ou em outro app. */
class CaptureService : Service() {

    private val mainHandler = Handler(Looper.getMainLooper())
    private var session: CaptureSession? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> handleStart(intent)
            ACTION_STOP -> stopCapture(null)
            else -> stopSelf()
        }
        return START_NOT_STICKY
    }

    private fun handleStart(intent: Intent) {
        if (session != null) return
        val config = RecorderConfig.fromIntent(intent)
        val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
        val data = IntentCompat.getParcelableExtra(intent, EXTRA_RESULT_DATA, Intent::class.java)

        createChannel()
        var types = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
        if (config.anyAudio) types = types or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification("Iniciando…"), types)
        } catch (e: Exception) {
            Log.e(TAG, "startForeground falhou", e)
            fail("O Android não permitiu iniciar a captura: ${e.message}")
            return
        }

        if (resultCode != Activity.RESULT_OK || data == null) {
            fail("Permissão de captura de tela não concedida.")
            return
        }
        val projection = getSystemService(MediaProjectionManager::class.java).getMediaProjection(resultCode, data)
        if (projection == null) {
            fail("Não foi possível iniciar a captura de tela.")
            return
        }

        val newSession = CaptureSession(applicationContext, projection, config) { reason ->
            mainHandler.post { stopCapture(reason) }
        }
        try {
            newSession.start()
        } catch (t: Throwable) {
            Log.e(TAG, "Falha ao iniciar", t)
            newSession.stop()
            fail(t.message ?: "Erro ao iniciar a captura.")
            return
        }
        session = newSession

        val parts = mutableListOf<String>()
        if (config.ndiEnabled) parts += "NDI"
        if (config.recordEnabled) parts += "gravando ${config.codec.label}"
        RecorderState.set(
            RecorderState.Status(
                running = true,
                startedAtMs = System.currentTimeMillis(),
                width = newSession.width,
                height = newSession.height,
                ndiName = if (config.ndiEnabled) config.resolvedNdiName() else null,
                recordingName = newSession.recordingName,
                codecLabel = if (config.recordEnabled) config.codec.label else null,
            ),
        )
        getSystemService(NotificationManager::class.java)
            .notify(NOTIFICATION_ID, buildNotification("Ao vivo: " + parts.joinToString(" + ")))
    }

    private fun stopCapture(reason: String?) {
        val current = session
        session = null
        val saved = current?.stop()
        val message = when {
            saved != null -> "Vídeo salvo em Filmes/${com.telandi.recorder.media.RecordingFile.FOLDER}/$saved" +
                (reason?.let { "\n$it" } ?: "")
            reason != null -> reason
            else -> "Parado."
        }
        RecorderState.set(RecorderState.Status(running = false, message = message))
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun fail(message: String) {
        RecorderState.set(RecorderState.Status(running = false, message = message, isError = true))
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        session?.stop()
        session = null
        super.onDestroy()
    }

    private fun createChannel() {
        val channel = NotificationChannel(CHANNEL_ID, getString(R.string.notif_channel), NotificationManager.IMPORTANCE_LOW)
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        val openApp = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE,
        )
        val stop = PendingIntent.getService(
            this, 1, Intent(this, CaptureService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_record)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setContentIntent(openApp)
            .addAction(0, getString(R.string.stop), stop)
            .setOngoing(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }

    companion object {
        private const val TAG = "TelaNDI"
        private const val CHANNEL_ID = "capture"
        private const val NOTIFICATION_ID = 1
        private const val ACTION_START = "com.telandi.recorder.START"
        private const val ACTION_STOP = "com.telandi.recorder.STOP"
        private const val EXTRA_RESULT_CODE = "result_code"
        private const val EXTRA_RESULT_DATA = "result_data"

        fun start(context: Context, resultCode: Int, data: Intent, config: RecorderConfig) {
            val intent = Intent(context, CaptureService::class.java)
                .setAction(ACTION_START)
                .putExtra(EXTRA_RESULT_CODE, resultCode)
                .putExtra(EXTRA_RESULT_DATA, data)
            config.writeTo(intent)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            context.startService(Intent(context, CaptureService::class.java).setAction(ACTION_STOP))
        }
    }
}
