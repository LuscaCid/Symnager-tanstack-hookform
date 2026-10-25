import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { ReactNode, useState } from "react"
import { cn } from "@/lib/cn"
import { Button } from "./Button"
import { TextField } from "./Field"

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: "sm" | "md" | "lg" | "xl"
}

const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }

/** Diálogo padrão: cartão elevado sobre fundo escurecido. */
export function Modal({ open, onOpenChange, title, description, children, footer, size = "md" }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35" />
        <Dialog.Content
          className={cn(
            "fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
            "flex flex-col rounded-xl border border-line bg-surface shadow-2xl",
            "text-fg  focus:outline-none",
            widths[size],
          )}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div>
              <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-sm text-muted ">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="-mr-1 -mt-1 h-8 w-8 inline-flex items-center justify-center rounded-lg text-faint hover:bg-hover hover:text-fg transition-colors"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="px-5 pb-5 overflow-y-auto min-h-0">{children}</div>
          {footer && <div className="px-5 py-3 border-t border-line bg-subtle/50 rounded-b-xl flex flex-wrap justify-end gap-2">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  tone?: "danger" | "default"
  loading?: boolean
  /** exige a senha do usuário para confirmar (ações destrutivas) */
  requirePassword?: boolean
  onConfirm: (password?: string) => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  tone = "danger",
  loading,
  requirePassword,
  onConfirm,
}: ConfirmDialogProps) {
  const [password, setPassword] = useState("")
  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) setPassword("")
        onOpenChange(o)
      }}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            loading={loading}
            disabled={requirePassword && !password}
            onClick={() => onConfirm(requirePassword ? password : undefined)}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && <div className="text-sm text-muted">{description}</div>}
      {requirePassword && (
        <TextField
          wrapperClassName="mt-3"
          label="Confirme com sua senha"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      )}
    </Modal>
  )
}
