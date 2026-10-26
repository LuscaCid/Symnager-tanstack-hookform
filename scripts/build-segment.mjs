// Gera o instalador de um ramo: node scripts/build-segment.mjs AR_CONDICIONADO
//
// O ramo só muda o padrão da configuração inicial (campos da OS e listas). appId e productName
// continuam os mesmos em todos os instaladores: a pasta de dados e as atualizações não mudam.
import { execSync } from "node:child_process"

const SLUGS = {
  CELULAR_INFORMATICA: "Celulares",
  AR_CONDICIONADO: "Climatizacao",
  ELETRODOMESTICOS: "Eletrodomesticos",
  SERVICOS_GERAIS: "Servicos",
}

const segment = (process.argv[2] || "").toUpperCase()
if (!SLUGS[segment]) {
  console.error(`Uso: node scripts/build-segment.mjs <${Object.keys(SLUGS).join(" | ")}>`)
  process.exit(1)
}

const env = { ...process.env, SYMNAGER_SEGMENT: segment, VITE_SYMNAGER_SEGMENT: segment }
const run = (cmd, extra = {}) => {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: "inherit", env: { ...env, ...extra } })
}

run("npm run build")
run("npm run build:api")
run("node scripts/build-electron.mjs", { NODE_ENV: "production" })
run(
  [
    "npx electron-builder --config electron-builder.yml",
    // eslint-disable-next-line no-template-curly-in-string
    `-c.win.artifactName=Symnager-${SLUGS[segment]}-Setup-\${version}.\${ext}`,
    `-c.extraMetadata.symnagerSegment=${segment}`,
  ].join(" "),
)
console.log(`\nInstalador do ramo ${segment} em release/Symnager-${SLUGS[segment]}-Setup-<versão>.exe`)
