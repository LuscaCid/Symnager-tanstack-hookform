import * as RadixTooltip from "@radix-ui/react-tooltip"
import { ReactElement, ReactNode } from "react"
import { cn } from "@/lib/cn"

/** Provider único no App: abre rápido (150 ms) e, passando de um item a outro, sem atraso. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={150} skipDelayDuration={300}>
      {children}
    </RadixTooltip.Provider>
  )
}

interface TooltipProps {
  /** texto (ou conteúdo) exibido; vazio/undefined = sem tooltip */
  content?: ReactNode
  /** atalho de teclado mostrado ao lado, ex.: "Ctrl K" */
  shortcut?: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  /** elemento que recebe o tooltip (precisa aceitar ref: botão, link, span...) */
  children: ReactElement
  disabled?: boolean
}

/**
 * Tooltip do app (substitui o atributo `title`, que demora ~400 ms e não segue o tema).
 * Acessível: aparece também no foco por teclado e é lido pelo leitor de tela.
 */
export function Tooltip({ content, shortcut, side = "bottom", align = "center", children, disabled }: TooltipProps) {
  if (!content || disabled) return children
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "z-[60] max-w-xs rounded-md px-2 py-1 text-xs font-medium leading-snug shadow-md select-none",
            "bg-fg text-app",
            "data-[state=delayed-open]:animate-tooltip-in data-[state=instant-open]:animate-tooltip-in",
          )}
        >
          <span className="flex items-center gap-2">
            {content}
            {shortcut && <kbd className="font-sans text-[10px] opacity-60">{shortcut}</kbd>}
          </span>
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}
