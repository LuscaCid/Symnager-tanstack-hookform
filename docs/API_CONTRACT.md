# Symnager — Contrato da API (v1)

Fonte da verdade compartilhada entre o frontend (`Symnager-tanstack-hookform`) e a API
(`Symnager-nest-prisma`). Qualquer mudança aqui deve ser comunicada ao outro lado.

## Convenções gerais

- Prefixo global: **`/api`** (ex.: `http://127.0.0.1:3333/api/clients`).
- JSON em `snake_case` nos campos de entidade (mantém o padrão já existente: `client_id`, `created_at`...).
- Datas em ISO-8601 (UTC). Valores monetários como **número em reais** (`Float`, 2 casas) — ex.: `149.9`.
- Autenticação: `Authorization: Bearer <access_token>` em todas as rotas, exceto as marcadas como **pública**.
- Listagens paginadas retornam:
  ```json
  { "data": [ ... ], "meta": { "page": 1, "page_size": 20, "total": 134 } }
  ```
  Query params padrão: `q` (busca), `page` (1-based), `page_size` (máx 100), `sort`, `order` (`asc|desc`).
- Erros: formato padrão do Nest `{ "statusCode": 400, "message": "texto" | ["textos"], "error": "Bad Request" }`.
  Mensagens em **português**.
- Exclusões de entidades com histórico (clientes, produtos, serviços, usuários) são **soft delete**
  (`deleted_at` / `active=false`) — nunca somem das OS antigas.
- Papéis (`role`): `ADMIN`, `TECNICO`, `ATENDENTE`.
  - `ADMIN`: tudo.
  - `ATENDENTE`: clientes, OS (criar/editar/status/pagamentos/entrega), leitura de catálogos.
  - `TECNICO`: OS (diagnóstico, itens, status), leitura de clientes e catálogos.
  - Rotas de `users` (gerenciar), `settings` (escrita), `backup` e `audit` → somente `ADMIN`.

## Saúde / runtime

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` (pública) | `{ status: "ok", version, db: "ok", mode: "local" \| "server", time }` |

## Autenticação (`/api/auth`)

| Método | Rota | Body | Resposta |
|---|---|---|---|
| GET | `/status` (pública) | — | `{ needs_setup: boolean }` (true quando não existe nenhum usuário) |
| POST | `/setup` (pública, só funciona se `needs_setup`) | `{ name, username, email, password, company_name? }` | `AuthResponse` (cria ADMIN) |
| POST | `/login` (pública, rate-limit forte) | `{ login, password }` — `login` = e-mail **ou** username | `AuthResponse` |
| POST | `/refresh` (pública) | `{ refresh_token? }` (ou cookie `symnager_rt`) | `AuthResponse` (rotação: o token antigo é revogado) |
| POST | `/logout` | `{ refresh_token? }` | `204` |
| GET | `/me` | — | `User` |

```ts
type AuthResponse = {
  access_token: string      // JWT curto (15 min) — payload: { sub, username, role }  (NUNCA senha/hash)
  refresh_token: string     // opaco, aleatório (64 bytes hex), armazenado com hash na tabela sessions, 30 dias
  expires_in: number        // segundos do access_token
  user: User
}
```
Também envia `Set-Cookie: symnager_rt=<refresh>; HttpOnly; SameSite=Strict; Path=/api/auth; Secure (quando HTTPS)`.

Segurança de login: bcrypt (custo 12), bloqueio após 5 tentativas falhas por 15 min (`failed_attempts`,
`locked_until`), mensagem genérica "Credenciais inválidas." (não revela se o usuário existe).

## Usuários (`/api/users`)

```ts
type User = {
  user_id: number; name: string; username: string; email: string;
  role: 'ADMIN' | 'TECNICO' | 'ATENDENTE'; active: boolean;
  phone: string | null; last_login_at: string | null; created_at: string; updated_at: string
}
```
| Método | Rota | Notas |
|---|---|---|
| GET | `/users` | paginado, `q`, `role`, `active` — ADMIN (TECNICO/ATENDENTE podem listar `?role=TECNICO&active=true` para selects: liberar GET para todos autenticados, retornando só campos públicos) |
| POST | `/users` | ADMIN — `{ name, username, email, password, role, phone? }` |
| GET | `/users/:id` | |
| PUT | `/users/:id` | ADMIN — campos parciais (incl. `role`, `active`, `password` opcional) |
| DELETE | `/users/:id` | ADMIN — desativa (`active=false`), não pode desativar a si mesmo nem o último ADMIN |
| PATCH | `/users/me` | `{ name?, email?, phone?, username? }` |
| PATCH | `/users/me/password` | `{ current_password, new_password }` — revoga outras sessões |

Política de senha: mínimo 8 caracteres, ao menos 1 letra e 1 número.

## Clientes (`/api/clients`)

```ts
type Client = {
  client_id: number; type: 'PF' | 'PJ'; name: string; document: string | null; // CPF/CNPJ só dígitos
  email: string | null; phone: string; phone2: string | null;
  zipcode: string | null; street: string | null; number: string | null; complement: string | null;
  district: string | null; city: string | null; state: string | null; notes: string | null;
  created_by: number; created_at: string; updated_at: string; deleted_at: string | null;
  _count?: { orders: number }
}
```
| Método | Rota | Notas |
|---|---|---|
| GET | `/clients` | paginado; `q` busca em name/document/email/phone; inclui `_count.orders` |
| POST | `/clients` | 409 se `document` ou `email` já existirem em cliente ativo, a menos que `?force=true` |
| GET | `/clients/:id` | inclui `stats: { orders_total, orders_open, total_spent, last_order_at }` |
| GET | `/clients/:id/orders` | paginado |
| PUT | `/clients/:id` | parcial; mesmas regras de conflito |
| DELETE | `/clients/:id` | soft delete |

## Ordens de serviço (`/api/orders`)

Status (fluxo):
`ABERTA → EM_ANALISE → AGUARDANDO_APROVACAO → APROVADA → AGUARDANDO_PECA → EM_REPARO → PRONTA → ENTREGUE`
e `CANCELADA` (a partir de qualquer não-final). Transições livres entre não-finais são permitidas
(o frontend usa kanban), `ENTREGUE` e `CANCELADA` só podem ser reabertas por ADMIN (volta para `ABERTA`).
Prioridade: `BAIXA | NORMAL | ALTA | URGENTE`.

```ts
type Order = {
  order_id: number; number: number;            // number = sequencial exibido como "OS-000123"
  tracking_code: string;                       // 8 chars [A-Z0-9] sem ambíguos, para consulta pública
  status: OrderStatus; priority: Priority;
  owner_id: number; owner?: Pick<Client,'client_id'|'name'|'phone'|'email'|'document'>;
  technician_id: number | null; technician?: { user_id, name } | null;
  created_by_id: number; created_by?: { user_id, name };
  device: string;                              // descrição livre do equipamento ("Samsung Galaxy S20")
  device_type: string | null; brand: string | null; model: string | null; serial: string | null;
  accessories: string | null; condition: string | null; device_password: string | null;
  description: string;                         // defeito relatado pelo cliente
  diagnosis: string | null; solution: string | null; internal_notes: string | null;
  arrived_at: string; due_date: string | null; finished_at: string | null; delivered_at: string | null;
  warranty_days: number; warranty_until: string | null;
  discount: number; total_services: number; total_products: number; total: number; paid: number;
  tags: { tag_id: number; slug: string }[];
  created_at: string; updated_at: string;
  // somente em GET /orders/:id
  items?: OrderItem[]; payments?: Payment[]; history?: OrderHistory[]; failures?: DeliveryFailure[];
}
type OrderItem = { item_id, order_id, kind: 'SERVICE'|'PRODUCT', service_id: number|null, product_id: number|null,
                   description: string, quantity: number, unit_price: number, total: number }
type Payment = { payment_id, order_id, method: string, amount: number, paid_at: string, notes: string|null, user?: {user_id,name} }
type OrderHistory = { history_id, order_id, type: 'CREATED'|'STATUS'|'COMMENT'|'ITEM'|'PAYMENT'|'FAILURE'|'UPDATE'|'PRINT',
                      from_status: string|null, to_status: string|null, message: string|null, created_at, user?: {user_id,name} }
```

| Método | Rota | Notas |
|---|---|---|
| GET | `/orders` | paginado; filtros `q` (device/description/owner.name/number/tracking_code/serial), `status` (CSV), `priority`, `technician_id`, `owner_id`, `from`, `to` (arrived_at), `overdue=true` |
| GET | `/orders/board` | `{ [status]: Order[] }` com OS não-finais + ENTREGUE/CANCELADA dos últimos 7 dias (kanban) |
| POST | `/orders` | `{ owner_id, device, description, device_type?, brand?, model?, serial?, accessories?, condition?, device_password?, priority?, technician_id?, due_date?, warranty_days?, tags?: string[], items?: ItemInput[] }` |
| GET | `/orders/:id` | completo (items, payments, history, failures) |
| PUT | `/orders/:id` | parcial dos campos editáveis (não muda status) |
| PATCH | `/orders/:id/status` | `{ status, message? }` — registra history; `PRONTA` seta `finished_at`; `ENTREGUE` seta `delivered_at` e `warranty_until` |
| DELETE | `/orders/:id` | ADMIN — remove definitivamente (devolve estoque) |
| POST | `/orders/:id/items` | `ItemInput = { kind, service_id?, product_id?, description?, quantity, unit_price? }` — PRODUCT baixa estoque; recalcula totais |
| PUT | `/orders/:id/items/:itemId` | parcial; ajusta estoque pela diferença |
| DELETE | `/orders/:id/items/:itemId` | devolve estoque |
| POST | `/orders/:id/payments` | `{ method, amount, paid_at?, notes? }` |
| DELETE | `/orders/:id/payments/:paymentId` | |
| POST | `/orders/:id/comments` | `{ message }` → history `COMMENT` |
| POST | `/orders/:id/print` | registra history `PRINT` (auditoria de impressão) — `{ layout: 'A4'|'THERMAL' }` |
| GET | `/orders/:id/failures` | lista de falhas da OS |
| POST | `/orders/:id/failures` | ver abaixo |

## Falhas de entrega / retornos (`/api/failures`)

```ts
type DeliveryFailure = {
  failure_id, order_id, order?: { order_id, number, device, owner: { name } },
  category: 'ENTREGA' | 'GARANTIA' | 'RETRABALHO' | 'PECA' | 'ATRASO' | 'OUTRO',
  reason: string;              // vindo do cadastro auxiliar FAILURE_REASON (texto livre aceito)
  description: string | null; occurred_at: string;
  resolved: boolean; resolved_at: string | null; resolution: string | null;
  technician_id: number | null;   // técnico responsável pela OS no momento
  user?: { user_id, name }; created_at
}
```
| Método | Rota | Notas |
|---|---|---|
| GET | `/failures` | paginado; `category`, `resolved`, `from`, `to`, `technician_id`, `q` |
| POST | `/orders/:id/failures` | `{ category, reason, description?, occurred_at? }` → history `FAILURE` |
| PUT | `/failures/:id` | parcial; `{ resolved: true, resolution }` seta `resolved_at` |
| DELETE | `/failures/:id` | ADMIN |
| GET | `/failures/stats?from&to` | `{ total, open, resolved, rate /* falhas ÷ OS entregues no período */, by_category: [{key,count}], by_reason: [{key,count}], by_technician: [{user_id,name,count,delivered}], by_device_type: [{key,count}], by_brand: [{key,count}], timeline: [{date /*YYYY-MM-DD semana*/, count}], avg_resolution_hours }` |

## Catálogos

### Serviços (`/api/services`)
`{ service_id, name, description|null, price, estimated_minutes|null, warranty_days, active, created_at, updated_at }`
GET (paginado, `q`, `active`), POST, GET `/:id`, PUT `/:id`, DELETE `/:id` (desativa).

### Produtos / peças (`/api/products`)
`{ product_id, sku|null, name, description|null, unit /* 'UN' */, cost_price, sale_price, stock, min_stock, supplier_id|null, supplier?: {supplier_id,name}, active, created_at, updated_at }`
GET (paginado, `q`, `active`, `low_stock=true`), POST, GET `/:id`, PUT `/:id`, DELETE `/:id` (desativa),
POST `/:id/stock` `{ type: 'IN'|'OUT'|'ADJUST', quantity, reason? }`, GET `/:id/movements` (paginado).

### Fornecedores (`/api/suppliers`)
`{ supplier_id, name, document|null, email|null, phone|null, contact|null, notes|null, active, created_at, updated_at }`
CRUD padrão (DELETE desativa).

### Cadastros auxiliares (`/api/lookups`)
`{ lookup_id, kind: 'DEVICE_TYPE'|'BRAND'|'PAYMENT_METHOD'|'FAILURE_REASON'|'ACCESSORY'|'CHECKLIST', name, active, sort }`
GET `/lookups?kind=BRAND` (não paginado, ordenado por `sort, name`), POST, PUT `/:id`, DELETE `/:id`.
Seeds iniciais criados no setup (ex.: Smartphone/Notebook/Tablet/Console…, Dinheiro/PIX/Cartão de crédito/Cartão de débito,
"Cliente ausente", "Endereço incorreto", "Defeito voltou", "Peça com defeito", "Atraso na peça"...).

## Dashboard (`/api/dashboard?from&to`)

```ts
{
  period: { from, to },
  kpis: {
    open: number; overdue: number; ready_waiting_pickup: number;
    created: number; delivered: number; canceled: number;        // no período
    revenue: number;                                             // soma de payments.paid_at no período
    receivable: number;                                          // total - paid de OS PRONTA/ENTREGUE
    avg_ticket: number; avg_turnaround_hours: number;            // arrived_at → finished_at
    failure_rate: number; new_clients: number;
  },
  by_status: [{ status, count }],
  orders_per_day: [{ date, created, delivered }],
  revenue_per_day: [{ date, amount }],
  top_devices: [{ key, count }], top_brands: [{ key, count }],
  top_services: [{ service_id, name, count, amount }],
  technicians: [{ user_id, name, open, finished, revenue }],
  low_stock: Product[], recent_orders: Order[]
}
```

## Configurações (`/api/settings`)

Chave/valor JSON. GET `/settings` (todos autenticados) → objeto; PUT `/settings` (ADMIN) → merge parcial.
Chaves conhecidas:
```ts
{
  company: { name, document, phone, email, address, city, state, zipcode, logo /* data URL ≤ 300KB */ },
  orders:  { prefix: 'OS', default_warranty_days: 90, terms /* texto impresso no rodapé */, require_technician: false,
             public_url: '' /* URL web pública do /rastreio, usada no QR do comprovante */ },
  print:   { layout: 'A4'|'THERMAL', copies: 1, show_qrcode: true, show_prices: true }
}
```

## Consulta pública (`/api/public`)
| GET | `/public/track/:code` (pública, rate-limit) | `{ number, status, device, arrived_at, finished_at, delivered_at, company: { name, phone } }` — nada sensível |

## Backup / exportação (`/api/backup`) — ADMIN
| Método | Rota | Notas |
|---|---|---|
| GET | `/backup/database` | download do arquivo SQLite consistente (`VACUUM INTO` em arquivo temporário) — `Content-Disposition: attachment; filename="symnager-YYYYMMDD-HHmm.db"` |
| GET | `/backup/json` | dump JSON de todas as tabelas (sem `password` e sem `sessions`) |
| GET | `/backup/csv/:entity` | `entity ∈ clients|orders|products|services|suppliers|payments|failures` (CSV `;` UTF-8 com BOM, para Excel pt-BR) |
| POST | `/backup/restore` | `multipart/form-data` campo `file` (.db) + `password` (do ADMIN logado). Valida cabeçalho `SQLite format 3`, faz backup automático do atual e substitui. |

## Auditoria (`/api/audit`) — ADMIN
GET `/audit` paginado `{ audit_id, user?: {user_id,name}, action, entity, entity_id, ip, meta, created_at }`.

## Variáveis de ambiente da API

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3333` | porta HTTP |
| `HOST` | `127.0.0.1` | bind (Docker usa `0.0.0.0`) |
| `DATABASE_URL` | `file:./dev.db` | SQLite |
| `JWT_SECRET` | **obrigatório** (≥ 32 chars) — Electron gera e guarda em `userData/secrets.json` |
| `JWT_EXPIRES_IN` | `15m` | |
| `REFRESH_TTL_DAYS` | `30` | |
| `CORS_ORIGINS` | `http://localhost:5173,app://symnager` | lista separada por vírgula |
| `TRUST_PROXY` | `false` | `true` atrás do nginx |
| `APP_MODE` | `server` | `local` (Electron) ou `server` |
| `RUN_MIGRATIONS` | `true` | aplica `prisma/migrations/*/migration.sql` no boot (sem precisar do CLI) |
| `COOKIE_SECURE` | `false` | `true` em HTTPS |

## Medidas de segurança esperadas na API
helmet, CORS por allowlist, `@nestjs/throttler` (global 300 req/min; login 10/min; track 30/min),
`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, limite de body (1 MB, upload 200 MB só no restore),
JWT sem dados sensíveis, refresh token rotativo com hash SHA-256 em `sessions`, bcrypt 12, lockout,
RolesGuard, auditoria de ações sensíveis, `x-powered-by` desligado, erros 500 sem stack em produção,
validação de env no boot (recusa iniciar sem `JWT_SECRET` forte), shutdown hooks do Prisma.
