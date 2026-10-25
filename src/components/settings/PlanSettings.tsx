import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowUpRight, Check, Clock, Gauge, RefreshCw, Send } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { BoneLines, Button, Modal, Panel, TextAreaField, TextField } from "@/components/ui"
import { useAuth, useHasRole } from "@/contexts/Auth-context"
import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/format"
import { toastError } from "@/lib/notify"
import { describeLimits, PLANS, planKey, planName, type PlanInfo } from "@/lib/plans"
import { bridge, isDesktop } from "@/lib/runtime"
import { cloudService, licenseService } from "@/services/resources"
import { CloudUsageBars } from "./UsageBar"

/** Configurações > Plano: plano atual, consumo na nuvem e troca de plano. */
export function PlanSettings() {
  const license = useAuth((c) => c.license)
  const applyLicense = useAuth((c) => c.applyLicense)
  const isAdmin = useHasRole()
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<PlanInfo | null>(null)
  const [checking, setChecking] = useState(false)

  const current = planKey(license?.plan)
  const currentInfo = PLANS.find((p) => p.key === current)
  const runtime = useQuery({ queryKey: ["runtime"], queryFn: () => bridge!.getRuntime(), enabled: isDesktop })
  const cloud = runtime.data?.mode === "remote"
  const usage = useQuery({ queryKey: ["cloud-usage"], queryFn: cloudService.usage, enabled: cloud, staleTime: 30_000 })
  const pending = useQuery({ queryKey: ["plan-request"], queryFn: licenseService.pendingPlanChange, retry: false })
  const pendingPlan = pending.data?.pending

  async function verify() {
    setChecking(true)
    try {
      const status = await licenseService.refresh()
      applyLicense(status)
      queryClient.setQueryData(["license"], status)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["plan-request"] }),
        queryClient.invalidateQueries({ queryKey: ["cloud-usage"] }),
      ])
      if (status.valid) toast.success(`Licença verificada: plano ${planName(status.plan) ?? "—"}.`)
    } catch (err) {
      toastError(err)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Plano atual" icon={Gauge}>
        {!license ? (
          <BoneLines lines={4} />
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p>
                <span className="text-base font-semibold">{license.plan_name || planName(license.plan) || "—"}</span>
                {currentInfo && (
                  <span className="text-muted">
                    {" "}
                    · {currentInfo.price} {currentInfo.period}
                  </span>
                )}
              </p>
              <Button size="sm" icon={RefreshCw} loading={checking} onClick={verify}>
                Verificar agora
              </Button>
            </div>
            {(license.limits || currentInfo) && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-muted">
                {describeLimits(license.limits ?? currentInfo!.limits).map((line) => (
                  <li key={line} className="flex items-start gap-1.5">
                    <Check size={14} className="text-accent shrink-0 mt-0.5" />
                    {line}
                  </li>
                ))}
              </ul>
            )}
            {cloud &&
              (usage.isLoading ? (
                <BoneLines lines={2} />
              ) : usage.data ? (
                <div className="border-t border-line pt-4">
                  <CloudUsageBars usage={usage.data.usage} limits={usage.data.limits} />
                </div>
              ) : (
                <p className="text-[13px] text-muted">Não foi possível carregar o consumo na nuvem agora.</p>
              ))}
            {pendingPlan && (
              <div role="status" className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-[13px]">
                <Clock size={16} className="text-warning shrink-0 mt-0.5" />
                <span>
                  Pedido de mudança para {planName(pendingPlan.to_plan)} enviado em {formatDate(pendingPlan.created_at, "dd/MM")} — você
                  receberá as instruções de pagamento; depois clique em Verificar agora.
                </span>
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Planos" icon={ArrowUpRight}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.key === current
            return (
              <div
                key={plan.key}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-4",
                  isCurrent ? "border-accent bg-accent-soft/40" : "border-line bg-surface",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{plan.name}</span>
                    {isCurrent && <span className="text-xs font-medium text-accent">Atual</span>}
                  </div>
                  <p className="mt-1">
                    <span className="text-lg font-semibold">{plan.price}</span>{" "}
                    <span className="text-xs text-faint">{plan.period}</span>
                  </p>
                  <p className="text-xs text-muted mt-1">{plan.audience}</p>
                </div>
                <ul className="flex flex-col gap-1 text-[13px] text-muted flex-1">
                  {describeLimits(plan.limits).map((line) => (
                    <li key={line} className="flex items-start gap-1.5">
                      <Check size={14} className="text-accent shrink-0 mt-0.5" />
                      {line}
                    </li>
                  ))}
                </ul>
                {isAdmin && !isCurrent && (
                  <Button
                    size="sm"
                    variant={plan.key === "PRO" ? "primary" : "default"}
                    disabled={pendingPlan?.to_plan === plan.key}
                    onClick={() => setTarget(plan)}
                  >
                    {pendingPlan?.to_plan === plan.key ? "Pedido enviado" : "Mudar para este plano"}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
        {!isAdmin && <p className="text-[13px] text-faint mt-3">Só o administrador pode pedir a troca de plano.</p>}
      </Panel>

      <ChangePlanDialog
        plan={target}
        fromName={license?.plan_name || planName(license?.plan)}
        onClose={() => setTarget(null)}
        onSent={() => queryClient.invalidateQueries({ queryKey: ["plan-request"] })}
      />
    </div>
  )
}

function ChangePlanDialog({
  plan,
  fromName,
  onClose,
  onSent,
}: {
  plan: PlanInfo | null
  fromName: string | null | undefined
  onClose: () => void
  onSent: () => void
}) {
  const [message, setMessage] = useState("")
  const [contact, setContact] = useState("")
  const [sending, setSending] = useState(false)

  async function send() {
    if (!plan) return
    setSending(true)
    try {
      await licenseService.requestPlanChange({
        plan: plan.key,
        ...(message.trim() ? { message: message.trim() } : {}),
        ...(contact.trim() ? { contact: contact.trim() } : {}),
      })
      toast.success(`Pedido de mudança para o plano ${plan.name} enviado. Você receberá as instruções de pagamento.`)
      setMessage("")
      setContact("")
      onSent()
      onClose()
    } catch (err) {
      toastError(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={!!plan}
      onOpenChange={(open) => !open && onClose()}
      title={plan ? `Mudar para o plano ${plan.name}` : ""}
      description={
        plan
          ? `${fromName ? `De ${fromName} para ${plan.name}` : plan.name}: ${plan.price} ${plan.period}. A troca vale depois da confirmação do pagamento.`
          : undefined
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Send} loading={sending} onClick={send}>
            Enviar pedido
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField
          label="Contato para o retorno (opcional)"
          placeholder="WhatsApp ou e-mail"
          value={contact}
          maxLength={150}
          onChange={(e) => setContact(e.target.value)}
        />
        <TextAreaField
          label="Mensagem (opcional)"
          className="min-h-20"
          value={message}
          maxLength={1000}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
    </Modal>
  )
}
