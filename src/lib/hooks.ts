import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { LookupKind } from "@/@types/api"
import { lookupsService, settingsService, usersService } from "@/services/resources"

export function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/** Executa `handler` quando a combinação de teclas é pressionada (ex.: "ctrl+k"). */
export function useHotkey(combo: string, handler: (e: KeyboardEvent) => void) {
  useEffect(() => {
    const [key, ...mods] = combo.toLowerCase().split("+").reverse()
    function listener(e: KeyboardEvent) {
      const wantsCtrl = mods.includes("ctrl")
      const wantsShift = mods.includes("shift")
      if (wantsCtrl && !(e.ctrlKey || e.metaKey)) return
      if (wantsShift !== e.shiftKey) return
      if (e.key.toLowerCase() !== key) return
      e.preventDefault()
      handler(e)
    }
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [combo, handler])
}

/** Cadastros auxiliares ativos de um tipo (usado em selects). */
export function useLookups(kind: LookupKind) {
  return useQuery({
    queryKey: ["lookups", kind],
    queryFn: () => lookupsService.list(kind),
    staleTime: 5 * 60_000,
    select: (rows) => rows.filter((r) => r.active),
  })
}

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: settingsService.get, staleTime: 5 * 60_000 })
}

export function useTechnicians() {
  return useQuery({
    queryKey: ["users", "technicians"],
    queryFn: () => usersService.list({ active: true, page_size: 100 }),
    staleTime: 5 * 60_000,
    // técnicos e administradores podem ser responsáveis por uma OS
    select: (res) => res.data.filter((u) => u.active && u.role !== "ATENDENTE"),
  })
}
