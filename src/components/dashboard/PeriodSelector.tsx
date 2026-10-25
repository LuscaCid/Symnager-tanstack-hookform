import { useEffect, useMemo, useState } from "react"
import { CalendarRange } from "lucide-react"
import { cn } from "@/lib/cn"
import { inputClass } from "@/components/ui"
import { formatDate, toDateInput } from "@/lib/format"

export type PeriodPreset = "today" | "7d" | "30d" | "month" | "last-month" | "custom"

export interface PeriodState {
  preset: PeriodPreset
  /** YYYY-MM-DD (datas locais, inclusivas) */
  from: string
  to: string
}

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "month", label: "Este mês" },
  { key: "last-month", label: "Mês passado" },
  { key: "custom", label: "Personalizado" },
]

function rangeFor(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date()
  const today = toDateInput(now)
  const daysAgo = (n: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    return toDateInput(d)
  }
  switch (preset) {
    case "today":
      return { from: today, to: today }
    case "7d":
      return { from: daysAgo(6), to: today }
    case "month":
      return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
    case "last-month":
      return {
        from: toDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
      }
    case "30d":
    default:
      return { from: daysAgo(29), to: today }
  }
}

function readStored(key: string, fallback: PeriodPreset): PeriodState {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null") as PeriodState | null
    if (raw?.preset === "custom" && raw.from && raw.to) return raw
    if (raw?.preset && raw.preset !== "custom") return { preset: raw.preset, ...rangeFor(raw.preset) }
  } catch {
    // ignora valor corrompido
  }
  return { preset: fallback, ...rangeFor(fallback) }
}

/** Período escolhido pelo usuário, lembrado por tela. Presets são recalculados a cada abertura. */
export function usePeriod(storageKey: string, fallback: PeriodPreset = "30d") {
  const key = `@symnager-period:${storageKey}`
  const [period, setPeriod] = useState<PeriodState>(() => readStored(key, fallback))

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(period))
    } catch {
      // sem persistência
    }
  }, [key, period])

  /** Parâmetros para a API: início do primeiro dia e fim do último, em ISO. */
  const params = useMemo(
    () => ({
      from: new Date(`${period.from}T00:00:00`).toISOString(),
      to: new Date(`${period.to}T23:59:59.999`).toISOString(),
    }),
    [period.from, period.to],
  )

  function choose(preset: PeriodPreset) {
    if (preset === "custom") setPeriod((p) => ({ ...p, preset }))
    else setPeriod({ preset, ...rangeFor(preset) })
  }

  function setCustom(from: string, to: string) {
    if (!from || !to) return
    // garante from <= to
    const [a, b] = from <= to ? [from, to] : [to, from]
    setPeriod({ preset: "custom", from: a, to: b })
  }

  return { period, params, choose, setCustom }
}

type PeriodApi = ReturnType<typeof usePeriod>

export function PeriodSelector({ value, className }: { value: PeriodApi; className?: string }) {
  const { period, choose, setCustom } = value
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div role="group" aria-label="Período" className="flex flex-wrap rounded-md border border-zinc-300 dark:border-zinc-800 overflow-hidden">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={period.preset === p.key}
            onClick={() => choose(p.key)}
            className={cn(
              "px-2 py-1 text-sm font-semibold transition duration-200 border-r last:border-r-0 border-zinc-300 dark:border-zinc-800",
              period.preset === p.key
                ? "bg-zinc-950 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-950"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-800/80",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {period.preset === "custom" ? (
        <div className="flex items-center gap-1">
          <label className="sr-only" htmlFor={`period-from`}>
            Data inicial
          </label>
          <input
            id="period-from"
            type="date"
            value={period.from}
            max={period.to}
            onChange={(e) => setCustom(e.target.value, period.to)}
            className={cn(inputClass, "w-auto text-sm")}
          />
          <span className="text-zinc-500 text-sm">até</span>
          <label className="sr-only" htmlFor={`period-to`}>
            Data final
          </label>
          <input
            id="period-to"
            type="date"
            value={period.to}
            min={period.from}
            onChange={(e) => setCustom(period.from, e.target.value)}
            className={cn(inputClass, "w-auto text-sm")}
          />
        </div>
      ) : (
        <span className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          <CalendarRange size={16} />
          {period.from === period.to ? formatDate(`${period.from}T12:00:00`) : `${formatDate(`${period.from}T12:00:00`)} – ${formatDate(`${period.to}T12:00:00`)}`}
        </span>
      )}
    </div>
  )
}
