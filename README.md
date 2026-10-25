# Symnager

Gerenciador de **ordens de serviço** para assistências técnicas — recepção de equipamentos, orçamento, reparo,
entrega, garantia, estoque de peças, financeiro da OS e mapeamento de falhas de entrega.

Roda como **aplicativo desktop** (Electron, banco SQLite local, funciona offline) ou como **aplicação web**
(Docker: nginx + API). O mesmo app desktop também pode se conectar a um servidor externo.

| Camada | Tecnologia | Repositório |
|---|---|---|
| Interface | React 18, Vite, TailwindCSS, TanStack Query, React Hook Form + Zod, Recharts | este |
| Desktop | Electron (janela isolada + API embutida em `utilityProcess`) | este (`electron/`) |
| API | NestJS 10, Prisma 5, SQLite | [`../Symnager-nest-prisma`](../Symnager-nest-prisma) |

## Funcionalidades

- **Dashboard** com indicadores do período (em aberto, atrasadas, prontas para retirada, faturamento, a receber,
  ticket médio, tempo médio de reparo, taxa de falhas), gráficos e ranking de técnicos.
- **Recepção**: histórico + abertura rápida de OS lado a lado (divisória arrastável), busca de cliente, cadastro na hora.
- **Ordens de serviço**: lista com filtros e **quadro kanban** (arrastar entre status), detalhes completos com itens
  (serviços e peças com baixa de estoque), pagamentos, histórico/comentários, garantia, aviso ao cliente por WhatsApp.
- **Impressão** A4 (2 vias) ou **térmica 80 mm**, com QR code de rastreio, escolha de impressora e PDF no desktop.
- **Rastreio público** (`/rastreio/<código>`): o cliente acompanha o andamento sem login.
- **Mapeamento de falhas de entrega**: registro por categoria e motivo, Pareto dos motivos, taxa por técnico,
  marca e tipo de equipamento, linha do tempo e sugestões automáticas.
- **Cadastros**: clientes (CPF/CNPJ validados, CEP automático), serviços, produtos e estoque (movimentações),
  fornecedores, usuários e papéis, cadastros auxiliares (tipos de equipamento, marcas, formas de pagamento,
  motivos de falha, acessórios, checklist).
- **Configurações**: perfil e senha, empresa (logo no comprovante), numeração e termos de garantia, impressão,
  **conexão** (local × servidor externo), **backup/exportação** (SQLite, JSON, CSV) e restauração, aparência.
- **Auditoria** de ações sensíveis (login, exclusões, backups, alterações de permissão).
- Busca global **Ctrl+K**, nova OS **Ctrl+Shift+O**, tema claro/escuro.

## Começando (desenvolvimento)

Pré-requisitos: Node 20+ (testado com 22), npm 10+. A API deve estar clonada ao lado deste repositório.

```bash
# API
cd ../Symnager-nest-prisma
npm install
npm run start:dev           # http://127.0.0.1:3333/api  (cria .env de dev com JWT_SECRET)

# Frontend web
cd ../Symnager-tanstack-hookform
npm install
npm run dev                 # http://localhost:5173 (proxy /api → 127.0.0.1:3333)
```

Na primeira execução o app abre a **configuração inicial** para criar o administrador.

### Desktop em desenvolvimento

```bash
npm run build:api           # compila a API irmã e prepara build/api
npm run electron:dev        # Vite + Electron com a API embutida
```

## Gerando o instalador

```bash
npm run electron:build      # Windows: release/Symnager-Setup-<versão>.exe
```

O instalador contém o frontend, o processo principal e a API com suas dependências de produção
(`resources/api`). Os dados do usuário ficam em `%APPDATA%\Symnager` (Windows) e **não** são apagados ao desinstalar:

| Arquivo | Conteúdo |
|---|---|
| `symnager.db` | banco SQLite |
| `config.json` | modo de conexão, porta, backup automático |
| `secrets.json` | segredo JWT gerado na primeira execução |
| `secure-store.json` | sessão (criptografada pelo sistema operacional) |
| `backups/` | backups automáticos (padrão: diário, mantém 10) |
| `logs/api.log` | log da API embutida |

### Usando em vários computadores

- **Rede local**: em um computador, *Configurações → Conexão → Neste computador*, marque
  “Permitir acesso de outros computadores” e fixe uma porta (ex.: 3333). Nos outros, escolha
  *Servidor externo* e informe `http://<ip-do-servidor>:3333`.
- **Servidor dedicado / nuvem**: suba com Docker (abaixo) e aponte os apps desktop para a URL HTTPS.

## Docker (versão web)

```bash
cp .env.example .env        # defina JWT_SECRET (≥ 32 caracteres)
docker compose up -d --build
# http://localhost:8080
```

- `api` — imagem construída de `../Symnager-nest-prisma` (`SYMNAGER_API_DIR` para outro caminho),
  banco no volume `symnager-data`, sem porta publicada (só a rede interna).
- `web` — nginx não-root servindo o build do Vite, proxy `/api`, cabeçalhos de segurança (CSP, frame-deny,
  nosniff…), rate limit extra no login.
- Em produção, coloque um proxy com HTTPS na frente, defina `COOKIE_SECURE=true` e habilite HSTS em
  `docker/security-headers.conf`.

Backup: use *Configurações → Backup* (gera uma cópia consistente do banco) ou copie o volume:
`docker run --rm -v symnager_symnager-data:/data -v "$PWD":/out alpine cp /data/symnager.db /out/`.

## Segurança

- Senhas com bcrypt (custo 12), política mínima, bloqueio após tentativas falhas, mensagens genéricas.
- Access token JWT curto (15 min) só em memória; refresh token rotativo (hash no banco) guardado com
  criptografia do SO no desktop e em cookie `HttpOnly; SameSite=Strict` na web.
- Papéis (Administrador, Técnico, Atendente) verificados na API; auditoria de ações sensíveis.
- API: helmet, CORS por lista, rate limiting, validação estrita de entrada (whitelist), limites de corpo,
  erros sem stack em produção, segredo JWT obrigatório.
- Electron: `contextIsolation`, `sandbox`, sem `nodeIntegration`, CSP, navegação e janelas externas bloqueadas,
  permissões do navegador negadas, IPC com origem validada, API ouvindo só em `127.0.0.1` por padrão.

## Estrutura

```
electron/          processo principal, preload, ciclo de vida da API, IPC, backup automático
scripts/           build do Electron (esbuild), empacotamento da API, geração do ícone
docker/            nginx e cabeçalhos de segurança
docs/              contrato da API (API_CONTRACT.md) e mapa de funcionalidades (ROADMAP.md)
src/
  pages/           uma página por rota
  components/ui/   kit visual (botões, campos, SplitPane, modal, tabela...)
  services/        chamadas HTTP por recurso
  service/api.ts   cliente axios (refresh automático)
  lib/             formatação pt-BR, validações, hooks, runtime (Electron/web)
.claude/skills/    guias de estilo e arquitetura para quem for evoluir o projeto
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Vite em modo desenvolvimento |
| `npm run build` | type-check + build web |
| `npm run typecheck` | type-check do frontend e do Electron |
| `npm run build:api` | compila e prepara a API para o Electron |
| `npm run electron:dev` | desktop em desenvolvimento |
| `npm run electron:start` | desktop com build de produção local |
| `npm run electron:pack` | gera a pasta do app sem instalador (teste rápido) |
| `npm run electron:build` | gera o instalador |
| `npm run docker:up` / `docker:down` | sobe / derruba a versão web |
