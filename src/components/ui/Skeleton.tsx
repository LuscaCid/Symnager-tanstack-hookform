import { CSSProperties } from "react"
import { cn } from "@/lib/cn"

/**
 * Peças de skeleton. Cada uma imita as dimensões do componente real correspondente
 * (mesma altura, raio e espaçamento), para o conteúdo entrar no lugar sem "pular".
 */

/** Bloco base. */
export function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={cn("bg-subtle rounded-md animate-pulse", className)} style={style} />
}

/** Linhas de texto com larguras variadas. */
export function BoneLines({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-2/3", "w-3/4"]
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Bone key={i} className={cn("h-3 rounded-full", i === lines - 1 ? "w-1/2" : widths[i % widths.length])} />
      ))}
    </div>
  )
}

/** Mesmo formato do <PageHeader>: ícone 36px + título + subtítulo (+ ações). */
export function SkeletonPageHeader({ actions = 1, subtitle = true }: { actions?: number; subtitle?: boolean }) {
  return (
    <div className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Bone className="w-9 h-9 rounded-lg" />
        <div className="flex flex-col gap-1.5">
          <Bone className="h-4 w-36 rounded-full" />
          {subtitle && <Bone className="h-3 w-52 rounded-full" />}
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }).map((_, i) => (
          <Bone key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/** Barra de abas (mesmo espaçamento do <Tabs>). */
export function SkeletonTabs({ count = 4 }: { count?: number }) {
  return (
    <div className="shrink-0 flex gap-5 border-b border-line px-4 pb-2.5 pt-1 mb-4">
      {Array.from({ length: count }).map((_, i) => (
        <Bone key={i} className="h-3.5 rounded-full" style={{ width: 56 + ((i * 23) % 40) }} />
      ))}
    </div>
  )
}

/** Controle segmentado (período, lista/quadro, tema). */
export function SkeletonSegmented({ items = 4 }: { items?: number }) {
  return (
    <div className="inline-flex gap-1 p-0.5 rounded-lg bg-subtle">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className={cn("h-7 rounded-md", i === 2 ? "w-16 bg-surface" : "w-12")} />
      ))}
    </div>
  )
}

/** Cartão de indicador (<StatCard>). */
export function SkeletonStat() {
  return (
    <div className="flex flex-col gap-2 p-4 bg-surface border border-line rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <Bone className="h-3 w-20 rounded-full" />
        <Bone className="w-7 h-7 rounded-lg" />
      </div>
      <Bone className="h-6 w-16 rounded-md" />
      <Bone className="h-2.5 w-24 rounded-full" />
    </div>
  )
}

/** Painel/cartão com título e corpo de altura fixa (gráficos, listas). */
export function SkeletonPanel({ height = 180, className, title = true }: { height?: number; className?: string; title?: boolean }) {
  return (
    <div className={cn("bg-surface border border-line rounded-xl shadow-sm p-4 flex flex-col gap-3", className)}>
      {title && <Bone className="h-3.5 w-32 rounded-full" />}
      <Bone className="w-full rounded-lg" style={{ height }} />
    </div>
  )
}

/** Cartão de OS da lista/histórico (<HistoryBox>). */
export function SkeletonOrderCard() {
  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-surface border border-line rounded-xl shadow-sm">
      <div className="flex justify-between">
        <Bone className="h-2.5 w-20 rounded-full" />
        <Bone className="h-2.5 w-16 rounded-full" />
      </div>
      <div className="flex justify-between items-start gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <Bone className="h-3.5 w-40 rounded-full" />
          <Bone className="h-3 w-28 rounded-full" />
        </div>
        <Bone className="h-5 w-20 rounded-md" />
      </div>
      <Bone className="h-3 w-4/5 rounded-full" />
    </div>
  )
}

/** Cartão de cliente (<UserBox>): avatar + 2 linhas. */
export function SkeletonPersonCard() {
  return (
    <div className="flex items-center gap-3 p-3.5 bg-surface border border-line rounded-xl shadow-sm">
      <Bone className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex justify-between">
          <Bone className="h-3.5 w-36 rounded-full" />
          <Bone className="h-2.5 w-14 rounded-full" />
        </div>
        <Bone className="h-3 w-48 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 5, variant = "order" }: { count?: number; variant?: "order" | "person" }) {
  const Item = variant === "order" ? SkeletonOrderCard : SkeletonPersonCard
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </div>
  )
}

/** Tabela no formato do <DataTable>. `cols` = larguras relativas das colunas. */
export function SkeletonTable({ rows = 8, cols = [3, 2, 2, 1.5, 1] }: { rows?: number; cols?: number[] }) {
  const template = cols.map((c) => `${c}fr`).join(" ")
  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm overflow-hidden">
      <div className="grid gap-4 px-3 py-3 border-b border-line" style={{ gridTemplateColumns: template }}>
        {cols.map((_, i) => (
          <Bone key={i} className="h-2.5 w-2/3 rounded-full" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 px-3 py-3.5 border-t border-line first:border-t-0" style={{ gridTemplateColumns: template }}>
          {cols.map((_, c) => (
            <Bone key={c} className={cn("h-3 rounded-full", c === 0 ? "w-4/5" : (r + c) % 3 === 0 ? "w-1/2" : "w-2/3")} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Campo de formulário: rótulo + input (h-9). */
export function SkeletonField({ className, tall }: { className?: string; tall?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Bone className="h-3 w-24 rounded-full" />
      <Bone className={cn("w-full rounded-lg", tall ? "h-20" : "h-9")} />
    </div>
  )
}

/** Formulário em grade dentro de um cartão. */
export function SkeletonForm({ fields = 6, columns = 2, title = true, className }: { fields?: number; columns?: 1 | 2 | 3; title?: boolean; className?: string }) {
  const grid = columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"
  return (
    <div className={cn("bg-surface border border-line rounded-xl shadow-sm p-5 flex flex-col gap-5", className)}>
      {title && <Bone className="h-4 w-44 rounded-full" />}
      <div className={cn("grid gap-3", grid)}>
        {Array.from({ length: fields }).map((_, i) => (
          <SkeletonField key={i} />
        ))}
      </div>
      <div className="flex justify-end">
        <Bone className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  )
}
