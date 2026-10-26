/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** ramo padrão da versão web (CELULAR_INFORMATICA, AR_CONDICIONADO, ELETRODOMESTICOS, SERVICOS_GERAIS) */
  readonly VITE_SYMNAGER_SEGMENT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
