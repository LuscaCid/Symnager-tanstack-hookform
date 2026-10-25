import { ReactNode, useState } from "react"
import { BarChart3, Table2 } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Panel, EmptyState, IconButton } from "@/components/ui"
import { formatDate, formatNumber } from "@/lib/format"
import { axisProps, ChartTheme, useChartTheme } from "./chartTheme"
import type { LucideIcon } from "lucide-react"

/** "2026-10-24" → "24/10" sem deslocamento de fuso. */
export const shortDay = (iso: string) => formatDate(iso.length === 10 ? `${iso}T12:00:00` : iso, "dd/MM")
export const longDay = (iso: string) => formatDate(iso.length === 10 ? `${iso}T12:00:00` : iso, "EEE, dd/MM/yyyy")

interface ChartCardProps {
  title: string
  icon?: LucideIcon
  /** conteúdo alternativo em tabela (acessibilidade / leitura exata) */
  table?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Painel de gráfico com alternância "ver tabela". */
export function ChartCard({ title, icon, table, actions, children, className }: ChartCardProps) {
  const [showTable, setShowTable] = useState(false)
  return (
    <Panel
      title={title}
      icon={icon}
      className={className}
      bodyClassName="p-2 min-h-0"
      actions={
        <>
          {actions}
          {table && (
            <IconButton
              icon={showTable ? BarChart3 : Table2}
              label={showTable ? "Ver gráfico" : "Ver tabela"}
              onClick={() => setShowTable((s) => !s)}
            />
          )}
        </>
      }
    >
      {showTable && table ? <div className="max-h-72 overflow-auto">{table}</div> : children}
    </Panel>
  )
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return <div className="w-full rounded-md bg-zinc-200 dark:bg-zinc-800/80 animate-pulse" style={{ height }} />
}

export function NoData({ text = "Sem dados no período" }: { text?: string }) {
  return <EmptyState icon={BarChart3} title={text} />
}

interface TooltipRow {
  label: string
  value: string
  color?: string
}

/** Caixa de tooltip no estilo do app (borda zinc, fundo do tema). */
export function TooltipBox({ title, rows, t }: { title?: string; rows: TooltipRow[]; t: ChartTheme }) {
  return (
    <div
      className="rounded-md border border-zinc-300 dark:border-zinc-800 shadow-lg px-2 py-1.5 text-xs min-w-32"
      style={{ background: t.surface, color: t.textPrimary }}
    >
      {title && <div className="font-semibold mb-1" style={{ color: t.textSecondary }}>{title}</div>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5" style={{ color: t.textSecondary }}>
            {r.color && <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: r.color }} />}
            {r.label}
          </span>
          <strong className="tabular-nums">{r.value}</strong>
        </div>
      ))}
    </div>
  )
}

/** Legenda simples (sempre presente com 2+ séries). Texto em tinta neutra, cor só na marca. */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400 mb-1">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[3px] rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

export interface SeriesDef<T> {
  key: keyof T & string
  label: string
}

interface TimeSeriesProps<T extends { date: string }> {
  data: T[]
  series: SeriesDef<T>[]
  format?: (v: number) => string
  height?: number
}

/** Linhas por dia (uma escala só; séries de mesma unidade). */
export function TimeSeriesChart<T extends { date: string }>({ data, series, format = formatNumber, height = 220 }: TimeSeriesProps<T>) {
  const t = useChartTheme()
  const colors = series.map((_, i) => t.series[i % t.series.length])
  return (
    <div>
      {series.length > 1 && <Legend items={series.map((s, i) => ({ label: s.label, color: colors[i] }))} />}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={t.grid} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDay} {...axisProps(t)} minTickGap={16} />
          <YAxis {...axisProps(t)} width={56} tickFormatter={(v: number) => format(v)} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: t.axis, strokeDasharray: "3 3" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  t={t}
                  title={longDay(String(label))}
                  rows={series.map((s, i) => ({
                    label: s.label,
                    color: colors[i],
                    value: format(Number((payload[0].payload as T)[s.key] ?? 0)),
                  }))}
                />
              ) : null
            }
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colors[i]}
              strokeWidth={2}
              dot={data.length <= 14 ? { r: 3, strokeWidth: 2, stroke: t.surface, fill: colors[i] } : false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: t.surface }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface BarItem {
  key: string
  label: string
  value: number
  color?: string
  /** texto extra no tooltip */
  hint?: string
}

interface HBarProps {
  items: BarItem[]
  format?: (v: number) => string
  /** altura por barra */
  rowHeight?: number
  onSelect?: (item: BarItem) => void
}

/** Barras horizontais ordenadas — boa leitura de rótulos longos (status, motivos, marcas). */
export function HBarChart({ items, format = formatNumber, rowHeight = 28, onSelect }: HBarProps) {
  const t = useChartTheme()
  const height = Math.max(80, items.length * rowHeight + 24)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={items} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }} barCategoryGap={4}>
        <CartesianGrid stroke={t.grid} horizontal={false} />
        <XAxis type="number" {...axisProps(t)} tickFormatter={(v: number) => format(v)} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          {...axisProps(t)}
          width={130}
          tick={{ fill: t.textSecondary, fontSize: 12 }}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: t.cursor }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0].payload as BarItem
            return (
              <TooltipBox
                t={t}
                title={item.label}
                rows={[
                  { label: "Total", value: format(item.value), color: item.color ?? t.series[0] },
                  ...(item.hint ? [{ label: "", value: item.hint }] : []),
                ]}
              />
            )
          }}
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
          isAnimationActive={false}
          cursor={onSelect ? "pointer" : undefined}
          onClick={onSelect ? (d) => onSelect(d.payload as BarItem) : undefined}
          label={{ position: "right", fill: t.textSecondary, fontSize: 11, formatter: (v: unknown) => format(Number(v)) }}
        >
          {items.map((item) => (
            <Cell key={item.key} fill={item.color ?? t.series[0]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Tabela simples usada como "ver tabela" dos gráficos. */
export function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-zinc-200 dark:bg-zinc-800/80 text-left">
        <tr>
          {head.map((h) => (
            <th key={h} className="px-2 py-1 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-zinc-300 dark:border-zinc-800">
            {r.map((c, j) => (
              <td key={j} className={j > 0 ? "px-2 py-1 tabular-nums" : "px-2 py-1"}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
