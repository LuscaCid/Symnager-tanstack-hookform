import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  FilePlus2,
  MessageSquare,
  Pencil,
  Printer,
  Send,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { FormEvent, useState } from "react"
import type { Order, OrderHistory, OrderStatus } from "@/@types/api"
import { Button, EmptyState, StatusBadge, TextAreaField } from "@/components/ui"
import { formatDateTime, formatRelative } from "@/lib/format"
import { ordersService } from "@/services/resources"

const ICONS: Record<OrderHistory["type"], LucideIcon> = {
  CREATED: FilePlus2,
  STATUS: ArrowRight,
  COMMENT: MessageSquare,
  ITEM: Boxes,
  PAYMENT: Wallet,
  FAILURE: AlertTriangle,
  UPDATE: Pencil,
  PRINT: Printer,
}

const LABELS: Record<OrderHistory["type"], string> = {
  CREATED: "OS criada",
  STATUS: "Status alterado",
  COMMENT: "Comentário",
  ITEM: "Itens",
  PAYMENT: "Pagamento",
  FAILURE: "Falha registrada",
  UPDATE: "Dados alterados",
  PRINT: "Impressão",
}

export function OrderHistoryTab({ order }: { order: Order }) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState("")
  const history = [...(order.history ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))

  const comment = useMutation({
    mutationFn: () => ordersService.comment(order.order_id, message.trim()),
    onSuccess: () => {
      setMessage("")
      queryClient.invalidateQueries({ queryKey: ["order", order.order_id] })
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (message.trim()) comment.mutate()
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <TextAreaField
          label="Adicionar comentário"
          hideLabel
          placeholder="Registre um contato com o cliente, uma observação técnica..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(e)
          }}
          className="min-h-16"
        />
        <Button type="submit" size="sm" icon={Send} loading={comment.isPending} disabled={!message.trim()} className="self-end">
          Comentar
        </Button>
      </form>

      {history.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Sem eventos ainda" />
      ) : (
        <ol className="relative flex flex-col gap-3 pl-5 before:absolute before:left-[9px] before:top-1 before:bottom-1 before:w-px before:bg-subtle ">
          {history.map((h) => {
            const Icon = ICONS[h.type] ?? MessageSquare
            return (
              <li key={h.history_id} className="relative">
                <span className="absolute -left-5 top-0 w-5 h-5 flex items-center justify-center rounded-full border border-line bg-app ">
                  <Icon size={11} />
                </span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <strong>{LABELS[h.type] ?? h.type}</strong>
                  {h.type === "STATUS" && h.to_status && (
                    <span className="inline-flex items-center gap-1">
                      {h.from_status && <StatusBadge status={h.from_status as OrderStatus} />}
                      <ArrowRight size={12} />
                      <StatusBadge status={h.to_status as OrderStatus} />
                    </span>
                  )}
                  <span className="text-xs text-faint" title={formatDateTime(h.created_at)}>
                    {formatRelative(h.created_at)}
                    {h.user && ` · ${h.user.name}`}
                  </span>
                </div>
                {h.message && <p className="text-sm text-fg whitespace-pre-wrap mt-0.5">{h.message}</p>}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
