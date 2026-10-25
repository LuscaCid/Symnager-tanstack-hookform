import * as Popover from "@radix-ui/react-popover"
import { ChevronDown, X } from "lucide-react"
import { forwardRef, InputHTMLAttributes, ReactNode, useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/cn"
import { FieldWrapper, inputClass } from "./Field"
import { ListOption, Listbox, normalizeText } from "./Listbox"

const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!
const SEPARATOR = ", "

const splitValues = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

type ComboboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string
  /** sugestões (ex.: marcas, acessórios cadastrados) */
  options: (string | ListOption)[]
  /** várias escolhas, guardadas como "a, b, c" */
  multiple?: boolean
  /** aceita texto livre fora da lista (padrão: sim) */
  creatable?: boolean
  error?: string
  hint?: ReactNode
  hideLabel?: boolean
  wrapperClassName?: string
  emptyText?: string
  onChange?: InputHTMLAttributes<HTMLInputElement>["onChange"]
  /** alternativa controlada simples: recebe o novo texto */
  onValueChange?: (value: string) => void
}

/**
 * Select com busca (combobox). Valor é texto: escolhe da lista de sugestões ou digita um novo
 * ("Usar “xyz”"). Com `multiple`, mostra chips e mantém o popover aberto entre escolhas.
 * Compatível com `register` do react-hook-form (um <input> oculto guarda o valor).
 * Fecha ao clicar fora ou com Esc.
 */
export const ComboboxField = forwardRef<HTMLInputElement, ComboboxProps>(function ComboboxField(
  {
    label,
    options: rawOptions,
    multiple,
    creatable = true,
    error,
    hint,
    hideLabel,
    wrapperClassName,
    className,
    id,
    name,
    placeholder = "Selecione ou digite",
    disabled,
    emptyText,
    onValueChange,
    ...props
  },
  ref,
) {
  const autoId = useId()
  const triggerId = id ?? `${name ?? "combobox"}-${autoId}`
  const nativeRef = useRef<HTMLInputElement | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const controlled = props.value !== undefined
  const [current, setCurrent] = useState(String(props.value ?? props.defaultValue ?? ""))
  const value = controlled ? String(props.value ?? "") : current

  const options = useMemo<ListOption[]>(
    () => rawOptions.map((o) => (typeof o === "string" ? { value: o, label: o } : o)),
    [rawOptions],
  )
  const selectedValues = multiple ? splitValues(value) : value ? [value] : []
  // valores livres (fora do cadastro) também aparecem na lista para poder desmarcar
  const allOptions = useMemo(() => {
    const known = new Set(options.map((o) => normalizeText(o.value)))
    const extra = selectedValues.filter((v) => !known.has(normalizeText(v))).map((v) => ({ value: v, label: v }))
    return [...options, ...extra]
  }, [options, selectedValues.join("|")]) // eslint-disable-line react-hooks/exhaustive-deps

  const setRefs = useCallback(
    (el: HTMLInputElement | null) => {
      nativeRef.current = el
      if (typeof ref === "function") ref(el)
      else if (ref) ref.current = el
      // O React já instala em todo <input> um rastreador próprio na propriedade "value" (é como ele
      // detecta mudanças). Encadeamos com ele em vez de substituí-lo: escritas externas (reset/setValue do
      // react-hook-form) passam pelo rastreador e também atualizam o que o campo mostra.
      const patched = el as HTMLInputElement & { __symnagerPatched?: boolean }
      if (el && !patched.__symnagerPatched) {
        const previous = Object.getOwnPropertyDescriptor(el, "value") ?? nativeValue
        Object.defineProperty(el, "value", {
          configurable: true,
          get: () => previous.get!.call(el),
          set: (v: string) => {
            previous.set!.call(el, v)
            setCurrent(nativeValue.get!.call(el))
          },
        })
        patched.__symnagerPatched = true
      }
    },
    [ref],
  )

  useLayoutEffect(() => {
    if (nativeRef.current) setCurrent(nativeValue.get!.call(nativeRef.current))
  }, [])

  function commit(next: string) {
    const el = nativeRef.current
    if (el) {
      // escreve pelo setter do protótipo (sem passar pelo rastreador do React), senão o React
      // acha que o valor não mudou e não dispara o onChange do evento "input"
      nativeValue.set!.call(el, next)
      el.dispatchEvent(new Event("input", { bubbles: true }))
    }
    setCurrent(next)
    onValueChange?.(next)
  }

  function toggle(item: string) {
    if (!multiple) {
      commit(item === value ? "" : item)
      setOpen(false)
      return
    }
    const exists = selectedValues.some((v) => normalizeText(v) === normalizeText(item))
    const next = exists ? selectedValues.filter((v) => normalizeText(v) !== normalizeText(item)) : [...selectedValues, item]
    commit(next.join(SEPARATOR))
  }

  const isSelected = (v: string) => selectedValues.some((s) => normalizeText(s) === normalizeText(v))

  return (
    <FieldWrapper label={label} htmlFor={triggerId} error={error} hint={hint} hideLabel={hideLabel} className={wrapperClassName}>
      <input
        ref={setRefs}
        name={name}
        type="text"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        disabled={disabled}
        {...props}
        // uso controlado só com onValueChange: evita o aviso de "value sem onChange"
        readOnly={props.onChange ? undefined : true}
      />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild disabled={disabled}>
          <div
            ref={triggerRef}
            id={triggerId}
            role="combobox"
            tabIndex={disabled ? -1 : 0}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-invalid={!!error}
            aria-disabled={disabled}
            onKeyDown={(e) => {
              if (["Enter", " ", "ArrowDown"].includes(e.key)) {
                e.preventDefault()
                setOpen(true)
              }
            }}
            className={cn(
              inputClass,
              "h-auto min-h-9 py-1 flex items-center gap-1.5 cursor-pointer",
              open && "border-accent ring-[3px] ring-accent/15",
              disabled && "opacity-60 cursor-not-allowed bg-subtle",
              error && "border-danger/70",
              className,
            )}
          >
            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1">
              {selectedValues.length === 0 && <span className="text-faint truncate">{placeholder}</span>}
              {!multiple && selectedValues[0] && <span className="truncate">{selectedValues[0]}</span>}
              {multiple &&
                selectedValues.map((v) => (
                  <span key={v} className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-subtle text-[13px]">
                    {v}
                    {!disabled && (
                      <button
                        type="button"
                        aria-label={`Remover ${v}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggle(v)
                        }}
                        className="h-4 w-4 inline-flex items-center justify-center rounded text-faint hover:text-fg hover:bg-hover"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </span>
                ))}
            </div>
            {!multiple && selectedValues[0] && !disabled ? (
              <button
                type="button"
                aria-label="Limpar"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  commit("")
                }}
                className="shrink-0 h-5 w-5 inline-flex items-center justify-center rounded text-faint hover:text-fg hover:bg-hover"
              >
                <X size={13} />
              </button>
            ) : (
              <ChevronDown size={15} className={cn("shrink-0 text-faint transition-transform duration-150", open && "rotate-180")} />
            )}
          </div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            collisionPadding={8}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              triggerRef.current?.focus()
            }}
            className="z-50 w-[var(--radix-popover-trigger-width)] min-w-56 rounded-lg border border-line bg-surface shadow-lg animate-pop-in overflow-hidden"
          >
            <Listbox
              options={allOptions}
              isSelected={isSelected}
              onSelect={toggle}
              searchable
              searchPlaceholder={creatable ? "Buscar ou digitar novo..." : "Buscar..."}
              onCreate={creatable ? (text) => toggle(text) : undefined}
              emptyText={emptyText ?? (creatable ? "Digite para adicionar" : "Nenhuma opção")}
              footer={
                multiple && selectedValues.length > 0 ? (
                  <div className="flex justify-between items-center gap-2 px-3 py-2 border-t border-line text-xs text-muted">
                    {selectedValues.length} selecionado(s)
                    <button type="button" onClick={() => setOpen(false)} className="font-medium text-accent hover:underline">
                      Concluir
                    </button>
                  </div>
                ) : undefined
              }
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldWrapper>
  )
})
