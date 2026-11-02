package com.telandi.recorder

import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/** Cálculo do tamanho do vídeo a partir do tamanho da tela (lógica pura, testável). */
object VideoSize {

    /**
     * Reduz (nunca aumenta) a tela para que o lado menor fique com [shortSide] pixels,
     * mantendo a proporção e arredondando para múltiplos de [align].
     * [shortSide] <= 0 significa resolução nativa.
     */
    fun fit(displayW: Int, displayH: Int, shortSide: Int, align: Int = 2): Pair<Int, Int> {
        require(displayW > 0 && displayH > 0) { "Tamanho de tela inválido" }
        val minSide = min(displayW, displayH)
        val scale = if (shortSide <= 0 || shortSide >= minSide) 1.0 else shortSide.toDouble() / minSide
        return alignDown((displayW * scale).roundToInt(), align) to
            alignDown((displayH * scale).roundToInt(), align)
    }

    fun alignDown(value: Int, align: Int): Int = max(align, value / align * align)

    /**
     * Escolhe o maior tamanho aceito pelo codificador ([isSupported]): tenta primeiro
     * alinhamento 2, depois 16, e vai reduzindo a resolução se necessário.
     */
    fun choose(
        displayW: Int,
        displayH: Int,
        shortSide: Int,
        isSupported: (Int, Int) -> Boolean,
    ): Pair<Int, Int> {
        val minSide = min(displayW, displayH)
        var target = if (shortSide <= 0) minSide else min(shortSide, minSide)
        while (target >= MIN_SHORT_SIDE) {
            for (align in intArrayOf(2, 16)) {
                val size = fit(displayW, displayH, target, align)
                if (isSupported(size.first, size.second)) return size
            }
            target = (target * 0.85).toInt()
        }
        return fit(displayW, displayH, MIN_SHORT_SIDE, 16)
    }

    private const val MIN_SHORT_SIDE = 240
}
