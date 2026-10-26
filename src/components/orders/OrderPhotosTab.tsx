import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, ImagePlus, Images, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { Order, OrderPhoto } from "@/@types/api"
import { Bone, Button, ConfirmDialog, EmptyState, IconButton, Modal } from "@/components/ui"
import { useAuth } from "@/contexts/Auth-context"
import { formatDateTime } from "@/lib/format"
import { compressImage } from "@/lib/image"
import { toastError } from "@/lib/notify"
import { ordersService } from "@/services/resources"
import { useSegment } from "@/lib/segment"

/** Busca a foto com o Bearer e devolve uma URL local (blob:), revogada ao desmontar. */
function usePhotoUrl(orderId: number, photoId: number) {
  const { data } = useQuery({
    queryKey: ["order-photo", orderId, photoId],
    queryFn: () => ordersService.photoBlob(orderId, photoId),
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  })
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!data) return
    const next = URL.createObjectURL(data)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [data])
  return url
}

function Thumb({ photo, onOpen }: { photo: OrderPhoto; onOpen: () => void }) {
  const url = usePhotoUrl(photo.order_id, photo.id)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir foto ${photo.original_name}`}
      className="group relative aspect-square rounded-lg overflow-hidden border border-line bg-subtle hover:border-line-strong transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      {url ? (
        <img src={url} alt={photo.caption || photo.original_name} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <Bone className="w-full h-full rounded-none" />
      )}
    </button>
  )
}

function Viewer({
  photos,
  index,
  onIndex,
  onClose,
  onDelete,
  canDelete,
}: {
  photos: OrderPhoto[]
  index: number | null
  onIndex: (i: number) => void
  onClose: () => void
  onDelete: (photo: OrderPhoto) => void
  canDelete: boolean
}) {
  const photo = index !== null ? photos[index] : null
  const url = usePhotoUrl(photo?.order_id ?? 0, photo?.id ?? 0)
  const has = photos.length > 1

  useEffect(() => {
    if (index === null || !has) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndex((index + 1) % photos.length)
      if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, has, photos.length, onIndex])

  return (
    <Modal
      open={!!photo}
      onOpenChange={(o) => !o && onClose()}
      size="xl"
      title={photo ? photo.caption || photo.original_name : ""}
      description={
        photo
          ? `${formatDateTime(photo.created_at)}${photo.user ? ` · ${photo.user.name}` : ""} · ${Math.round(photo.size / 1024)} KB`
          : undefined
      }
      footer={
        <>
          {canDelete && photo && (
            <Button icon={Trash2} variant="danger" onClick={() => onDelete(photo)}>
              Excluir foto
            </Button>
          )}
          <Button onClick={onClose}>Fechar</Button>
        </>
      }
    >
      <div className="relative flex items-center justify-center bg-subtle rounded-lg min-h-[50vh]">
        {url && photo ? (
          <img src={url} alt={photo.caption || photo.original_name} className="max-h-[65vh] max-w-full object-contain rounded-lg" />
        ) : (
          <Bone className="w-full h-[50vh]" />
        )}
        {has && index !== null && (
          <>
            <span className="absolute left-2 top-1/2 -translate-y-1/2">
              <IconButton icon={ChevronLeft} label="Foto anterior" onClick={() => onIndex((index - 1 + photos.length) % photos.length)} />
            </span>
            <span className="absolute right-2 top-1/2 -translate-y-1/2">
              <IconButton icon={ChevronRight} label="Próxima foto" onClick={() => onIndex((index + 1) % photos.length)} />
            </span>
          </>
        )}
      </div>
    </Modal>
  )
}

/** Aba "Fotos" da OS: estado do equipamento na entrada, peças trocadas, laudos. */
export function OrderPhotosTab({ order, readOnly }: { order: Order; readOnly: boolean }) {
  const queryClient = useQueryClient()
  const license = useAuth((c) => c.license)
  const { label } = useSegment()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<OrderPhoto | null>(null)
  const [removing, setRemoving] = useState(false)

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["order-photos", order.order_id],
    queryFn: () => ordersService.photos(order.order_id),
  })
  const max = license?.limits?.max_photos_per_order ?? null
  const full = max !== null && photos.length >= max

  async function upload(files: FileList | null) {
    if (!files?.length) return
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (!list.length) {
      toast.error("Escolha arquivos de imagem (JPG, PNG ou WebP).")
      return
    }
    const room = max === null ? list.length : Math.max(max - photos.length, 0)
    if (room < list.length)
      toast.warning(`Seu plano permite ${max} fotos por OS. ${room ? `Enviando só ${room}.` : "Exclua alguma para enviar outra."}`)
    const batch = list.slice(0, room)
    if (!batch.length) return
    setUploading({ done: 0, total: batch.length })
    try {
      for (const [i, file] of batch.entries()) {
        const { blob, name } = await compressImage(file)
        await ordersService.uploadPhoto(order.order_id, blob, name)
        setUploading({ done: i + 1, total: batch.length })
      }
      toast.success(batch.length === 1 ? "Foto enviada." : `${batch.length} fotos enviadas.`)
    } catch (err) {
      toastError(err, "Não foi possível enviar a foto.")
    } finally {
      setUploading(null)
      if (input.current) input.current.value = ""
      queryClient.invalidateQueries({ queryKey: ["order-photos", order.order_id] })
      queryClient.invalidateQueries({ queryKey: ["cloud-usage"] })
    }
  }

  async function remove() {
    if (!deleting) return
    setRemoving(true)
    try {
      await ordersService.deletePhoto(order.order_id, deleting.id)
      queryClient.removeQueries({ queryKey: ["order-photo", order.order_id, deleting.id] })
      await queryClient.invalidateQueries({ queryKey: ["order-photos", order.order_id] })
      queryClient.invalidateQueries({ queryKey: ["cloud-usage"] })
      setDeleting(null)
      setViewing(null)
      toast.success("Foto excluída.")
    } catch (err) {
      toastError(err)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-muted">
          {photos.length} {photos.length === 1 ? "foto" : "fotos"}
          {max !== null && <span className="text-faint"> de {max} no seu plano</span>}
        </p>
        {!readOnly && (
          <>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => upload(e.target.files)}
            />
            <Button
              size="sm"
              icon={ImagePlus}
              loading={!!uploading}
              disabled={full}
              tooltip={full ? "Limite de fotos do plano atingido nesta OS" : "As fotos são reduzidas antes do envio"}
              onClick={() => input.current?.click()}
            >
              {uploading ? `Enviando ${uploading.done + 1} de ${uploading.total}` : "Adicionar fotos"}
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Bone key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Nenhuma foto"
          description={`Registre o estado do ${label("equipment")} antes e depois do serviço, as peças trocadas ou o laudo.`}
        />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo, i) => (
            <Thumb key={photo.id} photo={photo} onOpen={() => setViewing(i)} />
          ))}
        </div>
      )}

      <Viewer
        photos={photos}
        index={viewing}
        onIndex={setViewing}
        onClose={() => setViewing(null)}
        onDelete={setDeleting}
        canDelete={!readOnly}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir esta foto?"
        description="A foto será apagada definitivamente desta OS."
        confirmLabel="Excluir"
        loading={removing}
        onConfirm={remove}
      />
    </div>
  )
}
