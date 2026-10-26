import { buildOrbitalHangar } from './orbital.js';

// Catálogo de cenários implementados. Os próximos temas entram aqui.
// Cada construtor mantém o mapa-base e retorna os limites da arena.
// Catálogo de cenários implementados: esta versão contém somente o hangar orbital.
export const ARENAS = {
  orbital: {
    name: 'Hangar orbital',
    description: 'Estação Órion · Setor de treinamento 07',
    build: buildOrbitalHangar
  }
};

// Seleciona o cenário utilizado na inicialização.
export const DEFAULT_ARENA = 'orbital';

// Valida o cenário e devolve os limites físicos e sua identificação.
export function buildArena(id, context) {
  const arena = ARENAS[id];
  if (!arena) throw new Error(`Cenário não disponível: ${id}`);
  return { ...arena.build(context), name: arena.name, description: arena.description };
}
