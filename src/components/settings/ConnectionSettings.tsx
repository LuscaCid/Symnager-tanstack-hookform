import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import { CheckCircle2, Cloud, Download, HardDrive, Loader, Plug, RefreshCw, Save, Server, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { DesktopConfig, DesktopRuntime } from "@/@types/bridge"
import { BoneLines, Button, Checkbox, ConfirmDialog, TextField } from "@/components/ui"
import { useAuth, useHasRole } from "@/contexts/Auth-context"
import { getAccessToken } from "@/service/api"
import { cloudService, licenseService } from "@/services/resources"
import { CloudUsageBars } from "./UsageBar"
import { bridge, getWebServerOverride, normalizeApiUrl, setWebServerOverride } from "@/lib/runtime"
import { cn } from "@/lib/cn"

type TestResult = { ok: boolean; message: string } | null

async function testWebUrl(url: string): Promise<TestResult> {
  try {
    const { data } = await axios.get(`${normalizeApiUrl(url || "/api")}/health`, { timeout: 5000 })
    return { ok: data?.status === "ok", message: `Conectado (versão ${data?.version ?? "?"})` }
  } catch {
    return { ok: false, message: "Não respondeu. Verifique o endereço, a porta e o CORS do servidor." }
  }
}

function ModeCard({
  active,
  onClick,
  icon: Icon,
  title,
  description,
  spinning,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Server
  title: string
  description: string
  spinning?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="radio"
      aria-checked={active}
      className={cn(
        "flex-1 text-left flex gap-2 p-3 rounded-md border transition duration-200",
        active
          ? "border-accent bg-accent-soft text-accent font-medium"
          : "border-line  hover:bg-hover ",
      )}
    >
      <Icon size={22} className={cn("shrink-0 mt-0.5", spinning && "animate-spin")} />
      <span>
        <strong className="block">{title}</strong>
        <span className="text-sm text-muted ">{description}</span>
      </span>
    </button>
  )
}

function TestBadge({ result }: { result: TestResult }) {
  if (!result) return null
  return (
    <p className={cn("flex items-center gap-1 text-sm", result.ok ? "text-green-600 dark:text-green-400" : "text-red-500")}>
      {result.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {result.message}
    </p>
  )
}

/** Escolha entre o banco deste computador e o servidor em nuvem Symnager. Usada no /conexao e em Configurações. */
export function ConnectionSettings() {
  return bridge ? <DesktopConnection /> : <WebConnection />
}

function CloudPanel() {
  const isAdmin = useHasRole()
  const reload = useAuth((c) => c.reload)
  const [confirm, setConfirm] = useState(false)
  const { data, isLoading, isError } = useQuery({ queryKey: ["cloud-usage"], queryFn: cloudService.usage, staleTime: 30_000 })

  async function pull() {
    const token = getAccessToken()
    if (!token) {
      toast.error("Sessão expirada. Entre novamente.")
      return
    }
    const result = await bridge!.cloudPull(token)
    setConfirm(false)
    if (!result.ok) {
      toast.error(result.message || "Não foi possível copiar os dados.")
      return
    }
    const counts =
      result.orders !== undefined ? ` (${result.orders} OS, ${result.clients ?? 0} clientes, ${result.photos ?? 0} fotos)` : ""
    toast.success(`Dados copiados para este computador${counts}. Escolha "Neste computador" para usá-los sem internet.`)
    await reload()
  }

  return (
    <div className="flex flex-col gap-4 border border-line rounded-lg p-4 text-sm">
      {isLoading ? (
        <BoneLines lines={3} />
      ) : isError || !data ? (
        <p className="text-muted">Não foi possível carregar o consumo do plano agora.</p>
      ) : (
        <>
          <p>
            <strong>Plano:</strong> {data.plan_name}
          </p>
          <CloudUsageBars usage={data.usage} limits={data.limits} />
        </>
      )}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between border-t border-line pt-3">
          <p className="text-[13px] text-muted">
            Leve os dados da empresa para o banco deste computador, para trabalhar sem internet ou mudar para o plano vitalício.
          </p>
          <Button size="sm" icon={Download} onClick={() => setConfirm(true)} className="shrink-0">
            Copiar dados da nuvem para este computador
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Copiar os dados da nuvem para este computador?"
        description="O banco local deste computador será substituído pelos dados da empresa na nuvem (ordens, clientes, usuários e fotos). Antes, o Symnager guarda uma cópia de segurança do banco atual. Os dados na nuvem não mudam."
        confirmLabel="Copiar dados"
        onConfirm={pull}
      />
    </div>
  )
}

function DesktopConnection() {
  const reload = useAuth((c) => c.reload)
  const [config, setConfig] = useState<DesktopConfig | null>(null)
  const [runtime, setRuntime] = useState<DesktopRuntime | null>(null)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    bridge!.getConfig().then(setConfig)
    bridge!.getRuntime().then(setRuntime)
    return bridge!.onApiStatus(setRuntime)
  }, [])

  if (!config) return <Loader className="animate-spin" />

  const update = (partial: Partial<DesktopConfig>) => setConfig((c) => (c ? { ...c, ...partial } : c))

  async function apply(partial: Partial<DesktopConfig>, message: string) {
    setRuntime(await bridge!.setConfig(partial))
    setConfig(await bridge!.getConfig())
    toast.success(message)
    await reload()
  }

  /** Testa a licença no servidor em nuvem antes de trocar: plano sem nuvem recebe o erro e fica no local. */
  async function connectCloud() {
    if (config!.mode === "remote" || connecting) return
    setConnecting(true)
    try {
      let result = await bridge!.cloudCheck()
      if (!result.ok && result.code === "CLOUD_LICENSE_STALE") {
        await licenseService.refresh().catch(() => undefined)
        result = await bridge!.cloudCheck()
      }
      if (!result.ok) {
        toast.error(result.message || "Não foi possível conectar ao servidor em nuvem.")
        return
      }
      await apply({ mode: "remote" }, `Conectado à nuvem Symnager${result.plan_name ? ` (plano ${result.plan_name})` : ""}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível conectar ao servidor em nuvem.")
    } finally {
      setConnecting(false)
    }
  }

  async function useLocal() {
    if (config!.mode === "local") return
    setSaving(true)
    try {
      await apply({ mode: "local" }, "Usando o banco deste computador.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveLocal() {
    setSaving(true)
    try {
      await apply({ localPort: config!.localPort, lanAccess: config!.lanAccess }, "Configuração do servidor local salva.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível aplicar a configuração.")
    } finally {
      setSaving(false)
    }
  }

  async function handleRestart() {
    setSaving(true)
    try {
      setRuntime(await bridge!.restartApi())
      await reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Onde ficam os dados" className="flex flex-col sm:flex-row gap-2">
        <ModeCard
          active={config.mode === "local"}
          onClick={useLocal}
          icon={HardDrive}
          title="Neste computador"
          description="Banco de dados local. Funciona sem internet. Disponível em todos os planos."
        />
        <ModeCard
          active={config.mode === "remote"}
          onClick={connectCloud}
          icon={connecting ? Loader : Cloud}
          spinning={connecting}
          title="Servidor em nuvem Symnager"
          description="Dados compartilhados entre os computadores da empresa. Planos mensais: Básico, Intermediário e Pro."
        />
      </div>

      {config.mode === "local" ? (
        <div className="flex flex-col gap-3 border border-line rounded-lg p-4 text-sm">
          <p>
            <strong>Status:</strong>{" "}
            {runtime?.apiStatus === "running" ? (
              <span className="text-success">em execução</span>
            ) : runtime?.apiStatus === "starting" ? (
              "iniciando..."
            ) : (
              <span className="text-danger">{runtime?.apiError || runtime?.apiStatus}</span>
            )}
          </p>
          {runtime?.dbPath && (
            <p className="break-all">
              <strong>Banco de dados:</strong>{" "}
              <button className="underline" onClick={() => bridge!.showItemInFolder(runtime.dbPath)}>
                {runtime.dbPath}
              </button>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
            <TextField
              label="Porta local"
              type="number"
              min={1024}
              max={65535}
              value={config.localPort}
              onChange={(e) => update({ localPort: Number(e.target.value) })}
              hint="0 = escolher automaticamente"
            />
            <Checkbox
              label="Permitir acesso de outros computadores da rede"
              checked={config.lanAccess}
              onChange={(e) => update({ lanAccess: e.target.checked })}
            />
          </div>
          {config.lanAccess && (
            <p className="text-xs text-warning">
              Outros computadores poderão usar este como servidor (porta fixa recomendada). Libere a porta no firewall apenas na
              rede interna.
            </p>
          )}
          <div className="flex flex-wrap gap-2 justify-end">
            <Button size="sm" icon={RefreshCw} onClick={handleRestart} disabled={saving}>
              Reiniciar servidor local
            </Button>
            <Button size="sm" variant="primary" icon={Save} loading={saving} onClick={handleSaveLocal}>
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        <CloudPanel />
      )}
    </div>
  )
}

function WebConnection() {
  const reload = useAuth((c) => c.reload)
  const [url, setUrl] = useState(getWebServerOverride())
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<TestResult>(null)

  async function handleTest() {
    setTesting(true)
    setTest(await testWebUrl(url))
    setTesting(false)
  }

  async function handleSave() {
    setWebServerOverride(url.trim())
    toast.success("Servidor atualizado.")
    await reload()
  }

  return (
    <div className="flex flex-col gap-3">
      <TextField
        label="Endereço da API"
        placeholder="Padrão: mesmo endereço deste site (/api)"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value)
          setTest(null)
        }}
        hint="Deixe em branco para usar o servidor que entregou esta página."
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" icon={Plug} loading={testing} onClick={handleTest}>
          Testar conexão
        </Button>
        <TestBadge result={test} />
      </div>
      <div className="flex justify-end">
        <Button variant="primary" icon={Save} onClick={handleSave}>
          Salvar e conectar
        </Button>
      </div>
    </div>
  )
}
