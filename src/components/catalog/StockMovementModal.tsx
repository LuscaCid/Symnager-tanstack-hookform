import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowDownToLine, ArrowUpFromLine, Scale } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import type { Product } from "@/@types/api"
import { Button, Modal, SelectField, TextField } from "@/components/ui"
import { productsService } from "@/services/resources"
import { formatNumber } from "@/lib/format"
import { MOVEMENT_LABEL } from "./labels"

const schema = z.object({
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z
    .string()
    .trim()
    .refine((v) => /^\d+(?:[.,]\d+)?$/.test(v) && Number(v.replace(",", ".")) >= 0, "Quantidade inválida"),
  reason: z.string().trim().max(200).optional(),
})
type FormType = z.infer<typeof schema>


interface Props {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onMoved: (product: Product) => void
}

/** Entrada, saída ou ajuste (define o saldo exato após uma contagem) de estoque. */
export function StockMovementModal({ product, open, onOpenChange, onMoved }: Props) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormType>({ resolver: zodResolver(schema), defaultValues: { type: "IN", quantity: "", reason: "" } })

  const type = watch("type")
  const qty = Number((watch("quantity") || "0").replace(",", ".")) || 0
  const preview = type === "IN" ? product.stock + qty : type === "OUT" ? product.stock - qty : qty

  const move = useMutation({
    mutationFn: (data: FormType) =>
      productsService.moveStock(product.product_id, {
        type: data.type,
        quantity: Number(data.quantity.replace(",", ".")),
        reason: data.reason || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.invalidateQueries({ queryKey: ["product-movements", product.product_id] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      toast.success("Estoque atualizado.")
      reset()
      onMoved(updated)
      onOpenChange(false)
    },
  })

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
      title="Movimentar estoque"
      description={`${product.name} — saldo atual: ${formatNumber(product.stock)} ${product.unit}`}
      size="sm"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="primary"
            loading={move.isPending}
            disabled={type === "OUT" && preview < 0}
            onClick={handleSubmit((data) => move.mutate(data))}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-2"
        onSubmit={handleSubmit((data) => move.mutate(data))}
      >
        <SelectField label="Tipo de movimento" {...register("type")}>
          <option value="IN">{MOVEMENT_LABEL.IN} — compra, devolução</option>
          <option value="OUT">{MOVEMENT_LABEL.OUT} — perda, uso interno</option>
          <option value="ADJUST">{MOVEMENT_LABEL.ADJUST} — define o saldo</option>
        </SelectField>
        <TextField
          label={type === "ADJUST" ? "Novo saldo" : "Quantidade"}
          inputMode="decimal"
          autoFocus
          error={errors.quantity?.message}
          {...register("quantity")}
        />
        <TextField label="Motivo" placeholder="NF 1234, contagem mensal..." error={errors.reason?.message} {...register("reason")} />
        <p className="flex items-center gap-2 text-sm text-muted ">
          {type === "IN" ? <ArrowDownToLine size={16} /> : type === "OUT" ? <ArrowUpFromLine size={16} /> : <Scale size={16} />}
          Saldo após o movimento:{" "}
          <strong className={preview < 0 ? "text-red-500" : "text-fg "}>
            {formatNumber(preview)} {product.unit}
          </strong>
        </p>
        <p className="text-xs text-faint">Peças usadas em OS dão baixa automaticamente ao serem incluídas na ordem.</p>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
