import { app, safeStorage } from "electron"
import { randomBytes } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

export interface DesktopConfig {
  mode: "local" | "remote"
  remoteUrl: string
  localPort: number
  lanAccess: boolean
  autoBackup: { enabled: boolean; intervalHours: number; keep: number; dir: string }
}

export const userDataDir = () => app.getPath("userData")
const configPath = () => path.join(userDataDir(), "config.json")
const secretsPath = () => path.join(userDataDir(), "secrets.json")
const securePath = () => path.join(userDataDir(), "secure-store.json")

export const dbPath = () => path.join(userDataDir(), "symnager.db")
export const logsDir = () => path.join(userDataDir(), "logs")
export const defaultBackupDir = () => path.join(userDataDir(), "backups")

function defaults(): DesktopConfig {
  return {
    mode: "local",
    remoteUrl: "",
    localPort: 0,
    lanAccess: false,
    autoBackup: { enabled: true, intervalHours: 24, keep: 10, dir: defaultBackupDir() },
  }
}

function readJson<T>(file: string): Partial<T> {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return {}
  }
}

/** Grava de forma atômica (arquivo temporário + rename) para não corromper em queda de energia. */
function writeJson(file: string, data: unknown, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode })
  fs.renameSync(tmp, file)
}

/** Valida e normaliza qualquer config vinda do disco ou do renderer. */
function sanitize(input: Partial<DesktopConfig>, base: DesktopConfig): DesktopConfig {
  const mode = input.mode === "remote" ? "remote" : input.mode === "local" ? "local" : base.mode
  let remoteUrl = typeof input.remoteUrl === "string" ? input.remoteUrl.trim().slice(0, 500) : base.remoteUrl
  if (remoteUrl && !/^https?:\/\/[^\s]+$/i.test(remoteUrl)) remoteUrl = base.remoteUrl
  const port = Number(input.localPort ?? base.localPort)
  const localPort = Number.isInteger(port) && (port === 0 || (port >= 1024 && port <= 65535)) ? port : base.localPort
  const ab = { ...base.autoBackup, ...(input.autoBackup ?? {}) }
  return {
    mode,
    remoteUrl,
    localPort,
    lanAccess: typeof input.lanAccess === "boolean" ? input.lanAccess : base.lanAccess,
    autoBackup: {
      enabled: !!ab.enabled,
      intervalHours: Math.min(Math.max(Number(ab.intervalHours) || 24, 1), 24 * 30),
      keep: Math.min(Math.max(Math.round(Number(ab.keep) || 10), 1), 200),
      dir: typeof ab.dir === "string" && ab.dir ? ab.dir : defaultBackupDir(),
    },
  }
}

export function loadConfig(): DesktopConfig {
  return sanitize(readJson<DesktopConfig>(configPath()), defaults())
}

export function saveConfig(partial: Partial<DesktopConfig>): DesktopConfig {
  const next = sanitize(partial, loadConfig())
  writeJson(configPath(), next, 0o644)
  return next
}

/** JWT_SECRET próprio desta instalação, gerado na primeira execução. */
export function getJwtSecret(): string {
  const secrets = readJson<{ jwtSecret: string }>(secretsPath())
  if (secrets.jwtSecret && secrets.jwtSecret.length >= 64) return secrets.jwtSecret
  const jwtSecret = randomBytes(48).toString("hex")
  writeJson(secretsPath(), { ...secrets, jwtSecret })
  return jwtSecret
}

/** Armazenamento de pequenos segredos (refresh token) criptografado pelo SO (DPAPI/Keychain/libsecret). */
export function secureGet(key: string): string | null {
  if (!safeStorage.isEncryptionAvailable()) return null
  const store = readJson<Record<string, string>>(securePath())
  const value = store[key]
  if (!value) return null
  try {
    return safeStorage.decryptString(Buffer.from(value, "base64"))
  } catch {
    return null
  }
}

export function secureSet(key: string, value: string | null) {
  const store = readJson<Record<string, string>>(securePath()) as Record<string, string>
  if (value === null || !safeStorage.isEncryptionAvailable()) {
    delete store[key]
  } else {
    store[key] = safeStorage.encryptString(value).toString("base64")
  }
  writeJson(securePath(), store)
}
