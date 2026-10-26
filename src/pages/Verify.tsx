import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { BadgeCheck, Search, ShieldX } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { TrackResultSkeleton } from "@/components/skeletons/PageSkeletons"
import { Button, TextField } from "@/components/ui"
import { formatDate, formatDateTime, formatPhone } from "@/lib/format"
import { resolveApiBaseUrl } from "@/lib/runtime"
import { setApiBaseUrl } from "@/service/api"
import { certificatesService } from "@/services/resources"
import { AuthShell } from "./auth/AuthShell"

/** Verificação pública de certificado pelo código impresso (QR code). */
export default function Verify() {
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
    queryKey: ["verify", routeCode],
    queryFn: () => certificatesService.verify(routeCode!),
    enabled: ready && !!routeCode,
    retry: 0,
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (normalized) navigate(`/verificar/${normalized}`)
  }

  const notFound = axios.isAxiosError(error) && error.response?.status === 404
  const valid = data?.status === "VALIDO"

  return (
    <AuthShell title="Verificar certificado" subtitle="Informe o código de verificação impresso no certificado">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 mb-3">
        <TextField
          label="Código de verificação"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={20}
          className="font-mono tracking-widest uppercase"
          autoFocus={!routeCode}
        />
        <Button type="submit" icon={Search}>
          Verificar
        </Button>
      </form>
      {isFetching && <TrackResultSkeleton />}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {notFound ? "Nenhum certificado encontrado com este código." : "Não foi possível verificar agora. Tente mais tarde."}
        </p>
      )}
      {data && (
        <div className="flex flex-col gap-3">
          <div className={valid ? "flex items-start gap-2 rounded-lg bg-success/10 p-3" : "flex items-start gap-2 rounded-lg bg-danger/10 p-3"}>
            {valid ? <BadgeCheck size={20} className="text-success shrink-0" /> : <ShieldX size={20} className="text-danger shrink-0" />}
            <div>
              <p className="text-sm font-semibold">{valid ? "Certificado válido" : "Certificado cancelado"}</p>
              <p className="text-[13px] text-muted">
                {data.title} nº {data.code}
              </p>
            </div>
          </div>
          <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-faint">Cliente</dt>
            <dd>{data.client_name}</dd>
            <dt className="text-faint">Serviço</dt>
            <dd>{formatDateTime(data.performed_at)}</dd>
            {data.next_service_at && (
              <>
                <dt className="text-faint">Próximo</dt>
                <dd>{formatDate(data.next_service_at)}</dd>
              </>
            )}
            <dt className="text-faint">Equipamentos</dt>
            <dd>
              {data.equipment.map((e, i) => (
                <span key={i} className="block">
                  {[e.device, e.btu && `${e.btu} BTUs`, e.ambiente].filter(Boolean).join(" · ")}
                </span>
              ))}
            </dd>
          </dl>
          {data.company?.name && (
            <p className="text-xs text-faint border-t border-line pt-2">
              Emitido por {data.company.name}
              {data.company.phone && ` · ${formatPhone(data.company.phone)}`}
            </p>
          )}
        </div>
      )}
    </AuthShell>
  )
}
