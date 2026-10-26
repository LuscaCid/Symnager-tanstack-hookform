import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { SettingsUpdate } from "@/@types/api"
import { settingsService } from "@/services/resources"

/** PUT /settings (merge parcial) + invalidação do cache. */
export function useSaveSettings(successMessage = "Configurações salvas.") {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SettingsUpdate) => settingsService.update(data),
    onSuccess: (saved) => {
      queryClient.setQueryData(["settings"], saved)
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast.success(successMessage)
    },
  })
}
