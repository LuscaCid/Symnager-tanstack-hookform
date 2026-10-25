import type { Client } from "@/@types/api"
import { UserBox } from "./UserBox"

interface Props {
    UserHistory : Client []
}

export function UsersRendering({ UserHistory } : Props) {
    return (
        <>
            {UserHistory.map((client) => <UserBox key={client.client_id} client={client} />)}
        </>
    )
}
