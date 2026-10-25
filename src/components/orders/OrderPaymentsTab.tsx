import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, Wallet } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import type { Order, Payment } from "@/@types/api"
import { Button, ConfirmDialog, EmptyState, IconButton, Panel, SelectField, TextField } from "@/components/ui"
import { useHasRole } from "@/contexts/Auth-context"
import { formatDateTime, formatMoney, toDateInput } from "@/lib/format"
import { useLookups } from "@/lib/hooks"
import { ordersService } from "@/services/resources"
import { OrderTotals } from "./OrderItemsTab"
import { balanceOf, parseDecimal } from "./orderUtils"

export function OrderPaymentsTab({ order, readOnly }: { order: Order; readOnly?: boolean }) {
  const queryClient = useQueryClient()
  const methods = useLookups("PAYMENT_METHOD")
  const canManage = useHasRole("ATENDENTE")
  const balance = balanceOf(order)
  const [method, setMethod] = useState("")
  const [amount, setAmount] = useState("")
  const [paidAt, setPaidAt] = useState(toDateInput(new Date()))
  const [notes, setNotes] = useState("")
  const [toRemove, setToRemove] = useState<Payment | null>(null)

  useEffect(() => {
    if (!method && methods.data?.length) setMethod(methods.data[0].name)
  }, [methods.data, method])

  useEffect(() => {
    setAmount(balance > 0 ? balance.toFixed(2).replace(".", ",") : "")
  }, [balance])

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["order", order.order_id] })
    queryClient.invalidateQueries({ queryKey: ["orders"] })
    queryClient.invalidateQueries({ queryKey: ["dashboard"] })
  }

  const add = useMutation({
    mutationFn: () =>
      ordersService.addPayment(order.order_id, {
        method,
        amount: parseDecimal(amount),
        // meio-dia local evita que o fuso desloque o dia escolhido
        paid_at: paidAt ? new Date(`${paidAt}T12:00:00`).toISOString() : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setNotes("")
      invalidate()
    },
  })

  const remove = useMutation({
    mutationFn: (p: Payment) => ordersService.removePayment(order.order_id, p.payment_id),
    onSuccess: () => {
      setToRemove(null)
      invalidate()
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!method || parseDecimal(amount) <= 0) return
    add.mutate()
  }

  const payments = order.payments ?? []

  return (
    <div className="flex flex-col gap-2">
      <OrderTotals order={order} />
      {!readOnly && canManage && (
        <form onSubmit={submit} className="flex flex-col gap-2 border border-line rounded-md p-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <SelectField label="Forma de pagamento" value={method} onChange={(e) => setMethod(e.target.value)}>
              {methods.data?.length === 0 && <option value="">Cadastre em Cadastros auxiliares</option>}
              {methods.data?.map((m) => (
                <option key={m.lookup_id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </SelectField>
            <TextField label="Valor (R$)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            <TextField label="Data" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
          </div>
          <TextField label="Observação" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: sinal de 50%" />
          <Button type="submit" size="sm" variant="primary" icon={Plus} loading={add.isPending} disabled={!method || parseDecimal(amount) <= 0}>
            Registrar pagamento
          </Button>
          {parseDecimal(amount) > balance && balance >= 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">O valor é maior que o saldo da OS ({formatMoney(balance)}).</p>
          )}
        </form>
      )}
      <Panel title="Pagamentos recebidos" icon={Wallet} bodyClassName="p-0">
        {payments.length === 0 ? (
          <EmptyState icon={Wallet} title="Nenhum pagamento registrado" />
        ) : (
          <ul className="flex flex-col">
            {payments.map((p) => (
              <li key={p.payment_id} className="flex items-center gap-2 px-2 py-1.5 border-t first:border-t-0 border-line text-sm">
                <div className="flex-1 min-w-0">
                  <strong>{p.method}</strong>
                  <span className="block text-xs text-faint truncate">
                    {formatDateTime(p.paid_at)}
                    {p.user && ` · ${p.user.name}`}
                    {p.notes && ` · ${p.notes}`}
                  </span>
                </div>
                <span className="tabular-nums font-semibold">{formatMoney(p.amount)}</span>
                {!readOnly && canManage && <IconButton icon={Trash2} label="Estornar pagamento" tone="danger" onClick={() => setToRemove(p)} />}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Estornar pagamento?"
        description={toRemove && `${toRemove.method} de ${formatMoney(toRemove.amount)} será removido da OS.`}
        confirmLabel="Estornar"
        loading={remove.isPending}
        onConfirm={() => {
          if (toRemove) remove.mutate(toRemove)
        }}
      />
    </div>
  )
}
