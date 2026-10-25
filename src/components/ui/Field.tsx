import { forwardRef, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/cn"

export const inputClass =
  "w-full h-9 rounded-lg bg-surface border border-line px-3 text-sm text-fg shadow-sm " +
  "placeholder:text-faint hover:border-line-strong " +
  "focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/15 " +
  "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-subtle transition-[border-color,box-shadow] duration-150"

const errorClass = "border-danger/70 focus:border-danger focus:ring-danger/15"

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
    <fieldset className={cn("flex flex-col gap-1.5 w-full min-w-0", className)}>
      <label htmlFor={htmlFor} className={cn("text-[13px] font-medium text-muted", hideLabel && "sr-only")}>
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-faint">{hint}</span>
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
          className={cn(inputClass, error && errorClass, className)}
          {...props}
        />
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
          className={cn(inputClass, "h-auto resize-y min-h-20 py-2 leading-relaxed", error && errorClass, className)}
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

/** Campo de busca das listas. */
export function SearchInput({ value, onChange, className, placeholder = "Pesquisar", ...props }: SearchInputProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, "pl-9 bg-subtle shadow-none border-transparent hover:border-line focus:bg-surface")}
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
    <label htmlFor={fieldId} className={cn("flex items-center gap-2 text-sm cursor-pointer select-none text-fg", className)}>
      <input ref={ref} id={fieldId} name={name} type="checkbox" className="accent-accent w-4 h-4 rounded" {...props} />
      {label}
    </label>
  )
})
