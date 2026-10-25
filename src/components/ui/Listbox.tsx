import { Check, Plus, Search } from "lucide-react"
import { KeyboardEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/cn"

export interface ListOption {
  value: string
  label: string
  disabled?: boolean
  hint?: string
}

export const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")

interface ListboxProps {
  options: ListOption[]
  isSelected: (value: string) => boolean
  onSelect: (value: string) => void
  searchable?: boolean
  searchPlaceholder?: string
  /** permite criar um valor com o texto digitado ("Usar “xyz”") */
  onCreate?: (text: string) => void
  emptyText?: string
  footer?: ReactNode
}

/**
 * Lista de opções do Select/Combobox: busca sem acento, navegação por setas, Enter, Home/End,
 * digitação rápida (sem busca) e rolagem até o item ativo.
 */
export function Listbox({ options, isSelected, onSelect, searchable, searchPlaceholder = "Buscar...", onCreate, emptyText = "Nenhuma opção", footer }: ListboxProps) {
  const [query, setQuery] = useState("")
  const listRef = useRef<HTMLUListElement>(null)
  const typeahead = useRef({ text: "", at: 0 })

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim())
    return q ? options.filter((o) => normalizeText(o.label).includes(q)) : options
  }, [options, query])

  const trimmed = query.trim()
  const canCreate = !!onCreate && !!trimmed && !options.some((o) => normalizeText(o.label) === normalizeText(trimmed))
  const items = useMemo(
    () => [...filtered, ...(canCreate ? [{ value: `__create__${trimmed}`, label: trimmed }] : [])],
    [filtered, canCreate, trimmed],
  )

  const firstSelected = items.findIndex((o) => isSelected(o.value))
  const [active, setActive] = useState(() => Math.max(firstSelected, 0))

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [active])

  function choose(index: number) {
    const item = items[index]
    if (!item || item.disabled) return
    if (item.value.startsWith("__create__")) onCreate?.(item.label)
    else onSelect(item.value)
  }

  function move(delta: number) {
    if (items.length === 0) return
    let next = active
    for (let i = 0; i < items.length; i++) {
      next = (next + delta + items.length) % items.length
      if (!items[next].disabled) break
    }
    setActive(next)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") move(1)
    else if (e.key === "ArrowUp") move(-1)
    else if (e.key === "Home") setActive(0)
    else if (e.key === "End") setActive(items.length - 1)
    else if (e.key === "Enter") choose(active)
    else if (!searchable && e.key.length === 1) {
      // digitação rápida: pula para a opção que começa com as letras digitadas
      const now = Date.now()
      typeahead.current.text = now - typeahead.current.at > 700 ? e.key : typeahead.current.text + e.key
      typeahead.current.at = now
      const idx = items.findIndex((o) => normalizeText(o.label).startsWith(normalizeText(typeahead.current.text)))
      if (idx >= 0) setActive(idx)
      return
    } else return
    e.preventDefault()
  }

  return (
    <div className="flex flex-col max-h-[min(320px,var(--radix-popover-content-available-height))]" onKeyDown={handleKeyDown}>
      {searchable && (
        <div className="relative p-1.5 border-b border-line">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full h-8 pl-8 pr-2 rounded-md bg-subtle text-sm placeholder:text-faint focus:outline-none"
          />
        </div>
      )}
      <ul
        ref={listRef}
        role="listbox"
        tabIndex={searchable ? -1 : 0}
        autoFocus={!searchable}
        aria-activedescendant={items[active] ? `opt-${active}` : undefined}
        className="flex-1 min-h-0 overflow-y-auto p-1 focus:outline-none"
      >
        {items.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-faint">{emptyText}</li>}
        {items.map((option, index) => {
          const creating = option.value.startsWith("__create__")
          const selected = !creating && isSelected(option.value)
          return (
            <li
              key={option.value}
              id={`opt-${index}`}
              data-index={index}
              role="option"
              aria-selected={selected}
              aria-disabled={option.disabled}
              onMouseMove={() => active !== index && setActive(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(index)}
              className={cn(
                "flex items-center gap-2 px-2.5 h-8 rounded-md text-sm cursor-pointer select-none",
                index === active && "bg-hover",
                selected && "font-medium",
                option.disabled && "opacity-40 cursor-not-allowed",
              )}
            >
              {creating ? (
                <>
                  <Plus size={14} className="shrink-0 text-accent" />
                  <span className="truncate">
                    Usar “<strong className="font-medium">{option.label}</strong>”
                  </span>
                </>
              ) : (
                <>
                  <span className={cn("flex-1 truncate", !option.value && "text-muted")}>{option.label}</span>
                  {option.hint && <span className="text-xs text-faint truncate">{option.hint}</span>}
                  <Check size={14} className={cn("shrink-0 text-accent", !selected && "invisible")} />
                </>
              )}
            </li>
          )
        })}
      </ul>
      {footer}
    </div>
  )
}
