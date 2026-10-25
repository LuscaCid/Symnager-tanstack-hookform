import { UsersProperties } from "@/@types/CreateJob"
import { useReducer } from "react"

export type ActionType  =
  | { type: 'SET_USER_SELECTED', payload: {data : UsersProperties} }
  | { type: 'REMOVE_USER_SELECTED' }

function reducer (state : UsersProperties | null  , action : ActionType) : UsersProperties | null {
  switch (action.type) {
    case "SET_USER_SELECTED" :
      return {
        id : action.payload.data.id,
        name : action.payload.data.name,
        phone : action.payload.data.phone,
        document : action.payload.data.document
      }
      case "REMOVE_USER_SELECTED" :
        return null
      default: return state
  }

}
export function NewJobFormReducerObject (initial : UsersProperties | null = null) {

  const [userSelected , dispatch] = useReducer(reducer, initial)

  function handleSelectUser (user : UsersProperties) {
    dispatch({ type : "SET_USER_SELECTED", payload : {data : user} })
  }
  function handleRemoveUserSelected () {
    dispatch({ type : "REMOVE_USER_SELECTED" })
  }

  return {
    userSelected,
    handleSelectUser,
    handleRemoveUserSelected
  }

}
