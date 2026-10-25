// Compila a API (repositório irmão) e prepara build/api com apenas o necessário para rodar dentro do Electron:
//   dist/, prisma/ (schema + migrations), package.json e node_modules de produção (+ cliente Prisma gerado).
// Uso: node scripts/build-api.mjs   (env SYMNAGER_API_DIR para outro caminho; --skip-build para só copiar)
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const apiDir = path.resolve(process.env.SYMNAGER_API_DIR || path.join(root, "..", "Symnager-nest-prisma"))
const outDir = path.join(root, "build", "api")
const skipBuild = process.argv.includes("--skip-build")

const run = (cmd, cwd) => {
  console.log(`\n> ${cmd}  (${path.relative(root, cwd) || "."})`)
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, NODE_ENV: "development" } })
}

if (!fs.existsSync(path.join(apiDir, "package.json"))) {
  console.error(`API não encontrada em ${apiDir}. Defina SYMNAGER_API_DIR.`)
  process.exit(1)
}

if (!skipBuild) {
  if (!fs.existsSync(path.join(apiDir, "node_modules"))) run("npm ci", apiDir)
  // build:prod = prisma generate + nest build. No Windows exige que nenhuma instância da API esteja rodando
  // (a DLL do query engine fica travada e o generate falha com EPERM).
  run("npm run build:prod", apiDir)
}

const entry = ["dist/main.js", "dist/src/main.js"].find((p) => fs.existsSync(path.join(apiDir, p)))
if (!entry) {
  console.error("Build da API não gerou dist/main.js")
  process.exit(1)
}

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const copy = (rel) => {
  const from = path.join(apiDir, rel)
  if (fs.existsSync(from)) fs.cpSync(from, path.join(outDir, rel), { recursive: true })
}
copy("dist")
copy("prisma/schema.prisma")
copy("prisma/migrations")
copy("package.json")
copy("package-lock.json")

// remove artefatos que não devem ir para o instalador
for (const junk of ["dist/tsconfig.build.tsbuildinfo"]) fs.rmSync(path.join(outDir, junk), { force: true })
for (const f of fs.readdirSync(path.join(outDir, "dist"), { recursive: true })) {
  if (String(f).endsWith(".map") || String(f).endsWith(".d.ts")) fs.rmSync(path.join(outDir, "dist", String(f)), { force: true })
}

// dependências de produção sem scripts (o cliente Prisma gerado é copiado abaixo)
run("npm ci --omit=dev --ignore-scripts --no-audit --no-fund", outDir)

const generated = path.join(apiDir, "node_modules", ".prisma")
if (!fs.existsSync(generated)) {
  console.error("Cliente Prisma não gerado (node_modules/.prisma). Rode `npx prisma generate` na API.")
  process.exit(1)
}
fs.cpSync(generated, path.join(outDir, "node_modules", ".prisma"), { recursive: true })

// mantém só o query engine desta plataforma (os outros alvos ficam para o Docker/CI)
const platformTag = { win32: "windows", darwin: "darwin", linux: "debian" }[process.platform]
const clientDir = path.join(outDir, "node_modules", ".prisma", "client")
for (const f of fs.readdirSync(clientDir)) {
  if (/^(lib)?query_engine/.test(f) && platformTag && !f.includes(platformTag)) {
    fs.rmSync(path.join(clientDir, f), { force: true })
  }
}
// o CLI do prisma e engines de migração não são usados em runtime
for (const dir of ["node_modules/prisma", "node_modules/@prisma/engines", "node_modules/typescript"]) {
  fs.rmSync(path.join(outDir, dir), { recursive: true, force: true })
}

const size = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((acc, d) => {
    const p = path.join(dir, d.name)
    return acc + (d.isDirectory() ? size(p) : fs.statSync(p).size)
  }, 0)
console.log(`\nAPI pronta em ${path.relative(root, outDir)} (${(size(outDir) / 1024 / 1024).toFixed(1)} MB) — entry ${entry}`)
