import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createContext, useContextSelector } from "use-context-selector"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { AuthResponse, LicenseStatus, Role, User } from "@/@types/api"
import {
  readRefreshToken,
  refreshSession,
  setAccessToken,
  setApiBaseUrl,
  setCloudDeniedHandler,
  setLicenseRequiredHandler,
  setLocalApiBaseUrl,
  setSessionExpiredHandler,
  storeRefreshToken,
} from "@/service/api"
import { authService, licenseService } from "@/services/resources"
import { getCachedLicense, setCachedLicense } from "@/lib/license"
import { bridge, resolveApiBaseUrl } from "@/lib/runtime"

export type AuthStatus = "loading" | "offline" | "unlicensed" | "needs-setup" | "unauthenticated" | "authenticated"

interface AuthContextProps {
  status: AuthStatus
  user: User | null
  apiUrl: string
  error: string | null
  login: (login: string, password: string) => Promise<void>
  setup: (data: Parameters<typeof authService.setup>[0]) => Promise<void>
  logout: () => Promise<void>
  /** reavalia conexão e sessão (após trocar servidor, restaurar backup...) */
  reload: () => Promise<void>
  setUser: (user: User) => void
  /** situação da licença desta instalação (null = API sem licenciamento) */
  license: LicenseStatus | null
  /** aplica um status novo (após ativar, verificar ou desativar) */
  applyLicense: (status: LicenseStatus) => void
}

export const AuthContext = createContext({} as AuthContextProps)

const emptyLicense: LicenseStatus = {
  valid: false,
  status: "UNLICENSED",
  message: null,
  key_masked: null,
  tenant: null,
  plan: null,
  license_expires_at: null,
  offline_until: null,
  activated_at: null,
  last_check_at: null,
  machine_name: null,
  machine_id: null,
  server_url: null,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [user, setUser] = useState<User | null>(null)
  const [apiUrl, setApiUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [license, setLicense] = useState<LicenseStatus | null>(() => getCachedLicense())

  const applySession = useCallback(async (session: AuthResponse) => {
    setAccessToken(session.access_token)
    await storeRefreshToken(session.refresh_token)
    setUser(session.user)
    setStatus("authenticated")
  }, [])

  const bootstrapRef = useRef<() => Promise<void>>(async () => undefined)
  const bootstrap = useCallback(async (): Promise<void> => {
    setStatus("loading")
    setError(null)
    try {
      const url = await resolveApiBaseUrl()
      const runtimeInfo = bridge ? await bridge.getRuntime() : null
      setApiUrl(url)
      setApiBaseUrl(url, runtimeInfo?.mode === "remote")
      setLocalApiBaseUrl(url)
      if (bridge) {
        const runtime = await bridge.getRuntime()
        if (runtime.apiStatus === "starting") return // aguarda o evento onApiStatus
        if (runtime.apiStatus === "error") throw new Error(runtime.apiError || "A API local não iniciou.")
        setLocalApiBaseUrl(runtime.localApiUrl)
        if (runtime.mode === "remote") {
          // licença sem nuvem (ex.: plano trocado para o vitalício): volta para o banco local
          const cloud = await bridge.cloudCheck()
          if (!cloud.ok && cloud.code !== "CLOUD_UNREACHABLE") {
            toast.error(cloud.message || "Sem acesso ao servidor em nuvem.")
            await bridge.setConfig({ mode: "local" })
            return bootstrapRef.current()
          }
          if (!cloud.ok) throw new Error(cloud.message || "Servidor em nuvem indisponível.")
        }
      }
      // licença: com um status válido em cache o app abre direto e a confirmação roda em segundo plano
      const cached = getCachedLicense()
      const check = licenseService.status().then(
        (lic) => {
          setLicense(lic)
          setCachedLicense(lic.valid ? lic : null)
          return lic
        },
        () => null, // API sem rota de licença (versão antiga) ou indisponível: segue o fluxo normal
      )
      if (cached?.valid) {
        check.then((lic) => {
          if (lic && !lic.valid) setStatus("unlicensed")
        })
      } else {
        const lic = await check
        if (lic && !lic.valid) {
          setStatus("unlicensed")
          return
        }
      }
      const { needs_setup } = await authService.status()
      if (needs_setup) {
        setStatus("needs-setup")
        return
      }
      const session = await refreshSession()
      if (session) {
        setUser(session.user)
        setStatus("authenticated")
      } else {
        setStatus("unauthenticated")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Servidor indisponível.")
      setStatus("offline")
    }
  }, [])

  bootstrapRef.current = bootstrap

  // a nuvem recusou a licença no meio do uso: avisa e volta para o banco deste computador
  useEffect(() => {
    if (!bridge) return
    let switching = false
    setCloudDeniedHandler(async (info) => {
      if (switching) return
      switching = true
      toast.error(info.message)
      try {
        await bridge!.setConfig({ mode: "local" })
        setAccessToken(null)
        queryClient.clear()
        await bootstrapRef.current()
      } finally {
        switching = false
      }
    })
  }, [queryClient])

  useEffect(() => {
    bootstrap()
    if (!bridge) return
    return bridge.onApiStatus((runtime) => {
      if (runtime.apiStatus === "running" || runtime.apiStatus === "remote") bootstrap()
      if (runtime.apiStatus === "error") {
        setError(runtime.apiError || "A API local parou de responder.")
        setStatus("offline")
      }
    })
  }, [bootstrap])

  // qualquer 402 LICENSE_REQUIRED (ex.: empresa bloqueada no painel) leva à tela de ativação
  useEffect(() => {
    setLicenseRequiredHandler((info) => {
      setLicense((prev) => ({
        ...(prev ?? emptyLicense),
        valid: false,
        status: info.license_status,
        message: info.message,
      }))
      setCachedLicense(null)
      setStatus("unlicensed")
    })
  }, [])

  const applyLicense = useCallback(
    (lic: LicenseStatus) => {
      setLicense(lic)
      setCachedLicense(lic.valid ? lic : null)
      if (lic.valid) {
        if (status === "unlicensed") bootstrap()
      } else {
        setStatus("unlicensed")
      }
    },
    [bootstrap, status],
  )

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setAccessToken(null)
      setUser(null)
      queryClient.clear()
      setStatus("unauthenticated")
    })
  }, [queryClient])

  const login = useCallback(
    async (loginValue: string, password: string) => {
      const session = await authService.login({ login: loginValue, password })
      await applySession(session)
    },
    [applySession],
  )

  const setup = useCallback(
    async (data: Parameters<typeof authService.setup>[0]) => {
      const session = await authService.setup(data)
      await applySession(session)
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      const token = await readRefreshToken()
      await authService.logout(token)
    } catch {
      // mesmo sem resposta do servidor a sessão local é encerrada
    }
    setAccessToken(null)
    await storeRefreshToken(null)
    setUser(null)
    queryClient.clear()
    setStatus("unauthenticated")
  }, [queryClient])

  const value = useMemo(
    () => ({ status, user, apiUrl, error, login, setup, logout, reload: bootstrap, setUser, license, applyLicense }),
    [status, user, apiUrl, error, login, setup, logout, bootstrap, license, applyLicense],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth<T>(selector: (ctx: AuthContextProps) => T) {
  return useContextSelector(AuthContext, selector)
}

export function useCurrentUser() {
  return useContextSelector(AuthContext, (c) => c.user)
}

/** true se o usuário logado tiver algum dos papéis (ADMIN sempre passa). */
export function useHasRole(...roles: Role[]) {
  const role = useContextSelector(AuthContext, (c) => c.user?.role)
  if (!role) return false
  return role === "ADMIN" || roles.includes(role)
}
