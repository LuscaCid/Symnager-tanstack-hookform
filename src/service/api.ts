import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import type { AuthResponse, LicenseRequiredError } from "@/@types/api"
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

/**
 * API embutida neste computador. No modo nuvem o `api` aponta para o servidor da Symnager,
 * mas a licença continua sendo da instalação local (rotas públicas, sem token).
 */
export const localApi = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json", "X-Requested-With": "symnager" },
})

export function setLocalApiBaseUrl(url: string) {
  localApi.defaults.baseURL = url
}

/** Recusas do servidor em nuvem ligadas à licença (403). */
export type CloudDenial = { code: string; message: string }
const CLOUD_DENIAL_CODES = new Set(["PLAN_NO_CLOUD", "CLOUD_LICENSE_INVALID"])
let onCloudDenied: ((info: CloudDenial) => void) | null = null

/** Chamado quando a nuvem recusa a licença deste computador (plano sem nuvem, licença inválida). */
export function setCloudDeniedHandler(fn: (info: CloudDenial) => void) {
  onCloudDenied = fn
}

// sessões separadas para a API local e para a nuvem: trocar de modo não derruba a outra
let refreshKey: "refresh_token" | "refresh_token_cloud" = "refresh_token"
let accessToken: string | null = null
let refreshing: Promise<AuthResponse | null> | null = null
let onSessionExpired: (() => void) | null = null
let onLicenseRequired: ((info: LicenseRequiredError) => void) | null = null

export function setApiBaseUrl(url: string, cloud = false) {
  api.defaults.baseURL = url
  refreshKey = cloud ? "refresh_token_cloud" : "refresh_token"
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

/** Chamado quando qualquer rota responde 402 LICENSE_REQUIRED (licença ausente, vencida ou bloqueada). */
export function setLicenseRequiredHandler(fn: (info: LicenseRequiredError) => void) {
  onLicenseRequired = fn
}

export async function storeRefreshToken(token: string | null) {
  if (bridge) await bridge.secureSet(refreshKey, token)
}

export async function readRefreshToken() {
  if (bridge) return bridge.secureGet(refreshKey)
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

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean; _licenseRetried?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined
    const url = original?.url ?? ""
    const isAuthRoute = /\/auth\/(login|refresh|setup)/.test(url)
    const body = error.response?.data as Partial<LicenseRequiredError> | undefined
    if (error.response?.status === 402 && body?.code === "LICENSE_REQUIRED") {
      onLicenseRequired?.(body as LicenseRequiredError)
      return Promise.reject(error)
    }
    const code = (body as { code?: string } | undefined)?.code
    if (error.response?.status === 403 && code === "CLOUD_LICENSE_STALE" && original && !original._licenseRetried && bridge) {
      // token da licença passou de 24 h: check-in agora e repete (o Electron injeta o token novo)
      original._licenseRetried = true
      await localApi.post("/license/refresh").catch(() => undefined)
      await bridge.cloudCheck().catch(() => undefined)
      return api(original)
    }
    if (error.response?.status === 403 && code && CLOUD_DENIAL_CODES.has(code)) {
      onCloudDenied?.({ code, message: (body as { message?: string }).message ?? "Acesso à nuvem recusado." })
      return Promise.reject(error)
    }
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
