---
name: symnager-ui
description: Visual language and component conventions of the Symnager frontend (semantic color tokens, soft layered surfaces, single teal accent, Inter, rounded 8–16px, pt-BR copy). Load before creating or editing any page, component or CSS in Symnager-tanstack-hookform so new screens match the current look.
---

# Symnager — guia de estilo da interface (v2)

Direção: ferramenta de trabalho calma e legível. Superfícies em camadas em vez de bordas fortes,
neutros levemente quentes, **um único destaque** (verde-petróleo) e nada de efeitos chamativos.

## O que NÃO fazer (evita cara de "produto de IA" e o visual pesado antigo)
- Sem gradientes, brilho/glow, vidro fosco (backdrop-blur decorativo), ícone de faísca ✨, roxo/índigo como marca.
- Sem `font-bold` em massa — títulos usam `font-semibold`, rótulos `font-medium`.
- Sem cores fixas `zinc-*`/`gray-*` nem pares `dark:` para neutros: use **tokens** (abaixo). Os tokens já mudam com o tema.
- Sem barras de título cinza-escuras dentro de cartões; título de seção é texto `text-sm font-semibold`.
- Sem `absolute inset-*` para layout de página.

## Tokens (Tailwind → variáveis CSS em `src/globals.css`)

| Classe | Uso |
|---|---|
| `bg-app` | fundo da janela/páginas |
| `bg-surface` | cartões, painéis, sidebar, header, modais, inputs |
| `bg-subtle` | campos de busca, trilhas de controles segmentados, skeleton |
| `bg-hover` / `hover:bg-hover` | hover de itens clicáveis |
| `border-line` / `border-line-strong` | bordas discretas / hover de borda |
| `text-fg` / `text-muted` / `text-faint` | texto principal / secundário / apoio e placeholders |
| `bg-accent text-accent-fg`, `hover:bg-accent-strong` | ação principal (1 por área), seleção forte |
| `bg-accent-soft text-accent` | item ativo do menu, ícone do cabeçalho, avatar, tags |
| `text-danger` `text-success` `text-warning` (+ `/10` em fundos) | estados |

Alfa funciona: `bg-accent/15`, `border-danger/40`, `bg-subtle/60`.

Raios: `rounded-md` 10px (itens pequenos), `rounded-lg` 12px (botões, inputs), `rounded-xl` 16px (cartões, modais).
Sombras (já suaves no config): `shadow-sm` em cartões/inputs, `shadow` no hover de cartão clicável, `shadow-lg/2xl` só em flutuantes.
Fonte: Inter Variable (embutida, funciona offline). Tamanhos: corpo `text-sm`, apoio `text-[13px]`/`text-xs`, título de página `text-lg font-semibold`.

## Padrões

- **Página**: `<Page>` → `<PageHeader icon title subtitle actions>` (ícone em quadrado `bg-accent-soft text-accent`) → `<PageBody>` (`px-4 pb-4`).
- **Cartão**: `bg-surface border border-line rounded-xl shadow-sm p-4/p-5`. Use `<Panel title>` para cartões com título.
- **Cartão de lista clicável** (OS, cliente): `p-3.5 rounded-xl bg-surface border border-line shadow-sm hover:border-line-strong hover:shadow`.
  Hierarquia: linha pequena `text-xs text-faint` (nº/data) → título `text-sm font-semibold` → apoio `text-[13px] text-muted`.
- **Controle segmentado** (tema, período, lista/quadro): trilha `p-0.5 rounded-lg bg-subtle`; opção ativa `bg-surface text-fg shadow-sm`, inativa `text-muted hover:text-fg`.
- **Tabela** (`DataTable`): cartão branco, cabeçalho `text-xs text-muted` sem fundo, linhas separadas por `border-line`.
- **Badges**: `StatusBadge` = ponto colorido + texto sobre fundo `cor/12`, sem borda.
- **Formulários**: `TextField/SelectField/TextAreaField` (label `text-[13px] text-muted` acima, input `h-9 rounded-lg`, foco `border-accent` + anel `ring-accent/15`).
- **SplitPane**: divisória de 1px `bg-line`; no hover/arraste ganha a cor do destaque e uma alça.
- Status de OS mantém a família de cores (sky, amber, indigo, orange, violet, emerald, green, red) — únicas cores além do destaque.

## Desktop: barra de título própria
A janela do Electron é sem moldura (Windows/Linux). O `Header` é a barra de título: classe `app-drag` (arrasta a janela),
botões/inputs são automaticamente `no-drag`, duplo clique na área livre maximiza, e `WindowControls`
(minimizar / maximizar-restaurar / fechar, F11 = tela cheia) fica à direita. Telas fora do layout usam `<SlimTitleBar/>`.
Elemento interativo novo dentro de uma área `app-drag` que não seja button/input/a precisa da classe `app-no-drag`.

## Componentes base (`src/components/ui/`)
`Button` (default | primary | success | danger | ghost; sm | md), `IconButton`, `TextField`, `SelectField`, `TextAreaField`,
`SearchInput`, `Checkbox`, `PageHeader`, `Panel`, `Page`, `PageBody`, `Badge`, `StatusBadge`, `PriorityBadge`, `TagChip`,
`Modal`, `ConfirmDialog`, `DataTable`, `Pagination`, `Tabs`, `EmptyState`, `ErrorState`, `Spinner`, `ListSkeleton`,
`StatCard`, `SplitPane`. Constante `inputClass` para inputs customizados.

## Interação
- Feedback com `toast` (sonner) e `ConfirmDialog`; nunca `alert()/confirm()`.
- Transições curtas: `transition-colors duration-150`.
- Acessibilidade: label em todo campo, `aria-label` em botões só com ícone, foco visível (`ring-accent/40`).

## Impressão
`.print-area` é sempre preto no branco (independe do tema); `PrintDocument.tsx` não usa tokens de propósito.
