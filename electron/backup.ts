import fs from "node:fs"
import path from "node:path"
import { apiProcess } from "./api-process"
import { loadConfig } from "./config"

const PREFIX = "symnager-auto-"
let timer: NodeJS.Timeout | null = null
let running = false

function stamp(date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
}

function listBackups(dir: string) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(PREFIX) && f.endsWith(".db"))
    .map((f) => ({ file: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
}

/**
 * Pede à API local uma cópia consistente do banco (VACUUM INTO) usando o token interno
 * desta execução e guarda na pasta de backups, mantendo só os N mais recentes.
 */
export async function backupNow(): Promise<{ ok: boolean; path?: string; error?: string }> {
  const config = loadConfig()
  if (config.mode !== "local") return { ok: false, error: "O backup automático só funciona no modo local." }
  const base = apiProcess.localUrl()
  if (!base) return { ok: false, error: "A API local não está em execução." }
  if (running) return { ok: false, error: "Já existe um backup em andamento." }
  running = true
  try {
    const res = await fetch(`${base}/backup/database`, {
      headers: { "x-internal-token": apiProcess.internalToken },
      signal: AbortSignal.timeout(5 * 60_000),
    })
    if (!res.ok) throw new Error(`A API respondeu ${res.status}.`)
    const data = Buffer.from(await res.arrayBuffer())
    if (data.subarray(0, 15).toString("utf8") !== "SQLite format 3") throw new Error("Resposta não é um banco SQLite válido.")
    const dir = config.autoBackup.dir
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${PREFIX}${stamp()}.db`)
    fs.writeFileSync(file, data)
    for (const old of listBackups(dir).slice(config.autoBackup.keep)) {
      try {
        fs.unlinkSync(old.file)
      } catch {
        // arquivo em uso: tenta na próxima
      }
    }
    return { ok: true, path: file }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  } finally {
    running = false
  }
}

async function tick() {
  const config = loadConfig()
  if (!config.autoBackup.enabled || config.mode !== "local" || !apiProcess.localUrl()) return
  const last = listBackups(config.autoBackup.dir)[0]
  const due = !last || Date.now() - last.mtime >= config.autoBackup.intervalHours * 3_600_000
  if (due) await backupNow()
}

export function startBackupScheduler() {
  if (timer) clearInterval(timer)
  // primeira verificação logo após a API subir, depois a cada 10 min
  setTimeout(tick, 60_000)
  timer = setInterval(tick, 10 * 60_000)
}

export function stopBackupScheduler() {
  if (timer) clearInterval(timer)
  timer = null
}
