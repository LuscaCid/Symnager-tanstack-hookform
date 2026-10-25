import axios from "axios"
import { CheckCircle2, HardDrive, Loader, Plug, RefreshCw, Save, Server, XCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { DesktopConfig, DesktopRuntime } from "@/@types/bridge"
import { Button, Checkbox, TextField } from "@/components/ui"
import { useAuth } from "@/contexts/Auth-context"
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
}: {
  active: boolean
  onClick: () => void
  icon: typeof Server
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 text-left flex gap-2 p-3 rounded-md border transition duration-200",
        active
          ? "border-zinc-950 dark:border-zinc-200 bg-zinc-200 dark:bg-zinc-800/80"
          : "border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800/80",
      )}
    >
      <Icon size={22} className="shrink-0 mt-0.5" />
      <span>
        <strong className="block">{title}</strong>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{description}</span>
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

/** Escolha entre servidor embutido (SQLite local) e servidor externo. Usada no /conexao e em Configurações. */
export function ConnectionSettings() {
  return bridge ? <DesktopConnection /> : <WebConnection />
}

function DesktopConnection() {
  const reload = useAuth((c) => c.reload)
  const [config, setConfig] = useState<DesktopConfig | null>(null)
  const [runtime, setRuntime] = useState<DesktopRuntime | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<TestResult>(null)

  useEffect(() => {
    bridge!.getConfig().then(setConfig)
    bridge!.getRuntime().then(setRuntime)
    return bridge!.onApiStatus(setRuntime)
  }, [])

  if (!config) return <Loader className="animate-spin" />

  const update = (partial: Partial<DesktopConfig>) => setConfig((c) => (c ? { ...c, ...partial } : c))

  async function handleTest() {
    setTesting(true)
    setTest(await bridge!.testRemote(config!.remoteUrl))
    setTesting(false)
  }

  async function handleSave() {
    if (config!.mode === "remote" && !/^https?:\/\//i.test(config!.remoteUrl)) {
      toast.error("Informe um endereço começando com http:// ou https://")
      return
    }
    setSaving(true)
    try {
      const rt = await bridge!.setConfig(config!)
      setRuntime(rt)
      toast.success("Conexão atualizada.")
      await reload()
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
      <div className="flex flex-col sm:flex-row gap-2">
        <ModeCard
          active={config.mode === "local"}
          onClick={() => update({ mode: "local" })}
          icon={HardDrive}
          title="Neste computador"
          description="Servidor embutido com banco SQLite local. Funciona sem internet."
        />
        <ModeCard
          active={config.mode === "remote"}
          onClick={() => update({ mode: "remote" })}
          icon={Server}
          title="Servidor externo"
          description="Conecta a uma API Symnager na rede ou na nuvem (vários computadores)."
        />
      </div>

      {config.mode === "local" ? (
        <div className="flex flex-col gap-2 border border-zinc-300 dark:border-zinc-800 rounded-md p-2 text-sm">
          <p>
            <strong>Status:</strong>{" "}
            {runtime?.apiStatus === "running" ? (
              <span className="text-green-600 dark:text-green-400">em execução</span>
            ) : runtime?.apiStatus === "starting" ? (
              "iniciando..."
            ) : (
              <span className="text-red-500">{runtime?.apiError || runtime?.apiStatus}</span>
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
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Outros computadores poderão usar este como servidor (porta fixa recomendada). Libere a porta no firewall apenas na rede interna.
            </p>
          )}
          <div>
            <Button size="sm" icon={RefreshCw} onClick={handleRestart} disabled={saving}>
              Reiniciar servidor local
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <TextField
            label="Endereço do servidor"
            placeholder="https://os.minhaempresa.com.br"
            value={config.remoteUrl}
            onChange={(e) => {
              update({ remoteUrl: e.target.value })
              setTest(null)
            }}
            hint="Use HTTPS fora da rede local. O caminho /api é adicionado automaticamente."
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" icon={Plug} loading={testing} onClick={handleTest} disabled={!config.remoteUrl}>
              Testar conexão
            </Button>
            <TestBadge result={test} />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="primary" icon={Save} loading={saving} onClick={handleSave}>
          Salvar e conectar
        </Button>
      </div>
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
