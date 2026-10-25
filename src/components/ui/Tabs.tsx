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
    <div role="tablist" className={cn("shrink-0 flex gap-1 overflow-x-auto border-b border-zinc-300 dark:border-zinc-800 px-2", className)}>
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
                "flex items-center gap-1 px-3 py-1.5 -mb-px text-sm font-semibold whitespace-nowrap border-b-2 transition duration-200",
                active
                  ? "border-zinc-950 dark:border-zinc-200"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200",
              )}
            >
              {Icon && <Icon size={16} />} {t.label}
            </button>
          )
        })}
    </div>
  )
}
