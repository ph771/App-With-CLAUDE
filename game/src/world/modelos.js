// Modelos 3D prontos (Kenney Furniture Kit, licença CC0) em game/assets/modelos.
// Cada modelo é ajustado para a altura pedida, apoiado no chão e centrado no ponto.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const cache = {};

export async function carregarModelos(nomes) {
  const loader = new GLTFLoader();
  await Promise.all(nomes.map((n) => loader.loadAsync(`assets/modelos/${n}.json`)
    .then((g) => { cache[n] = g.scene; })
    .catch(() => { /* sem o modelo, o prédio usa a caixa simples */ })));
}

export const temModelo = (nome) => Boolean(cache[nome]);

// Devolve um clone pronto para pôr na cena, ou null se o modelo não carregou.
// `rot` em radianos (0 = como veio do arquivo). `altura` em metros.
export function instanciar(nome, { x, z, y = 0, rot = 0, altura = 1 }) {
  const base = cache[nome];
  if (!base) return null;
  const modelo = base.clone(true);
  const caixa = new THREE.Box3().setFromObject(modelo);
  const tamanho = caixa.getSize(new THREE.Vector3());
  const escala = altura / (tamanho.y || 1);
  modelo.scale.setScalar(escala);
  const centro = caixa.getCenter(new THREE.Vector3());
  // Recentra no pivô para girar em volta do meio.
  modelo.position.set(-centro.x * escala, -caixa.min.y * escala, -centro.z * escala);
  const pivo = new THREE.Group();
  pivo.add(modelo);
  pivo.position.set(x, y, z);
  pivo.rotation.y = rot;
  pivo.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.flatShading = true; } });
  return pivo;
}
