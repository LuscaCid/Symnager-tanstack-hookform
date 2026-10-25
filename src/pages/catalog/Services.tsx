import { zodResolver } from "@hookform/resolvers/zod"
import { Wrench } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import type { Service } from "@/@types/api"
import { Checkbox, TextAreaField, TextField } from "@/components/ui"
import { CatalogFormContext, CatalogPage } from "@/components/catalog/CatalogPage"
import { ActiveBadge, FormActions } from "@/components/catalog/FormActions"
import { useCatalogMutations } from "@/components/catalog/useCatalogMutations"
import { intField, moneyField, moneyToInput, orNull, parseMoney, toInt, toIntOrNull } from "@/components/catalog/money"
import { servicesService } from "@/services/resources"
import { useHasRole } from "@/contexts/Auth-context"
import { formatMoney } from "@/lib/format"

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome do serviço").max(120),
  description: z.string().trim().max(1000).optional(),
  price: moneyField,
  estimated_minutes: intField(),
  warranty_days: intField(),
  active: z.boolean(),
})
type FormType = z.infer<typeof schema>

function formatMinutes(minutes: number | null) {
  if (!minutes) return "—"
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

function ServiceForm({ selected, close, select, canWrite }: CatalogFormContext<Service> & { canWrite: boolean }) {
  const { save, deactivate } = useCatalogMutations({
    queryKey: "services",
    label: "Serviço",
    create: servicesService.create,
    update: servicesService.update,
    remove: servicesService.remove,
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: selected?.name ?? "",
      description: selected?.description ?? "",
      price: selected ? moneyToInput(selected.price) : "",
      estimated_minutes: selected?.estimated_minutes ? String(selected.estimated_minutes) : "",
      warranty_days: String(selected?.warranty_days ?? 90),
      active: selected?.active ?? true,
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const saved = await save.mutateAsync({
        id: selected?.service_id ?? null,
        data: {
          name: data.name,
          description: orNull(data.description),
          price: parseMoney(data.price),
          estimated_minutes: toIntOrNull(data.estimated_minutes),
          warranty_days: toInt(data.warranty_days),
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
        <TextField wrapperClassName="sm:col-span-2" label="Nome" autoFocus error={errors.name?.message} {...register("name")} />
        <TextAreaField
          wrapperClassName="sm:col-span-2"
          label="Descrição"
          placeholder="O que está incluso no serviço"
          error={errors.description?.message}
          {...register("description")}
        />
        <TextField label="Preço (R$)" inputMode="decimal" placeholder="0,00" error={errors.price?.message} {...register("price")} />
        <TextField
          label="Tempo estimado (minutos)"
          inputMode="numeric"
          placeholder="opcional"
          error={errors.estimated_minutes?.message}
          {...register("estimated_minutes")}
        />
        <TextField
          label="Garantia (dias)"
          inputMode="numeric"
          error={errors.warranty_days?.message}
          hint="Usada como padrão ao incluir o serviço numa OS"
          {...register("warranty_days")}
        />
        <Checkbox label="Ativo" className="self-end pb-1" {...register("active")} />
      </fieldset>
      <FormActions
        canWrite={canWrite}
        isEdit={!!selected}
        saving={save.isPending}
        onCancel={close}
        inactive={selected?.active === false}
        deactivating={deactivate.isPending}
        onDeactivate={async () => {
          await deactivate.mutateAsync(selected!.service_id)
          close()
        }}
      />
    </form>
  )
}

export default function Services() {
  const canWrite = useHasRole("ATENDENTE")
  return (
    <CatalogPage<Service>
      storageKey="cadastro-servicos"
      icon={Wrench}
      title="Serviços"
      subtitle="Mão de obra e serviços com preço padrão para as OS"
      queryKey="services"
      fetchList={servicesService.list}
      rowKey={(s) => s.service_id}
      searchPlaceholder="Pesquisar serviços"
      canCreate={canWrite}
      newLabel="Novo serviço"
      formIcon={Wrench}
      formTitle={(s) => (s ? s.name : "Novo serviço")}
      emptyTitle="Nenhum serviço cadastrado"
      columns={[
        {
          key: "name",
          header: "Serviço",
          render: (s) => (
            <span className="flex items-center gap-2">
              <span className="font-semibold">{s.name}</span>
              <ActiveBadge active={s.active} />
            </span>
          ),
        },
        { key: "price", header: "Preço", className: "text-right tabular-nums", render: (s) => formatMoney(s.price) },
        { key: "time", header: "Tempo", hideOnMobile: true, render: (s) => formatMinutes(s.estimated_minutes) },
        { key: "warranty", header: "Garantia", hideOnMobile: true, render: (s) => `${s.warranty_days} dias` },
      ]}
      renderForm={(ctx) => <ServiceForm {...ctx} canWrite={canWrite} />}
    />
  )
}
