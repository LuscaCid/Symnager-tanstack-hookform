import { Moon, Sun } from 'lucide-react'
import { useContextSelector } from 'use-context-selector'
import { ThemeContext } from '@/contexts/Theme-context'
import { cn } from '@/lib/cn'

export function ChangeTheme({ compact = false }: { compact?: boolean }) {
    const theme = useContextSelector(ThemeContext, (c) => c.theme)
    const toggleTheme = useContextSelector(ThemeContext, (c) => c.toggleTheme)

    const buttonClass = 'hover:bg-zinc-200 transition duration-200 rounded-md flex px-1 py-0.5 border border-zinc-300 dark:border-zinc-800/80 items-center dark:hover:bg-zinc-800/80 justify-between gap-1'

    if (compact) {
        const next = theme === 'dark' ? 'light' : 'dark'
        return (
            <button
                onClick={() => toggleTheme(next)}
                aria-label={next === 'dark' ? 'Tema escuro' : 'Tema claro'}
                title={next === 'dark' ? 'Tema escuro' : 'Tema claro'}
                className={cn(buttonClass, 'justify-center p-1')}
            >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
        )
    }

    return (
    <div className='flex flex-col gap-1'>
        <button
            onClick={() => toggleTheme('light')}
            aria-pressed={theme === 'light'}
            className={cn(buttonClass, theme === 'light' && 'bg-zinc-200 dark:bg-zinc-800/80')}>
            claro <Sun size={18} />
        </button>
        <button
            onClick={() => toggleTheme('dark')}
            aria-pressed={theme === 'dark'}
            className={cn(buttonClass, theme === 'dark' && 'bg-zinc-200 dark:bg-zinc-800/80')}>
            escuro <Moon size={18} />
        </button>
    </div>
    )
}
