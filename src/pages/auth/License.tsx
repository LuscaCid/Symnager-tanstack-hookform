import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, CheckCircle2, KeyRound, RefreshCw, Send, Server, ShieldAlert } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router-dom"
import { z } from "zod"
import { Button, TextAreaField, TextField } from "@/components/ui"
import { useAuth } from "@/contexts/Auth-context"
import { cn } from "@/lib/cn"
import { formatLicenseKey, LICENSE_KEY_PATTERN, LICENSE_STATUS_LABEL, licenseServerUrl, requestLicense } from "@/lib/license"
import { getErrorMessage } from "@/service/api"
import { licenseService } from "@/services/resources"
import { AuthShell } from "./AuthShell"

type View = "activate" | "request" | "sent"

const PLANS = [
  { key: "Vitalício", price: "R$ 74,90", detail: "pagamento único · banco neste computador" },
  { key: "Mensal", price: "R$ 24,90/mês", detail: "banco em nuvem · dados compartilhados" },
] as const

/** Primeira tela quando a instalação não tem licença válida: ativar com a chave ou pedir uma. */
export default function LicenseScreen() {
  const [view, setView] = useState<View>("activate")
  if (view === "request") return <RequestView onBack={() => setView("activate")} onSent={() => setView("sent")} />
  if (view === "sent") return <SentView onBack={() => setView("activate")} />
  return <ActivateView onRequest={() => setView("request")} />
}

function ActivateView({ onRequest }: { onRequest: () => void }) {
  const license = useAuth((c) => c.license)
  const applyLicense = useAuth((c) => c.applyLicense)
  const [key, setKey] = useState("")
  const [busy, setBusy] = useState<"activate" | "refresh" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const notice = license && license.status !== "UNLICENSED" ? license.message || LICENSE_STATUS_LABEL[license.status] : null
  const keyOk = LICENSE_KEY_PATTERN.test(key)

  async function activate(e: React.FormEvent) {
    e.preventDefault()
    if (!keyOk) {
      setError("Digite a chave completa no formato SYMN-XXXXX-XXXXX-XXXXX-XXXXX.")
      return
    }
    setBusy("activate")
    setError(null)
    try {
      applyLicense(await licenseService.activate(key))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function refresh() {
    setBusy("refresh")
    setError(null)
    try {
      const status = await licenseService.refresh()
      applyLicense(status)
      if (!status.valid) setError(status.message || LICENSE_STATUS_LABEL[status.status] || "A licença ainda não está liberada.")
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <AuthShell
      title="Ativar o Symnager"
      subtitle="Digite a chave de licença que você recebeu para liberar este computador."
      footer={
        <span className="inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <button type="button" onClick={onRequest} className="font-medium text-accent hover:underline">
            Ainda não tenho licença
          </button>
          <Link to="/conexao" className="inline-flex items-center gap-1 hover:underline">
            <Server size={14} /> Configurar servidor
          </Link>
        </span>
      }
    >
      <form onSubmit={activate} className="flex flex-col gap-3" noValidate>
        {notice && (
          <div role="status" className="flex items-start gap-2 rounded-lg bg-warning/10 text-[13px] p-3">
            <ShieldAlert size={16} className="text-warning shrink-0 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}
        <TextField
          label="Chave de licença"
          placeholder="SYMN-XXXXX-XXXXX-XXXXX-XXXXX"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(formatLicenseKey(e.target.value))}
          className="font-mono tracking-wide"
          hint={license?.machine_name ? `Este computador: ${license.machine_name}` : undefined}
        />
        {error && (
          <p role="alert" className="text-sm text-danger bg-danger/10 rounded-lg p-2.5">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" icon={KeyRound} loading={busy === "activate"} disabled={busy === "refresh"}>
          Ativar
        </Button>
        <Button
          type="button"
          icon={RefreshCw}
          loading={busy === "refresh"}
          disabled={busy === "activate"}
          onClick={refresh}
          tooltip="Consulta o servidor de licenças de novo (por exemplo, depois do pagamento ser confirmado)"
        >
          Verificar agora
        </Button>
      </form>
    </AuthShell>
  )
}

const requestSchema = z.object({
  plan: z.enum(["Vitalício", "Mensal"]),
  company_name: z.string().trim().min(2, "Informe o nome da empresa"),
  contact_name: z.string().trim().min(2, "Informe o seu nome"),
  document: z.string().trim().optional(),
  email: z.string().trim().email("E-mail inválido"),
  phone: z.string().trim().min(8, "Informe um telefone ou WhatsApp"),
  message: z.string().trim().max(1000).optional(),
})
type RequestForm = z.infer<typeof requestSchema>

function RequestView({ onBack, onSent }: { onBack: () => void; onSent: () => void }) {
  const license = useAuth((c) => c.license)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RequestForm>({ resolver: zodResolver(requestSchema), defaultValues: { plan: "Vitalício" } })
  const plan = watch("plan")

  async function onSubmit(data: RequestForm) {
    setError(null)
    try {
      const { plan: chosen, message, document, ...rest } = data
      await requestLicense(licenseServerUrl(license), {
        ...rest,
        ...(document ? { document: document.replace(/\D/g, "") } : {}),
        message: [`Plano: ${chosen}`, message].filter(Boolean).join("\n"),
        ...(license?.machine_name ? { machine_name: license.machine_name } : {}),
      })
      onSent()
    } catch (err) {
      setError(err instanceof TypeError ? "Sem conexão com o servidor de licenças. Verifique a internet." : getErrorMessage(err))
    }
  }

  return (
    <AuthShell title="Pedir uma licença" subtitle="Preencha os dados da empresa. Depois do pagamento, enviamos a chave de ativação.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3" noValidate>
        <div role="radiogroup" aria-label="Plano" className="grid grid-cols-2 gap-2">
          {PLANS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={plan === p.key}
              onClick={() => setValue("plan", p.key)}
              className={cn(
                "text-left rounded-lg border p-3 transition-colors duration-150",
                plan === p.key ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong",
              )}
            >
              <span className="block text-[13px] text-muted">{p.key}</span>
              <span className="block text-base font-semibold">{p.price}</span>
              <span className="block text-xs text-faint mt-0.5">{p.detail}</span>
            </button>
          ))}
        </div>
        <TextField label="Empresa" autoFocus error={errors.company_name?.message} {...register("company_name")} />
        <TextField label="Seu nome" error={errors.contact_name?.message} {...register("contact_name")} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="E-mail" type="email" error={errors.email?.message} {...register("email")} />
          <TextField label="Telefone / WhatsApp" error={errors.phone?.message} {...register("phone")} />
        </div>
        <TextField label="CPF ou CNPJ (opcional)" {...register("document")} />
        <TextAreaField label="Observações (opcional)" className="min-h-16" {...register("message")} />
        {error && (
          <p role="alert" className="text-sm text-danger bg-danger/10 rounded-lg p-2.5">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" icon={ArrowLeft} onClick={onBack}>
            Voltar
          </Button>
          <Button type="submit" variant="primary" icon={Send} loading={isSubmitting} className="flex-1">
            Enviar pedido
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}

function SentView({ onBack }: { onBack: () => void }) {
  return (
    <AuthShell title="Pedido enviado">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} className="text-success shrink-0" />
          <div className="text-sm flex flex-col gap-2">
            <p>Recebemos o seu pedido de licença.</p>
            <p className="text-muted">
              Você vai receber os dados para o pagamento via Pix no e-mail ou WhatsApp informado. Assim que o pagamento for
              confirmado, enviamos a chave de ativação — é só voltar aqui, digitar a chave e clicar em Ativar.
            </p>
          </div>
        </div>
        <Button variant="primary" icon={KeyRound} onClick={onBack}>
          Já tenho a chave
        </Button>
      </div>
    </AuthShell>
  )
}
