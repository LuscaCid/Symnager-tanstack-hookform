import axios from "axios"
import { toast } from "sonner"
import { getErrorMessage } from "@/service/api"

let navigate: ((to: string) => void) | null = null

/** Registrado pelo Layout (dentro do Router) para os toasts poderem levar a outra tela. */
export function setNotifyNavigator(fn: ((to: string) => void) | null) {
  navigate = fn
}

/** 403 PLAN_LIMIT: o tenant bateu num limite do plano (usuários, OS do mês, armazenamento, fotos). */
export function isPlanLimitError(err: unknown) {
  return axios.isAxiosError(err) && err.response?.status === 403 && (err.response.data as { code?: string })?.code === "PLAN_LIMIT"
}

/** Toast de erro padrão; em limite de plano oferece "Ver planos". */
export function toastError(err: unknown, fallback?: string) {
  const message = getErrorMessage(err, fallback)
  if (isPlanLimitError(err) && navigate) {
    const go = navigate
    toast.error(message, { action: { label: "Ver planos", onClick: () => go("/configuracoes/plano") }, duration: 10_000 })
    return
  }
  toast.error(message)
}
