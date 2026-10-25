import type { Order } from "@/@types/api"
import { HistoryBox } from "./HistoryBox"

interface Props {
    JobsHistory : Order []
}

export function HistoryRender({ JobsHistory } : Props) {
    return (
        <>
            {JobsHistory.map((order) => <HistoryBox key={order.order_id} order={order} />)}
        </>
    )
}
