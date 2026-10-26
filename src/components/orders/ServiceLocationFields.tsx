import { CalendarClock, MapPin, MapPinned } from "lucide-react"
import type { FieldValues, Path, UseFormRegister } from "react-hook-form"
import { Button, TextAreaField, TextField } from "@/components/ui"
import { openExternal } from "./orderUtils"

export const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

interface Props<T extends FieldValues> {
  register: UseFormRegister<T>
  labels: { service_address: string; scheduled_at: string }
  /** endereço atual do campo (para o link do mapa) */
  address: string
  /** endereço cadastrado do cliente; habilita "Usar endereço do cliente" */
  clientAddress?: string
  onUseClientAddress?: () => void
  disabled?: boolean
}

/** Local do atendimento e data/hora da visita (ramos com atendimento no endereço do cliente). */
export function ServiceLocationFields<T extends FieldValues>({
  register,
  labels,
  address,
  clientAddress,
  onUseClientAddress,
  disabled,
}: Props<T>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_15rem] gap-x-3 gap-y-3">
      <div className="flex flex-col gap-1.5">
        <TextAreaField
          label={labels.service_address}
          placeholder="Rua, número, bairro, cidade"
          className="min-h-16"
          disabled={disabled}
          {...register("service_address" as Path<T>)}
        />
        <div className="flex flex-wrap gap-1.5">
          {clientAddress && onUseClientAddress && !disabled && (
            <Button size="sm" variant="ghost" icon={MapPin} onClick={onUseClientAddress} tooltip={clientAddress}>
              Usar endereço do cliente
            </Button>
          )}
          {address.trim() && (
            <Button size="sm" variant="ghost" icon={MapPinned} onClick={() => openExternal(mapsUrl(address.trim()))}>
              Abrir no mapa
            </Button>
          )}
        </div>
      </div>
      <TextField
        label={labels.scheduled_at}
        type="datetime-local"
        disabled={disabled}
        hint={
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={11} /> aparece no quadro e no aviso ao cliente
          </span>
        }
        {...register("scheduled_at" as Path<T>)}
      />
    </div>
  )
}
