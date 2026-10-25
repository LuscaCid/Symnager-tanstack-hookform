import { useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound, MonitorX, RefreshCw } from "lucide-react"
import { ReactNode, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import type { LicenseStatus } from "@/@types/api"
import { BoneLines, Button, ConfirmDialog, Panel } from "@/components/ui"
import { useAuth, useHasRole } from "@/contexts/Auth-context"
import { cn } from "@/lib/cn"
import { formatDate, formatDateTime } from "@/lib/format"
import { LICENSE_STATUS_LABEL } from "@/lib/license"
import { planName } from "@/lib/plans"
import { bridge, isDesktop } from "@/lib/runtime"
import { toastError } from "@/lib/notify"
import { licenseService } from "@/services/resources"

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-faint">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  )
}

function StatusLine({ license }: { license: LicenseStatus }) {
  const offline = license.status === "OFFLINE"
  const tone = license.valid ? (offline ? "text-warning" : "text-success") : "text-danger"
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", tone)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {LICENSE_STATUS_LABEL[license.status] ?? license.status}
      {offline && license.offline_until && (
        <span className="font-normal text-muted">· validada até {formatDateTime(license.offline_until)}</span>
      )}
    </span>
  )
}

/** Configurações > Licença: situação da licença desta instalação. */
export function LicenseSettings() {
  const queryClient = useQueryClient()
  const applyLicense = useAuth((c) => c.applyLicense)
  const isAdmin = useHasRole()
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const { data: license, isLoading } = useQuery({ queryKey: ["license"], queryFn: licenseService.status })
  // desativar exige a sessão da API local: no modo nuvem o usuário está logado só na nuvem
  const runtime = useQuery({ queryKey: ["runtime"], queryFn: () => bridge!.getRuntime(), enabled: isDesktop })
  const cloud = runtime.data?.mode === "remote"

  function update(status: LicenseStatus) {
    queryClient.setQueryData(["license"], status)
    applyLicense(status)
  }

  async function refresh() {
    setBusy(true)
    try {
      const status = await licenseService.refresh()
      update(status)
      if (status.valid) toast.success("Licença verificada.")
    } catch (err) {
      toastError(err)
    } finally {
      setBusy(false)
    }
  }

  async function deactivate() {
    try {
      const status = await licenseService.deactivate()
      setConfirm(false)
      update(status)
    } catch (err) {
      toastError(err)
    }
  }

  return (
    <Panel title="Licença" icon={KeyRound}>
      {isLoading || !license ? (
        <BoneLines lines={6} />
      ) : (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1.5 text-sm">
            <Row label="Empresa licenciada">{license.tenant?.name ?? "—"}</Row>
            <Row label="Situação">
              <StatusLine license={license} />
            </Row>
            <Row label="Plano">
              {license.plan_name || planName(license.plan) || "—"}
              {license.valid && (
                <Link to="/configuracoes/plano" className="ml-2 text-[13px] text-accent hover:underline">
                  ver limites e mudar de plano
                </Link>
              )}
            </Row>
            <Row label="Validade">
              {license.license_expires_at ? `até ${formatDate(license.license_expires_at)}` : license.valid ? "vitalícia" : "—"}
            </Row>
            <Row label="Chave">
              <span className="font-mono text-[13px]">{license.key_masked ?? "—"}</span>
            </Row>
            <Row label="Este computador">{license.machine_name ?? "—"}</Row>
            <Row label="Ativada em">{license.activated_at ? formatDateTime(license.activated_at) : "—"}</Row>
            <Row label="Última verificação">{license.last_check_at ? formatDateTime(license.last_check_at) : "—"}</Row>
          </dl>
          {license.message && !license.valid && (
            <p role="alert" className="text-sm text-danger bg-danger/10 rounded-lg p-2.5">
              {license.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-end border-t border-line pt-4">
            {isAdmin && license.valid && !cloud && (
              <Button icon={MonitorX} variant="ghost" onClick={() => setConfirm(true)}>
                Desativar neste computador
              </Button>
            )}
            <Button icon={RefreshCw} loading={busy} onClick={refresh}>
              Verificar agora
            </Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Desativar a licença neste computador?"
        description="O Symnager fica bloqueado aqui até a chave ser digitada de novo. Use para transferir a licença para outro computador. Os dados não são apagados."
        confirmLabel="Desativar"
        onConfirm={deactivate}
      />
    </Panel>
  )
}
