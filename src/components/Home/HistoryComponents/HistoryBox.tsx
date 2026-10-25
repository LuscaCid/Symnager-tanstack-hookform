import type { Order } from '@/@types/api'
import { useNavigate } from 'react-router-dom'
import { PriorityBadge, StatusBadge, TagChip } from '@/components/ui'
import { formatMoney, formatOrderNumber, formatRelative } from '@/lib/format'

export function HistoryBox({ order } : { order : Order }){
    const navigate = useNavigate()

    const formattedDescription = order.description.length > 80 ? `${order.description.slice(0,80)}...` : order.description
    return (
        <button
            onClick={() => navigate(`/ordens/${order.order_id}`)}
            className='w-full text-left flex flex-col gap-2 p-2 bg-transparent border dark:border-zinc-800  border-zinc-300 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition duration-200 shadow-md'>
            <header className='flex justify-between items-center gap-2'>
                <strong className='text-zinc-950 font-bold text-lg dark:text-zinc-200 truncate'>{order.owner?.name ?? '—'}</strong>
                <span className='shrink-0 text-sm font-medium text-zinc-600 dark:text-zinc-400'>{formatRelative(order.arrived_at)}</span>
            </header>
            <div className='flex items-center justify-between gap-2'>
                <h1 className='font-semibold text-md text-zinc-800 dark:text-zinc-300 truncate'>
                    <span className='text-zinc-500 font-mono text-sm mr-1'>{formatOrderNumber(order.number)}</span>
                    {order.device}
                </h1>
                <StatusBadge status={order.status} />
            </div>
            <span className='text-zinc-600 dark:text-zinc-400 font-semibold text-sm'>
                {formattedDescription}
            </span>
            <footer className='flex flex-wrap items-center gap-1'>
                {order.priority !== 'NORMAL' && <PriorityBadge priority={order.priority} />}
                {order.tags.map((tag) => <TagChip key={tag.tag_id}>{tag.slug}</TagChip>)}
                {order.total > 0 && <span className='ml-auto text-sm font-semibold tabular-nums'>{formatMoney(order.total)}</span>}
            </footer>
        </button>
    )
}
