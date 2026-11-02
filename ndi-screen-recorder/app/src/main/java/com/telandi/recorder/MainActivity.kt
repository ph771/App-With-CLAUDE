package com.telandi.recorder

import android.Manifest
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.widget.doAfterTextChanged
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.google.android.material.button.MaterialButton
import com.google.android.material.materialswitch.MaterialSwitch
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.telandi.recorder.media.CodecSupport
import com.telandi.recorder.ndi.NdiNative
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var prefs: SharedPreferences

    private lateinit var statusTitle: TextView
    private lateinit var statusDetail: TextView
    private lateinit var ndiLibStatus: TextView
    private lateinit var switchNdi: MaterialSwitch
    private lateinit var ndiNameLayout: TextInputLayout
    private lateinit var ndiName: TextInputEditText
    private lateinit var switchRecord: MaterialSwitch
    private lateinit var codecGroup: RadioGroup
    private lateinit var radioH264: RadioButton
    private lateinit var radioH265: RadioButton
    private lateinit var codecNote: TextView
    private lateinit var spinnerResolution: Spinner
    private lateinit var spinnerFps: Spinner
    private lateinit var spinnerBitrate: Spinner
    private lateinit var switchInternal: MaterialSwitch
    private lateinit var switchMic: MaterialSwitch
    private lateinit var buttonStart: MaterialButton

    private val resolutions = listOf(0 to "Nativa (tela inteira)", 1080 to "1080p", 720 to "720p", 480 to "480p")
    private val fpsOptions = listOf(30, 60)
    private val bitrates = listOf(4, 8, 12, 20, 40)

    private var ndiAvailable = false
    private var hevcSupported = false
    private var loading = true

    private val projectionLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val data = result.data
            if (result.resultCode == RESULT_OK && data != null) {
                CaptureService.start(this, result.resultCode, data, readConfig())
            } else {
                toast("Você precisa permitir a captura da tela para continuar.")
            }
        }

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
            val config = readConfig()
            if (config.anyAudio && !granted(Manifest.permission.RECORD_AUDIO)) {
                toast("Sem a permissão de áudio não dá para capturar o som. Desative o áudio ou permita nas configurações.")
                return@registerForActivityResult
            }
            launchProjection()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        prefs = getSharedPreferences("config", MODE_PRIVATE)
        bindViews()

        ndiAvailable = NdiNative.isAvailable()
        hevcSupported = CodecSupport.isSupported(VideoCodec.H265)

        ndiLibStatus.text = if (ndiAvailable) {
            "Biblioteca NDI carregada (${NdiNative.version() ?: "NDI"})."
        } else {
            "⚠ Biblioteca NDI não incluída neste APK: a transmissão NDI está desativada. A gravação funciona normalmente."
        }
        radioH265.isEnabled = hevcSupported
        codecNote.text = if (hevcSupported) {
            "H.265 gera arquivos menores com a mesma qualidade; H.264 abre em qualquer lugar."
        } else {
            "Este celular não tem codificador H.265 — use H.264."
        }

        setupSpinner(spinnerResolution, resolutions.map { it.second })
        setupSpinner(spinnerFps, fpsOptions.map { "$it fps" })
        setupSpinner(spinnerBitrate, bitrates.map { "$it Mbps" })

        applyConfig(RecorderConfig.load(prefs))
        listOf(switchNdi, switchRecord, switchInternal, switchMic).forEach {
            it.setOnCheckedChangeListener { _, _ -> onSettingsChanged() }
        }
        codecGroup.setOnCheckedChangeListener { _, _ -> onSettingsChanged() }
        ndiName.doAfterTextChanged { onSettingsChanged() }
        loading = false
        onSettingsChanged()

        buttonStart.setOnClickListener { onStartClicked() }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch { RecorderState.status.collect { render(it) } }
                launch {
                    while (true) {
                        delay(1000)
                        render(RecorderState.status.value)
                    }
                }
            }
        }
    }

    private fun bindViews() {
        statusTitle = findViewById(R.id.statusTitle)
        statusDetail = findViewById(R.id.statusDetail)
        ndiLibStatus = findViewById(R.id.ndiLibStatus)
        switchNdi = findViewById(R.id.switchNdi)
        ndiNameLayout = findViewById(R.id.ndiNameLayout)
        ndiName = findViewById(R.id.ndiName)
        switchRecord = findViewById(R.id.switchRecord)
        codecGroup = findViewById(R.id.codecGroup)
        radioH264 = findViewById(R.id.radioH264)
        radioH265 = findViewById(R.id.radioH265)
        codecNote = findViewById(R.id.codecNote)
        spinnerResolution = findViewById(R.id.spinnerResolution)
        spinnerFps = findViewById(R.id.spinnerFps)
        spinnerBitrate = findViewById(R.id.spinnerBitrate)
        switchInternal = findViewById(R.id.switchInternal)
        switchMic = findViewById(R.id.switchMic)
        buttonStart = findViewById(R.id.buttonStart)
    }

    private fun setupSpinner(spinner: Spinner, labels: List<String>) {
        spinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, labels)
        spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) = onSettingsChanged()
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }
    }

    private fun applyConfig(c: RecorderConfig) {
        switchNdi.isChecked = c.ndiEnabled && ndiAvailable
        ndiName.setText(c.ndiName)
        ndiNameLayout.placeholderText = c.resolvedNdiName()
        switchRecord.isChecked = c.recordEnabled
        if (c.codec == VideoCodec.H265 && hevcSupported) radioH265.isChecked = true else radioH264.isChecked = true
        spinnerResolution.setSelection(resolutions.indexOfFirst { it.first == c.shortSide }.coerceAtLeast(0))
        spinnerFps.setSelection(fpsOptions.indexOf(c.fps).coerceAtLeast(0))
        spinnerBitrate.setSelection(bitrates.indexOf(c.bitrateMbps).coerceAtLeast(0))
        switchInternal.isChecked = c.internalAudio
        switchMic.isChecked = c.micAudio
    }

    private fun readConfig() = RecorderConfig(
        ndiEnabled = switchNdi.isChecked,
        ndiName = ndiName.text?.toString().orEmpty(),
        recordEnabled = switchRecord.isChecked,
        codec = if (radioH265.isChecked) VideoCodec.H265 else VideoCodec.H264,
        shortSide = resolutions[spinnerResolution.selectedItemPosition.coerceAtLeast(0)].first,
        fps = fpsOptions[spinnerFps.selectedItemPosition.coerceAtLeast(0)],
        bitrateMbps = bitrates[spinnerBitrate.selectedItemPosition.coerceAtLeast(0)],
        internalAudio = switchInternal.isChecked,
        micAudio = switchMic.isChecked,
    )

    private fun onSettingsChanged() {
        if (loading) return
        readConfig().save(prefs)
        setControlsEnabled(!RecorderState.status.value.running)
    }

    private fun setControlsEnabled(enabled: Boolean) {
        switchNdi.isEnabled = enabled && ndiAvailable
        ndiNameLayout.isEnabled = enabled && switchNdi.isChecked
        switchRecord.isEnabled = enabled
        radioH264.isEnabled = enabled && switchRecord.isChecked
        radioH265.isEnabled = enabled && switchRecord.isChecked && hevcSupported
        spinnerResolution.isEnabled = enabled
        spinnerFps.isEnabled = enabled
        spinnerBitrate.isEnabled = enabled && switchRecord.isChecked
        switchInternal.isEnabled = enabled
        switchMic.isEnabled = enabled
    }

    private fun onStartClicked() {
        if (RecorderState.status.value.running) {
            CaptureService.stop(this)
            return
        }
        val config = readConfig()
        if (!config.ndiEnabled && !config.recordEnabled) {
            toast("Ative a transmissão NDI, a gravação, ou os dois.")
            return
        }
        val needed = mutableListOf<String>()
        if (config.anyAudio) needed += Manifest.permission.RECORD_AUDIO
        if (Build.VERSION.SDK_INT >= 33) needed += Manifest.permission.POST_NOTIFICATIONS
        val missing = needed.filterNot { granted(it) }
        if (missing.isEmpty()) launchProjection() else permissionLauncher.launch(missing.toTypedArray())
    }

    private fun launchProjection() {
        val manager = getSystemService(MediaProjectionManager::class.java)
        projectionLauncher.launch(manager.createScreenCaptureIntent())
    }

    private fun render(status: RecorderState.Status) {
        setControlsEnabled(!status.running)
        buttonStart.text = getString(if (status.running) R.string.stop else R.string.start)
        buttonStart.setBackgroundColor(
            ContextCompat.getColor(this, if (status.running) R.color.live else R.color.brand),
        )
        if (status.running) {
            val seconds = ((System.currentTimeMillis() - status.startedAtMs) / 1000).coerceAtLeast(0)
            statusTitle.text = "● AO VIVO  %02d:%02d:%02d".format(seconds / 3600, seconds / 60 % 60, seconds % 60)
            statusTitle.setTextColor(ContextCompat.getColor(this, R.color.live))
            val lines = mutableListOf("Vídeo: ${status.width}×${status.height}")
            status.ndiName?.let {
                val n = status.ndiConnections
                lines += "NDI: \"$it\" — $n receptor${if (n == 1) "" else "es"} conectado${if (n == 1) "" else "s"}"
            }
            status.recordingName?.let { lines += "Gravando (${status.codecLabel}): $it" }
            statusDetail.text = lines.joinToString("\n")
        } else {
            statusTitle.text = if (status.isError) "Erro" else "Pronto"
            statusTitle.setTextColor(
                ContextCompat.getColor(this, if (status.isError) R.color.live else R.color.brand),
            )
            statusDetail.text = status.message ?: "Escolha as opções e toque em Iniciar."
        }
    }

    private fun granted(permission: String) =
        ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED

    private fun toast(text: String) = Toast.makeText(this, text, Toast.LENGTH_LONG).show()
}
