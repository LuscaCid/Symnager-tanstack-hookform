import type { FieldValues, Path, UseFormRegister } from "react-hook-form"
import type { CustomFieldDef, CustomFieldValues } from "@/@types/api"
import { Checkbox, SelectField, TextField } from "@/components/ui"
import { formatCustomValue } from "@/lib/orderFields"

interface Props<T extends FieldValues> {
  fields: CustomFieldDef[]
  register: UseFormRegister<T>
  /** valores gravados: os de campos que não estão mais em uso aparecem só para leitura */
  saved?: CustomFieldValues | null
  /** definições conhecidas (incluindo desativadas) para rotular os valores antigos */
  allDefs?: CustomFieldDef[]
  disabled?: boolean
}

/** Campos adicionais da OS (do ramo, como BTUs e gás, e os criados pela empresa). */
export function CustomFieldsEditor<T extends FieldValues>({ fields, register, saved, allDefs = [], disabled }: Props<T>) {
  const name = (key: string) => `custom_fields.${key}` as Path<T>
  const active = new Set(fields.map((f) => f.key))
  const orphans = Object.entries(saved ?? {}).filter(([k, v]) => !active.has(k) && v !== null && v !== "")

  if (!fields.length && !orphans.length) return null

  return (
    <div className="flex flex-col gap-2">
      {fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3">
          {fields.map((f) => {
            const label = f.unit ? `${f.label} (${f.unit})` : f.label
            if (f.type === "boolean")
              return (
                <div key={f.key} className="flex items-end pb-2">
                  <Checkbox label={f.label} disabled={disabled} {...register(name(f.key))} />
                </div>
              )
            if (f.type === "select")
              return (
                <SelectField key={f.key} label={label} placeholder="Não informado" disabled={disabled} {...register(name(f.key))}>
                  <option value="">Não informado</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </SelectField>
              )
            return (
              <TextField
                key={f.key}
                label={label}
                type={f.type === "date" ? "date" : "text"}
                inputMode={f.type === "number" ? "decimal" : undefined}
                disabled={disabled}
                {...register(name(f.key))}
              />
            )
          })}
        </div>
      )}
      {orphans.length > 0 && (
        <div className="rounded-lg bg-subtle/60 px-3 py-2 text-[13px]">
          <p className="text-xs text-faint mb-1">Outros campos (não estão mais em uso)</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {orphans.map(([k, v]) => {
              const def = allDefs.find((d) => d.key === k)
              return (
                <div key={k} className="contents">
                  <dt className="text-muted">{def?.label ?? k}</dt>
                  <dd className="text-fg">{formatCustomValue(v, def)}</dd>
                </div>
              )
            })}
          </dl>
        </div>
      )}
    </div>
  )
}
