import { cn } from "@/lib/cn"

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(bytes / 1024, 0).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MB`
  return `${(bytes / 1024 ** 3).toFixed(2).replace(".", ",")} GB`
}

/** Barra de consumo discreta: valor / limite (limite null = ilimitado). */
export function UsageBar({
  label,
  value,
  limit,
  format = String,
}: {
  label: string
  value: number
  limit: number | null
  format?: (n: number) => string
}) {
  const ratio = limit ? Math.min(value / limit, 1) : 0
  const tone = ratio >= 0.9 ? "bg-danger" : ratio >= 0.75 ? "bg-warning" : "bg-accent"
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-2 text-[13px]">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          {format(value)} <span className="text-faint">/ {limit === null ? "ilimitado" : format(limit)}</span>
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit ?? undefined}
        aria-valuenow={value}
        className="h-1.5 rounded-full bg-subtle overflow-hidden"
      >
        {limit !== null && (
          <div className={cn("h-full rounded-full transition-[width] duration-300", tone)} style={{ width: `${ratio * 100}%` }} />
        )}
      </div>
    </div>
  )
}

/** As três barras do plano em nuvem (usuários, OS do mês, armazenamento). */
export function CloudUsageBars({
  usage,
  limits,
}: {
  usage: { users: number; orders_month: number; storage_bytes: number }
  limits: { max_users: number | null; max_orders_month: number | null; storage_mb: number | null }
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <UsageBar label="Usuários" value={usage.users} limit={limits.max_users} />
      <UsageBar label="OS neste mês" value={usage.orders_month} limit={limits.max_orders_month} />
      <UsageBar
        label="Armazenamento"
        value={usage.storage_bytes}
        limit={limits.storage_mb === null ? null : limits.storage_mb * 1024 * 1024}
        format={formatBytes}
      />
    </div>
  )
}
