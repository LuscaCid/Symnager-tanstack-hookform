import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ArrowLeftRight, Boxes } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { useSearchParams } from "react-router-dom"
import { z } from "zod"
import type { Product } from "@/@types/api"
import { Badge, Button, Checkbox, SelectField, TextAreaField, TextField } from "@/components/ui"
import { CatalogFormContext, CatalogPage } from "@/components/catalog/CatalogPage"
import { ActiveBadge, FormActions } from "@/components/catalog/FormActions"
import { useCatalogMutations } from "@/components/catalog/useCatalogMutations"
import { StockMovementModal } from "@/components/catalog/StockMovementModal"
import { StockMovements } from "@/components/catalog/StockMovements"
import { intField, moneyField, moneyToInput, orNull, parseMoney, toInt } from "@/components/catalog/money"
import { productsService, suppliersService } from "@/services/resources"
import { useHasRole } from "@/contexts/Auth-context"
import { formatMoney, formatNumber } from "@/lib/format"
import { cn } from "@/lib/cn"

const UNITS = ["UN", "PC", "CX", "KIT", "M", "KG", "L"]

const schema = z.object({
  sku: z.string().trim().max(60).optional(),
  name: z.string().trim().min(2, "Informe o nome do produto").max(120),
  description: z.string().trim().max(1000).optional(),
  unit: z.string().trim().min(1).max(10),
  cost_price: moneyField,
  sale_price: moneyField,
  stock: intField("Estoque inválido"),
  min_stock: intField("Estoque mínimo inválido"),
  supplier_id: z.string().optional(),
  active: z.boolean(),
})
type FormType = z.infer<typeof schema>

const isLow = (p: Product) => p.active && p.stock <= p.min_stock

function margin(cost: number, sale: number) {
  if (!sale || Number.isNaN(cost) || Number.isNaN(sale)) return null
  return ((sale - cost) / sale) * 100
}

function useSuppliersOptions() {
  return useQuery({
    queryKey: ["suppliers", "options"],
    queryFn: () => suppliersService.list({ active: true, page_size: 100 }),
    staleTime: 60_000,
    select: (res) => res.data,
  })
}

function ProductForm({ selected, close, select, canWrite }: CatalogFormContext<Product> & { canWrite: boolean }) {
  const suppliers = useSuppliersOptions()
  const [moving, setMoving] = useState(false)
  const { save, deactivate } = useCatalogMutations({
    queryKey: "products",
    label: "Produto",
    create: productsService.create,
    update: productsService.update,
    remove: productsService.remove,
    alsoInvalidate: ["dashboard"],
  })
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: selected?.sku ?? "",
      name: selected?.name ?? "",
      description: selected?.description ?? "",
      unit: selected?.unit ?? "UN",
      cost_price: selected ? moneyToInput(selected.cost_price) : "",
      sale_price: selected ? moneyToInput(selected.sale_price) : "",
      stock: String(selected?.stock ?? 0),
      min_stock: String(selected?.min_stock ?? 0),
      supplier_id: selected?.supplier_id ? String(selected.supplier_id) : "",
      active: selected?.active ?? true,
    },
  })

  const m = margin(parseMoney(watch("cost_price")), parseMoney(watch("sale_price")))

  const onSubmit = handleSubmit(async (data) => {
    const payload: Partial<Product> = {
      sku: orNull(data.sku),
      name: data.name,
      description: orNull(data.description),
      unit: data.unit,
      cost_price: parseMoney(data.cost_price),
      sale_price: parseMoney(data.sale_price),
      min_stock: toInt(data.min_stock),
      supplier_id: data.supplier_id ? Number(data.supplier_id) : null,
      active: data.active,
    }
    // o saldo só é informado na criação; depois muda apenas por movimentação (rastreável)
    if (!selected) payload.stock = toInt(data.stock)
    try {
      const saved = await save.mutateAsync({ id: selected?.product_id ?? null, data: payload })
      select(saved)
    } catch {
      // toast exibido pelo MutationCache
    }
  })

  return (
    <>
      <form noValidate onSubmit={onSubmit}>
        <fieldset disabled={!canWrite} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <TextField wrapperClassName="sm:col-span-2" label="Nome" autoFocus error={errors.name?.message} {...register("name")} />
          <TextField label="SKU / código" placeholder="opcional" error={errors.sku?.message} {...register("sku")} />
          <SelectField label="Unidade" {...register("unit")}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            wrapperClassName="sm:col-span-2"
            label="Descrição"
            className="min-h-16"
            error={errors.description?.message}
            {...register("description")}
          />
          <TextField label="Preço de custo (R$)" inputMode="decimal" placeholder="0,00" error={errors.cost_price?.message} {...register("cost_price")} />
          <TextField
            label="Preço de venda (R$)"
            inputMode="decimal"
            placeholder="0,00"
            error={errors.sale_price?.message}
            hint={
              m !== null && (
                <span className={cn(m < 0 && "text-red-500")}>
                  Margem: {m.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
                </span>
              )
            }
            {...register("sale_price")}
          />
          {selected ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted ">Estoque atual</span>
              <div className="flex items-center gap-2">
                <strong className={cn("text-lg tabular-nums", isLow(selected) && "text-red-500")}>
                  {formatNumber(selected.stock)} {selected.unit}
                </strong>
                {canWrite && (
                  <Button size="sm" icon={ArrowLeftRight} onClick={() => setMoving(true)}>
                    Movimentar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <TextField label="Estoque inicial" inputMode="numeric" error={errors.stock?.message} {...register("stock")} />
          )}
          <TextField
            label="Estoque mínimo"
            inputMode="numeric"
            hint="Abaixo disso o produto aparece como estoque baixo"
            error={errors.min_stock?.message}
            {...register("min_stock")}
          />
          <SelectField label="Fornecedor" {...register("supplier_id")}>
            <option value="">—</option>
            {suppliers.data?.map((s) => (
              <option key={s.supplier_id} value={s.supplier_id}>
                {s.name}
              </option>
            ))}
            {/* fornecedor atual inativo continua visível */}
            {selected?.supplier && !suppliers.data?.some((s) => s.supplier_id === selected.supplier_id) && (
              <option value={selected.supplier.supplier_id}>{selected.supplier.name}</option>
            )}
          </SelectField>
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
            await deactivate.mutateAsync(selected!.product_id)
            close()
          }}
        />
      </form>
      {selected && (
        <>
          <StockMovements productId={selected.product_id} unit={selected.unit} />
          <StockMovementModal product={selected} open={moving} onOpenChange={setMoving} onMoved={select} />
        </>
      )}
    </>
  )
}

export default function Products() {
  const canWrite = useHasRole("ATENDENTE")
  const [params, setParams] = useSearchParams()
  const lowStock = params.get("low_stock") === "true"

  function toggleLowStock(checked: boolean) {
    const next = new URLSearchParams(params)
    if (checked) next.set("low_stock", "true")
    else next.delete("low_stock")
    setParams(next, { replace: true })
  }

  return (
    <CatalogPage<Product>
      storageKey="cadastro-produtos"
      icon={Boxes}
      title="Produtos e estoque"
      subtitle="Peças e produtos usados ou vendidos nas OS"
      queryKey="products"
      fetchList={productsService.list}
      extraParams={lowStock ? { low_stock: true } : undefined}
      rowKey={(p) => p.product_id}
      searchPlaceholder="Pesquisar por nome ou SKU"
      canCreate={canWrite}
      newLabel="Novo produto"
      formIcon={Boxes}
      formTitle={(p) => (p ? p.name : "Novo produto")}
      emptyTitle={lowStock ? "Nenhum produto com estoque baixo" : "Nenhum produto cadastrado"}
      filters={<CheckboxLow checked={lowStock} onChange={toggleLowStock} />}
      columns={[
        {
          key: "name",
          header: "Produto",
          render: (p) => (
            <span className="flex flex-col">
              <span className="flex items-center gap-2 font-semibold">
                {p.name} <ActiveBadge active={p.active} />
              </span>
              {p.sku && <span className="text-xs text-faint font-mono">{p.sku}</span>}
            </span>
          ),
        },
        {
          key: "stock",
          header: "Estoque",
          className: "text-right",
          render: (p) => (
            <span className="inline-flex items-center gap-1 justify-end tabular-nums">
              {isLow(p) && (
                <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30">
                  <AlertTriangle size={12} /> baixo
                </Badge>
              )}
              {formatNumber(p.stock)} {p.unit}
            </span>
          ),
        },
        { key: "sale", header: "Venda", className: "text-right tabular-nums", render: (p) => formatMoney(p.sale_price) },
        { key: "cost", header: "Custo", hideOnMobile: true, className: "text-right tabular-nums", render: (p) => formatMoney(p.cost_price) },
        { key: "supplier", header: "Fornecedor", hideOnMobile: true, render: (p) => p.supplier?.name ?? "—" },
      ]}
      renderForm={(ctx) => <ProductForm {...ctx} canWrite={canWrite} />}
    />
  )
}

function CheckboxLow({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <Checkbox label="Só estoque baixo" checked={checked} onChange={(e) => onChange(e.target.checked)} />
}
