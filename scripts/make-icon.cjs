// Gera build/icon.png (512x512) a partir de um SVG, usando o próprio Electron para rasterizar.
// Uso: npx electron scripts/make-icon.cjs
const { app, BrowserWindow } = require("electron")
const fs = require("node:fs")
const path = require("node:path")

const SIZE = 512
// foguete do lucide (mesmo ícone do cabeçalho do app) sobre quadrado zinc-950
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 512 512">
  <rect x="16" y="16" width="480" height="480" rx="108" fill="#09090b"/>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="none" stroke="#3f3f46" stroke-width="8"/>
  <g transform="translate(96 96) scale(13.333)" fill="none" stroke="#e4e4e7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </g>
</svg>`

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: SIZE, height: SIZE, show: false, frame: false, transparent: true, useContentSize: true })
  const html = `<html><body style="margin:0;background:transparent">${svg}</body></html>`
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  await new Promise((r) => setTimeout(r, 300))
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE })
  const out = path.join(__dirname, "..", "build", "icon.png")
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, image.resize({ width: SIZE, height: SIZE }).toPNG())
  fs.writeFileSync(path.join(__dirname, "..", "public", "icon.svg"), svg.trim())
  console.log("ícone gerado em", out)
  app.quit()
})
