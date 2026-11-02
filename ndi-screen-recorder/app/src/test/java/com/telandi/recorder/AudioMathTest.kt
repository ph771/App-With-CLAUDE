package com.telandi.recorder

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Test

class AudioMathTest {

    @Test
    fun `mono vira estereo duplicando cada amostra`() {
        val dst = ShortArray(6)
        AudioMath.monoToStereo(shortArrayOf(1, -2, 3), 3, dst)
        assertArrayEquals(shortArrayOf(1, 1, -2, -2, 3, 3), dst)
    }

    @Test
    fun `mixagem soma as amostras`() {
        val dst = shortArrayOf(100, -100, 0)
        AudioMath.mixInto(dst, shortArrayOf(50, -50, 7), 3)
        assertArrayEquals(shortArrayOf(150, -150, 7), dst)
    }

    @Test
    fun `mixagem limita sem estourar`() {
        val dst = shortArrayOf(30000, -30000)
        AudioMath.mixInto(dst, shortArrayOf(10000, -10000), 2)
        assertArrayEquals(shortArrayOf(Short.MAX_VALUE, Short.MIN_VALUE), dst)
    }

    @Test
    fun `mixagem respeita a quantidade pedida`() {
        val dst = shortArrayOf(1, 1)
        AudioMath.mixInto(dst, shortArrayOf(1, 1), 1)
        assertArrayEquals(shortArrayOf(2, 1), dst)
    }

    @Test
    fun `carimbo de tempo avanca com as amostras`() {
        assertEquals(1_000_000L, AudioMath.ptsUs(0, 48_000, 48_000))
        assertEquals(5_020_000L, AudioMath.ptsUs(5_000_000, 960, 48_000))
    }
}
