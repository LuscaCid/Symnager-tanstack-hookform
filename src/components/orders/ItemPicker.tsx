import { useQuery } from "@tanstack/react-query"
import { Loader, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { inputClass } from "@/components/ui"
import { cn } from "@/lib/cn"
import { formatMoney, formatNumber } from "@/lib/format"
import { useDebounce } from "@/lib/hooks"
import { productsService, servicesService } from "@/services/resources"

export interface PickedItem {
  kind: "SERVICE" | "PRODUCT"
  id: number
  name: string
  price: number
  stock?: number
}

/** Busca no catálogo de serviços ou produtos com lista suspensa navegável pelo teclado. */
export function ItemPicker({ kind, onPick }: { kind: "SERVICE" | "PRODUCT"; onPick: (item: PickedItem) => void }) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const q = useDebounce(query.trim(), 250)
  const boxRef = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useQuery({
    queryKey: [kind === "SERVICE" ? "services" : "products", "picker", q],
    queryFn: async (): Promise<PickedItem[]> => {
      if (kind === "SERVICE") {
        const res = await servicesService.list({ q, active: true, page_size: 15 })
        return res.data.map((s) => ({ kind, id: s.service_id, name: s.name, price: s.price }))
      }
      const res = await productsService.list({ q, active: true, page_size: 15 })
      return res.data.map((p) => ({ kind, id: p.product_id, name: p.sku ? `${p.name} (${p.sku})` : p.name, price: p.sale_price, stock: p.stock }))
    },
    enabled: open,
  })
  const results = data ?? []

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  useEffect(() => setActive(0), [q, kind])

  function pick(item: PickedItem | undefined) {
    if (!item) return
    onPick(item)
    setQuery("")
    setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
            setActive((i) => Math.min(i + 1, results.length - 1))
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === "Enter") {
            e.preventDefault()
            pick(results[active])
          } else if (e.key === "Escape") setOpen(false)
        }}
        role="combobox"
        aria-expanded={open}
        aria-label={kind === "SERVICE" ? "Buscar serviço" : "Buscar produto"}
        placeholder={kind === "SERVICE" ? "Buscar serviço do catálogo..." : "Buscar produto / peça..."}
        className={cn(inputClass, "pl-7")}
      />
      {isFetching && <Loader size={14} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin" />}
      {open && (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-xl p-1"
        >
          {results.length === 0 && (
            <li className="p-2 text-sm text-zinc-500">{isFetching ? "Buscando..." : "Nada encontrado no catálogo."}</li>
          )}
          {results.map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(item)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-2 py-1 rounded-sm text-sm text-left",
                  i === active && "bg-zinc-200 dark:bg-zinc-800/80",
                )}
              >
                <span className="truncate">{item.name}</span>
                <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                  {item.stock !== undefined && (
                    <span className={cn("mr-2", item.stock <= 0 && "text-red-500")}>est. {formatNumber(item.stock)}</span>
                  )}
                  {formatMoney(item.price)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
