import * as Dialog from "@radix-ui/react-dialog"
import { useQuery } from "@tanstack/react-query"
import { ClipboardList, CornerDownLeft, Plus, Search, User } from "lucide-react"
import { KeyboardEvent, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { NAVIGATION } from "./navigation"
import { useDebounce } from "@/lib/hooks"
import { clientsService, ordersService } from "@/services/resources"
import { useCurrentUser } from "@/contexts/Auth-context"
import { formatOrderNumber } from "@/lib/format"
import { useSegment } from "@/lib/segment"
import { cn } from "@/lib/cn"
import type { LucideIcon } from "lucide-react"

interface Entry {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  to: string
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")

/** Busca global (Ctrl+K): navegação, ordens de serviço e clientes. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const { statusLabel } = useSegment()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const debounced = useDebounce(query.trim(), 250)
  const enabled = open && debounced.length >= 2

  const orders = useQuery({
    queryKey: ["palette", "orders", debounced],
    queryFn: () => ordersService.list({ q: debounced, page_size: 5 }),
    enabled,
  })
  const clients = useQuery({
    queryKey: ["palette", "clients", debounced],
    queryFn: () => clientsService.list({ q: debounced, page_size: 5 }),
    enabled,
  })

  const entries = useMemo<Entry[]>(() => {
    const q = normalize(query.trim())
    const nav: Entry[] = [
      { id: "new-order", label: "Nova ordem de serviço", icon: Plus, to: "/recepcao", hint: "ação" },
      ...NAVIGATION.flatMap((g) =>
        g.items
          .filter((i) => !i.roles || (user && i.roles.includes(user.role)))
          .map((i) => ({ id: i.to, label: i.label, icon: i.icon, to: i.to, hint: g.title, keywords: i.keywords })),
      ),
    ].filter((e) => !q || normalize(`${e.label} ${(e as { keywords?: string }).keywords ?? ""}`).includes(q))

    const orderEntries: Entry[] = (orders.data?.data ?? []).map((o) => ({
      id: `o${o.order_id}`,
      label: `${formatOrderNumber(o.number)} · ${o.device}`,
      hint: `${o.owner?.name ?? ""} · ${statusLabel(o.status)}`,
      icon: ClipboardList,
      to: `/ordens/${o.order_id}`,
    }))
    const clientEntries: Entry[] = (clients.data?.data ?? []).map((c) => ({
      id: `c${c.client_id}`,
      label: c.name,
      hint: c.phone,
      icon: User,
      to: `/clientes/${c.client_id}`,
    }))
    return [...orderEntries, ...clientEntries, ...nav]
  }, [query, orders.data, clients.data, user, statusLabel])

  function go(entry: Entry | undefined) {
    if (!entry) return
    navigate(entry.to)
    onOpenChange(false)
    setQuery("")
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, entries.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      go(entries[active])
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setQuery("")
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35" />
        <Dialog.Content className="fixed z-50 top-[15vh] left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-xl rounded-xl border border-line bg-surface shadow-2xl text-fg overflow-hidden">
          <Dialog.Title className="sr-only">Busca global</Dialog.Title>
          <Dialog.Description className="sr-only">Pesquise telas, ordens de serviço e clientes</Dialog.Description>
          <div className="flex items-center gap-2 px-3 border-b border-line ">
            <Search size={18} className="text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar OS, cliente ou tela..."
              aria-label="Buscar"
              className="flex-1 bg-transparent py-3 focus:outline-none"
            />
            <kbd className="text-xs text-faint border border-line rounded px-1">Esc</kbd>
          </div>
          <ul role="listbox" className="max-h-80 overflow-y-auto p-1">
            {entries.length === 0 && <li className="p-3 text-sm text-faint">Nada encontrado.</li>}
            {entries.map((entry, index) => {
              const Icon = entry.icon
              return (
                <li key={entry.id} role="option" aria-selected={index === active}>
                  <button
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(entry)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition duration-100",
                      index === active && "bg-hover",
                    )}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 truncate">{entry.label}</span>
                    {entry.hint && <span className="text-xs text-faint truncate max-w-[40%]">{entry.hint}</span>}
                    {index === active && <CornerDownLeft size={14} className="text-faint" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
