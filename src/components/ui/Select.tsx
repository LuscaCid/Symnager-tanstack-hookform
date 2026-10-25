import * as Popover from "@radix-ui/react-popover"
import { ChevronDown } from "lucide-react"
import {
  Children,
  forwardRef,
  isValidElement,
  ReactNode,
  SelectHTMLAttributes,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { cn } from "@/lib/cn"
import { FieldWrapper, inputClass } from "./Field"
import { ListOption, Listbox } from "./Listbox"

const nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!

/** Lê as <option> filhas (inclusive dentro de fragments, arrays e condicionais). */
function readOptions(children: ReactNode): ListOption[] {
  const out: ListOption[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    const props = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean }
    if (child.type === "option") {
      const label = Children.toArray(props.children).join("")
      out.push({ value: String(props.value ?? label), label, disabled: props.disabled })
    } else if (props.children) {
      out.push(...readOptions(props.children))
    }
  })
  return out
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
  hint?: ReactNode
  hideLabel?: boolean
  wrapperClassName?: string
  /** mostra campo de busca (padrão: automático com mais de 8 opções) */
  searchable?: boolean
  placeholder?: string
}

/**
 * Select do app (substitui o <select> nativo). Mesma API do <select>: recebe <option> como filhos e
 * funciona com `register` do react-hook-form ou com value/onChange controlados.
 * Um <select> nativo oculto guarda o valor; a escolha na lista dispara o "change" real nele.
 * Fecha ao clicar fora, com Esc ou ao escolher; abre com Enter/Espaço/setas.
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, hint, hideLabel, wrapperClassName, className, id, name, children, searchable, placeholder = "Selecione", disabled, ...props },
  ref,
) {
  const autoId = useId()
  const triggerId = id ?? `${name ?? "select"}-${autoId}`
  const nativeRef = useRef<HTMLSelectElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // último valor escrito (reset/setValue/escolha): o select nativo o descarta se a opção ainda não existe
  const intendedRef = useRef<string | null>(null)
  const [open, setOpen] = useState(false)
  const options = useMemo(() => readOptions(children), [children])
  const controlled = props.value !== undefined
  const [current, setCurrent] = useState(String(props.value ?? props.defaultValue ?? ""))
  const value = controlled ? String(props.value) : current

  // intercepta escritas em .value (reset/setValue do react-hook-form) para atualizar o que aparece
  const setRefs = useCallback(
    (el: HTMLSelectElement | null) => {
      nativeRef.current = el
      if (typeof ref === "function") ref(el)
      else if (ref) ref.current = el
      const patched = el as HTMLSelectElement & { __symnagerPatched?: boolean }
      if (el && !patched.__symnagerPatched) {
        const previous = Object.getOwnPropertyDescriptor(el, "value") ?? nativeValue
        Object.defineProperty(el, "value", {
          configurable: true,
          get: () => previous.get!.call(el),
          set: (v: string) => {
            intendedRef.current = v == null ? null : String(v)
            previous.set!.call(el, v)
            setCurrent(nativeValue.get!.call(el))
          },
        })
        patched.__symnagerPatched = true
      }
    },
    [ref],
  )

  // quando as opções chegam depois (listas da API), relê o valor real do select
  const optionsKey = options.map((o) => o.value).join("|")
  useLayoutEffect(() => {
    const el = nativeRef.current
    if (!el) return
    const intended = intendedRef.current
    if (intended && nativeValue.get!.call(el) !== intended && options.some((o) => o.value === intended)) {
      nativeValue.set!.call(el, intended)
    }
    setCurrent(nativeValue.get!.call(el))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey])

  const selected = options.find((o) => o.value === value)
  const showSearch = searchable ?? options.length > 8

  function choose(next: string) {
    const el = nativeRef.current
    intendedRef.current = next
    if (el) {
      nativeValue.set!.call(el, next)
      el.dispatchEvent(new Event("change", { bubbles: true }))
    }
    setCurrent(next)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <FieldWrapper label={label} htmlFor={triggerId} error={error} hint={hint} hideLabel={hideLabel} className={wrapperClassName}>
      <select
        ref={setRefs}
        name={name}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        {...props}
      >
        {children}
      </select>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild disabled={disabled}>
          <button
            ref={triggerRef}
            id={triggerId}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-invalid={!!error}
            onKeyDown={(e) => {
              if (["ArrowDown", "ArrowUp"].includes(e.key)) {
                e.preventDefault()
                setOpen(true)
              }
            }}
            onBlur={() => nativeRef.current?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))}
            className={cn(
              inputClass,
              "flex items-center justify-between gap-2 text-left cursor-pointer",
              open && "border-accent ring-[3px] ring-accent/15",
              error && "border-danger/70",
              className,
            )}
          >
            <span className={cn("truncate", (!selected || !selected.value) && "text-faint")}>
              {selected?.label || placeholder}
            </span>
            <ChevronDown size={15} className={cn("shrink-0 text-faint transition-transform duration-150", open && "rotate-180")} />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            collisionPadding={8}
            onOpenAutoFocus={(e) => {
              // o foco vai para a busca/lista pelo autoFocus do Listbox
              e.preventDefault()
            }}
            className="z-50 w-[var(--radix-popover-trigger-width)] min-w-44 rounded-lg border border-line bg-surface shadow-lg animate-pop-in overflow-hidden"
          >
            <Listbox options={options} isSelected={(v) => v === value} onSelect={choose} searchable={showSearch} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldWrapper>
  )
})
