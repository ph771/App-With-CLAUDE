# Contador de Cangas por Câmera — Design

> **Atualização (versão 5):** a pedido do operador, o app passou a contar **só as peças
> certas**, penduradas no suporte. A contagem de erradas, a área de saída e a área da
> cortadeira foram removidas para evitar contagens falsas. Antes de contar, um **ajuste**
> guiado pede para desenhar o retângulo do suporte na imagem e testar com uma peça (o
> teste não entra na contagem). A contagem só começa no botão "Começar a contar", e pausa
> sozinha se o celular se mexer. O texto abaixo é o design original.
>
> **Atualização (versão 6):** mão, máquina ou pessoa na frente do suporte não contam. O app
> vigia uma faixa em cima e dos lados do suporte; essas coisas sempre atravessam a faixa,
> enquanto a peça pendurada fica só dentro do suporte. A contagem só acontece com o suporte
> mudado, parado por 1,5 s e com a faixa livre. Se algo ficar parado na frente, o app espera
> (e avisa depois de 20 s), sem nunca transformar isso em referência.
>
> **Atualização (versão 8):** cangas iguais empilhadas mudam pouco o "desenho" do suporte;
> agora também conta quando ≥5% dos pixels do suporte mudam (dobra, borda, volume). Uma mão
> que passa e sai deixa 0%. Se suporte e faixa ficarem parados 5 s com a faixa diferente, o
> app aprende a cena sem contar (não trava mais). Imagens lisas (camiseta de uma cor) não
> geram contagens repetidas. O ajuste mostra uma linha de diagnóstico.

## O que é

Um app que roda no navegador do celular, com a câmera parada filmando o posto de
acabamento. Ele conta sozinho cada canga que sai da mesa:

- **Certa**: pendurada no suporte (lado direito da imagem).
- **Errada**: jogada para o lado esquerdo da imagem (mão direita do operador).

A tela mostra, em letras grandes, **Total**, **Certas** e **Erradas**.

## O que NÃO faz

- Não descobre sozinho se a canga tem defeito — quem decide é o operador, pelo lugar
  onde coloca a peça.
- Não conta movimentos de trabalho: cortar, puxar, dobrar, usar a cortadeira.
- Não conta sobras (retalhos brancos), que vão para o lixo embaixo do suporte.

## Posto de trabalho (fixo, a câmera não muda de lugar)

```
 ESQUERDA DA IMAGEM         CENTRO                    DIREITA DA IMAGEM
 cortadeira azul (perto)    operador + mesa           suporte (canto inferior direito)
 ❌ errados saem por aqui   ✂️ trabalho                ✅ certas penduradas aqui
                                                      🗑️ lixo embaixo do suporte
```

Celular deitado na mesa, olhando para cima, em vídeo 1280×720.

## Abordagens consideradas

1. **Vigiar os lugares de destino** — exige ver o destino dos errados, que fica fora
   da imagem. Descartada.
2. **Vigiar a direção da peça (escolhida)** — conta quando um tecido grande sai pela
   esquerda (errado) ou chega e fica parado no suporte (certo). Funciona com o destino
   dos errados fora da imagem.
3. **Botões/pedal manuais** — 100% confiável, mas exige parar o trabalho. Fica como
   correção (botões grandes de desfazer e +1/−1), não como forma principal.

## Como o app decide

O app compara cada quadro do vídeo com os anteriores (detecção de movimento e de
mudança), em resolução baixa, dentro de **áreas** marcadas uma vez na configuração:

| Área | Onde | Para que serve |
|---|---|---|
| **Suporte** | faixa do suporte, canto inferior direito | Certa: mudança grande que **fica parada** depois que o movimento acaba |
| **Saída dos errados** | borda esquerda, **acima** da cortadeira | Errada: movimento grande e rápido saindo pela esquerda |
| **Ignorar** | a cortadeira azul | Movimento ali nunca conta |

Regras para não contar errado:

1. **Tamanho mínimo** — só conta mudança do tamanho de uma canga; retalho é pequeno.
2. **Altura** — sobra cai embaixo do suporte, abaixo da área do suporte; não conta.
3. **Precisa assentar (certa)** — a área do suporte tem que ficar diferente de antes
   **e parada** por ~1 s. Mão passando e saindo não muda o resultado final.
4. **Intervalo mínimo** — depois de contar, espera alguns segundos antes de poder
   contar de novo, para a mesma peça não contar duas vezes.

## Tela

- Imagem da câmera ao fundo com as áreas desenhadas (pode esconder).
- Três números grandes: Total, Certas, Erradas. Um sinal visual e sonoro a cada contagem.
- Botões grandes: **Desfazer última**, **+1 Certa**, **+1 Errada**, **Zerar**.
- Modo **Configurar**: arrastar os retângulos das áreas sobre a imagem.
- A contagem fica salva no celular (não perde se a tela apagar) e tem botão para
  **copiar/compartilhar o resumo do dia**.
- Mantém a tela acesa enquanto conta.

## Como é feito

- Uma única página web (HTML + JavaScript), sem instalar nada e sem internet depois de
  aberta. Câmera traseira via navegador. Nenhum vídeo sai do celular.
- A lógica de contagem fica separada da tela, para poder ser **testada com os vídeos
  gravados** antes de usar ao vivo.

## Como saber que funciona

- Rodar a lógica no vídeo de teste (15 s): resultado esperado **1 certa, 1 errada**,
  sem contar a sobra (≈10 s) nem os cortes.
- Depois, teste ao vivo com mais peças e ajuste fino da sensibilidade na tela.

## Riscos conhecidos

- Só há um vídeo de exemplo (1 certa, 1 errada): a calibração inicial é limitada.
- A cortadeira fica do mesmo lado dos errados; se ela for levantada até a área de saída,
  pode gerar um errado falso → o botão Desfazer corrige.
- Mudança forte de luz (sol, alguém passando na frente da lâmpada) pode atrapalhar.
