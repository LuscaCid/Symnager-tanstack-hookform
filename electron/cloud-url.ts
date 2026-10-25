/** Servidor em nuvem da Symnager (planos mensais). Em dev pode apontar para outra API com SYMNAGER_CLOUD_URL. */
export const CLOUD_URL = (process.env.SYMNAGER_CLOUD_URL || "https://symnager.plune.app.br/cloud").replace(/\/+$/, "")
export const CLOUD_API_URL = `${CLOUD_URL}/api`
export const CLOUD_ORIGIN = new URL(CLOUD_URL).origin
