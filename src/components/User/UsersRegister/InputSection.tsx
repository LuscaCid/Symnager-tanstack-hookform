import { InputHTMLAttributes } from "react"
import { useFormContext } from "react-hook-form"
import { cn } from "@/lib/cn"
import { inputClass } from "@/components/ui/Field"

interface InputProperties extends Omit<InputHTMLAttributes<HTMLInputElement>, "name"> {
  input_name : string
  input_label : string
  input_placeholder : string
}

/**
 * Campo do formulário de clientes. O valor é controlado só pelo react-hook-form
 * (a versão antiga sobrescrevia `value`, o que travava a digitação e perdia o preenchimento do CEP).
 */
export default function InputSection ({ input_name, input_label, input_placeholder, className, type = "text", ...props } : InputProperties ) {
  const { register, formState : { errors } } = useFormContext()
  const error = errors[input_name]?.message as string | undefined
  return (
    <fieldset className={cn("flex flex-col gap-1.5 w-full min-w-0", className)}>
      <label className="text-[13px] font-medium text-muted" htmlFor={input_name}>{input_label}</label>
      <input
        className={cn(
          inputClass,
          error && "border-danger/70 focus:border-danger focus:ring-danger/15",
        )}
        placeholder={input_placeholder}
        id={input_name}
        type={type}
        aria-invalid={!!error}
        {...props}
        {...register(input_name)}
      />
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </fieldset>

  )
}
