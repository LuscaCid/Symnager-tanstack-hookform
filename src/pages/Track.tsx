import { useQuery } from "@tanstack/react-query"
import { TrackResultSkeleton } from "@/components/skeletons/PageSkeletons"
import { CheckCircle2, Circle, Search } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import axios from "axios"
import { Badge, Button, TextField } from "@/components/ui"
import { trackService } from "@/services/resources"
import { setApiBaseUrl } from "@/service/api"
import { resolveApiBaseUrl } from "@/lib/runtime"
import { formatDateTime, formatOrderNumber, formatPhone, STATUS_COLOR, STATUS_HEX, STATUS_LABEL } from "@/lib/format"
import { cn } from "@/lib/cn"
import { AuthShell } from "./auth/AuthShell"
import type { OrderStatus } from "@/@types/api"

// Etapas neutras para qualquer ramo; atendimento no local termina em "Concluído", balcão em "Pronto para retirada".
const steps = (onSite: boolean): { label: string; statuses: OrderStatus[] }[] => [
  { label: "Recebido", statuses: ["ABERTA"] },
  { label: "Em análise", statuses: ["EM_ANALISE", "AGUARDANDO_APROVACAO", "APROVADA"] },
  { label: "Em execução", statuses: ["AGUARDANDO_PECA", "EM_REPARO"] },
  { label: onSite ? "Concluído" : "Pronto para retirada", statuses: ["PRONTA"] },
  { label: onSite ? "Finalizado" : "Entregue", statuses: ["ENTREGUE"] },
]

/** Consulta pública do andamento da OS pelo código impresso no comprovante (QR code). */
export default function Track() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const [code, setCode] = useState(routeCode ?? "")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    resolveApiBaseUrl().then((url) => {
      setApiBaseUrl(url)
      setReady(true)
    })
  }, [])

  const { data, isFetching, error } = useQuery({
    queryKey: ["track", routeCode],
    queryFn: () => trackService.get(routeCode!),
    enabled: ready && !!routeCode,
    retry: 0,
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (normalized) navigate(`/rastreio/${normalized}`)
  }

  const notFound = axios.isAxiosError(error) && error.response?.status === 404
  const STEPS = steps(!!data?.scheduled_at)
  const currentStep = data ? STEPS.findIndex((s) => s.statuses.includes(data.status)) : -1

  return (
    <AuthShell title="Acompanhe seu serviço" subtitle="Informe o código impresso no comprovante da ordem de serviço">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 mb-3">
        <TextField
          label="Código de rastreio"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={12}
          className="font-mono tracking-widest uppercase"
          autoFocus={!routeCode}
        />
        <Button type="submit" icon={Search}>
          Consultar
        </Button>
      </form>
      {isFetching && <TrackResultSkeleton />}
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {notFound ? "Nenhuma ordem de serviço encontrada com este código." : "Não foi possível consultar agora. Tente mais tarde."}
        </p>
      )}
      {data && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <strong className="block text-lg">{formatOrderNumber(data.number)}</strong>
              <span className="text-sm text-muted ">
                {data.equipment_label ? `${data.equipment_label}: ` : ""}
                {data.device}
              </span>
            </div>
            <Badge className={STATUS_COLOR[data.status]}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_HEX[data.status] }} />
              {data.status_label || STATUS_LABEL[data.status]}
            </Badge>
          </div>
          {data.status === "CANCELADA" ? (
            <p className="text-sm">Esta ordem de serviço foi cancelada. Entre em contato para mais informações.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {STEPS.map((step, i) => {
                const done = i <= currentStep
                return (
                  <li key={step.label} className={cn("flex items-center gap-2 text-sm", !done && "text-faint ")}>
                    {done ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} />}
                    <span className={cn(i === currentStep && "font-semibold")}>{step.label}</span>
                  </li>
                )
              })}
            </ol>
          )}
          <dl className="text-sm grid grid-cols-2 gap-1 border-t border-line pt-2">
            <dt className="text-faint">Entrada</dt>
            <dd>{formatDateTime(data.arrived_at)}</dd>
            {data.scheduled_at && (
              <>
                <dt className="text-faint">Visita agendada</dt>
                <dd>{formatDateTime(data.scheduled_at)}</dd>
              </>
            )}
            {data.finished_at && (
              <>
                <dt className="text-faint">Concluído</dt>
                <dd>{formatDateTime(data.finished_at)}</dd>
              </>
            )}
            {data.delivered_at && (
              <>
                <dt className="text-faint">Entregue</dt>
                <dd>{formatDateTime(data.delivered_at)}</dd>
              </>
            )}
          </dl>
          {data.company?.name && (
            <p className="text-xs text-faint">
              {data.company.name}
              {data.company.phone && ` · ${formatPhone(data.company.phone)}`}
            </p>
          )}
        </div>
      )}
    </AuthShell>
  )
}
