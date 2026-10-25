import { z } from "zod"

/** "1.234,50" | "1234.5" | "12" -> 1234.5 (NaN se inválido) */
export function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") return value
  const raw = (value ?? "").trim().replace(/^R\$\s*/i, "")
  if (!raw) return 0
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw
  const n = Number(normalized)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

/** 1234.5 -> "1.234,50" (para preencher o input) */
export function moneyToInput(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const moneyField = z
  .string()
  .trim()
  .refine((v) => {
    const n = parseMoney(v)
    return !Number.isNaN(n) && n >= 0
  }, "Valor inválido")

/** inteiro >= 0 vindo de input de texto/number */
export const intField = (message = "Número inválido") =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 1_000_000), message)

export const toInt = (v: string | undefined) => (v && v.trim() ? Number(v) : 0)
export const toIntOrNull = (v: string | undefined) => (v && v.trim() ? Number(v) : null)
export const orNull = (v: string | undefined | null) => (v && v.trim() ? v.trim() : null)
