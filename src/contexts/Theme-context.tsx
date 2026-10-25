import { ContextProviderProps, IContext, Theme } from "@/@types/ThemeContext";
import { useLayoutEffect, useState } from "react";
import { createContext } from "use-context-selector";

export const ThemeContext = createContext({} as IContext)

// mesma chave usada pela versão anterior do seletor de tema
const STORAGE_KEY = '@OS-theme'

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // sem storage: usa a preferência do sistema
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider ({ children }: ContextProviderProps) {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useLayoutEffect(() => {
    const root = document.documentElement
    // desliga transições durante a troca: sem isso cada elemento anima a cor em ritmos diferentes ("pisca")
    root.classList.add('theme-switching')
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    void root.offsetHeight // força o navegador a aplicar as novas cores já sem transição
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignora
    }
    return () => cancelAnimationFrame(frame)
  }, [theme])

  function toggleTheme(themeSet : Theme){
    setTheme(themeSet)
  }
  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  )
}
