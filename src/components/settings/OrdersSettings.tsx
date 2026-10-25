import { zodResolver } from "@hookform/resolvers/zod"
import { ClipboardList, Save } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button, Checkbox, Panel, Spinner, TextAreaField, TextField } from "@/components/ui"
import { useSettings } from "@/lib/hooks"
import { formatOrderNumber } from "@/lib/format"
import { withDefaults } from "./defaults"
import { useSaveSettings } from "./useSaveSettings"

const schema = z.object({
  prefix: z
    .string()
    .trim()
    .min(1, "Informe o prefixo")
    .max(6, "Máximo de 6 caracteres")
    .regex(/^[A-Za-z0-9]+$/, "Use apenas letras e números"),
  default_warranty_days: z.coerce.number().int("Número inteiro").min(0, "Mínimo 0").max(3650, "Máximo 3650"),
  terms: z.string().max(4000, "Texto muito longo (máx. 4000 caracteres)"),
  require_technician: z.boolean(),
  public_url: z
    .string()
    .trim()
    .refine((v) => !v || /^https?:\/\/[^\s]+$/i.test(v), "Use um endereço começando com http:// ou https://"),
})
type FormType = z.input<typeof schema>

export function OrdersSettings() {
  const { data, isLoading } = useSettings()
  const save = useSaveSettings("Configurações de OS salvas.")
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormType>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!data) return
    const o = withDefaults(data).orders
    reset({ ...o, public_url: o.public_url ?? "" })
  }, [data, reset])

  if (isLoading) return <Spinner />

  const prefix = watch("prefix") || "OS"

  return (
    <Panel title="Ordens de serviço" icon={ClipboardList}>
      <form
        noValidate
        onSubmit={handleSubmit((form) => {
          const parsed = schema.parse(form)
          save.mutate({ orders: { ...parsed, prefix: parsed.prefix.toUpperCase(), public_url: parsed.public_url.replace(/\/+$/, "") } })
        })}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        <TextField
          label="Prefixo da numeração"
          maxLength={6}
          hint={`Exemplo: ${formatOrderNumber(123, prefix.toUpperCase())}`}
          error={errors.prefix?.message}
          {...register("prefix")}
        />
        <TextField
          label="Garantia padrão (dias)"
          type="number"
          min={0}
          max={3650}
          error={errors.default_warranty_days?.message}
          {...register("default_warranty_days")}
        />
        <TextField
          label="Endereço público de rastreio"
          wrapperClassName="sm:col-span-2"
          placeholder="https://os.minhaempresa.com.br"
          hint="Endereço web onde os clientes acessam /rastreio. Usado no QR code do comprovante; vazio = o QR mostra só o código."
          error={errors.public_url?.message}
          {...register("public_url")}
        />
        <TextAreaField
          label="Termos impressos no comprovante"
          wrapperClassName="sm:col-span-2"
          className="min-h-32"
          placeholder="Ex.: Equipamentos não retirados em 90 dias após a conclusão serão considerados abandonados..."
          error={errors.terms?.message}
          {...register("terms")}
        />
        <Checkbox
          className="sm:col-span-2"
          label="Exigir técnico responsável ao abrir uma OS"
          {...register("require_technician")}
        />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" icon={Save} loading={save.isPending} disabled={!isDirty}>
            Salvar
          </Button>
        </div>
      </form>
    </Panel>
  )
}
