import { Ban, Save, X } from "lucide-react"
import { useState } from "react"
import { Badge, Button, ConfirmDialog } from "@/components/ui"

interface FormActionsProps {
  canWrite: boolean
  isEdit: boolean
  saving: boolean
  onCancel: () => void
  /** desativar (soft delete). Ausente = sem botão */
  onDeactivate?: () => Promise<unknown>
  deactivating?: boolean
  deactivateLabel?: string
  deactivateDescription?: string
  /** motivo para não permitir desativar (ex.: o próprio usuário) */
  deactivateBlockedReason?: string
  /** item já inativo: esconde o botão de desativar */
  inactive?: boolean
}

/** Rodapé padrão dos formulários de cadastro: salvar, cancelar e desativar com confirmação. */
export function FormActions({
  canWrite,
  isEdit,
  saving,
  onCancel,
  onDeactivate,
  deactivating,
  deactivateLabel = "Desativar",
  deactivateDescription = "O registro deixa de aparecer nas listas e seleções, mas o histórico é preservado. Você pode reativá-lo depois.",
  deactivateBlockedReason,
  inactive,
}: FormActionsProps) {
  const [confirm, setConfirm] = useState(false)

  if (!canWrite) {
    return (
      <div className="flex justify-end pt-2">
        <Button icon={X} onClick={onCancel}>
          Fechar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 pt-2">
      <Button type="submit" variant="success" icon={Save} loading={saving} className="flex-1">
        {isEdit ? "Salvar alterações" : "Cadastrar"}
      </Button>
      <Button icon={X} onClick={onCancel}>
        Cancelar
      </Button>
      {isEdit && onDeactivate && !inactive && (
        <Button
          variant="danger"
          icon={Ban}
          onClick={() => setConfirm(true)}
          disabled={!!deactivateBlockedReason}
          title={deactivateBlockedReason}
        >
          {deactivateLabel}
        </Button>
      )}
      {isEdit && inactive && <Badge className="self-center">Inativo</Badge>}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`${deactivateLabel}?`}
        description={deactivateDescription}
        confirmLabel={deactivateLabel}
        loading={deactivating}
        onConfirm={async () => {
          try {
            await onDeactivate?.()
            setConfirm(false)
          } catch {
            // o erro já é exibido em toast pelo MutationCache
          }
        }}
      />
    </div>
  )
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? null : <Badge className="text-faint">Inativo</Badge>
}
