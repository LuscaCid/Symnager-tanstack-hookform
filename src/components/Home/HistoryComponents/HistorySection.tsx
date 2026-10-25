import { History, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import JobsHistory from "./JobsHistory";
import { Button, PageHeader } from "@/components/ui";

export function HistorySection () {
  const navigate = useNavigate()

  return (
    <section className="w-full h-full min-h-0 flex flex-col">
      <PageHeader
        icon={History}
        title="Histórico"
        actions={<Button size="sm" icon={LayoutGrid} onClick={() => navigate('/ordens?view=board')}>Quadro</Button>}
      />
      <JobsHistory />
    </section>
  )
}
