import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import type { Order, OrderStatus } from "@/@types/api"
import { ConfirmDialog, TextAreaField } from "@/components/ui"
import { useHasRole } from "@/contexts/Auth-context"
import { formatMoney, formatOrderNumber, STATUS_LABEL } from "@/lib/format"
import { ordersService } from "@/services/resources"
import { balanceOf, isFinal } from "./orderUtils"

type BoardData = Partial<Record<OrderStatus, Order[]>>

interface Pending {
  order: Order
  status: OrderStatus
  reason: "balance" | "cancel" | "reopen"
}

/** Troca de status com as regras de negócio: aviso de saldo ao entregar, motivo ao cancelar, reabertura só para ADMIN. */
export function useStatusChange() {
  const queryClient = useQueryClient()
  const isAdmin = useHasRole()
  const [pending, setPending] = useState<Pending | null>(null)
  const [message, setMessage] = useState("")

  const mutation = useMutation({
    mutationFn: ({ order, status, note }: { order: Order; status: OrderStatus; note?: string }) =>
      ordersService.setStatus(order.order_id, status, note),
    // atualização otimista do quadro: o cartão muda de coluna na hora
    onMutate: async ({ order, status }) => {
      await queryClient.cancelQueries({ queryKey: ["orders", "board"] })
      const previous = queryClient.getQueryData<BoardData>(["orders", "board"])
      if (previous) {
        const next: BoardData = {}
        for (const [key, list] of Object.entries(previous) as [OrderStatus, Order[]][]) {
          next[key] = list.filter((o) => o.order_id !== order.order_id)
        }
        next[status] = [{ ...order, status }, ...(next[status] ?? [])]
        queryClient.setQueryData(["orders", "board"], next)
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["orders", "board"], ctx.previous)
    },
    onSuccess: (_data, { order, status }) => {
      toast.success(`${formatOrderNumber(order.number)} → ${STATUS_LABEL[status]}`)
    },
    onSettled: (_data, _err, { order }) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["order", order.order_id] })
      queryClient.invalidateQueries({ queryKey: ["history"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
  })

  function request(order: Order, status: OrderStatus) {
    if (order.status === status) return
    if (isFinal(order.status)) {
      if (!isAdmin) {
        toast.error("Apenas administradores podem reabrir uma OS entregue ou cancelada.")
        return
      }
      setPending({ order, status: "ABERTA", reason: "reopen" })
      return
    }
    if (status === "ENTREGUE" && balanceOf(order) > 0) {
      setPending({ order, status, reason: "balance" })
      return
    }
    if (status === "CANCELADA") {
      setPending({ order, status, reason: "cancel" })
      return
    }
    mutation.mutate({ order, status })
  }

  function close() {
    setPending(null)
    setMessage("")
  }

  const titles = {
    balance: "Entregar com saldo em aberto?",
    cancel: "Cancelar ordem de serviço?",
    reopen: "Reabrir ordem de serviço?",
  }

  const dialog = (
    <ConfirmDialog
      open={!!pending}
      onOpenChange={(o) => !o && close()}
      title={pending ? titles[pending.reason] : ""}
      tone={pending?.reason === "reopen" ? "default" : "danger"}
      confirmLabel={pending?.reason === "balance" ? "Entregar mesmo assim" : pending?.reason === "cancel" ? "Cancelar OS" : "Reabrir"}
      loading={mutation.isPending}
      description={
        pending && (
          <div className="flex flex-col gap-2">
            {pending.reason === "balance" && (
              <p>
                Ainda falta receber <strong>{formatMoney(balanceOf(pending.order))}</strong> de{" "}
                {formatOrderNumber(pending.order.number)}. Registre o pagamento antes ou confirme a entrega assim mesmo.
              </p>
            )}
            {pending.reason === "cancel" && <p>A OS sai do fluxo de atendimento. Informe o motivo para o histórico.</p>}
            {pending.reason === "reopen" && (
              <p>
                {formatOrderNumber(pending.order.number)} voltará para <strong>Aberta</strong>.
              </p>
            )}
            <TextAreaField
              label={pending.reason === "cancel" ? "Motivo do cancelamento" : "Observação (opcional)"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-16"
            />
          </div>
        )
      }
      onConfirm={() => {
        if (!pending) return
        if (pending.reason === "cancel" && !message.trim()) {
          toast.error("Informe o motivo do cancelamento.")
          return
        }
        mutation.mutate({ order: pending.order, status: pending.status, note: message.trim() || undefined }, { onSuccess: close })
      }}
    />
  )

  return { request, dialog, isPending: mutation.isPending }
}
