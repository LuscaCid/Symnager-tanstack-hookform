import { ButtonHTMLAttributes, forwardRef } from "react"
import { Loader, LucideIcon } from "lucide-react"
import { cn } from "@/lib/cn"

type Variant = "default" | "primary" | "success" | "danger" | "ghost"
type Size = "sm" | "md"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
}

const variants: Record<Variant, string> = {
  default:
    "bg-transparent border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800/80",
  primary:
    "bg-zinc-950 text-zinc-100 border border-zinc-950 hover:bg-zinc-800 dark:bg-zinc-200 dark:text-zinc-950 dark:border-zinc-200 dark:hover:bg-zinc-300",
  success:
    "bg-zinc-200 dark:bg-zinc-800/80 border border-transparent hover:bg-green-300 dark:hover:bg-green-900",
  danger:
    "bg-zinc-200 dark:bg-zinc-800/80 border border-transparent hover:bg-red-300 dark:hover:bg-red-800",
  ghost: "bg-transparent border border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800/80",
}

const sizes: Record<Size, string> = {
  sm: "text-sm px-2 py-1 gap-1",
  md: "px-3 py-2 gap-2",
}

const iconColor: Partial<Record<Variant, string>> = {
  success: "text-green-500",
  danger: "text-red-500",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "md", icon: Icon, loading, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold transition duration-200 whitespace-nowrap",
        "disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader className="animate-spin" size={size === "sm" ? 16 : 20} />
      ) : (
        Icon && <Icon className={iconColor[variant]} size={size === "sm" ? 16 : 20} />
      )}
      {children}
    </button>
  )
})

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  tone?: "default" | "danger"
}

export function IconButton({ icon: Icon, label, tone = "default", className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "p-1 rounded-md bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        tone === "danger" && "text-red-500 hover:text-red-600",
        className,
      )}
      {...props}
    >
      <Icon size={18} />
    </button>
  )
}
