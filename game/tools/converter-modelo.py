"""Converte um modelo .glb (Kenney) ou .gltf (Poly Haven) para o .json único que o jogo carrega.
Uso: python3 converter-modelo.py ENTRADA SAIDA.json [--textura 256]
- Tudo vai embutido (dados em base64), porque o site de prévia não serve .glb.
- Texturas reduzidas (padrão 256 px): combina com o visual retrô e fica leve no celular.
- Só a cor (baseColor) é mantida; normal e rugosidade/metal são descartados.
"""
import base64, io, json, struct, sys
from pathlib import Path
from PIL import Image

def data_uri(mime, dados):
    return f"data:{mime};base64,{base64.b64encode(dados).decode()}"

def reduzir(dados, lado):
    img = Image.open(io.BytesIO(dados)).convert('RGB')
    img.thumbnail((lado, lado))
    out = io.BytesIO(); img.save(out, 'JPEG', quality=85)
    return out.getvalue()

def ler(caminho):
    p = Path(caminho)
    if p.suffix == '.glb':
        b = p.read_bytes()
        _, _, _ = struct.unpack('<III', b[:12])
        n, _ = struct.unpack('<II', b[12:20]); gltf = json.loads(b[20:20 + n])
        pos = 20 + n; bin_ = b''
        if pos < len(b):
            m, _ = struct.unpack('<II', b[pos:pos + 8]); bin_ = b[pos + 8:pos + 8 + m]
        return gltf, [bin_], p.parent
    gltf = json.loads(p.read_text())
    return gltf, [(p.parent / buf['uri']).read_bytes() for buf in gltf['buffers']], p.parent

def converter(entrada, saida, lado=256):
    gltf, bins, pasta = ler(entrada)
    # Descarta mapas que o jogo não usa (fica bem mais leve).
    descartadas = set()
    for mat in gltf.get('materials', []):
        for chave in ('normalTexture', 'occlusionTexture', 'emissiveTexture'):
            if chave in mat: descartadas.add(mat.pop(chave)['index'])
        pbr = mat.setdefault('pbrMetallicRoughness', {})
        if 'metallicRoughnessTexture' in pbr: descartadas.add(pbr.pop('metallicRoughnessTexture')['index'])
        pbr['metallicFactor'] = 0; pbr['roughnessFactor'] = 1
    usadas = {gltf['textures'][i]['source'] for i in range(len(gltf.get('textures', []))) if i not in descartadas}
    for i, img in enumerate(gltf.get('images', [])):
        if 'uri' in img and not img['uri'].startswith('data:'):
            dados = (pasta / img['uri']).read_bytes() if i in usadas else b''
            if dados and img['uri'].lower().endswith('.png'):
                img['uri'] = data_uri('image/png', dados)  # paleta de cores (Kenney): mantém exata
            else:
                img['uri'] = data_uri('image/jpeg', reduzir(dados, lado)) if dados else data_uri('image/jpeg', reduzir(Image_vazia(), 4))
            img.pop('mimeType', None)
        elif 'bufferView' in img and i in usadas and lado:
            pass  # textura já embutida no .glb (Kenney: paleta pequena), mantém
    for i, buf in enumerate(gltf['buffers']):
        buf['uri'] = data_uri('application/octet-stream', bins[i]); buf['byteLength'] = len(bins[i])
    Path(saida).write_text(json.dumps(gltf, separators=(',', ':')))
    return Path(saida).stat().st_size

def Image_vazia():
    out = io.BytesIO(); Image.new('RGB', (4, 4), (128, 128, 128)).save(out, 'JPEG'); return out.getvalue()

if __name__ == '__main__':
    lado = int(sys.argv[sys.argv.index('--textura') + 1]) if '--textura' in sys.argv else 256
    print(sys.argv[2], round(converter(sys.argv[1], sys.argv[2], lado) / 1024), 'KB')
