
import { UsersProperties } from '@/@types/CreateJob'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { Loader, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientsService } from '@/services/resources'
import { useDebounce } from '@/lib/hooks'
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
            <Dialog.Overlay className='fixed inset-0 z-40 bg-zinc-800/50 '/>
            <Dialog.Content className='z-50 mx-auto dark:bg-zinc-950 border dark:border-zinc-800 border-zinc-300 w-[calc(100vw-2rem)] max-w-md rounded-md p-3 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-100 text-zinc-950 dark:text-zinc-200 shadow-2xl'>
                <Dialog.Close aria-label='Fechar' className='absolute top-2 right-2 bg-transparent cursor-pointer text-red-500 hover:text-red-600 transition duration-200'>
                    <X size={24}/>
                </Dialog.Close>
                <Dialog.Title className='text-lg font-bold dark:text-zinc-300 text-zinc-900 mb-1'>
                    Buscar cliente
                </Dialog.Title>
                <Dialog.Description className='text-sm text-zinc-600 dark:text-zinc-400 mb-3'>
                    Digite nome, CPF/CNPJ, telefone ou e-mail.
                </Dialog.Description>

                <div className='relative mb-2'>
                    <input
                        autoFocus
                        aria-label='Buscar cliente'
                        className='bg-transparent w-full px-3 py-1 rounded-full border border-zinc-300 dark:border-zinc-800/80 dark:text-zinc-300 text-zinc-950 focus:outline-none focus:border-zinc-500'
                        placeholder='nome, cpf ou telefone'
                        type="text"
                        onChange={e => setQuery(e.target.value)}
                        value={query}
                    />
                    {isFetching && <Loader size={16} className='absolute right-3 top-1/2 -translate-y-1/2 animate-spin' />}
                </div>
                <section className='rounded-md border h-56 border-zinc-300 dark:border-zinc-800/80 flex flex-col gap-1 overflow-y-auto p-2 '>
                    {
                    usersFound.length > 0 ? (
                        usersFound.map((user) =>{
                            return (
                                <Dialog.Close asChild key={user.client_id}>
                                    <button
                                        type='button'
                                        onClick={() => handleSelectUser({ id : user.client_id, name : user.name, phone : user.phone, document : user.document })}
                                        className='text-left rounded-md w-full bg-zinc-200 dark:bg-zinc-800/80 p-2 text-sm dark:hover:bg-zinc-800 transition duration-200 hover:bg-zinc-300'>
                                        <strong className='block'>{user.name}</strong>
                                        <span className='text-xs text-zinc-600 dark:text-zinc-400'>
                                            {formatPhone(user.phone)}{user.document ? ` · ${formatDocument(user.document)}` : ''}
                                        </span>
                                    </button>
                                </Dialog.Close>
                            )
                        })
                    ) : ( <span className='p-2 text-sm font-bold text-zinc-600 dark:text-zinc-400'>
                            {q.length >= 2 && !isFetching ? 'Nenhum cliente encontrado.' : 'Digite ao menos 2 caracteres para buscar.'}
                        </span>)
                    }
                </section>
                <footer  className='w-full flex flex-col items-center mt-2'>
                    <span className='mx-auto dark:text-zinc-600 text-zinc-400 text-sm'>ou</span>
                    <Dialog.Close asChild>
                        <button
                            type='button'
                            className='rounded-md w-full p-2 bg-transparent border border-zinc-300 dark:border-zinc-800/80 hover:bg-zinc-200 transition duration-200 dark:hover:bg-zinc-800/80 dark:text-zinc-300 font-bold text-zinc-600'
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

