import { app, BrowserWindow, Menu, net, protocol, session, shell } from "electron"
import fs from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { apiProcess } from "./api-process"
import { startBackupScheduler, stopBackupScheduler } from "./backup"
import { installCloudHeaders } from "./cloud"
import { registerIpc } from "./ipc"
import { APP_ORIGIN, contentSecurityPolicy, DEV_URL, isSafeExternal, isTrustedUrl } from "./security"

// precisa ser registrado antes do app ficar pronto: app:// se comporta como origem segura (https-like)
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

app.setAppUserModelId("br.com.symnager.app")

// em desenvolvimento os dados ficam separados da instalação real (%APPDATA%\Symnager-dev);
// SYMNAGER_USER_DATA aponta outra pasta (ambiente de demonstração, gravações)
if (!app.isPackaged)
  app.setPath("userData", process.env.SYMNAGER_USER_DATA || path.join(app.getPath("appData"), "Symnager-dev"))

let mainWindow: BrowserWindow | null = null

const rendererDir = () => path.join(app.getAppPath(), "dist")

/** Serve o build do Vite em app://symnager/ com fallback de SPA para index.html. */
function registerAppProtocol() {
  protocol.handle("app", async (request) => {
    const url = new URL(request.url)
    if (url.host !== "symnager") return new Response("Not found", { status: 404 })
    const root = rendererDir()
    const requested = path.normalize(path.join(root, decodeURIComponent(url.pathname)))
    // impede path traversal para fora da pasta do build
    const safe = requested.startsWith(root) && fs.existsSync(requested) && fs.statSync(requested).isFile()
    const file = safe ? requested : path.join(root, "index.html")
    const response = await net.fetch(pathToFileURL(file).toString())
    const headers = new Headers(response.headers)
    if (file.endsWith(".html")) {
      headers.set("Content-Security-Policy", contentSecurityPolicy())
      headers.set("Cache-Control", "no-cache")
    }
    headers.set("X-Content-Type-Options", "nosniff")
    return new Response(response.body, { status: response.status, headers })
  })
}

function hardenSession() {
  const ses = session.defaultSession
  // nenhuma permissão de hardware/notificação/geolocalização é necessária
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  ses.setPermissionCheckHandler(() => false)
  if (DEV_URL) {
    ses.webRequest.onHeadersReceived({ urls: [`${DEV_URL}/*`] }, (details, callback) => {
      callback({
        responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [contentSecurityPolicy()] },
      })
    })
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 840,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: "Symnager",
    backgroundColor: "#151517",
    autoHideMenuBar: true,
    // sem moldura do sistema: a barra de título é o cabeçalho do próprio app (arrastável, com
    // minimizar / maximizar / fechar). No macOS mantém os botões nativos sobre o cabeçalho.
    frame: process.platform === "darwin",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    icon: path.join(app.getAppPath(), "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: true,
      devTools: !app.isPackaged || process.env.SYMNAGER_DEVTOOLS === "1",
    },
  })

  mainWindow.once("ready-to-show", () => mainWindow?.show())

  const sendWindowState = () => {
    if (!mainWindow) return
    mainWindow.webContents.send("window:state", {
      maximized: mainWindow.isMaximized(),
      fullscreen: mainWindow.isFullScreen(),
      focused: mainWindow.isFocused(),
    })
  }
  for (const event of ["maximize", "unmaximize", "enter-full-screen", "leave-full-screen", "focus", "blur"] as const) {
    mainWindow.on(event as "maximize", sendWindowState)
  }

  const wc = mainWindow.webContents
  // nunca abrir janelas novas: links externos vão para o navegador padrão
  wc.setWindowOpenHandler(({ url }) => {
    if (isSafeExternal(url)) shell.openExternal(url)
    return { action: "deny" }
  })
  wc.on("will-navigate", (event, url) => {
    if (!isTrustedUrl(url)) {
      event.preventDefault()
      if (isSafeExternal(url)) shell.openExternal(url)
    }
  })
  wc.on("will-attach-webview", (event) => event.preventDefault())

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL)
    wc.openDevTools({ mode: "detach" })
  } else {
    mainWindow.loadURL(`${APP_ORIGIN}/`)
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "Symnager",
      submenu: [{ role: "reload", label: "Recarregar" }, { role: "togglefullscreen", label: "Tela cheia" }, { type: "separator" }, { role: "quit", label: "Sair" }],
    },
    {
      label: "Editar",
      submenu: [
        { role: "undo", label: "Desfazer" },
        { role: "redo", label: "Refazer" },
        { type: "separator" },
        { role: "cut", label: "Recortar" },
        { role: "copy", label: "Copiar" },
        { role: "paste", label: "Colar" },
        { role: "selectAll", label: "Selecionar tudo" },
      ],
    },
    {
      label: "Exibir",
      submenu: [
        { role: "zoomIn", label: "Aumentar zoom" },
        { role: "zoomOut", label: "Diminuir zoom" },
        { role: "resetZoom", label: "Zoom padrão" },
        ...(app.isPackaged ? [] : [{ role: "toggleDevTools" as const, label: "Ferramentas de desenvolvedor" }]),
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    hardenSession()
    installCloudHeaders()
    registerAppProtocol()
    registerIpc(() => mainWindow)
    buildMenu()
    apiProcess.on("status", (runtime) => mainWindow?.webContents.send("api:status", runtime))
    createWindow()
    await apiProcess.start()
    startBackupScheduler()

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  // qualquer webContents criado (inclusive futuros) herda as restrições de navegação
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-navigate", (event, url) => {
      if (!isTrustedUrl(url)) event.preventDefault()
    })
  })

  let quitting = false
  app.on("before-quit", (event) => {
    if (quitting) return
    quitting = true
    event.preventDefault()
    stopBackupScheduler()
    apiProcess.stop().finally(() => app.quit())
  })

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
  })
}
