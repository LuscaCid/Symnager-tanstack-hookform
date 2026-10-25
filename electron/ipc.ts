import { BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent, shell, app } from "electron"
import fs from "node:fs/promises"
import path from "node:path"
import { apiProcess, normalizeApiUrl } from "./api-process"
import { backupNow, startBackupScheduler } from "./backup"
import { DesktopConfig, loadConfig, saveConfig, secureGet, secureSet } from "./config"
import { isSafeExternal, isTrustedUrl } from "./security"

type FileFilter = { name: string; extensions: string[] }

const MAX_OPEN_FILE = 512 * 1024 * 1024
const ALLOWED_SECURE_KEYS = new Set(["refresh_token"])

/** Só aceita chamadas vindas da nossa própria página (evita abuso por conteúdo injetado/externo). */
function assertSender(event: IpcMainInvokeEvent) {
  const url = event.senderFrame?.url ?? ""
  if (!isTrustedUrl(url)) throw new Error("Origem não autorizada.")
}

function handle<A extends unknown[], R>(channel: string, fn: (event: IpcMainInvokeEvent, ...args: A) => R | Promise<R>) {
  ipcMain.handle(channel, async (event, ...args) => {
    assertSender(event)
    return fn(event, ...(args as A))
  })
}

function sanitizeFilters(filters?: FileFilter[]) {
  return (filters ?? [])
    .filter((f) => f && typeof f.name === "string" && Array.isArray(f.extensions))
    .map((f) => ({ name: f.name.slice(0, 40), extensions: f.extensions.map((e) => String(e).replace(/[^a-z0-9*]/gi, "")).slice(0, 10) }))
}

export function registerIpc(getWindow: () => BrowserWindow | null) {
  handle("runtime:get", () => apiProcess.runtime())

  handle("config:get", () => loadConfig())

  handle("config:set", async (_e, partial: Partial<DesktopConfig>) => {
    const before = loadConfig()
    const after = saveConfig(partial ?? {})
    const needsRestart =
      before.mode !== after.mode ||
      (after.mode === "local" && (before.localPort !== after.localPort || before.lanAccess !== after.lanAccess))
    if (needsRestart) await apiProcess.restart()
    startBackupScheduler()
    return apiProcess.runtime()
  })

  handle("api:restart", () => apiProcess.restart())

  handle("remote:test", async (_e, url: string) => {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return { ok: false, message: "Endereço inválido." }
    try {
      const res = await fetch(`${normalizeApiUrl(url)}/health`, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) return { ok: false, message: `O servidor respondeu ${res.status}.` }
      const data = (await res.json()) as { status?: string; version?: string }
      return data.status === "ok"
        ? { ok: true, message: `Conectado (versão ${data.version ?? "?"})` }
        : { ok: false, message: "Resposta inesperada do servidor." }
    } catch {
      return { ok: false, message: "Sem resposta. Verifique endereço, porta, firewall e certificado." }
    }
  })

  handle("secure:get", (_e, key: string) => (ALLOWED_SECURE_KEYS.has(key) ? secureGet(key) : null))
  handle("secure:set", (_e, key: string, value: string | null) => {
    if (!ALLOWED_SECURE_KEYS.has(key)) return
    secureSet(key, typeof value === "string" ? value.slice(0, 4096) : null)
  })

  handle("file:save", async (_e, opts: { defaultPath: string; data: ArrayBuffer; filters?: FileFilter[] }) => {
    const win = getWindow()
    const name = path.basename(String(opts?.defaultPath || "arquivo"))
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: path.join(app.getPath("downloads"), name),
      filters: sanitizeFilters(opts?.filters),
    })
    if (result.canceled || !result.filePath) return null
    await fs.writeFile(result.filePath, Buffer.from(opts.data))
    return result.filePath
  })

  handle("file:open", async (_e, opts: { filters?: FileFilter[] }) => {
    const win = getWindow()
    const result = await dialog.showOpenDialog(win!, { properties: ["openFile"], filters: sanitizeFilters(opts?.filters) })
    if (result.canceled || !result.filePaths[0]) return null
    const file = result.filePaths[0]
    const stat = await fs.stat(file)
    if (stat.size > MAX_OPEN_FILE) throw new Error("Arquivo muito grande.")
    const buf = await fs.readFile(file)
    return { name: path.basename(file), data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }
  })

  handle("dir:choose", async () => {
    const win = getWindow()
    const result = await dialog.showOpenDialog(win!, { properties: ["openDirectory", "createDirectory"] })
    return result.canceled ? null : result.filePaths[0] ?? null
  })

  handle("print:list", async (event) => {
    const printers = await event.sender.getPrintersAsync()
    return printers.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: !!(p as { isDefault?: boolean }).isDefault }))
  })

  handle("print:run", (event, opts: { deviceName?: string; silent?: boolean; copies?: number; layout?: "A4" | "THERMAL" }) => {
    const thermal = opts?.layout === "THERMAL"
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      event.sender.print(
        {
          silent: !!opts?.silent,
          deviceName: opts?.deviceName || undefined,
          copies: Math.min(Math.max(Number(opts?.copies) || 1, 1), 10),
          printBackground: true,
          margins: { marginType: thermal ? "none" : "default" },
          // 80 mm de largura; altura longa para rolo contínuo (microns)
          pageSize: thermal ? { width: 80_000, height: 297_000 } : "A4",
        },
        (success, failureReason) => resolve(success ? { ok: true } : { ok: false, error: failureReason || "Impressão cancelada." }),
      )
    })
  })

  handle("print:pdf", async (event, opts: { defaultPath: string; layout?: "A4" | "THERMAL" }) => {
    const thermal = opts?.layout === "THERMAL"
    const pdf = await event.sender.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: thermal ? { width: 3.15, height: 11.69 } : "A4",
    })
    const win = getWindow()
    const result = await dialog.showSaveDialog(win!, {
      defaultPath: path.join(app.getPath("documents"), path.basename(String(opts?.defaultPath || "os.pdf"))),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    })
    if (result.canceled || !result.filePath) return null
    await fs.writeFile(result.filePath, pdf)
    return result.filePath
  })

  handle("shell:openExternal", async (_e, url: string) => {
    if (isSafeExternal(url)) await shell.openExternal(url)
  })

  handle("shell:showItem", (_e, target: string) => {
    if (typeof target === "string" && target) shell.showItemInFolder(path.normalize(target))
  })

  handle("backup:now", () => backupNow())
}
