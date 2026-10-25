import RegistrationSection from "../components/User/UsersRegister/RegistrationSection";
import { UsersSection } from "../components/User/UsersHistoryComponents/UserSection";
import { SplitPane } from "@/components/ui";

export default function User () {
  return (
    <SplitPane
      storageKey="clientes"
      defaultSize={40}
      minLeft={280}
      minRight={360}
      left={<UsersSection />}
      right={<RegistrationSection/>}
    />
  )
}
