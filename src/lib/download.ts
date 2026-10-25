import { bridge } from "./runtime"

/** Salva um arquivo: diálogo nativo no Electron, download do navegador na web. */
export async function saveBinary(data: ArrayBuffer, filename: string, mime = "application/octet-stream") {
  if (bridge) {
    const ext = filename.split(".").pop() ?? "*"
    return bridge.saveFile({ defaultPath: filename, data, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
  }
  const url = URL.createObjectURL(new Blob([data], { type: mime }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return filename
}

/** Lê o nome do arquivo do header Content-Disposition, se presente. */
export function filenameFromDisposition(header: string | undefined, fallback: string) {
  const match = header?.match(/filename="?([^";]+)"?/i)
  return match?.[1] ?? fallback
}
