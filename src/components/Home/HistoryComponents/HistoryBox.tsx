import type { Order } from '@/@types/api'
import { useNavigate } from 'react-router-dom'
import { PriorityBadge, StatusBadge, TagChip } from '@/components/ui'
import { formatMoney, formatOrderNumber, formatRelative } from '@/lib/format'
import { VisitChip } from '@/components/orders/VisitChip'

export function HistoryBox({ order } : { order : Order }){
    const navigate = useNavigate()

    const formattedDescription = order.description
    return (
        <button
            onClick={() => navigate(`/ordens/${order.order_id}`)}
            className='group w-full text-left flex flex-col gap-2 p-3.5 bg-surface border border-line rounded-xl shadow-sm hover:border-line-strong hover:shadow transition-[border-color,box-shadow] duration-150'>
            <header className='flex justify-between items-center gap-2 text-xs text-faint'>
                <span className='font-mono tabular-nums'>{formatOrderNumber(order.number)}</span>
                <span className='shrink-0'>{formatRelative(order.arrived_at)}</span>
            </header>
            <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                    <h1 className='text-sm font-semibold text-fg truncate'>{order.device}</h1>
                    <p className='text-[13px] text-muted truncate'>{order.owner?.name ?? '—'}</p>
                </div>
                <StatusBadge status={order.status} />
            </div>
            <p className='text-[13px] text-muted line-clamp-2'>
                {formattedDescription}
            </p>
            {(order.priority !== 'NORMAL' || order.tags.length > 0 || order.total > 0 || order.scheduled_at) && (
                <footer className='flex flex-wrap items-center gap-1.5 pt-0.5'>
                    {order.scheduled_at && <VisitChip iso={order.scheduled_at} address={order.service_address} />}
                    {order.priority !== 'NORMAL' && <PriorityBadge priority={order.priority} />}
                    {order.tags.map((tag) => <TagChip key={tag.tag_id}>{tag.slug}</TagChip>)}
                    {order.total > 0 && <span className='ml-auto text-[13px] font-semibold tabular-nums text-fg'>{formatMoney(order.total)}</span>}
                </footer>
            )}
        </button>
    )
}
