import { Moon, Sun } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useContextSelector } from 'use-context-selector'
import { ThemeContext } from '@/contexts/Theme-context'
import { cn } from '@/lib/cn'

/** Alternância de tema: controle segmentado (expandido) ou botão único (recolhido). */
export function ChangeTheme({ compact = false }: { compact?: boolean }) {
    const theme = useContextSelector(ThemeContext, (c) => c.theme)
    const toggleTheme = useContextSelector(ThemeContext, (c) => c.toggleTheme)

    if (compact) {
        const next = theme === 'dark' ? 'light' : 'dark'
        return (
            <Tooltip content={next === 'dark' ? 'Tema escuro' : 'Tema claro'} side='right'>
            <button
                onClick={() => toggleTheme(next)}
                aria-label={next === 'dark' ? 'Tema escuro' : 'Tema claro'}
                className='h-9 w-10 inline-flex items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'
            >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            </Tooltip>
        )
    }

    const option = (value: 'light' | 'dark', label: string, Icon: typeof Sun) => (
        <button
            key={value}
            onClick={() => toggleTheme(value)}
            aria-pressed={theme === value}
            className={cn(
                'flex-1 h-7 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors',
                theme === value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
            )}
        >
            <Icon size={13} /> {label}
        </button>
    )

    return (
        <div role='group' aria-label='Tema' className='flex gap-0.5 p-0.5 rounded-lg bg-subtle'>
            {option('light', 'Claro', Sun)}
            {option('dark', 'Escuro', Moon)}
        </div>
    )
}
