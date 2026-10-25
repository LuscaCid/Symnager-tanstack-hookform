import { createContext } from "use-context-selector";
import { ContextProps } from '../@types/SidebarContext'
import { ReactNode, useCallback, useEffect, useState } from "react";

export const SidebarContext = createContext({} as ContextProps)

const STORAGE_KEY = '@symnager-sidebar'

function readInitial() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'open'
  } catch {
    // ignora
  }
  return window.innerWidth >= 1024
}

export function SidebarContextProvider ({children} : {children : ReactNode}) {

  const [isOpen, setIsOpen] = useState<boolean>(readInitial)

  const handleOpenOrClose = useCallback(() => {
    setIsOpen((open) => !open)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, isOpen ? 'open' : 'closed')
    } catch {
      // ignora
    }
  }, [isOpen])

  return (
    <SidebarContext.Provider value={{
      isOpen,
      handleOpenOrClose
    }}>
      {children}
    </SidebarContext.Provider>
  )
}
