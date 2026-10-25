import { ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { createContext, useContextSelector } from "use-context-selector"
import { useQueryClient } from "@tanstack/react-query"
import type { AuthResponse, Role, User } from "@/@types/api"
import {
  refreshSession,
  setAccessToken,
  setApiBaseUrl,
  setSessionExpiredHandler,
  storeRefreshToken,
} from "@/service/api"
import { authService } from "@/services/resources"
import { bridge, resolveApiBaseUrl } from "@/lib/runtime"

export type AuthStatus = "loading" | "offline" | "needs-setup" | "unauthenticated" | "authenticated"

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
}

export const AuthContext = createContext({} as AuthContextProps)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [user, setUser] = useState<User | null>(null)
  const [apiUrl, setApiUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  const applySession = useCallback(async (session: AuthResponse) => {
    setAccessToken(session.access_token)
    await storeRefreshToken(session.refresh_token)
    setUser(session.user)
    setStatus("authenticated")
  }, [])

  const bootstrap = useCallback(async () => {
    setStatus("loading")
    setError(null)
    try {
      const url = await resolveApiBaseUrl()
      setApiUrl(url)
      setApiBaseUrl(url)
      if (bridge) {
        const runtime = await bridge.getRuntime()
        if (runtime.apiStatus === "starting") return // aguarda o evento onApiStatus
        if (runtime.apiStatus === "error") throw new Error(runtime.apiError || "A API local não iniciou.")
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
      const token = bridge ? await bridge.secureGet("refresh_token") : null
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
    () => ({ status, user, apiUrl, error, login, setup, logout, reload: bootstrap, setUser }),
    [status, user, apiUrl, error, login, setup, logout, bootstrap],
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
