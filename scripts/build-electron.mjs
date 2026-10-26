// Compila electron/main.ts e electron/preload.ts em arquivos CommonJS únicos (dist-electron/).
// SYMNAGER_SEGMENT define o ramo padrão do instalador (vira constante no main).
import { build } from "esbuild"

const SEGMENTS = ["CELULAR_INFORMATICA", "AR_CONDICIONADO", "ELETRODOMESTICOS", "SERVICOS_GERAIS"]
const segment = process.env.SYMNAGER_SEGMENT || "CELULAR_INFORMATICA"
if (!SEGMENTS.includes(segment)) {
  console.error(`SYMNAGER_SEGMENT inválido: "${segment}". Use: ${SEGMENTS.join(", ")}`)
  process.exit(1)
}

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["electron"],
  sourcemap: false,
  minify: process.env.NODE_ENV === "production",
  logLevel: "info",
  define: { "process.env.SYMNAGER_BUILD_SEGMENT": JSON.stringify(segment) },
}

console.log(`Ramo padrão do instalador: ${segment}`)
await Promise.all([
  build({ ...common, entryPoints: ["electron/main.ts"], outfile: "dist-electron/main.cjs" }),
  // o preload roda com sandbox: precisa ser um único arquivo sem requires além de "electron"
  build({ ...common, entryPoints: ["electron/preload.ts"], outfile: "dist-electron/preload.cjs" }),
])
