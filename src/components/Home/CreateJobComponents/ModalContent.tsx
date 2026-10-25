
import { UsersProperties } from '@/@types/CreateJob'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { Loader, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientsService } from '@/services/resources'
import { useDebounce } from '@/lib/hooks'
import { inputClass } from '@/components/ui'
import { formatDocument, formatPhone } from '@/lib/format'


interface Props {
    handleSelectUser : (userSelected : UsersProperties) => void
}
export function ModalContent ({handleSelectUser} : Props) {
    const navigate = useNavigate()
    const [query, setQuery] = useState<string>('')
    const q = useDebounce(query.trim(), 250)

    const { data, isFetching } = useQuery({
        queryKey : ['clients', 'search', q],
        queryFn : () => clientsService.list({ q, page_size : 15 }),
        enabled : q.length >= 2,
    })
    const usersFound = data?.data ?? []

    return (
        <Dialog.Portal>
            <Dialog.Overlay className='fixed inset-0 z-40 bg-black/35'/>
            <Dialog.Content className='z-50 mx-auto border border-line w-[calc(100vw-2rem)] max-w-md rounded-xl p-5 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface text-fg shadow-2xl'>
                <Dialog.Close aria-label='Fechar' className='absolute top-3 right-3 h-8 w-8 inline-flex items-center justify-center rounded-lg text-faint hover:bg-hover hover:text-fg transition-colors'>
                    <X size={18}/>
                </Dialog.Close>
                <Dialog.Title className='text-base font-semibold text-fg mb-1'>
                    Buscar cliente
                </Dialog.Title>
                <Dialog.Description className='text-sm text-muted mb-3'>
                    Digite nome, CPF/CNPJ, telefone ou e-mail.
                </Dialog.Description>

                <div className='relative mb-2'>
                    <input
                        autoFocus
                        aria-label='Buscar cliente'
                        className={inputClass}
                        placeholder='nome, cpf ou telefone'
                        type="text"
                        onChange={e => setQuery(e.target.value)}
                        value={query}
                    />
                    {isFetching && <Loader size={16} className='absolute right-3 top-1/2 -translate-y-1/2 animate-spin' />}
                </div>
                <section className='rounded-lg border h-56 border-line flex flex-col gap-0.5 overflow-y-auto p-1'>
                    {
                    usersFound.length > 0 ? (
                        usersFound.map((user) =>{
                            return (
                                <Dialog.Close asChild key={user.client_id}>
                                    <button
                                        type='button'
                                        onClick={() => handleSelectUser({ id : user.client_id, name : user.name, phone : user.phone, document : user.document })}
                                        className='text-left rounded-md w-full px-3 py-2 text-sm transition-colors hover:bg-hover'>
                                        <strong className='block font-medium'>{user.name}</strong>
                                        <span className='text-xs text-muted '>
                                            {formatPhone(user.phone)}{user.document ? ` · ${formatDocument(user.document)}` : ''}
                                        </span>
                                    </button>
                                </Dialog.Close>
                            )
                        })
                    ) : ( <span className='p-3 text-[13px] text-muted'>
                            {q.length >= 2 && !isFetching ? 'Nenhum cliente encontrado.' : 'Digite ao menos 2 caracteres para buscar.'}
                        </span>)
                    }
                </section>
                <footer  className='w-full flex flex-col items-center mt-2'>
                    <span className='mx-auto text-faint text-sm'>ou</span>
                    <Dialog.Close asChild>
                        <button
                            type='button'
                            className='rounded-lg w-full h-9 bg-surface border border-line shadow-sm hover:bg-hover transition-colors text-sm font-medium text-fg'
                            onClick={() => navigate('/clientes?novo=1', { state : { returnTo : '/recepcao', name : query } })}
                        >
                            Cadastrar novo cliente
                        </button>
                    </Dialog.Close>
                </footer>
            </Dialog.Content>
        </Dialog.Portal>


    )
}

