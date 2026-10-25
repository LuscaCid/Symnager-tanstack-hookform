// Hook afterPack do electron-builder: o builder sempre ignora node_modules (e pastas ocultas como .prisma)
// em extraResources, então copiamos as dependências de produção da API manualmente para resources/api.
const fs = require("node:fs")
const path = require("node:path")

exports.default = async function afterPack(context) {
  const source = path.join(__dirname, "..", "build", "api", "node_modules")
  const resources =
    context.electronPlatformName === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources")
  const target = path.join(resources, "api", "node_modules")
  if (!fs.existsSync(source)) throw new Error("build/api/node_modules não existe. Rode `npm run build:api` antes.")
  fs.rmSync(target, { recursive: true, force: true })
  fs.cpSync(source, target, { recursive: true })
  const engine = fs.readdirSync(path.join(target, ".prisma", "client")).find((f) => f.includes("query_engine"))
  if (!engine) throw new Error("Query engine do Prisma não encontrado em node_modules/.prisma/client.")
  console.log(`  • API node_modules copiado (${engine})`)
}
