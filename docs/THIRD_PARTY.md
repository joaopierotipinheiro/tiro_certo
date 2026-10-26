# Componentes de terceiros

## Three.js 0.180.0 / r180

- Projeto: https://github.com/mrdoob/three.js
- Copyright © 2010–2025 three.js authors.
- Licença: MIT, texto integral em [LICENSE-threejs.txt](LICENSE-threejs.txt).
- Biblioteca incluída: `vendor/three/build/three.module.js` e `three.core.js`.
- Complementos incluídos: GLTFLoader, Octree, Capsule e BufferGeometryUtils.
- Origem dos arquivos da biblioteca: https://cdn.jsdelivr.net/npm/three@0.180.0/

## Exemplo FPS e mapa

- Base: https://github.com/mrdoob/three.js/blob/r180/examples/games_fps.html
- Modelo: https://github.com/mrdoob/three.js/blob/r180/examples/models/gltf/collision-world.glb
- O modelo é distribuído com os exemplos do repositório Three.js; o arquivo de licença do repositório foi preservado.
- A adaptação mantém o modelo e os conceitos de câmera FPS, cápsula, Octree, gravidade e subpassos. Acrescenta fechamento da arena, alvos, projéteis visíveis com colisões por segmento, lançador feito com primitivas, efeitos de impacto, regras de partida, interface e áudio sintetizado.

Não foram adicionadas imagens, fontes ou trilhas sonoras externas ao jogo. As texturas do hangar e a vista orbital são desenhadas em Canvas por `src/arenas/orbital.js`.
