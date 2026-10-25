---
name: symnager-architecture
description: How the Symnager desktop/web app is wired — React+Vite frontend, NestJS+Prisma+SQLite API embedded in Electron, runtime bridge, auth/token flow, services layer, routes, Docker. Load before adding pages, API calls, Electron IPC, build/packaging or Docker changes in Symnager-tanstack-hookform or Symnager-nest-prisma.
---

# Symnager — arquitetura

## Repositórios

| Repo | Papel |
|---|---|
| `Symnager-tanstack-hookform` (este) | Frontend React + **shell Electron** (`electron/`) + **Docker compose** raiz + scripts de empacotamento |
| `../Symnager-nest-prisma` | API NestJS + Prisma (SQLite). Embutida no Electron e também publicada via Docker |

Contrato HTTP: **`docs/API_CONTRACT.md`** — fonte da verdade. Mudou rota/campo? Atualize o contrato e avise o outro lado.

## Modos de execução

1. **Desktop local (padrão)** — Electron inicia a API como `utilityProcess` (Node embutido) em `127.0.0.1:<porta livre>`,
   banco em `<userData>/symnager.db`, `JWT_SECRET` gerado na 1ª execução em `<userData>/secrets.json`.
   A janela carrega o build do Vite pelo protocolo `app://symnager/` (SPA fallback para `index.html`).
2. **Desktop nuvem** (`mode: "remote"`, planos mensais) — o renderer fala com o servidor em nuvem Symnager, endereço fixo
   (`electron/cloud-url.ts`, env `SYMNAGER_CLOUD_URL` em dev). A API local **continua subindo**: ela guarda a licença
   (`licenseService` usa sempre `localApi` → `runtime.localApiUrl`) e recebe a cópia dos dados da nuvem (`POST /sync/import`).
   O processo principal injeta `X-Symnager-License` nas requisições para a nuvem (`electron/cloud.ts`); o renderer nunca vê o token.
   Antes de trocar de modo, `bridge.cloudCheck()`; plano sem nuvem (403 `PLAN_NO_CLOUD`) → toast e continua local.
   Refresh token separado por modo (`refresh_token` / `refresh_token_cloud`).
3. **Web (Docker)** — `nginx` serve o build e faz proxy de `/api` para o container da API (mesma origem → cookie HttpOnly do refresh funciona).
4. **Dev** — `npm run dev` (Vite :5173 com proxy `/api` → `127.0.0.1:3333`) + `npm run start:dev` na API; ou `npm run electron:dev`.

## Frontend — onde fica cada coisa

```
src/
  @types/api.ts           tipos do contrato (Order, Client, ...) + enums (ORDER_STATUSES, PRIORITIES...)
  @types/bridge.d.ts      tipo de window.symnager (preload do Electron)
  service/api.ts          axios único: baseURL em runtime, access token em memória, refresh automático em 401, getErrorMessage()
  services/resources.ts   TODAS as chamadas HTTP por recurso (ordersService, clientsService, ...). Página nunca chama axios direto.
  lib/runtime.ts          bridge/isDesktop, resolveApiBaseUrl()
  lib/plans.ts            catálogo de planos (Vitalício, Básico, Intermediário, Pro), describeLimits(), planName()
  lib/notify.ts           toastError(err): erro padrão; 403 PLAN_LIMIT ganha a ação "Ver planos" (/configuracoes/plano)
  lib/image.ts            compressImage(): fotos da OS reduzidas para 1600 px JPEG antes do upload
  lib/format.ts           moeda, datas pt-BR, CPF/CNPJ/telefone, rótulos e cores de status/prioridade/categorias
  lib/hooks.ts            useDebounce, useHotkey, useLookups(kind), useSettings(), useTechnicians()
  lib/validation.ts       zod: senha, usuário, e-mail opcional, documento, telefone
  lib/download.ts         saveBinary(): diálogo nativo no Electron / download na web
  contexts/Auth-context   status (loading|offline|needs-setup|unauthenticated|authenticated), user, login/logout/reload; useHasRole()
  components/ui/          kit visual (ver skill symnager-ui) — importe de "@/components/ui"
  components/Layout/      Header (busca Ctrl+K, Nova OS, indicador de conexão), Sidebar (navigation.ts), CommandPalette
  pages/                  uma página por rota (default export, carregada com React.lazy em routes/app.routes.tsx)
```

Regras:
- Query keys: `["orders", params]`, `["order", id]`, `["clients", ...]`, `["client", id]`, `["dashboard", range]`, `["failures", ...]`,
  `["lookups", kind]`, `["settings"]`, `["products", ...]`, `["services", ...]`, `["suppliers", ...]`, `["users", ...]`.
  Após mutation invalide as listas afetadas (`history`, `orders`, `dashboard`, `order`).
- Erros de mutation sem `onError` próprio já viram `toastError(err)` (MutationCache no `App.tsx`). Em catch manual, use `toastError`.
- Permissões na UI: `useHasRole('TECNICO')` (ADMIN sempre passa). A API é quem garante; a UI só esconde.
- Rota nova: arquivo em `pages/`, `lazy()` + `<Route>` em `routes/app.routes.tsx`, item em `components/Layout/navigation.ts`.
- Páginas: `<Page>` + `<PageHeader>` + `<PageBody>` (ou `SplitPane`). Nunca `absolute inset-*` para layout.
- Impressão: rota `/ordens/:id/imprimir` fora do Layout. Electron → `bridge.print({ deviceName, silent, copies, layout })` /
  `bridge.printToPDF`; web → `window.print()`. Registre a impressão com `ordersService.registerPrint`.
- Exportação de banco: `backupService.database()` → `saveBinary(...)`. No Electron também há `bridge.backupNow()` (cópia direta + rotação).

## Electron (`electron/`)

- `main.ts` — janela segura (`contextIsolation`, `sandbox`, `nodeIntegration:false`, CSP, bloqueio de navegação/janelas externas,
  permissões negadas), protocolo `app://`, ciclo de vida da API (`api-process.ts`), IPC (`ipc.ts`), backup automático (`backup.ts`).
- `preload.ts` — expõe apenas `window.symnager` (ver `src/@types/bridge.d.ts`). Nada de `ipcRenderer` cru no renderer.
- `cloud.ts` / `cloud-url.ts` — URL da nuvem, injeção do header da licença, IPCs `cloud:check` e `cloud:pull`.
- Config do usuário: `<userData>/config.json` (`mode`, `localPort`, `lanAccess`, `autoBackup`; `remoteUrl` é legado e ignorado).
- Segredos: `<userData>/secrets.json` (JWT) e refresh token criptografado com `safeStorage`.
- Build: `npm run build:api` (compila a API irmã e copia `dist/`, `prisma/migrations`, `package.json` e `node_modules` de produção
  para `build/api/`), `npm run electron:build` (Vite + tsc do electron + electron-builder; `build/api` vai em `extraResources`).
  Prisma: `node_modules/.prisma/**` e `@prisma/**` ficam fora do asar.
- Caminho da API irmã: env `SYMNAGER_API_DIR` (padrão `../Symnager-nest-prisma`).

## Docker

`docker-compose.yml` (raiz deste repo): `api` (build de `../Symnager-nest-prisma`, volume `symnager-data:/data`) + `web`
(nginx com o build do Vite, proxy `/api`, headers de segurança). Variáveis em `.env` (ver `.env.example`).

## Comandos úteis

```bash
npx tsc --noEmit -p .        # type-check do frontend
npm run build                # build web
npm run electron:dev         # Vite + Electron (API local compilada de ../Symnager-nest-prisma)
npm run electron:build       # instalador (Windows: NSIS em release/)
docker compose up --build    # web + api
```
