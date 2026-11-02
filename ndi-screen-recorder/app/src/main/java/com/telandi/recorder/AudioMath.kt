package com.telandi.recorder

/** Operações simples de áudio PCM 16 bits (lógica pura, testável). */
object AudioMath {

    /** Duplica um canal mono em estéreo intercalado (L R L R…). */
    fun monoToStereo(src: ShortArray, frames: Int, dst: ShortArray) {
        for (i in 0 until frames) {
            val s = src[i]
            dst[2 * i] = s
            dst[2 * i + 1] = s
        }
    }

    /** Soma [src] em [dst] (mixagem), limitando para não distorcer com estouro. */
    fun mixInto(dst: ShortArray, src: ShortArray, samples: Int) {
        for (i in 0 until samples) {
            val sum = dst[i] + src[i]
            dst[i] = sum.coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
        }
    }

    /** Carimbo de tempo (µs) do bloco que começa após [framesBefore] amostras. */
    fun ptsUs(startUs: Long, framesBefore: Long, sampleRate: Int): Long =
        startUs + framesBefore * 1_000_000L / sampleRate
}
