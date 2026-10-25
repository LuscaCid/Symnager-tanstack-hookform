import { session } from "electron"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { randomBytes } from "node:crypto"
import { apiProcess } from "./api-process"
import { CLOUD_API_URL, CLOUD_ORIGIN, CLOUD_URL } from "./cloud-url"

const LICENSE_HEADER = "X-Symnager-License"
const TOKEN_TTL_MS = 60_000

let cached: { token: string | null; at: number } | null = null

export type CloudCheck = {
  ok: boolean
  code?: string
  message?: string
  tenant?: { id: number; name: string }
  plan?: string
  plan_name?: string
  limits?: Record<string, unknown>
}

/** Token assinado pelo servidor de licenças, lido da API local (nunca passa pelo renderer). */
async function licenseToken(force = false): Promise<string | null> {
  if (!force && cached && Date.now() - cached.at < TOKEN_TTL_MS) return cached.token
  const base = apiProcess.localUrl()
  if (!base) return null
  try {
    const res = await fetch(`${base}/license/token`, {
      headers: { "x-internal-token": apiProcess.internalToken },
      signal: AbortSignal.timeout(5000),
    })
    const data = res.ok ? ((await res.json()) as { token?: string | null }) : null
    cached = { token: data?.token ?? null, at: Date.now() }
  } catch {
    cached = { token: null, at: Date.now() }
  }
  return cached.token
}

/** Pede à API local um check-in imediato com o servidor de licenças (token novo). */
async function refreshLicense() {
  const base = apiProcess.localUrl()
  if (!base) return
  await fetch(`${base}/license/refresh`, { method: "POST", signal: AbortSignal.timeout(20_000) }).catch(() => undefined)
  cached = null
}

const isCloudUrl = (url: string) => url === CLOUD_URL || url.startsWith(`${CLOUD_URL}/`)

/** Toda requisição do renderer para a nuvem leva o token da licença deste computador. */
export function installCloudHeaders() {
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: [`${CLOUD_ORIGIN}/*`] }, (details, callback) => {
    if (!isCloudUrl(details.url)) return callback({ requestHeaders: details.requestHeaders })
    licenseToken().then((token) => {
      const headers = { ...details.requestHeaders }
      if (token) headers[LICENSE_HEADER] = token
      callback({ requestHeaders: headers })
    })
  })
}

async function readError(res: Response) {
  const data = (await res.json().catch(() => ({}))) as { code?: string; message?: string | string[] }
  const message = Array.isArray(data.message) ? data.message.join(" ") : data.message
  return { code: data.code, message: message || `O servidor em nuvem respondeu ${res.status}.` }
}

const UNREACHABLE = "Não foi possível falar com o servidor em nuvem. Verifique a internet e tente novamente."

/** Confere se a licença deste computador dá acesso à nuvem (antes de trocar de modo). */
export async function cloudCheck(retry = true): Promise<CloudCheck> {
  const token = await licenseToken(true)
  if (!token) {
    return {
      ok: false,
      code: "CLOUD_LICENSE_INVALID",
      message: "Este computador não tem uma licença ativa. Ative a licença antes de conectar ao servidor em nuvem.",
    }
  }
  let res: Response
  try {
    res = await fetch(`${CLOUD_API_URL}/cloud/check`, {
      headers: { [LICENSE_HEADER]: token },
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return { ok: false, code: "CLOUD_UNREACHABLE", message: UNREACHABLE }
  }
  if (res.ok) return { ok: true, ...((await res.json()) as Omit<CloudCheck, "ok">) }
  const error = await readError(res)
  if (retry && error.code === "CLOUD_LICENSE_STALE") {
    await refreshLicense()
    return cloudCheck(false)
  }
  return { ok: false, ...error }
}

/**
 * Copia os dados do tenant na nuvem para o banco local: baixa o export (tar com banco e fotos)
 * e entrega à API local, que guarda uma cópia de segurança antes de substituir.
 */
export async function cloudPull(accessToken: string) {
  if (typeof accessToken !== "string" || !accessToken || accessToken.length > 4096)
    return { ok: false, message: "Sessão inválida. Entre novamente." }
  const base = apiProcess.localUrl()
  if (!base) return { ok: false, message: "A API local não está em execução." }
  const token = await licenseToken(true)
  if (!token) return { ok: false, message: "Este computador não tem uma licença ativa." }

  const file = path.join(os.tmpdir(), `symnager-cloud-${randomBytes(6).toString("hex")}.tar`)
  try {
    let res: Response
    try {
      res = await fetch(`${CLOUD_API_URL}/sync/export`, {
        headers: { Authorization: `Bearer ${accessToken}`, [LICENSE_HEADER]: token },
        signal: AbortSignal.timeout(10 * 60_000),
      })
    } catch {
      return { ok: false, message: UNREACHABLE }
    }
    if (!res.ok) return { ok: false, ...(await readError(res)) }
    if (!res.body) return { ok: false, message: "O servidor em nuvem não enviou os dados." }
    // grava em disco em vez de segurar tudo na memória (fotos podem somar alguns GB)
    const out = await fs.promises.open(file, "w")
    try {
      const reader = res.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        await out.write(value)
      }
    } finally {
      await out.close()
    }

    const form = new FormData()
    form.append("file", await fs.openAsBlob(file, { type: "application/x-tar" }), "symnager-cloud.tar")
    const imported = await fetch(`${base}/sync/import`, {
      method: "POST",
      headers: { "x-internal-token": apiProcess.internalToken },
      body: form,
      signal: AbortSignal.timeout(10 * 60_000),
    })
    if (!imported.ok) return { ok: false, ...(await readError(imported)) }
    const result = (await imported.json()) as Record<string, unknown>
    return { ok: true, message: "Dados da nuvem copiados para este computador.", ...result }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  } finally {
    fs.promises.unlink(file).catch(() => undefined)
  }
}

