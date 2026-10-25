import { ArrowUp, Search, X } from "lucide-react";
import * as Dialog from '@radix-ui/react-dialog'
import { ModalContent } from "./ModalContent";
import { UsersProperties } from "@/@types/CreateJob";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/format";


interface PropsDrilling{
    selectedUser : UsersProperties | null
    handleRemoveSelectedUser : () => void
    handleSelectUser : (userSelected : UsersProperties) => void
    error? : boolean
}

export function SelectClientSection ({selectedUser, handleSelectUser, handleRemoveSelectedUser, error} : PropsDrilling) {

    const styleOfButton = cn(
      'font-bold items-center flex justify-between dark:text-zinc-300 w-full bg-transparent p-2 border dark:hover:bg-zinc-800/80 border-zinc-300 dark:border-zinc-800 rounded-md hover:bg-zinc-200/50 transition duration-200 cursor-text',
      selectedUser === null && 'animate-pulse',
      error && 'border-red-500 dark:border-red-500/70',
    )

    return (
      <section className='flex flex-col gap-2 mx-2'>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button type='button' className={styleOfButton}>
                {selectedUser ? 'Trocar cliente' : 'Selecionar cliente'} <Search strokeWidth={1.25} size={20}/>
            </button>
          </Dialog.Trigger>
          <ModalContent handleSelectUser={handleSelectUser} />
        </Dialog.Root>
        <span className='p-2 border flex items-center justify-between gap-2 dark:border-zinc-800 border-zinc-300 rounded-md transition duration-200'>
          {
            selectedUser?.name ? (
              <span className="min-w-0">
                <strong className="block truncate">{selectedUser.name}</strong>
                {selectedUser.phone && <span className="text-xs text-zinc-600 dark:text-zinc-400">{formatPhone(selectedUser.phone)}</span>}
              </span>
            ) : <span className="flex items-center text-zinc-600 dark:text-zinc-400"> Selecione um cliente acima <ArrowUp size={20} className="mx-4" /></span>
          }
          {
            selectedUser?.name && (
              <button type="button" aria-label="Remover cliente selecionado" onClick={handleRemoveSelectedUser}>
                <X className='text-red-500 cursor-pointer' size={20}/>
              </button>
            )
          }
        </span>
        {error && <span role="alert" className="text-xs text-red-500">Selecione o cliente da OS</span>}
      </section>
    )
}
