// Ramo padrão deste instalador. Definido no build (scripts/build-electron.mjs, env SYMNAGER_SEGMENT)
// e usado só na configuração inicial: depois o ramo fica nas configurações da empresa.

export const SEGMENT_IDS = ["CELULAR_INFORMATICA", "AR_CONDICIONADO", "ELETRODOMESTICOS", "SERVICOS_GERAIS"] as const
export type SegmentId = (typeof SEGMENT_IDS)[number]

const baked = process.env.SYMNAGER_BUILD_SEGMENT ?? ""

export const BUILD_SEGMENT: SegmentId = (SEGMENT_IDS as readonly string[]).includes(baked)
  ? (baked as SegmentId)
  : "CELULAR_INFORMATICA"
