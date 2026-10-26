import { CalendarCheck } from "lucide-react"
import { Tooltip } from "@/components/ui"
import { cn } from "@/lib/cn"
import { formatDate, formatDateTime } from "@/lib/format"

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** "Hoje 14:00", "Amanhã 09:30" ou "26/10 14:00". */
export function visitText(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  const time = formatDate(d, "HH:mm")
  if (sameDay(d, today)) return `Hoje ${time}`
  if (sameDay(d, tomorrow)) return `Amanhã ${time}`
  return formatDate(d, "dd/MM HH:mm")
}

/** Data/hora da visita agendada (destaque quando é hoje). */
export function VisitChip({ iso, address, className }: { iso: string; address?: string | null; className?: string }) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  const isToday = sameDay(d, now)
  const past = d.getTime() < now.getTime() && !isToday
  return (
    <Tooltip content={[`Visita: ${formatDateTime(iso)}`, address].filter(Boolean).join(" · ")}>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs rounded-md px-1.5 py-0.5",
          isToday ? "bg-accent-soft text-accent font-medium" : past ? "text-faint" : "text-muted bg-subtle",
          className,
        )}
      >
        <CalendarCheck size={12} /> {visitText(iso)}
      </span>
    </Tooltip>
  )
}
