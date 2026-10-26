# Tiro Certo — Hangar Orbital

Jogo de tiro ao alvo em primeira pessoa desenvolvido com JavaScript e Three.js, a partir do exemplo oficial [games_fps — r180](https://github.com/mrdoob/three.js/blob/r180/examples/games_fps.html). O objetivo é explorar renderização 3D, eventos, vetores, colisões, controle de tempo e estados de jogo.

## Base utilizada e alterações

Foram aproveitados o mapa `collision-world.glb` e a estrutura de câmera em primeira pessoa, movimentação, gravidade, pulo e colisões com `Octree` e `Capsule`.

As principais alterações são:

- Fechamento da arena com teto, paredes e piso de segurança, incluídos nas colisões.
- Visual de hangar orbital, com materiais metálicos, iluminação, caixas de carga e janelas decorativas sobre paredes sólidas.
- Substituição das bolas físicas da base por projéteis de energia visíveis, com lançador, rastro e efeitos de impacto.
- Alvos, pontuação, três níveis, cronômetro, pausa, reinício e resultado final.
- Interface com mira, placar e sons opcionais gerados no navegador.

A geometria do mapa original foi preservada. A adaptação modifica seus materiais e acrescenta estruturas; o cenário inteiro não foi modelado do zero. Nesta versão, o cenário disponível é o hangar orbital.

## Como executar

1. Extraia o ZIP e abra a pasta `tiro-certo-organizado` no VS Code.
2. Instale a extensão **Live Server**, de Ritwick Dey, se necessário.
3. Clique com o botão direito em `index.html` e selecione **Open with Live Server**.
4. No navegador, clique em **Entrar na arena**.

Não é necessário executar `npm install`. A biblioteca e o mapa estão incluídos no projeto. Utilize um servidor HTTP local; abrir o HTML por duplo clique pode impedir o carregamento de módulos e do modelo.

Alternativa para quem já tem Python instalado: execute `python -m http.server 5500` na pasta do projeto e acesse `http://localhost:5500`. Encerre o servidor com Ctrl+C.

Requisitos: computador com teclado e mouse e navegador com suporte a WebGL 2. A interface se adapta a janelas menores, mas não há controles por toque.

## Controles

| Controle | Ação |
| --- | --- |
| W, A, S, D | Mover |
| Mouse | Mirar |
| Botão esquerdo | Disparar |
| Espaço | Pular |
| Esc | Pausar e liberar o cursor |

## Regras

Cada acerto vale **10 pontos**. Os três alvos ativos reaparecem após serem atingidos; a meta conta o total de acertos do nível. A pontuação é acumulada entre as fases.

| Nível | Tempo | Meta | Dificuldade |
| --- | --- | --- | --- |
| 1 | 60 segundos | 5 acertos | Alvos parados |
| 2 | 50 segundos | 7 acertos | Alvos menores e móveis |
| 3 | 40 segundos | 9 acertos | Alvos ainda menores e mais rápidos |

Atingir a meta libera o próximo nível. Zerar o tempo encerra a partida. Completar os três níveis resulta em **210 pontos**. A tela final mostra pontos, acertos, disparos e precisão.

Os pontos são registrados quando o projétil chega ao alvo, não no clique. Paredes interrompem os tiros. A pausa suspende o cronômetro e a simulação; sair da janela ou esconder a aba também pausa o jogo.

## Arquivos

```text
tiro-certo-organizado/
├── index.html
├── README.md
├── package.json
├── .gitignore
├── src/
│   ├── main.js
│   ├── game.js
│   ├── projectiles.js
│   └── arenas/
│       ├── index.js
│       └── orbital.js
├── styles/
│   └── style.css
├── assets/
│   └── models/
│       └── collision-world.glb
├── vendor/
│   └── three/
├── tests/
│   └── game.test.js
└── docs/
    ├── LICENSE-threejs.txt
    └── THIRD_PARTY.md
```

`src`, `styles`, `assets` e `vendor` contêm o código e os recursos do jogo. `tests` reúne os testes e `docs` guarda os créditos e a licença. Abra sempre o `index.html` da raiz pelo servidor local.

| Arquivo ou pasta | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura da interface e entrada da aplicação |
| `styles/style.css` | Aparência da interface |
| `src/main.js` | Cena, jogador, alvos, eventos e integração da partida |
| `src/game.js` | Regras, pontuação, tempo, níveis e estados |
| `src/projectiles.js` | Lançador, voo, colisões e efeitos dos projéteis |
| `src/arenas/` | Construção e identificação do hangar |
| `assets/models/` | Modelo 3D original |
| `vendor/` | Three.js 0.180.0 e complementos locais |
| `tests/` | Testes automatizados das regras |
| `package.json` | Configuração dos módulos e comando de testes |
| `.gitignore` | Arquivos locais ignorados pelo Git |
| `docs/LICENSE-threejs.txt` | Licença dos recursos do Three.js |
| `docs/THIRD_PARTY.md` | Créditos e origem dos componentes |

O código contém comentários breves sobre a função de cada parte. Não remova `vendor/three/examples`: essa pasta contém complementos utilizados pelo jogo.

## Funcionamento técnico

O mapa e os objetos sólidos são reunidos antes da construção da Octree. O jogador é representado por uma cápsula, e a física utiliza cinco subpassos por quadro.

O Raycaster no centro da câmera orienta o lançamento. O projétil viaja em velocidade finita e testa cada trecho percorrido: contra o cenário, usa sua linha central; contra alvos, considera os raios das esferas e o movimento relativo. O tiro é removido no primeiro impacto.

A classe `Game` mantém as regras separadas da renderização. O cronômetro usa tempo real, enquanto a física limita o passo para melhorar a estabilidade. Texturas do hangar são geradas em Canvas e os sons são sintetizados com Web Audio.

## Testes

Com Node.js instalado, execute na pasta do projeto:

```sh
npm test
```

Os cinco testes verificam pontuação no impacto, precisão, pausa e retomada, encerramento por tempo e progressão completa com reinício. Não precisam de instalação de dependências.

Para revisão manual, confira movimentação, teto fechado, bloqueio dos disparos, aumento de pontos, pausa, troca de nível e resultado final.

## Créditos

- [Three.js](https://threejs.org/)
- [Exemplo games_fps — r180](https://github.com/mrdoob/three.js/blob/r180/examples/games_fps.html)
- [Modelo collision-world.glb](https://github.com/mrdoob/three.js/blob/r180/examples/models/gltf/collision-world.glb)

Os créditos e a licença do Three.js foram preservados em [THIRD_PARTY.md](docs/THIRD_PARTY.md) e [LICENSE-threejs.txt](docs/LICENSE-threejs.txt).
