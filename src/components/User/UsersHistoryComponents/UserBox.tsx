import type { Client } from '@/@types/api'
import { Tooltip } from "@/components/ui"
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { formatPhone, formatRelative } from '@/lib/format'


export function UserBox({ client } : { client : Client }){
    const navigate = useNavigate()
    function handleClickInClient () {
        navigate(`/clientes/${client.client_id}`)
    }
    return (
        <button onClick={handleClickInClient} className='w-full text-left flex items-center gap-3 p-3.5 bg-surface border border-line rounded-xl shadow-sm hover:border-line-strong hover:shadow transition-[border-color,box-shadow] duration-150'>
            <span className='shrink-0 w-9 h-9 rounded-full bg-accent-soft text-accent text-xs font-semibold flex items-center justify-center'>
                {client.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
            </span>
            <div className='min-w-0 flex-1'>
                <header className='flex justify-between items-center gap-2'>
                    <strong className='text-sm font-semibold text-fg truncate'>{client.name}</strong>
                    <span className='shrink-0 text-xs text-faint'>{formatRelative(client.created_at)}</span>
                </header>
                <footer className='flex items-center justify-between gap-2 text-[13px] text-muted'>
                    <span className='truncate'>{formatPhone(client.phone)}{client.email ? ` · ${client.email}` : ''}</span>
                    {client._count && (
                        <Tooltip content='Ordens de serviço'>
                            <span className='shrink-0 flex items-center gap-1 text-xs text-faint'>
                                <ClipboardList size={13} /> {client._count.orders}
                            </span>
                        </Tooltip>
                    )}
                </footer>
            </div>
        </button>
    )
}
