import { CLOUD_ORIGIN } from "./cloud-url"

export const APP_ORIGIN = "app://symnager"
export const DEV_URL = process.env.VITE_DEV_SERVER_URL || ""

/** Origens que a página pode chamar via fetch/XHR. */
function connectSources() {
  const sources = ["'self'", "http://127.0.0.1:*", "http://localhost:*", "https://viacep.com.br", CLOUD_ORIGIN]
  if (DEV_URL) sources.push("ws://localhost:*", "ws://127.0.0.1:*")
  return sources.join(" ")
}

/** Content-Security-Policy da janela. Em desenvolvimento o Vite precisa de scripts inline (react-refresh). */
export function contentSecurityPolicy() {
  const script = DEV_URL ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'"
  return [
    "default-src 'self'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src ${connectSources()}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
  ].join("; ")
}

/** O renderer só pode estar no nosso protocolo ou no servidor do Vite em dev. */
export function isTrustedUrl(url: string) {
  return url.startsWith(`${APP_ORIGIN}/`) || url === APP_ORIGIN || (!!DEV_URL && url.startsWith(DEV_URL))
}

/** Links externos permitidos (abrem no navegador do sistema). */
export function isSafeExternal(url: string) {
  try {
    const { protocol } = new URL(url)
    return protocol === "https:" || protocol === "http:" || protocol === "mailto:" || protocol === "tel:"
  } catch {
    return false
  }
}
