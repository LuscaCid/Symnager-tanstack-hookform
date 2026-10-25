import { useState } from "react"
import { UserFetch } from "./UserFetchData"
import { SearchInput } from "@/components/ui"

export default function UsersHistory () {
  const [query, setQuery] = useState<string>('')
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1 m-1 p-1 rounded-md border border-zinc-300 dark:border-zinc-800/80">
      <SearchInput value={query} onChange={setQuery} placeholder="Pesquisar clientes (nome, CPF, telefone, e-mail)" />
      <div className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col gap-2 pr-1 pt-1">
         <UserFetch query={query}/>
      </div>
  </div>
  )
}
