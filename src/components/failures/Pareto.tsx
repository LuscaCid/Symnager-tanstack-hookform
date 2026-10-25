import type { KeyCount } from "@/@types/api"
import { cn } from "@/lib/cn"
import { formatNumber } from "@/lib/format"
import { useChartTheme } from "@/components/dashboard/chartTheme"

/**
 * Pareto de motivos de falha: barras ordenadas + % acumulado em coluna própria
 * (sem segundo eixo). Os motivos que somam até 80% ficam destacados — são os "poucos vitais".
 */
export function Pareto({ items, onSelect }: { items: KeyCount[]; onSelect?: (key: string) => void }) {
  const t = useChartTheme()
  const sorted = [...items].filter((i) => i.count > 0).sort((a, b) => b.count - a.count)
  const total = sorted.reduce((acc, i) => acc + i.count, 0)
  const max = sorted[0]?.count ?? 0
  let running = 0

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[minmax(0,10rem)_1fr_3.5rem_3.5rem] gap-2 text-xs font-semibold text-zinc-500 px-1">
        <span>Motivo</span>
        <span>Ocorrências</span>
        <span className="text-right">%</span>
        <span className="text-right">Acum.</span>
      </div>
      <ul className="flex flex-col gap-1">
        {sorted.map((item) => {
          const before = running
          running += item.count
          const share = total ? item.count / total : 0
          const cumulative = total ? running / total : 0
          // vital: entra na faixa enquanto o acumulado ANTES dele ainda não chegou a 80%
          const vital = total > 0 && before / total < 0.8
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={onSelect ? () => onSelect(item.key) : undefined}
                title={`${item.key}: ${item.count} (${Math.round(share * 100)}%)`}
                className={cn(
                  "w-full grid grid-cols-[minmax(0,10rem)_1fr_3.5rem_3.5rem] gap-2 items-center px-1 py-0.5 rounded-sm text-sm text-left",
                  onSelect && "hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200",
                )}
              >
                <span className={cn("truncate", vital ? "font-semibold" : "text-zinc-600 dark:text-zinc-400")}>{item.key || "Não informado"}</span>
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-3 rounded-r-[4px]"
                    style={{
                      width: `${max ? Math.max(2, (item.count / max) * 100) : 0}%`,
                      background: vital ? t.series[1] : t.axis,
                    }}
                  />
                  <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">{formatNumber(item.count)}</span>
                </span>
                <span className="text-right tabular-nums text-xs">{Math.round(share * 100)}%</span>
                <span className={cn("text-right tabular-nums text-xs", cumulative <= 0.8 && "font-semibold")}>{Math.round(cumulative * 100)}%</span>
              </button>
            </li>
          )
        })}
      </ul>
      {sorted.length > 1 && (
        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: t.series[1] }} /> motivos que concentram ~80% das falhas
        </p>
      )}
    </div>
  )
}
