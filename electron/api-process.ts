import { app, utilityProcess, UtilityProcess } from "electron"
import { randomBytes } from "node:crypto"
import { EventEmitter } from "node:events"
import fs from "node:fs"
import net from "node:net"
import path from "node:path"
import { dbPath, getJwtSecret, loadConfig, logsDir } from "./config"

export type ApiStatus = "starting" | "running" | "error" | "stopped" | "remote"

export interface Runtime {
  apiUrl: string
  mode: "local" | "remote"
  apiStatus: ApiStatus
  apiError?: string
  version: string
  userData: string
  dbPath: string
  platform: string
}

const HEALTH_TIMEOUT_MS = 90_000
const MAX_AUTO_RESTARTS = 3

/** Pasta da API: dentro de resources/ no app instalado, ou o repositório irmão em desenvolvimento. */
export function resolveApiDir() {
  if (app.isPackaged) return path.join(process.resourcesPath, "api")
  if (process.env.SYMNAGER_API_DIR) return path.resolve(process.env.SYMNAGER_API_DIR)
  const staged = path.join(app.getAppPath(), "build", "api")
  if (fs.existsSync(path.join(staged, "dist"))) return staged
  return path.resolve(app.getAppPath(), "..", "Symnager-nest-prisma")
}

function resolveEntry(apiDir: string) {
  for (const candidate of ["dist/main.js", "dist/src/main.js"]) {
    const full = path.join(apiDir, candidate)
    if (fs.existsSync(full)) return full
  }
  throw new Error(`API não encontrada em ${apiDir}. Rode "npm run build:api".`)
}

function freePort(host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on("error", reject)
    srv.listen(0, host, () => {
      const { port } = srv.address() as net.AddressInfo
      srv.close(() => resolve(port))
    })
  })
}

function portInUse(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once("error", () => resolve(true))
    srv.listen(port, host, () => srv.close(() => resolve(false)))
  })
}

export function normalizeApiUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, "")
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`
}

class ApiProcess extends EventEmitter {
  private child: UtilityProcess | null = null
  private status: ApiStatus = "stopped"
  private error: string | undefined
  private url = ""
  private restarts = 0
  private stopping = false
  private logStream: fs.WriteStream | null = null
  /** token por execução para o backup automático (header x-internal-token) */
  readonly internalToken = randomBytes(32).toString("hex")

  runtime(): Runtime {
    const config = loadConfig()
    return {
      apiUrl: config.mode === "remote" ? normalizeApiUrl(config.remoteUrl || "http://localhost") : this.url,
      mode: config.mode,
      apiStatus: config.mode === "remote" ? "remote" : this.status,
      apiError: this.error,
      version: app.getVersion(),
      userData: app.getPath("userData"),
      dbPath: dbPath(),
      platform: process.platform,
    }
  }

  /** URL base local (http://127.0.0.1:porta/api) quando em execução. */
  localUrl() {
    return this.status === "running" ? this.url : ""
  }

  private setStatus(status: ApiStatus, error?: string) {
    this.status = status
    this.error = error
    this.emit("status", this.runtime())
  }

  private openLog() {
    fs.mkdirSync(logsDir(), { recursive: true })
    const file = path.join(logsDir(), "api.log")
    try {
      // rotação simples: mantém o último arquivo com até 5 MB
      if (fs.existsSync(file) && fs.statSync(file).size > 5 * 1024 * 1024) fs.renameSync(file, `${file}.1`)
    } catch {
      // ignora
    }
    this.logStream?.end()
    this.logStream = fs.createWriteStream(file, { flags: "a" })
    this.logStream.write(`\n===== ${new Date().toISOString()} start =====\n`)
  }

  async start() {
    const config = loadConfig()
    if (config.mode === "remote") {
      await this.stop()
      // runtime() já reporta "remote" quando o modo é remoto
      this.setStatus("stopped")
      return
    }
    if (this.child) return
    this.stopping = false
    this.setStatus("starting")

    try {
      const apiDir = resolveApiDir()
      const entry = resolveEntry(apiDir)
      const host = config.lanAccess ? "0.0.0.0" : "127.0.0.1"
      let port = config.localPort
      if (!port || (await portInUse(port, host))) port = await freePort(host)
      this.url = `http://127.0.0.1:${port}/api`

      const db = dbPath().replace(/\\/g, "/")
      this.openLog()
      const env: Record<string, string> = {
        ...(process.env as Record<string, string>),
        NODE_ENV: "production",
        APP_MODE: "local",
        PORT: String(port),
        HOST: host,
        DATABASE_URL: `file:${db}`,
        JWT_SECRET: getJwtSecret(),
        RUN_MIGRATIONS: "true",
        MIGRATIONS_DIR: path.join(apiDir, "prisma", "migrations"),
        CORS_ORIGINS: ["app://symnager", "http://localhost:5173", "http://127.0.0.1:5173"].join(","),
        INTERNAL_TOKEN: this.internalToken,
        COOKIE_SECURE: "false",
        TRUST_PROXY: "false",
      }
      delete env.ELECTRON_RUN_AS_NODE

      const child = utilityProcess.fork(entry, [], {
        cwd: apiDir,
        env,
        stdio: "pipe",
        serviceName: "Symnager API",
      })
      this.child = child
      child.stdout?.on("data", (chunk) => this.logStream?.write(chunk))
      child.stderr?.on("data", (chunk) => this.logStream?.write(chunk))
      child.on("exit", (code) => this.handleExit(code))

      await this.waitHealthy()
      this.restarts = 0
      this.setStatus("running")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logStream?.write(`[electron] falha ao iniciar: ${message}\n`)
      await this.stop()
      this.setStatus("error", message)
    }
  }

  private async waitHealthy() {
    const deadline = Date.now() + HEALTH_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (!this.child) throw new Error("O processo da API encerrou durante a inicialização. Veja logs/api.log.")
      try {
        const res = await fetch(`${this.url}/health`, { signal: AbortSignal.timeout(2000) })
        if (res.ok) return
      } catch {
        // ainda subindo
      }
      await new Promise((r) => setTimeout(r, 400))
    }
    throw new Error("A API local não respondeu a tempo.")
  }

  private handleExit(code: number) {
    this.logStream?.write(`[electron] API saiu com código ${code}\n`)
    this.child = null
    if (this.stopping) return
    if (this.status === "running" && this.restarts < MAX_AUTO_RESTARTS) {
      this.restarts++
      this.setStatus("starting")
      setTimeout(() => this.start(), 1000 * this.restarts)
      return
    }
    if (this.status !== "starting") this.setStatus("error", `A API local parou (código ${code}).`)
  }

  async stop() {
    this.stopping = true
    const child = this.child
    if (!child) return
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        child.kill()
        resolve()
      }, 5000)
      child.once("exit", () => {
        clearTimeout(timer)
        resolve()
      })
      // SIGTERM permite ao Nest fechar o Prisma (shutdown hooks)
      child.kill()
    })
    this.child = null
    this.setStatus("stopped")
  }

  async restart() {
    await this.stop()
    await this.start()
    return this.runtime()
  }
}

export const apiProcess = new ApiProcess()
