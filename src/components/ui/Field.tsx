import { forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/cn"

export const inputClass =
  "w-full rounded-sm bg-transparent border border-zinc-300 dark:border-zinc-800/80 px-2 py-1 " +
  "placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 " +
  "disabled:opacity-60 disabled:cursor-not-allowed transition duration-200"

interface WrapperProps {
  label: string
  htmlFor: string
  error?: string
  hint?: ReactNode
  hideLabel?: boolean
  className?: string
  children: ReactNode
}

export function FieldWrapper({ label, htmlFor, error, hint, hideLabel, className, children }: WrapperProps) {
  return (
    <fieldset className={cn("flex flex-col gap-1 w-full min-w-0", className)}>
      <label
        htmlFor={htmlFor}
        className={cn("text-xs font-semibold text-zinc-600 dark:text-zinc-400", hideLabel && "sr-only")}
      >
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-xs text-red-500">
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-zinc-500">{hint}</span>
      )}
    </fieldset>
  )
}

type BaseProps = { label: string; error?: string; hint?: ReactNode; hideLabel?: boolean; wrapperClassName?: string }

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & BaseProps>(
  function TextField({ label, error, hint, hideLabel, wrapperClassName, className, id, name, ...props }, ref) {
    const fieldId = id ?? name ?? label
    return (
      <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint} hideLabel={hideLabel} className={wrapperClassName}>
        <input
          ref={ref}
          id={fieldId}
          name={name}
          aria-invalid={!!error}
          className={cn(inputClass, error && "border-red-500 dark:border-red-500/70", className)}
          {...props}
        />
      </FieldWrapper>
    )
  },
)

export const SelectField = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & BaseProps>(
  function SelectField({ label, error, hint, hideLabel, wrapperClassName, className, id, name, children, ...props }, ref) {
    const fieldId = id ?? name ?? label
    return (
      <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint} hideLabel={hideLabel} className={wrapperClassName}>
        <select
          ref={ref}
          id={fieldId}
          name={name}
          aria-invalid={!!error}
          className={cn(inputClass, "py-[5px] dark:bg-zinc-950", error && "border-red-500", className)}
          {...props}
        >
          {children}
        </select>
      </FieldWrapper>
    )
  },
)

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & BaseProps>(
  function TextAreaField({ label, error, hint, hideLabel, wrapperClassName, className, id, name, ...props }, ref) {
    const fieldId = id ?? name ?? label
    return (
      <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint} hideLabel={hideLabel} className={wrapperClassName}>
        <textarea
          ref={ref}
          id={fieldId}
          name={name}
          aria-invalid={!!error}
          className={cn(inputClass, "resize-y min-h-20 p-2", error && "border-red-500", className)}
          {...props}
        />
      </FieldWrapper>
    )
  },
)

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string
  onChange: (value: string) => void
}

/** Campo de busca no estilo do "Pesquisar" original do histórico. */
export function SearchInput({ value, onChange, className, placeholder = "Pesquisar", ...props }: SearchInputProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="py-1 pl-7 pr-2 rounded-sm w-full border bg-zinc-300 border-zinc-400 text-zinc-950 placeholder:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/80 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
        {...props}
      />
    </div>
  )
}

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, id, name, className, ...props }, ref) {
  const fieldId = id ?? name ?? label
  return (
    <label htmlFor={fieldId} className={cn("flex items-center gap-2 text-sm cursor-pointer select-none", className)}>
      <input ref={ref} id={fieldId} name={name} type="checkbox" className="accent-zinc-800 dark:accent-zinc-300 w-4 h-4" {...props} />
      {label}
    </label>
  )
})
