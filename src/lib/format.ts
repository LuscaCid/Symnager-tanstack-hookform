import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import type { FailureCategory, OrderStatus, Priority, Role } from "@/@types/api"

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const number = new Intl.NumberFormat("pt-BR")

export const formatMoney = (value: number | null | undefined) => currency.format(Number(value ?? 0))
export const formatNumber = (value: number | null | undefined) => number.format(Number(value ?? 0))
export const formatPercent = (value: number | null | undefined) =>
  `${(Number(value ?? 0) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`

export function formatDate(value: string | Date | null | undefined, pattern = "dd/MM/yyyy") {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return format(date, pattern, { locale: ptBR })
}

export const formatDateTime = (value: string | Date | null | undefined) => formatDate(value, "dd/MM/yyyy HH:mm")

export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
}

export function formatHours(hours: number | null | undefined) {
  const h = Number(hours ?? 0)
  if (h < 24) return `${h.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`
  return `${(h / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`
}

export const formatOrderNumber = (n: number | null | undefined, prefix = "OS") => `${prefix}-${String(n ?? 0).padStart(6, "0")}`

export const onlyDigits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "")

export function formatDocument(value: string | null | undefined) {
  const d = onlyDigits(value)
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  return value || "—"
}

export function formatPhone(value: string | null | undefined) {
  const d = onlyDigits(value)
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  return value || "—"
}

export function formatZipcode(value: string | null | undefined) {
  const d = onlyDigits(value)
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, "$1-$2") : value || ""
}

/** Valida CPF/CNPJ pelos dígitos verificadores. */
export function isValidDocument(value: string) {
  const d = onlyDigits(value)
  if (d.length === 11) {
    if (/^(\d)\1+$/.test(d)) return false
    const calc = (len: number) => {
      let sum = 0
      for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i)
      const rest = (sum * 10) % 11
      return rest === 10 ? 0 : rest
    }
    return calc(9) === Number(d[9]) && calc(10) === Number(d[10])
  }
  if (d.length === 14) {
    if (/^(\d)\1+$/.test(d)) return false
    const calc = (len: number) => {
      const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0)
      const rest = sum % 11
      return rest < 2 ? 0 : 11 - rest
    }
    return calc(12) === Number(d[12]) && calc(13) === Number(d[13])
  }
  return false
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  ABERTA: "Aberta",
  EM_ANALISE: "Em análise",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADA: "Aprovada",
  AGUARDANDO_PECA: "Aguardando peça",
  EM_REPARO: "Em reparo",
  PRONTA: "Pronta",
  ENTREGUE: "Entregue",
  CANCELADA: "Cancelada",
}

export const STATUS_COLOR: Record<OrderStatus, string> = {
  ABERTA: "bg-faint/15 text-muted",
  EM_ANALISE: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  AGUARDANDO_APROVACAO: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  APROVADA: "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
  AGUARDANDO_PECA: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  EM_REPARO: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  PRONTA: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  ENTREGUE: "bg-green-500/12 text-green-700 dark:text-green-300",
  CANCELADA: "bg-red-500/12 text-red-700 dark:text-red-300",
}

/** Cor sólida para gráficos (mesma família do badge). */
export const STATUS_HEX: Record<OrderStatus, string> = {
  ABERTA: "#71717a",
  EM_ANALISE: "#0ea5e9",
  AGUARDANDO_APROVACAO: "#f59e0b",
  APROVADA: "#6366f1",
  AGUARDANDO_PECA: "#f97316",
  EM_REPARO: "#8b5cf6",
  PRONTA: "#10b981",
  ENTREGUE: "#22c55e",
  CANCELADA: "#ef4444",
}

export const FINAL_STATUSES: OrderStatus[] = ["ENTREGUE", "CANCELADA"]

export const PRIORITY_LABEL: Record<Priority, string> = {
  BAIXA: "Baixa",
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  BAIXA: "bg-faint/15 text-muted",
  NORMAL: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  ALTA: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  URGENTE: "bg-red-500/12 text-red-700 dark:text-red-300",
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  TECNICO: "Técnico",
  ATENDENTE: "Atendente",
}

export const FAILURE_CATEGORY_LABEL: Record<FailureCategory, string> = {
  ENTREGA: "Falha na entrega",
  GARANTIA: "Retorno em garantia",
  RETRABALHO: "Retrabalho",
  PECA: "Problema com peça",
  ATRASO: "Atraso no prazo",
  OUTRO: "Outro",
}

export const LOOKUP_LABEL = {
  DEVICE_TYPE: "Tipos de equipamento",
  BRAND: "Marcas",
  PAYMENT_METHOD: "Formas de pagamento",
  FAILURE_REASON: "Motivos de falha",
  ACCESSORY: "Acessórios",
  CHECKLIST: "Checklist de entrada",
} as const

/** Data local YYYY-MM-DD (para inputs type=date e filtros). */
export function toDateInput(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
