import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import type { AuthResponse } from "@/@types/api"
import { bridge } from "@/lib/runtime"

/**
 * Cliente HTTP único do app. O baseURL é definido em runtime (Electron local/remoto ou web),
 * o access token vive só em memória e o refresh token fica:
 *  - no Electron: criptografado com safeStorage (bridge.secureSet)
 *  - na web: em cookie HttpOnly emitido pela API (nunca acessível ao JS)
 */
export const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "symnager",
  },
  withCredentials: true,
})

const REFRESH_KEY = "refresh_token"
let accessToken: string | null = null
let refreshing: Promise<AuthResponse | null> | null = null
let onSessionExpired: (() => void) | null = null

export function setApiBaseUrl(url: string) {
  api.defaults.baseURL = url
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export function setSessionExpiredHandler(fn: () => void) {
  onSessionExpired = fn
}

export async function storeRefreshToken(token: string | null) {
  if (bridge) await bridge.secureSet(REFRESH_KEY, token)
}

async function readRefreshToken() {
  if (bridge) return bridge.secureGet(REFRESH_KEY)
  return null
}

/** Troca o refresh token por um novo par. Chamadas simultâneas compartilham a mesma requisição. */
export function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const refresh_token = await readRefreshToken()
        const { data } = await axios.post<AuthResponse>(
          `${api.defaults.baseURL}/auth/refresh`,
          refresh_token ? { refresh_token } : {},
          { withCredentials: true, headers: { "X-Requested-With": "symnager" } },
        )
        accessToken = data.access_token
        await storeRefreshToken(data.refresh_token)
        return data
      } catch {
        accessToken = null
        await storeRefreshToken(null)
        return null
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const url = original?.url ?? ""
    const isAuthRoute = /\/auth\/(login|refresh|setup)/.test(url)
    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true
      const session = await refreshSession()
      if (session) {
        original.headers.Authorization = `Bearer ${session.access_token}`
        return api(original)
      }
      onSessionExpired?.()
    }
    return Promise.reject(error)
  },
)

/** Extrai a mensagem amigável de um erro da API (formato padrão do Nest). */
export function getErrorMessage(err: unknown, fallback = "Ocorreu um erro inesperado.") {
  if (axios.isAxiosError(err)) {
    if (!err.response) return "Não foi possível conectar ao servidor."
    const message = (err.response.data as { message?: string | string[] })?.message
    if (Array.isArray(message)) return message.join("\n")
    if (typeof message === "string") return message
    if (err.response.status === 429) return "Muitas tentativas. Aguarde um instante."
  }
  if (err instanceof Error) return err.message
  return fallback
}
