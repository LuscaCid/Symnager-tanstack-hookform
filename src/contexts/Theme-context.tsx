import { ContextProviderProps, IContext, Theme } from "@/@types/ThemeContext";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignora
    }
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
