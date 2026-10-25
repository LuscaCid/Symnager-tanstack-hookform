// Compila electron/main.ts e electron/preload.ts em arquivos CommonJS únicos (dist-electron/).
import { build } from "esbuild"

const common = {
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["electron"],
  sourcemap: false,
  minify: process.env.NODE_ENV === "production",
  logLevel: "info",
}

await Promise.all([
  build({ ...common, entryPoints: ["electron/main.ts"], outfile: "dist-electron/main.cjs" }),
  // o preload roda com sandbox: precisa ser um único arquivo sem requires além de "electron"
  build({ ...common, entryPoints: ["electron/preload.ts"], outfile: "dist-electron/preload.cjs" }),
])
