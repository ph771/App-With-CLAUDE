package com.telandi.recorder

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update

/** Estado compartilhado entre o serviço de captura e a tela principal. */
object RecorderState {
    data class Status(
        val running: Boolean = false,
        val startedAtMs: Long = 0,
        val width: Int = 0,
        val height: Int = 0,
        val ndiName: String? = null,
        val ndiConnections: Int = 0,
        val recordingName: String? = null,
        val codecLabel: String? = null,
        val message: String? = null,
        val isError: Boolean = false,
    )

    private val _status = MutableStateFlow(Status())
    val status: StateFlow<Status> = _status

    fun update(block: (Status) -> Status) = _status.update(block)
    fun set(status: Status) { _status.value = status }
}
