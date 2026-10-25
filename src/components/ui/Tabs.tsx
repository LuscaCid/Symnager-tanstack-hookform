import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/cn"

export interface TabItem<K extends string> {
  key: K
  label: string
  icon?: LucideIcon
  hidden?: boolean
}

export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem<K>[]
  value: K
  onChange: (key: K) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn("shrink-0 flex gap-4 overflow-x-auto border-b border-line px-4", className)}>
      {tabs
        .filter((t) => !t.hidden)
        .map((t) => {
          const Icon = t.icon
          const active = t.key === value
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              className={cn(
                "flex items-center gap-1.5 py-2.5 -mb-px text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors duration-150",
                active
                  ? "border-accent text-fg"
                  : "border-transparent text-muted hover:text-fg",
              )}
            >
              {Icon && <Icon size={15} />} {t.label}
            </button>
          )
        })}
    </div>
  )
}
