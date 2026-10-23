// Respiração no esconderijo: com o Fiscal perto, segure a respiração (até 6 s).
// Sem segurar, ele te ouve em ~1,2 s; segurando até acabar o ar, você solta um suspiro e ele te acha.
export const FOLEGO_RESPIRACAO = 6;
const OUVE_EM = 1.2, RECUPERA = 1.5;

export function createRespiracao() {
  let ar = FOLEGO_RESPIRACAO, semSegurar = 0, perto = false;
  return {
    update(dt, { escondido, fiscalPerto, segurando }) {
      perto = escondido && fiscalPerto;
      if (!escondido) { ar = FOLEGO_RESPIRACAO; semSegurar = 0; return null; }
      if (!fiscalPerto) { ar = Math.min(FOLEGO_RESPIRACAO, ar + RECUPERA * dt); semSegurar = 0; return null; }
      if (segurando) {
        semSegurar = 0;
        ar = Math.max(0, ar - dt);
        return ar <= 1e-9 ? 'achou' : null;
      }
      semSegurar += dt;
      return semSegurar >= OUVE_EM - 1e-9 ? 'achou' : null;
    },
    frac: () => ar / FOLEGO_RESPIRACAO,
    precisaSegurar: () => perto,
    zerar() { ar = FOLEGO_RESPIRACAO; semSegurar = 0; perto = false; },
  };
}
