import { LucideIcon } from "lucide-react"
import { useFormContext } from "react-hook-form"
import { cn } from "@/lib/cn"

interface InputProps {
  IType : "text" | "number" | "date"
  input_placeholder : string
  icon : LucideIcon
  input_name : string
  list? : string
  inputMode? : "text" | "decimal" | "numeric"
}
export default function Input ({ IType,icon : Icon,input_placeholder, input_name, list, inputMode } : InputProps) {
  const { register, formState: { errors } } = useFormContext()
  const error = errors[input_name]?.message as string | undefined

  return (
    <div className="flex flex-col gap-0.5 mx-2">
      <div className={cn(
        "h-10 flex items-center gap-1 border dark:border-zinc-800 border-zinc-300 rounded-md shadow-sm focus-within:border-zinc-500 transition duration-200",
        error && "border-red-500 dark:border-red-500/70",
      )}>
        {Icon && <Icon className="ml-2 shrink-0 text-zinc-500" size={20}/>}
        <label htmlFor={input_name} className="sr-only">{input_placeholder}</label>
        <input
          placeholder={input_placeholder}
          {...register(input_name)}
          id={input_name}
          list={list}
          inputMode={inputMode}
          aria-invalid={!!error}
          className="bg-transparent w-full h-full px-1 focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
          type={IType}
        />
      </div>
      {error && <span role="alert" className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
