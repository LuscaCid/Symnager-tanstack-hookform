import { InputHTMLAttributes } from "react"
import { useFormContext } from "react-hook-form"
import { cn } from "@/lib/cn"

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
    <fieldset className={cn("flex flex-col gap-1 w-full min-w-0", className)}>
      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400" htmlFor={input_name}>{input_label}</label>
      <input
        className={cn(
          "w-full rounded-sm bg-transparent border border-zinc-300 dark:border-zinc-800/80 px-2 py-1 focus:outline-none focus:border-zinc-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
          error && "border-red-500 dark:border-red-500/70",
        )}
        placeholder={input_placeholder}
        id={input_name}
        type={type}
        aria-invalid={!!error}
        {...props}
        {...register(input_name)}
      />
      {error && <span role="alert" className="text-xs text-red-500">{error}</span>}
    </fieldset>

  )
}
