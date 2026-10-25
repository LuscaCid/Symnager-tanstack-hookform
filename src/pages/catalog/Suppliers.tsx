import { zodResolver } from "@hookform/resolvers/zod"
import { Truck } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { Supplier } from "@/@types/api"
import { Checkbox, TextAreaField, TextField } from "@/components/ui"
import { CatalogFormContext, CatalogPage } from "@/components/catalog/CatalogPage"
import { ActiveBadge, FormActions } from "@/components/catalog/FormActions"
import { useCatalogMutations } from "@/components/catalog/useCatalogMutations"
import { orNull } from "@/components/catalog/money"
import { suppliersService } from "@/services/resources"
import { useHasRole } from "@/contexts/Auth-context"
import { formatDocument, formatPhone, onlyDigits } from "@/lib/format"
import { optionalDocument, optionalEmail } from "@/lib/validation"

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  document: optionalDocument,
  email: optionalEmail,
  phone: z
    .string()
    .trim()
    .refine((v) => !v || (onlyDigits(v).length >= 10 && onlyDigits(v).length <= 13), "Telefone inválido (com DDD)"),
  contact: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
  active: z.boolean(),
})
type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

function SupplierForm({ selected, close, select, canWrite }: CatalogFormContext<Supplier> & { canWrite: boolean }) {
  const { save, deactivate } = useCatalogMutations({
    queryKey: "suppliers",
    label: "Fornecedor",
    create: suppliersService.create,
    update: suppliersService.update,
    remove: suppliersService.remove,
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: selected?.name ?? "",
      document: selected?.document ? formatDocument(selected.document) : "",
      email: selected?.email ?? "",
      phone: selected?.phone ? formatPhone(selected.phone) : "",
      contact: selected?.contact ?? "",
      notes: selected?.notes ?? "",
      active: selected?.active ?? true,
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const saved = await save.mutateAsync({
        id: selected?.supplier_id ?? null,
        data: {
          name: data.name,
          document: orNull(data.document),
          email: orNull(data.email),
          phone: orNull(onlyDigits(data.phone)),
          contact: orNull(data.contact),
          notes: orNull(data.notes),
          active: data.active,
        },
      })
      select(saved)
    } catch {
      // toast exibido pelo MutationCache
    }
  })

  return (
    <form noValidate onSubmit={onSubmit}>
      <fieldset disabled={!canWrite} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <TextField wrapperClassName="sm:col-span-2" label="Nome / razão social" autoFocus error={errors.name?.message} {...register("name")} />
        <TextField label="CPF / CNPJ" inputMode="numeric" placeholder="opcional" error={errors.document?.message} {...register("document")} />
        <TextField label="Pessoa de contato" error={errors.contact?.message} {...register("contact")} />
        <TextField label="Telefone" inputMode="tel" error={errors.phone?.message} {...register("phone")} />
        <TextField label="E-mail" type="email" error={errors.email?.message} {...register("email")} />
        <TextAreaField
          wrapperClassName="sm:col-span-2"
          label="Observações"
          placeholder="prazo de entrega, condições, site..."
          error={errors.notes?.message}
          {...register("notes")}
        />
        <Checkbox label="Ativo" {...register("active")} />
      </fieldset>
      <FormActions
        canWrite={canWrite}
        isEdit={!!selected}
        saving={save.isPending}
        onCancel={close}
        inactive={selected?.active === false}
        deactivating={deactivate.isPending}
        onDeactivate={async () => {
          await deactivate.mutateAsync(selected!.supplier_id)
          close()
        }}
      />
    </form>
  )
}

export default function Suppliers() {
  const canWrite = useHasRole("ATENDENTE")
  return (
    <CatalogPage<Supplier>
      storageKey="cadastro-fornecedores"
      icon={Truck}
      title="Fornecedores"
      subtitle="Quem fornece as peças e produtos do estoque"
      queryKey="suppliers"
      fetchList={suppliersService.list}
      rowKey={(s) => s.supplier_id}
      searchPlaceholder="Pesquisar fornecedores"
      canCreate={canWrite}
      newLabel="Novo fornecedor"
      formIcon={Truck}
      formTitle={(s) => (s ? s.name : "Novo fornecedor")}
      emptyTitle="Nenhum fornecedor cadastrado"
      columns={[
        {
          key: "name",
          header: "Fornecedor",
          render: (s) => (
            <span className="flex flex-col">
              <span className="flex items-center gap-2 font-semibold">
                {s.name} <ActiveBadge active={s.active} />
              </span>
              {s.contact && <span className="text-xs text-zinc-500">{s.contact}</span>}
            </span>
          ),
        },
        { key: "phone", header: "Telefone", render: (s) => (s.phone ? formatPhone(s.phone) : "—") },
        { key: "email", header: "E-mail", hideOnMobile: true, render: (s) => s.email ?? "—" },
        { key: "document", header: "CPF/CNPJ", hideOnMobile: true, render: (s) => formatDocument(s.document) },
      ]}
      renderForm={(ctx) => <SupplierForm {...ctx} canWrite={canWrite} />}
    />
  )
}
