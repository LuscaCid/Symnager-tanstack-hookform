import { Check, ClipboardCheck, Minus, X } from "lucide-react"
import type { ChecklistEntry } from "@/@types/api"
import { useLookups } from "@/lib/hooks"
import { cn } from "@/lib/cn"

interface ChecklistEditorProps {
  value: ChecklistEntry[]
  onChange: (value: ChecklistEntry[]) => void
  disabled?: boolean
}

const STATES: { ok: boolean | null; label: string; icon: typeof Check; active: string }[] = [
  { ok: true, label: "Conforme", icon: Check, active: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/40" },
  { ok: false, label: "Com problema", icon: X, active: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40" },
  { ok: null, label: "Não verificado", icon: Minus, active: "bg-zinc-500/15 border-zinc-500/40" },
]

/**
 * Junta os itens já salvos na OS com os itens do cadastro auxiliar CHECKLIST,
 * preservando respostas antigas mesmo se o item foi removido do cadastro.
 */
export function mergeChecklist(saved: ChecklistEntry[] | null | undefined, catalog: string[]) {
  const map = new Map((saved ?? []).map((e) => [e.item, e]))
  const merged = catalog.map((item) => map.get(item) ?? { item, ok: null })
  for (const entry of saved ?? []) if (!catalog.includes(entry.item)) merged.push(entry)
  return merged
}

/** Checklist de entrada do equipamento: cada item marcado como conforme / problema / não verificado. */
export function ChecklistEditor({ value, onChange, disabled }: ChecklistEditorProps) {
  const lookups = useLookups("CHECKLIST")
  const entries = mergeChecklist(value, (lookups.data ?? []).map((l) => l.name))

  if (entries.length === 0) {
    return (
      <p className="text-xs text-zinc-500 flex items-center gap-1">
        <ClipboardCheck size={14} /> Cadastre os itens em Cadastros auxiliares → Checklist de entrada.
      </p>
    )
  }

  function set(item: string, ok: boolean | null) {
    onChange(entries.map((e) => (e.item === item ? { ...e, ok } : e)))
  }

  return (
    <ul className="flex flex-col gap-1">
      {entries.map((entry) => (
        <li key={entry.item} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate">{entry.item}</span>
          <div role="radiogroup" aria-label={entry.item} className="flex gap-1 shrink-0">
            {STATES.map(({ ok, label, icon: Icon, active }) => (
              <button
                key={String(ok)}
                type="button"
                role="radio"
                aria-checked={entry.ok === ok}
                aria-label={label}
                title={label}
                disabled={disabled}
                onClick={() => set(entry.item, ok)}
                className={cn(
                  "p-1 rounded-md border transition duration-200 disabled:cursor-not-allowed",
                  entry.ok === ok ? active : "border-zinc-300 dark:border-zinc-800 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800/80",
                )}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Remove itens não respondidos para não poluir a OS. */
export const answeredOnly = (entries: ChecklistEntry[]) => entries.filter((e) => e.ok !== null || e.note)
