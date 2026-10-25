import { History } from "lucide-react";
import UsersHistory from "./UsersHistory";
import { PageHeader } from "@/components/ui";

export function UsersSection () {

  return (
    <section className="w-full h-full min-h-0 flex flex-col">
      <PageHeader icon={History} title="Histórico" />
      <UsersHistory />
    </section>
  )
}
