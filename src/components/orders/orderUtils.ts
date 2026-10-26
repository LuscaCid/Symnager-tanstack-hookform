import type { Order, OrderStatus } from "@/@types/api"
import type { SegmentProfile } from "@/@types/api"
import { FINAL_STATUSES, formatDate, formatMoney, formatOrderNumber, onlyDigits } from "@/lib/format"
import { FALLBACK_PROFILE, fillTemplate, statusLabelOf } from "@/lib/segment"
import { bridge } from "@/lib/runtime"

export const isFinal = (status: OrderStatus) => FINAL_STATUSES.includes(status)

/** OS ainda em andamento com previsão de entrega vencida. */
export function isOverdue(order: Pick<Order, "status" | "due_date">) {
  if (!order.due_date || isFinal(order.status) || order.status === "PRONTA") return false
  return new Date(order.due_date).getTime() < Date.now()
}

export const balanceOf = (order: Pick<Order, "total" | "paid">) => Math.round((Number(order.total) - Number(order.paid)) * 100) / 100

/** Situação da garantia de uma OS entregue. */
export function warrantyInfo(order: Pick<Order, "status" | "warranty_until" | "warranty_days">) {
  if (order.status !== "ENTREGUE" || !order.warranty_until || !order.warranty_days) return null
  const until = new Date(order.warranty_until)
  return { active: until.getTime() >= Date.now(), until }
}

/** Mensagem pronta para avisar o cliente pelo WhatsApp, com os textos do ramo da empresa. */
export function whatsappMessage(order: Order, companyName: string | undefined, profile: SegmentProfile = FALLBACK_PROFILE) {
  const first = order.owner?.name?.split(" ")[0] ?? ""
  const subject = fillTemplate(profile.messages.subject, { equipamento: order.device })
  const statusText = profile.messages.status[order.status] ?? `está com status: ${statusLabelOf(profile, order.status)}`
  const lines = [`Olá${first ? `, ${first}` : ""}! ${subject} (${formatOrderNumber(order.number)}) ${statusText}.`]
  const visit = order.scheduled_at ? new Date(order.scheduled_at) : null
  if (visit && visit.getTime() > Date.now() && !isFinal(order.status)) {
    const when = `${formatDate(visit, "EEEE, dd/MM 'às' HH:mm")}`
    lines.push(`${subject.replace(/^./, (c) => c.toUpperCase())} ${fillTemplate(profile.messages.scheduled, { data: when })}.`)
    if (order.service_address) lines.push(`Local: ${order.service_address}`)
  }
  if (order.status === "AGUARDANDO_APROVACAO" || order.status === "PRONTA") {
    if (order.total > 0) lines.push(`Valor: ${formatMoney(order.total)}${order.paid > 0 ? ` (saldo ${formatMoney(balanceOf(order))})` : ""}.`)
  }
  if (order.due_date && !isFinal(order.status) && order.status !== "PRONTA") lines.push(`Previsão: ${formatDate(order.due_date)}.`)
  lines.push(`Código de acompanhamento: ${order.tracking_code}`)
  if (companyName) lines.push(companyName)
  return lines.join("\n")
}

export function whatsappLink(phone: string | null | undefined, message: string) {
  let digits = onlyDigits(phone)
  if (digits.length <= 11) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function openExternal(url: string) {
  if (bridge) return bridge.openExternal(url)
  window.open(url, "_blank", "noopener,noreferrer")
}

/** Converte "dd/mm" de input date (YYYY-MM-DD) para ISO no fim do expediente local. */
export function dateInputToIso(value: string | undefined | null) {
  return value ? new Date(`${value}T18:00:00`).toISOString() : null
}

/** ISO -> YYYY-MM-DD local para inputs type=date. */
export function isoToDateInput(value: string | null | undefined) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** "1.234,50" | "1234.5" -> 1234.5 */
export function parseDecimal(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") return 0
  if (typeof value === "number") return value
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value
  const n = Number(normalized)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}
