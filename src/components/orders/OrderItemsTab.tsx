import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Boxes, Plus, Trash2, Wrench, X } from "lucide-react"
import { FormEvent, useState } from "react"
import type { ItemInput, Order, OrderItem } from "@/@types/api"
import { Button, EmptyState, IconButton, inputClass, Panel, TextField } from "@/components/ui"
import { cn } from "@/lib/cn"
import { formatMoney } from "@/lib/format"
import { ordersService } from "@/services/resources"
import { ItemPicker, PickedItem } from "./ItemPicker"
import { balanceOf, parseDecimal } from "./orderUtils"

type Kind = "SERVICE" | "PRODUCT"

function useOrderInvalidate(orderId: number) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ["order", orderId] })
    queryClient.invalidateQueries({ queryKey: ["orders"] })
    queryClient.invalidateQueries({ queryKey: ["history"] })
    queryClient.invalidateQueries({ queryKey: ["products"] })
  }
}

/** Campo numérico que só envia ao sair (blur/Enter) e se o valor mudou. */
function InlineNumber({
  value,
  onCommit,
  label,
  money,
  disabled,
}: {
  value: number
  onCommit: (n: number) => void
  label: string
  money?: boolean
  disabled?: boolean
}) {
  const format = (n: number) => (money ? n.toFixed(2).replace(".", ",") : String(n))
  const [text, setText] = useState(format(value))
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setText(format(value))
  }
  function commit() {
    const n = parseDecimal(text)
    if (n <= 0 && !money) {
      setText(format(value))
      return
    }
    if (n !== value) onCommit(n)
  }
  return (
    <input
      aria-label={label}
      value={text}
      disabled={disabled}
      inputMode="decimal"
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      className={cn(inputClass, "w-20 text-right tabular-nums py-0.5", money && "w-24")}
    />
  )
}

function ItemRow({ order, item, readOnly }: { order: Order; item: OrderItem; readOnly?: boolean }) {
  const invalidate = useOrderInvalidate(order.order_id)
  const update = useMutation({
    mutationFn: (data: Partial<ItemInput>) => ordersService.updateItem(order.order_id, item.item_id, data),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: () => ordersService.removeItem(order.order_id, item.item_id),
    onSuccess: invalidate,
  })
  const Icon = item.kind === "SERVICE" ? Wrench : Boxes
  return (
    <tr className="border-t border-zinc-300 dark:border-zinc-800">
      <td className="px-2 py-1">
        <span className="flex items-center gap-1 min-w-0">
          <Icon size={14} className="shrink-0 text-zinc-500" aria-label={item.kind === "SERVICE" ? "Serviço" : "Produto"} />
          <span className="truncate">{item.description}</span>
        </span>
      </td>
      <td className="px-2 py-1 text-right">
        {readOnly ? item.quantity : <InlineNumber label="Quantidade" value={item.quantity} onCommit={(quantity) => update.mutate({ quantity })} disabled={update.isPending} />}
      </td>
      <td className="px-2 py-1 text-right">
        {readOnly ? (
          formatMoney(item.unit_price)
        ) : (
          <InlineNumber label="Valor unitário" money value={item.unit_price} onCommit={(unit_price) => update.mutate({ unit_price })} disabled={update.isPending} />
        )}
      </td>
      <td className="px-2 py-1 text-right tabular-nums whitespace-nowrap font-semibold">{formatMoney(item.total)}</td>
      <td className="px-1 py-1 w-8">
        {!readOnly && <IconButton icon={Trash2} label="Remover item" tone="danger" disabled={remove.isPending} onClick={() => remove.mutate()} />}
      </td>
    </tr>
  )
}

function AddItemForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const invalidate = useOrderInvalidate(order.order_id)
  const [kind, setKind] = useState<Kind>("SERVICE")
  const [picked, setPicked] = useState<PickedItem | null>(null)
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [price, setPrice] = useState("")

  const add = useMutation({
    mutationFn: (item: ItemInput) => ordersService.addItem(order.order_id, item),
    onSuccess: () => {
      invalidate()
      setPicked(null)
      setDescription("")
      setQuantity("1")
      setPrice("")
    },
  })

  function handlePick(item: PickedItem) {
    setPicked(item)
    setDescription(item.name)
    setPrice(item.price.toFixed(2).replace(".", ","))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const qty = parseDecimal(quantity)
    if (!description.trim() || qty <= 0) return
    add.mutate({
      kind,
      service_id: picked?.kind === "SERVICE" ? picked.id : undefined,
      product_id: picked?.kind === "PRODUCT" ? picked.id : undefined,
      description: description.trim(),
      quantity: qty,
      unit_price: price ? parseDecimal(price) : undefined,
    })
  }

  const lowStock = picked?.kind === "PRODUCT" && picked.stock !== undefined && picked.stock < parseDecimal(quantity)

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border border-zinc-300 dark:border-zinc-800 rounded-md p-2">
      <div className="flex items-center gap-1" role="group" aria-label="Tipo de item">
        {(["SERVICE", "PRODUCT"] as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k)
              setPicked(null)
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-sm rounded-md border transition duration-200",
              kind === k
                ? "border-zinc-950 dark:border-zinc-200 bg-zinc-200 dark:bg-zinc-800 font-semibold"
                : "border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800/80",
            )}
          >
            {k === "SERVICE" ? <Wrench size={14} /> : <Boxes size={14} />} {k === "SERVICE" ? "Serviço" : "Produto / peça"}
          </button>
        ))}
        <IconButton icon={X} label="Fechar" className="ml-auto" onClick={onDone} />
      </div>
      <ItemPicker kind={kind} onPick={handlePick} />
      <div className="grid grid-cols-[1fr_5rem_7rem] gap-2 items-end">
        <TextField
          label={picked ? "Descrição (do catálogo)" : "Descrição (item avulso)"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex.: Troca de tela"
        />
        <TextField label="Qtd." inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <TextField
          label="Valor unit."
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={picked ? "do catálogo" : "0,00"}
        />
      </div>
      {lowStock && <p className="text-xs text-amber-600 dark:text-amber-400">Estoque atual ({picked?.stock}) menor que a quantidade.</p>}
      {picked?.kind === "PRODUCT" && <p className="text-xs text-zinc-500">A peça é baixada do estoque ao adicionar e devolvida se o item for removido.</p>}
      <Button type="submit" size="sm" variant="primary" icon={Plus} loading={add.isPending} disabled={!description.trim()}>
        Adicionar item
      </Button>
    </form>
  )
}

function TotalsRow({ label, value, strong, tone }: { label: string; value: number; strong?: boolean; tone?: "danger" | "success" }) {
  return (
    <div className={cn("flex justify-between gap-2", strong && "font-bold text-base")}>
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className={cn("tabular-nums", tone === "danger" && "text-red-500", tone === "success" && "text-green-600 dark:text-green-400")}>
        {formatMoney(value)}
      </span>
    </div>
  )
}

export function OrderTotals({ order }: { order: Order }) {
  const balance = balanceOf(order)
  return (
    <div className="flex flex-col gap-1 text-sm border border-zinc-300 dark:border-zinc-800 rounded-md p-2">
      <TotalsRow label="Serviços" value={order.total_services} />
      <TotalsRow label="Produtos" value={order.total_products} />
      {order.discount > 0 && <TotalsRow label="Desconto" value={-order.discount} />}
      <div className="border-t border-zinc-300 dark:border-zinc-800 my-1" />
      <TotalsRow label="Total" value={order.total} strong />
      <TotalsRow label="Pago" value={order.paid} tone={order.paid > 0 ? "success" : undefined} />
      <TotalsRow label="Saldo" value={balance} strong tone={balance > 0 ? "danger" : "success"} />
    </div>
  )
}

export function OrderItemsTab({ order, readOnly }: { order: Order; readOnly?: boolean }) {
  const items = order.items ?? []
  const [adding, setAdding] = useState(items.length === 0)

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && (adding ? <AddItemForm order={order} onDone={() => setAdding(false)} /> : (
        <Button size="sm" icon={Plus} onClick={() => setAdding(true)} className="self-start">
          Adicionar serviço ou peça
        </Button>
      ))}
      <Panel title="Itens da OS" bodyClassName="p-0">
        {items.length === 0 ? (
          <EmptyState icon={Wrench} title="Nenhum item lançado" description="Adicione serviços e peças para compor o orçamento." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="px-2 py-1 font-semibold">Descrição</th>
                  <th className="px-2 py-1 font-semibold text-right">Qtd.</th>
                  <th className="px-2 py-1 font-semibold text-right">Unitário</th>
                  <th className="px-2 py-1 font-semibold text-right">Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <ItemRow key={item.item_id} order={order} item={item} readOnly={readOnly} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <OrderTotals order={order} />
    </div>
  )
}
