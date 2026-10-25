import { useQueryClient } from "@tanstack/react-query"
import { AxiosResponse } from "axios"
import { Clock, Database, FileJson, FileSpreadsheet, FolderOpen, HardDriveDownload, Save, Upload } from "lucide-react"
import { ChangeEvent, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { DesktopConfig } from "@/@types/bridge"
import { Button, Checkbox, ConfirmDialog, Panel, TextField } from "@/components/ui"
import { useAuth } from "@/contexts/Auth-context"
import { backupService, CsvEntity } from "@/services/resources"
import { getErrorMessage } from "@/service/api"
import { filenameFromDisposition, saveBinary } from "@/lib/download"
import { bridge, isDesktop } from "@/lib/runtime"
import { toDateInput } from "@/lib/format"

const CSV_ENTITIES: { key: CsvEntity; label: string }[] = [
  { key: "orders", label: "Ordens de serviço" },
  { key: "clients", label: "Clientes" },
  { key: "payments", label: "Pagamentos" },
  { key: "products", label: "Produtos e estoque" },
  { key: "services", label: "Serviços" },
  { key: "suppliers", label: "Fornecedores" },
  { key: "failures", label: "Falhas de entrega" },
]

function stamp() {
  const d = new Date()
  return `${toDateInput(d).replace(/-/g, "")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`
}

function ExportPanel() {
  const [busy, setBusy] = useState<string | null>(null)

  async function download(key: string, request: () => Promise<AxiosResponse<ArrayBuffer>>, fallback: string, mime: string) {
    setBusy(key)
    try {
      const res = await request()
      const name = filenameFromDisposition(res.headers["content-disposition"] as string | undefined, fallback)
      const saved = await saveBinary(res.data, name, mime)
      if (saved) toast.success("Arquivo exportado.", { description: saved })
    } catch (err) {
      toast.error(getErrorMessage(err, "Falha ao exportar."))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel title="Exportar dados" icon={HardDriveDownload}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            icon={Database}
            loading={busy === "db"}
            disabled={!!busy}
            onClick={() => download("db", backupService.database, `symnager-${stamp()}.db`, "application/vnd.sqlite3")}
          >
            Banco completo (SQLite)
          </Button>
          <Button
            icon={FileJson}
            loading={busy === "json"}
            disabled={!!busy}
            onClick={() => download("json", backupService.json, `symnager-${stamp()}.json`, "application/json")}
          >
            Dados em JSON
          </Button>
        </div>
        <p className="text-xs text-faint">
          O arquivo .db é uma cópia completa e pode ser restaurado abaixo. O JSON não inclui senhas nem sessões.
        </p>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted ">Planilhas CSV (abrem no Excel)</span>
          <div className="flex flex-wrap gap-2">
            {CSV_ENTITIES.map((e) => (
              <Button
                key={e.key}
                size="sm"
                icon={FileSpreadsheet}
                loading={busy === e.key}
                disabled={!!busy}
                onClick={() => download(e.key, () => backupService.csv(e.key), `${e.key}-${stamp()}.csv`, "text/csv")}
              >
                {e.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}

function RestorePanel() {
  const reload = useAuth((c) => c.reload)
  const queryClient = useQueryClient()
  const [file, setFile] = useState<{ blob: Blob; name: string } | null>(null)
  const [restoring, setRestoring] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function pick() {
    if (bridge) {
      const picked = await bridge.openFile({ filters: [{ name: "SQLite", extensions: ["db", "sqlite"] }] })
      if (picked) setFile({ blob: new Blob([picked.data]), name: picked.name })
      return
    }
    inputRef.current?.click()
  }

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (f) setFile({ blob: f, name: f.name })
  }

  async function restore(password?: string) {
    if (!file || !password) return
    setRestoring(true)
    try {
      await backupService.restore(file.blob, file.name, password)
      toast.success("Backup restaurado. O banco anterior foi guardado como cópia de segurança.")
      setFile(null)
      queryClient.clear()
      await reload()
    } catch (err) {
      toast.error(getErrorMessage(err, "Falha ao restaurar o backup."))
    } finally {
      setRestoring(false)
    }
  }

  return (
    <Panel title="Restaurar backup" icon={Upload}>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted ">
          Substitui <strong>todos</strong> os dados atuais pelo arquivo .db escolhido. Antes disso o servidor guarda uma cópia do banco atual.
        </p>
        <input ref={inputRef} type="file" accept=".db,.sqlite" className="sr-only" onChange={handleInput} aria-label="Arquivo de backup" />
        <div>
          <Button icon={FolderOpen} onClick={pick} disabled={restoring}>
            Escolher arquivo .db
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={!!file}
        onOpenChange={(o) => !o && !restoring && setFile(null)}
        title="Restaurar este backup?"
        description={
          <>
            Arquivo: <strong className="break-all">{file?.name}</strong>
            <br />
            Todos os usuários serão desconectados e os dados atuais serão substituídos.
          </>
        }
        confirmLabel="Restaurar"
        requirePassword
        loading={restoring}
        onConfirm={restore}
      />
    </Panel>
  )
}

function AutoBackupPanel() {
  const [config, setConfig] = useState<DesktopConfig["autoBackup"] | null>(null)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [lastPath, setLastPath] = useState<string | null>(null)

  useEffect(() => {
    bridge!.getConfig().then((c) => setConfig(c.autoBackup))
  }, [])

  if (!config) return null

  const update = (partial: Partial<DesktopConfig["autoBackup"]>) => setConfig((c) => (c ? { ...c, ...partial } : c))

  async function chooseDir() {
    const dir = await bridge!.chooseDirectory()
    if (dir) update({ dir })
  }

  async function handleSave() {
    setSaving(true)
    try {
      await bridge!.setConfig({ autoBackup: config! })
      toast.success("Backup automático configurado.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.")
    } finally {
      setSaving(false)
    }
  }

  async function handleNow() {
    setRunning(true)
    try {
      const result = await bridge!.backupNow()
      if (result.ok) {
        setLastPath(result.path ?? null)
        toast.success("Backup concluído.")
      } else {
        toast.error(result.error || "Falha no backup.")
      }
    } finally {
      setRunning(false)
    }
  }

  return (
    <Panel title="Backup automático (este computador)" icon={Clock}>
      <div className="flex flex-col gap-2">
        <Checkbox
          label="Fazer cópias automáticas do banco local"
          checked={config.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TextField
            label="Intervalo (horas)"
            type="number"
            min={1}
            max={168}
            value={config.intervalHours}
            onChange={(e) => update({ intervalHours: Math.min(168, Math.max(1, Number(e.target.value) || 1)) })}
          />
          <TextField
            label="Manter as últimas"
            type="number"
            min={1}
            max={365}
            value={config.keep}
            onChange={(e) => update({ keep: Math.min(365, Math.max(1, Number(e.target.value) || 1)) })}
            hint="cópias mais antigas são apagadas"
          />
          <div className="sm:col-span-2 flex items-end gap-2">
            <TextField label="Pasta de destino" value={config.dir} readOnly placeholder="Padrão: pasta de dados do app" />
            <Button icon={FolderOpen} onClick={chooseDir}>
              Escolher
            </Button>
          </div>
          <p className="sm:col-span-2 text-xs text-faint">
            Dica: escolha uma pasta sincronizada (OneDrive, Google Drive) ou um pendrive para ter uma cópia fora do computador.
          </p>
        </div>
        {lastPath && (
          <p className="text-sm break-all">
            Último backup:{" "}
            <button className="underline" onClick={() => bridge!.showItemInFolder(lastPath)}>
              {lastPath}
            </button>
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button icon={Database} loading={running} onClick={handleNow}>
            Fazer backup agora
          </Button>
          <Button variant="primary" icon={Save} loading={saving} onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </div>
    </Panel>
  )
}

export function BackupSettings() {
  return (
    <div className="flex flex-col gap-3">
      <ExportPanel />
      {isDesktop && <AutoBackupPanel />}
      <RestorePanel />
    </div>
  )
}
