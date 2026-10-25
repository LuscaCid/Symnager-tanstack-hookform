
import { HistorySection } from "../components/Home/HistoryComponents/HistorySection"
import { CreateJobSection } from "../components/Home/CreateJobComponents/CreateJobSection"
import { SplitPane } from "@/components/ui"

export default function Home(){//history side and create an job side
  return (
    <SplitPane
      storageKey="recepcao"
      defaultSize={45}
      minLeft={300}
      minRight={360}
      left={<HistorySection />}
      right={<CreateJobSection />}
    />
  )
}
