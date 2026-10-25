---
name: symnager-ui
description: Visual language and component conventions of the Symnager frontend (zinc palette, bordered panels, dark mode by class, lucide icons, pt-BR copy). Load before creating or editing any page, component or CSS in Symnager-tanstack-hookform so new screens match the existing look.
---

# Symnager — guia de estilo da interface

Extraído das telas originais (Home/History/NewJobForm, User/Registration, ClientDetails, Sidebar).
Toda tela nova deve parecer que sempre esteve no app.

## Princípios

1. **Monocromático zinc** — sem cores de marca. Cor só para significado (status, sucesso, perigo).
2. **Painéis com borda fina**, não sombras pesadas nem fundos coloridos. Separação = `border` + `rounded-md`.
3. **Fundo transparente + hover sutil** em tudo que é clicável.
4. **Cabeçalho de seção** = ícone dentro de uma caixinha com borda + título em negrito.
5. **Dark mode por classe** (`html.dark`), toda classe de cor tem par `dark:`.
6. **Textos em português (pt-BR)**, curtos. Datas com `date-fns` + `ptBR`.

## Tokens (Tailwind)

| Papel | Claro | Escuro |
|---|---|---|
| Fundo do app | `bg-zinc-100` | `dark:bg-zinc-950` |
| Texto principal | `text-zinc-950` / `text-zinc-900` | `dark:text-zinc-200` / `dark:text-zinc-300` |
| Texto secundário | `text-zinc-600` | `dark:text-zinc-400` |
| Texto apagado | `text-zinc-400`/`500` | `dark:text-zinc-500`/`600` |
| Borda | `border-zinc-300` | `dark:border-zinc-800` (ou `/80`) |
| Superfície destacada (barra de título de form, legend) | `bg-zinc-200` | `dark:bg-zinc-800/80` |
| Hover de item | `hover:bg-zinc-200` | `dark:hover:bg-zinc-800/80` |
| Input "preenchido" (busca) | `bg-zinc-300 border-zinc-400` | `dark:bg-zinc-800 dark:border-zinc-700/80` |
| Chip/tag invertido | `bg-zinc-950 text-zinc-100` | `dark:bg-zinc-200 dark:text-zinc-950` |
| Sucesso | `text-green-500`, `hover:bg-green-300` | `dark:hover:bg-green-900` |
| Perigo | `text-red-500`, `hover:bg-red-300` | `dark:hover:bg-red-800` |

Transições: sempre `transition duration-200`. Raio: `rounded-md` (containers, botões), `rounded-sm` (inputs, barras), `rounded-full` só em inputs de busca de modal e badges.

Cores de status de OS (únicas cores "vivas" permitidas, sempre como badge discreto `bg-<cor>-500/15 text-<cor>-700 dark:text-<cor>-300 border border-<cor>-500/30`):
ABERTA=zinc, EM_ANALISE=sky, AGUARDANDO_APROVACAO=amber, APROVADA=indigo, AGUARDANDO_PECA=orange, EM_REPARO=violet, PRONTA=emerald, ENTREGUE=green, CANCELADA=red.
Prioridade: BAIXA=zinc, NORMAL=sky, ALTA=amber, URGENTE=red.

## Padrões de layout

- O `Layout` é: `Header` (barra fina com botão de menu) + `Sidebar` recolhível + `<Outlet/>`.
- Páginas ocupam `w-full h-full` e **não** rolam o body; quem rola é a área interna (`overflow-y-auto`).
  Evite `absolute inset-*` para layout de página — foi a origem de sobreposições e cortes nas telas antigas.
  Use flex column: cabeçalho fixo (`shrink-0`) + corpo `flex-1 min-h-0 overflow-y-auto`.
- Telas com duas colunas usam **`<SplitPane>`** (`src/components/ui/SplitPane.tsx`) — divisória arrastável
  com o mouse, tamanho persistido por `storageKey`; em telas estreitas (<768px) vira coluna única empilhada.
- Seção padrão:
  ```tsx
  <PageHeader icon={History} title="Histórico" actions={...} />
  ```
  que renderiza
  ```tsx
  <h1 className="p-2 flex items-center gap-2 text-2xl font-bold border-b border-zinc-300 dark:border-zinc-800 w-full">
    <div className="rounded-md border border-zinc-300 dark:border-zinc-800/80 p-0.5"><Icon size={24}/></div>
    Título
  </h1>
  ```
- Formulário padrão: container `border border-zinc-300 dark:border-zinc-800/80 rounded-md m-2 flex flex-col gap-2`
  com barra de título `bg-zinc-200 dark:bg-zinc-800/80 rounded-sm p-1 text-xl font-bold flex justify-between items-center` e ícone à direita.
- Card de lista (HistoryBox/UserBox): `flex flex-col gap-2 p-2 border border-zinc-300 dark:border-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200 shadow-md`
  — header com nome em `font-bold text-lg` à esquerda e data relativa `text-sm font-medium text-zinc-600` à direita.
- Skeleton de carregamento: blocos `bg-zinc-200 dark:bg-zinc-800/80 animate-pulse` com barras internas `bg-zinc-300 dark:bg-zinc-500`.

## Componentes base (use-os, não recrie)

Todos em `src/components/ui/`:
`Button` (variants: `default` borda+transparente, `primary` invertido zinc-950/zinc-200, `success`, `danger`, `ghost`; sizes `sm|md`),
`TextField`/`SelectField`/`TextAreaField` (label visível pequena + input `bg-transparent border rounded-sm px-2 py-1`, integra com `react-hook-form` via `register`, mostra `error`),
`SearchInput` (estilo do input "Pesquisar" original), `PageHeader`, `Panel`, `Badge`/`StatusBadge`/`PriorityBadge`,
`Modal` (Radix Dialog com overlay `bg-zinc-800/50` e conteúdo `bg-zinc-100 dark:bg-zinc-950` com borda — igual ao ModalContent original),
`ConfirmDialog`, `DataTable` (tabela simples com cabeçalho `bg-zinc-200 dark:bg-zinc-800/80`), `Pagination`, `EmptyState`, `Spinner`, `ListSkeleton`, `SplitPane`, `Tabs`, `StatCard`.

## Interação e feedback

- **Nunca use `alert()`/`confirm()`** — use `toast` do `sonner` (já montado no `App`) e `ConfirmDialog`.
- Botão de submit mostra `<Loader className="animate-spin"/>` enquanto `isPending` e fica `disabled:opacity-50 disabled:cursor-not-allowed`.
- Dados do servidor sempre via TanStack Query (`useQuery`/`useMutation`) usando os hooks/funções de `src/lib/` e `src/services/`; nunca `fetch('http://localhost:3000')` direto.
- Atalhos: `Ctrl+K` abre a busca global; `Esc` fecha modais.
- Acessibilidade: todo input tem `<label htmlFor>` (pode ser `sr-only`), botões só com ícone têm `aria-label`/`title`.

## Ícones

`lucide-react`, `size={20}` em linha/botões, `size={24}` em cabeçalhos, `strokeWidth` padrão.

## Impressão

Conteúdo imprimível fica dentro de `.print-area`; `@media print` em `globals.css` esconde o resto.
Layout A4 e térmico 80 mm (`.print-thermal`). Na impressão é sempre preto no branco, independente do tema.
