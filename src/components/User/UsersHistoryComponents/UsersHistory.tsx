import { useState } from "react"
import { UserFetch } from "./UserFetchData"
import { SearchInput } from "@/components/ui"

export default function UsersHistory () {
  const [query, setQuery] = useState<string>('')
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 px-4">
      <SearchInput value={query} onChange={setQuery} placeholder="Pesquisar clientes (nome, CPF, telefone, e-mail)" />
      <div className="flex-1 min-h-0 overflow-y-auto w-full flex flex-col gap-2 pb-4 -mx-1 px-1">
         <UserFetch query={query}/>
      </div>
  </div>
  )
}
