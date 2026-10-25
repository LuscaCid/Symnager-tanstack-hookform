# Mapa de funcionalidades do Symnager

Levantamento feito a partir do estado anterior do projeto (frontend com `json-server` de mock e API com
autenticação em duas etapas, clientes e ordens básicas) e do que um sistema de ordens de serviço costuma ter.

Legenda: ✅ entregue nesta versão · 🟡 parcial · ⏭️ próximo passo sugerido

## Estado anterior → o que mudou

| Área | Antes | Agora |
|---|---|---|
| Dados | `json-server` (server.json) no frontend; API sem uso | API NestJS + SQLite real; mock removido |
| Autenticação | 2 etapas (e-mail → senha); JWT carregava o **hash da senha**; frontend sem login | login único, JWT curto sem dados sensíveis, refresh rotativo, bloqueio por tentativas, setup inicial |
| Clientes | cadastro com bugs (rua recebia o estado, campo "number" fora do schema, inputs travados por `value`) | formulário corrigido, CEP automático, CPF/CNPJ validado, duplicidade confirmável, soft delete |
| OS | criação simples, histórico com filtro no cliente | fluxo completo de status, itens, pagamentos, garantia, histórico, kanban, impressão |
| Layout | `absolute inset-*` cortando conteúdo; sidebar sumindo; scrollbar escura no tema claro | layout flex sem vazamentos, sidebar recolhível em ícones, painéis redimensionáveis |
| Distribuição | — | Electron com API embutida, instalador, Docker web |

## Operação

| Funcionalidade | Status |
|---|---|
| Recepção: abrir OS com cliente, equipamento, defeito, prioridade, técnico, prazo, orçamento inicial | ✅ |
| Detalhes do equipamento: tipo, marca, modelo, série/IMEI, acessórios, estado físico, senha | ✅ |
| Fluxo de status (aberta → análise → aprovação → peça → reparo → pronta → entregue / cancelada) | ✅ |
| Quadro kanban com arrastar e soltar | ✅ |
| Itens de serviço e peça, baixa/devolução automática de estoque | ✅ |
| Pagamentos parciais, saldo, aviso ao entregar com saldo | ✅ |
| Garantia (dias por OS, data limite, retorno em garantia) | ✅ |
| Histórico/linha do tempo + comentários internos | ✅ |
| Aviso ao cliente por WhatsApp (link com mensagem pronta) | ✅ |
| Impressão A4 (2 vias) e térmica 80 mm, QR code, PDF | ✅ |
| Rastreio público por código | ✅ |
| Busca global (Ctrl+K) | ✅ |
| Checklist de entrada (itens marcáveis por OS) | 🟡 cadastro auxiliar existe; marcação por OS ⏭️ |
| Fotos do equipamento na entrada | ⏭️ (upload de anexos) |
| Assinatura digital do cliente na tela | ⏭️ |
| Orçamento com aprovação pelo cliente via link | ⏭️ (estender o rastreio público) |
| Envio automático de e-mail/WhatsApp em mudança de status | ⏭️ (exige integração externa) |

## Gestão

| Funcionalidade | Status |
|---|---|
| Dashboard com KPIs, gráficos, técnicos, estoque baixo | ✅ |
| Mapeamento de falhas de entrega (categorias, motivos, Pareto, por técnico/marca/tipo, insights) | ✅ |
| Exportação CSV por entidade, JSON completo, banco SQLite | ✅ |
| Relatórios em PDF (fechamento de caixa, produtividade por técnico) | ⏭️ |
| Comissão de técnicos | ⏭️ |
| Contas a pagar / fluxo de caixa geral | ⏭️ (fora do escopo de OS) |
| Emissão de NFS-e | ⏭️ (depende de integração com prefeitura) |

## Cadastros

| Cadastro | Status |
|---|---|
| Clientes (PF/PJ) | ✅ |
| Usuários e papéis (Administrador, Técnico, Atendente) | ✅ |
| Serviços (preço, tempo estimado, garantia) | ✅ |
| Produtos/peças e estoque (mínimo, movimentações, fornecedor) | ✅ |
| Fornecedores | ✅ |
| Tipos de equipamento, marcas, formas de pagamento, motivos de falha, acessórios, checklist | ✅ |
| Empresa (dados e logo do comprovante), termos de garantia, numeração | ✅ |

## Plataforma e segurança

| Item | Status |
|---|---|
| App desktop com banco local, backup automático com rotação | ✅ |
| Modo servidor externo (rede local ou nuvem) com teste de conexão | ✅ |
| Docker (web + API), nginx com cabeçalhos de segurança e rate limit | ✅ |
| Auditoria de ações sensíveis | ✅ |
| Restauração de backup com confirmação de senha | ✅ |
| Auto-atualização do app desktop | ⏭️ (`electron-updater` + servidor de releases) |
| Assinatura de código do instalador | ⏭️ (requer certificado) |
| Postgres para instalações grandes | ⏭️ (Prisma suporta; trocar provider + migrações) |
| Autenticação em dois fatores | ⏭️ |
| Testes automatizados (e2e Playwright, unitários da API) | 🟡 type-check/lint/build; testes ⏭️ |
