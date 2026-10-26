import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Award, Ban, CalendarClock, Printer } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import type { Certificate, Order } from "@/@types/api"
import { Badge, Bone, Button, EmptyState, IconButton, Modal, TextAreaField } from "@/components/ui"
import { useHasRole } from "@/contexts/Auth-context"
import { cn } from "@/lib/cn"
import { formatDate, formatDateTime } from "@/lib/format"
import { certificatesService } from "@/services/resources"
import { CertificateFormModal } from "./CertificateFormModal"

export function CertificateStatusBadge({ status }: { status: Certificate["status"] }) {
  return status === "VALIDO" ? (
    <Badge className="bg-success/10 text-success">Válido</Badge>
  ) : (
    <Badge className="bg-danger/10 text-danger">Cancelado</Badge>
  )
}

/** Aba "Certificados" da OS (ramos com certificados, como ar-condicionado). */
export function OrderCertificatesTab({ order }: { order: Order }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canIssue = useHasRole("TECNICO")
  const isAdmin = useHasRole()
  const [issuing, setIssuing] = useState(false)
  const [canceling, setCanceling] = useState<Certificate | null>(null)
  const [reason, setReason] = useState("")

  const { data = [], isLoading } = useQuery({
    queryKey: ["certificates", "order", order.order_id],
    queryFn: () => certificatesService.ofOrder(order.order_id),
  })

  const cancel = useMutation({
    mutationFn: () => certificatesService.cancel(canceling!.id, reason.trim()),
    onSuccess: (cert) => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] })
      queryClient.invalidateQueries({ queryKey: ["order", order.order_id] })
      toast.success(`${cert.code} cancelado.`)
      setCanceling(null)
      setReason("")
    },
  })

  const canEmit = canIssue && order.status !== "CANCELADA"

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-muted">Certificado de higienização e relatório de manutenção preventiva, com QR de verificação.</p>
        {canEmit && (
          <Button size="sm" variant="primary" icon={Award} onClick={() => setIssuing(true)}>
            Emitir certificado
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Bone key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Nenhum certificado emitido"
          description={canEmit ? "Emita o certificado ao concluir a limpeza ou a manutenção." : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((c) => (
            <li
              key={c.id}
              className={cn("p-3 rounded-xl bg-surface border border-line shadow-sm flex flex-col gap-1.5", c.status === "CANCELADO" && "opacity-70")}
            >
              <div className="flex items-center gap-2 text-xs text-faint">
                <span className="font-mono">{c.code}</span>
                <span>· {formatDateTime(c.performed_at)}</span>
                <span className="ml-auto">
                  <CertificateStatusBadge status={c.status} />
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{c.title}</p>
                  <p className="text-[13px] text-muted truncate">
                    {c.equipment.length} {c.equipment.length === 1 ? "unidade" : "unidades"}: {c.equipment.map((e) => e.ambiente || e.device).join(", ")}
                  </p>
                  {c.next_service_at && c.status === "VALIDO" && (
                    <p className="text-xs text-muted inline-flex items-center gap-1 mt-0.5">
                      <CalendarClock size={12} /> Próximo serviço: {formatDate(c.next_service_at)}
                    </p>
                  )}
                  {c.status === "CANCELADO" && c.cancel_reason && <p className="text-xs text-danger mt-0.5">Motivo: {c.cancel_reason}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" icon={Printer} onClick={() => navigate(`/certificados/${c.id}/imprimir`)}>
                    Imprimir
                  </Button>
                  {isAdmin && c.status === "VALIDO" && (
                    <IconButton icon={Ban} label="Cancelar certificado" tone="danger" onClick={() => setCanceling(c)} />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CertificateFormModal order={order} open={issuing} onOpenChange={setIssuing} />

      <Modal
        open={!!canceling}
        onOpenChange={(o) => {
          if (!o) {
            setCanceling(null)
            setReason("")
          }
        }}
        size="sm"
        title={`Cancelar ${canceling?.code ?? "certificado"}?`}
        description="O certificado passa a constar como cancelado na verificação pública. Para corrigir dados, emita um novo depois."
        footer={
          <>
            <Button onClick={() => setCanceling(null)}>Voltar</Button>
            <Button variant="danger" loading={cancel.isPending} disabled={reason.trim().length < 3} onClick={() => cancel.mutate()}>
              Cancelar certificado
            </Button>
          </>
        }
      >
        <TextAreaField label="Motivo" autoFocus value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </div>
  )
}
