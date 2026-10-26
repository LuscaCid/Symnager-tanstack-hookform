import { zodResolver } from "@hookform/resolvers/zod"
import { Award, Save } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { CertificateSettings as CertificateSettingsType } from "@/@types/api"
import { Button, Checkbox, Panel, SkeletonForm, TextAreaField, TextField } from "@/components/ui"
import { useSettings } from "@/lib/hooks"
import { useSaveSettings } from "./useSaveSettings"

export const DEFAULT_CERTIFICATE_SETTINGS: CertificateSettingsType = {
  prefix: "CERT",
  responsible_name: "",
  responsible_registry: "",
  hygiene_months: 6,
  preventive_months: 3,
  notes: "",
  show_qrcode: true,
}

const months = z.coerce.number().int("Número inteiro").min(1, "Mínimo 1").max(36, "Máximo 36")

const schema = z.object({
  prefix: z
    .string()
    .trim()
    .min(1, "Informe o prefixo")
    .max(10, "Máximo de 10 caracteres")
    .regex(/^[A-Za-z0-9]+$/, "Use apenas letras e números"),
  responsible_name: z.string().trim().max(120),
  responsible_registry: z.string().trim().max(60),
  hygiene_months: months,
  preventive_months: months,
  notes: z.string().max(2000, "Texto muito longo"),
  show_qrcode: z.boolean(),
})
type FormType = z.input<typeof schema>

/** Configurações dos certificados de higienização e manutenção preventiva. */
export function CertificateSettings() {
  const { data, isLoading } = useSettings()
  const save = useSaveSettings("Configurações de certificados salvas.")
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormType>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (data) reset({ ...DEFAULT_CERTIFICATE_SETTINGS, ...(data.certificates ?? {}) })
  }, [data, reset])

  if (isLoading) return <SkeletonForm fields={6} columns={2} />

  return (
    <Panel title="Certificados" icon={Award}>
      <form
        noValidate
        onSubmit={handleSubmit((form) => {
          const parsed = schema.parse(form)
          save.mutate({ certificates: { ...parsed, prefix: parsed.prefix.toUpperCase() } })
        })}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
      >
        <TextField label="Prefixo da numeração" maxLength={10} hint="Exemplo: CERT-000012" error={errors.prefix?.message} {...register("prefix")} />
        <div />
        <TextField
          label="Responsável técnico"
          placeholder="Nome impresso quando a OS não tem técnico"
          error={errors.responsible_name?.message}
          {...register("responsible_name")}
        />
        <TextField
          label="Registro profissional"
          placeholder="ex.: CREA, CFT, nº do registro"
          error={errors.responsible_registry?.message}
          {...register("responsible_registry")}
        />
        <TextField
          label="Próxima higienização (meses)"
          type="number"
          min={1}
          max={36}
          hint="Sugere a data da próxima limpeza"
          error={errors.hygiene_months?.message}
          {...register("hygiene_months")}
        />
        <TextField
          label="Próxima preventiva (meses)"
          type="number"
          min={1}
          max={36}
          hint="Sugere a data da próxima manutenção"
          error={errors.preventive_months?.message}
          {...register("preventive_months")}
        />
        <TextAreaField
          label="Observações no rodapé"
          wrapperClassName="sm:col-span-2"
          className="min-h-20"
          placeholder="Ex.: Produtos com registro na Anvisa. Recomenda-se a limpeza dos filtros a cada 30 dias."
          error={errors.notes?.message}
          {...register("notes")}
        />
        <Checkbox className="sm:col-span-2" label="Imprimir QR code de verificação" {...register("show_qrcode")} />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" icon={Save} loading={save.isPending} disabled={!isDirty}>
            Salvar
          </Button>
        </div>
      </form>
    </Panel>
  )
}
