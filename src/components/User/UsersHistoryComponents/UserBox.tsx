import type { Client } from '@/@types/api'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { formatPhone, formatRelative } from '@/lib/format'


export function UserBox({ client } : { client : Client }){
    const navigate = useNavigate()
    function handleClickInClient () {
        navigate(`/clientes/${client.client_id}`)
    }
    return (
        <button onClick={handleClickInClient} className='w-full text-left flex flex-col gap-1 p-2 bg-transparent border dark:border-zinc-800  border-zinc-300 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200 shadow-md'>
            <header className='flex justify-between items-center gap-2'>
                <strong className='text-zinc-950 font-bold text-lg dark:text-zinc-200 truncate'>{client.name}</strong>
                <span className='shrink-0 text-sm font-medium text-zinc-600 dark:text-zinc-400'>{formatRelative(client.created_at)}</span>
            </header>
            {client.email && (
                <span className='text-zinc-600 dark:text-zinc-400 font-semibold truncate'>
                    {client.email}
                </span>
            )}
            <footer className='flex items-center justify-between text-zinc-500 dark:text-zinc-400 font-semibold text-sm'>
                {formatPhone(client.phone)}
                {client._count && (
                    <span className='flex items-center gap-1' title='Ordens de serviço'>
                        <ClipboardList size={14} /> {client._count.orders}
                    </span>
                )}
            </footer>
        </button>
    )
}
