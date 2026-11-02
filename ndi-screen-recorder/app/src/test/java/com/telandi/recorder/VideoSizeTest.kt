package com.telandi.recorder

import org.junit.Assert.assertEquals
import org.junit.Test

class VideoSizeTest {

    @Test
    fun `reduz para 720p mantendo a proporcao`() {
        assertEquals(720 to 1600, VideoSize.fit(1080, 2400, 720))
    }

    @Test
    fun `nativa mantem o tamanho da tela`() {
        assertEquals(1080 to 2340, VideoSize.fit(1080, 2340, 0))
    }

    @Test
    fun `nunca aumenta a resolucao`() {
        assertEquals(720 to 1280, VideoSize.fit(720, 1280, 1080))
    }

    @Test
    fun `funciona com a tela deitada`() {
        assertEquals(2400 to 1080, VideoSize.fit(3200, 1440, 1080))
    }

    @Test
    fun `alinha em multiplos de 16 quando pedido`() {
        val (w, h) = VideoSize.fit(1080, 2340, 0, align = 16)
        assertEquals(1072 to 2336, w to h)
    }

    @Test
    fun `usa o primeiro tamanho aceito pelo codificador`() {
        assertEquals(1080 to 2400, VideoSize.choose(1080, 2400, 0) { _, _ -> true })
    }

    @Test
    fun `tenta alinhamento 16 antes de reduzir`() {
        val size = VideoSize.choose(1080, 2340, 0) { w, h -> w % 16 == 0 && h % 16 == 0 }
        assertEquals(1072 to 2336, size)
    }

    @Test
    fun `reduz ate caber no limite do codificador`() {
        val (w, h) = VideoSize.choose(1080, 2400, 0) { w, h -> maxOf(w, h) <= 1920 }
        assert(maxOf(w, h) <= 1920)
        assert(w % 2 == 0 && h % 2 == 0)
    }
}
