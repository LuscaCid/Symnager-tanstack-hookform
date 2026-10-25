import { ButtonHTMLAttributes, forwardRef } from "react"
import { Loader, LucideIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { Tooltip } from "./Tooltip"

type Variant = "default" | "primary" | "success" | "danger" | "ghost"
type Size = "sm" | "md"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
  /** dica exibida ao passar o mouse/focar (substitui o atributo title) */
  tooltip?: string
}

const variants: Record<Variant, string> = {
  default: "bg-surface text-fg border border-line shadow-sm hover:bg-hover hover:border-line-strong",
  primary: "bg-accent text-accent-fg border border-transparent shadow-sm hover:bg-accent-strong",
  success: "bg-surface text-success border border-line shadow-sm hover:bg-success/10 hover:border-success/40",
  danger: "bg-surface text-danger border border-line shadow-sm hover:bg-danger/10 hover:border-danger/40",
  ghost: "bg-transparent text-muted border border-transparent hover:bg-hover hover:text-fg",
}

const sizes: Record<Size, string> = {
  sm: "h-8 text-[13px] px-2.5 gap-1.5",
  md: "h-9 text-sm px-3.5 gap-2",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "md", icon: Icon, loading, className, children, disabled, type = "button", tooltip, ...props },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 whitespace-nowrap select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-app",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader className="animate-spin" size={size === "sm" ? 14 : 16} />
      ) : (
        Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2} />
      )}
      {children}
    </button>
  )
  return tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  tone?: "default" | "danger"
  tooltipSide?: "top" | "right" | "bottom" | "left"
}

/** Botão só com ícone: o rótulo vira aria-label e tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, tone = "default", className, type = "button", tooltipSide, ...props },
  ref,
) {
  return (
    <Tooltip content={label} side={tooltipSide}>
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted transition-colors duration-150",
        "hover:bg-hover hover:text-fg disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        tone === "danger" && "hover:text-danger hover:bg-danger/10",
        className,
      )}
      {...props}
    >
      <Icon size={17} />
    </button>
    </Tooltip>
  )
})
