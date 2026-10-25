import type { SymnagerBridge } from '@/@types/bridge'

export const bridge: SymnagerBridge | undefined = window.symnager
export const isDesktop = !!bridge

const SERVER_KEY = '@symnager-server-url'

/** Normaliza "http://host:3333" ou "http://host:3333/api/" para "http://host:3333/api". */
export function normalizeApiUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (!trimmed) return '/api'
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

/** Servidor configurado manualmente na versão web (Configurações > Conexão). */
export function getWebServerOverride() {
  try {
    return localStorage.getItem(SERVER_KEY) || ''
  } catch {
    return ''
  }
}

export function setWebServerOverride(url: string) {
  try {
    if (url) localStorage.setItem(SERVER_KEY, url)
    else localStorage.removeItem(SERVER_KEY)
  } catch {
    // armazenamento indisponível: segue com o padrão
  }
}

export async function resolveApiBaseUrl(): Promise<string> {
  if (bridge) {
    const runtime = await bridge.getRuntime()
    return runtime.apiUrl
  }
  const override = getWebServerOverride()
  if (override) return normalizeApiUrl(override)
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined
  return normalizeApiUrl(fromEnv || '/api')
}
