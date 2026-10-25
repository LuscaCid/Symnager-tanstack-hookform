import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react"
import { FormEvent, useState } from "react"
import { FAILURE_CATEGORIES, type DeliveryFailure, type FailureCategory, type Order } from "@/@types/api"
import { Badge, Button, ComboboxField, EmptyState, Modal, SelectField, TextAreaField, TextField } from "@/components/ui"
import { cn } from "@/lib/cn"
import { FAILURE_CATEGORY_LABEL, formatDateTime, toDateInput } from "@/lib/format"
import { useLookups } from "@/lib/hooks"
import { failuresService, ordersService } from "@/services/resources"

function ResolveDialog({ failure, onClose }: { failure: DeliveryFailure | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [resolution, setResolution] = useState("")
  const resolve = useMutation({
    mutationFn: () => failuresService.update(failure!.failure_id, { resolved: true, resolution: resolution.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", failure!.order_id] })
      queryClient.invalidateQueries({ queryKey: ["failures"] })
      setResolution("")
      onClose()
    },
  })
  return (
    <Modal
      open={!!failure}
      onOpenChange={(o) => !o && onClose()}
      title="Resolver falha"
      description={failure ? `${FAILURE_CATEGORY_LABEL[failure.category]} — ${failure.reason}` : undefined}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="success" icon={CheckCircle2} loading={resolve.isPending} disabled={!resolution.trim()} onClick={() => resolve.mutate()}>
            Marcar como resolvida
          </Button>
        </>
      }
    >
      <TextAreaField label="Como foi resolvido" value={resolution} onChange={(e) => setResolution(e.target.value)} autoFocus />
    </Modal>
  )
}

export function OrderFailuresTab({ order }: { order: Order }) {
  const queryClient = useQueryClient()
  const reasons = useLookups("FAILURE_REASON")
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<FailureCategory>(order.status === "ENTREGUE" ? "GARANTIA" : "ENTREGA")
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")
  const [occurredAt, setOccurredAt] = useState(toDateInput(new Date()))
  const [resolving, setResolving] = useState<DeliveryFailure | null>(null)

  const add = useMutation({
    mutationFn: () =>
      ordersService.addFailure(order.order_id, {
        category,
        reason: reason.trim(),
        description: description.trim() || undefined,
        occurred_at: occurredAt ? new Date(`${occurredAt}T12:00:00`).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", order.order_id] })
      queryClient.invalidateQueries({ queryKey: ["failures"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      setReason("")
      setDescription("")
      setOpen(false)
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (reason.trim()) add.mutate()
  }

  const failures = order.failures ?? []

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted ">
        Registre aqui entregas que não aconteceram, retornos em garantia, retrabalho e problemas com peças. Os dados alimentam o
        mapeamento de falhas.
      </p>
      {open ? (
        <form onSubmit={submit} className="flex flex-col gap-2 border border-line rounded-md p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <SelectField label="Categoria" value={category} onChange={(e) => setCategory(e.target.value as FailureCategory)}>
              {FAILURE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {FAILURE_CATEGORY_LABEL[c]}
                </option>
              ))}
            </SelectField>
            <TextField label="Data" type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            <ComboboxField
              label="Motivo"
              wrapperClassName="sm:col-span-2"
              value={reason}
              onValueChange={setReason}
              options={(reasons.data ?? []).map((r) => r.name)}
              placeholder="Escolha da lista ou digite"
            />
            <TextAreaField
              label="Detalhes"
              wrapperClassName="sm:col-span-2"
              className="min-h-16"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" variant="danger" icon={AlertTriangle} loading={add.isPending} disabled={!reason.trim()}>
              Registrar falha
            </Button>
          </div>
        </form>
      ) : (
        <Button size="sm" icon={Plus} onClick={() => setOpen(true)} className="self-start">
          Registrar falha / retorno
        </Button>
      )}

      {failures.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nenhuma falha registrada" description="Ótimo! Esta OS não teve problemas de entrega." />
      ) : (
        <ul className="flex flex-col gap-2">
          {failures.map((f) => (
            <li
              key={f.failure_id}
              className={cn(
                "flex flex-col gap-1 p-2 rounded-md border text-sm",
                f.resolved ? "border-line " : "border-red-500/40",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={f.resolved ? "" : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"}>
                  {FAILURE_CATEGORY_LABEL[f.category]}
                </Badge>
                <strong className="flex-1 min-w-0 truncate">{f.reason}</strong>
                <span className="text-xs text-faint">{formatDateTime(f.occurred_at)}</span>
              </div>
              {f.description && <p className="text-fg whitespace-pre-wrap">{f.description}</p>}
              {f.resolved ? (
                <p className="text-green-600 dark:text-green-400 flex items-start gap-1">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Resolvida {f.resolved_at && `em ${formatDateTime(f.resolved_at)}`}
                    {f.resolution && ` — ${f.resolution}`}
                  </span>
                </p>
              ) : (
                <Button size="sm" variant="success" icon={CheckCircle2} className="self-start" onClick={() => setResolving(f)}>
                  Resolver
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <ResolveDialog failure={resolving} onClose={() => setResolving(null)} />
    </div>
  )
}
