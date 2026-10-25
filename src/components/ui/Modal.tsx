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

/** Diálogo no estilo do ModalContent original (overlay zinc-800/50, conteúdo com borda). */
export function Modal({ open, onOpenChange, title, description, children, footer, size = "md" }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-zinc-800/50 backdrop-blur-[1px]" />
        <Dialog.Content
          className={cn(
            "fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
            "flex flex-col rounded-md border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-2xl",
            "text-zinc-950 dark:text-zinc-200 focus:outline-none",
            widths[size],
          )}
        >
          <div className="flex items-start justify-between gap-2 p-3 border-b border-zinc-300 dark:border-zinc-800">
            <div>
              <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-sm text-zinc-600 dark:text-zinc-400">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="bg-transparent cursor-pointer text-red-500 hover:text-red-600 transition duration-200"
            >
              <X size={22} />
            </Dialog.Close>
          </div>
          <div className="p-3 overflow-y-auto min-h-0">{children}</div>
          {footer && <div className="p-3 border-t border-zinc-300 dark:border-zinc-800 flex flex-wrap justify-end gap-2">{footer}</div>}
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
      {description && <div className="text-sm text-zinc-700 dark:text-zinc-300">{description}</div>}
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
