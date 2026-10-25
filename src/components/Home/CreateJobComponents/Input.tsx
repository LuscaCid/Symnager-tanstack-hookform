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
    <div className="flex flex-col gap-1 mx-4">
      <div className={cn(
        "h-10 flex items-center gap-2 bg-surface border border-line rounded-lg shadow-sm hover:border-line-strong",
        "focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15 transition-[border-color,box-shadow] duration-150",
        error && "border-danger/70",
      )}>
        {Icon && <Icon className="ml-3 shrink-0 text-faint" size={16}/>}
        <label htmlFor={input_name} className="sr-only">{input_placeholder}</label>
        <input
          placeholder={input_placeholder}
          {...register(input_name)}
          id={input_name}
          list={list}
          inputMode={inputMode}
          aria-invalid={!!error}
          className="bg-transparent w-full h-full pr-3 text-sm focus:outline-none placeholder:text-faint"
          type={IType}
        />
      </div>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </div>
  )
}
