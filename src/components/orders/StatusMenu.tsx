import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Check, ChevronDown, RotateCcw } from "lucide-react"
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/@types/api"
import { useHasRole } from "@/contexts/Auth-context"
import { STATUS_HEX } from "@/lib/format"
import { useSegment } from "@/lib/segment"
import { isFinal } from "./orderUtils"

const itemClass =
  "flex items-center gap-2 rounded-sm px-2 py-1 text-sm cursor-pointer outline-none data-[highlighted]:bg-hover  data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed"

/** Botão "Alterar status" com a lista do fluxo da OS. */
export function StatusMenu({ order, onSelect, disabled }: { order: Order; onSelect: (status: OrderStatus) => void; disabled?: boolean }) {
  const isAdmin = useHasRole()
  const final = isFinal(order.status)
  const { statusLabel } = useSegment()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold border border-line hover:bg-hover  transition duration-200 disabled:opacity-50">
          Alterar status <ChevronDown size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-56 rounded-md border border-line bg-app  p-1 shadow-xl text-fg "
        >
          {final ? (
            <DropdownMenu.Item disabled={!isAdmin} onSelect={() => onSelect("ABERTA")} className={itemClass}>
              <RotateCcw size={16} /> Reabrir OS {!isAdmin && "(somente admin)"}
            </DropdownMenu.Item>
          ) : (
            ORDER_STATUSES.map((status) => (
              <DropdownMenu.Item key={status} onSelect={() => onSelect(status)} className={itemClass}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_HEX[status] }} />
                <span className="flex-1">{statusLabel(status)}</span>
                {status === order.status && <Check size={14} />}
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
