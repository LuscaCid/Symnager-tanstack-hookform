import { Search, UserRound, X } from "lucide-react";
import * as Dialog from '@radix-ui/react-dialog'
import { ModalContent } from "./ModalContent";
import { UsersProperties } from "@/@types/CreateJob";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/format";
import { inputClass, Tooltip } from "@/components/ui";


interface PropsDrilling{
    selectedUser : UsersProperties | null
    handleRemoveSelectedUser : () => void
    handleSelectUser : (userSelected : UsersProperties) => void
    error? : boolean
}

/** Campo "Cliente" da nova OS: abre a busca de clientes; mostra o selecionado com opção de remover. */
export function SelectClientSection ({selectedUser, handleSelectUser, handleRemoveSelectedUser, error} : PropsDrilling) {
    return (
      <div className='flex flex-col gap-1.5'>
        <Dialog.Root>
          <div className='relative'>
            <Dialog.Trigger asChild>
              <button
                type='button'
                aria-invalid={error}
                className={cn(
                  inputClass,
                  'h-auto min-h-11 py-1.5 flex items-center gap-3 text-left cursor-pointer',
                  error && 'border-danger/70',
                )}
              >
                {selectedUser ? (
                  <>
                    <span className='shrink-0 w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center'>
                      <UserRound size={14} />
                    </span>
                    <span className='min-w-0 flex-1'>
                      <strong className='block truncate text-sm font-medium'>{selectedUser.name}</strong>
                      {selectedUser.phone && <span className='block text-xs text-muted'>{formatPhone(selectedUser.phone)}</span>}
                    </span>
                    <span className='text-xs text-faint pr-7'>Trocar</span>
                  </>
                ) : (
                  <>
                    <Search size={15} className='shrink-0 text-faint' />
                    <span className='flex-1 text-faint'>Buscar cliente por nome, CPF ou telefone</span>
                  </>
                )}
              </button>
            </Dialog.Trigger>
            {selectedUser && (
              <Tooltip content='Remover cliente'>
                <button
                  type='button'
                  aria-label='Remover cliente selecionado'
                  onClick={handleRemoveSelectedUser}
                  className='absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-faint hover:text-danger hover:bg-danger/10 transition-colors'
                >
                  <X size={15}/>
                </button>
              </Tooltip>
            )}
          </div>
          <ModalContent handleSelectUser={handleSelectUser} />
        </Dialog.Root>
        {error && <span role="alert" className="text-xs text-danger">Selecione o cliente da OS</span>}
      </div>
    )
}
