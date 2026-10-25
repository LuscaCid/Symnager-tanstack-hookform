const MAX_SIDE = 1600
const QUALITY = 0.8

/**
 * Reduz a foto antes do envio (lado maior até 1600 px, JPEG 0,8): uma foto de celular de
 * 4–8 MB vira ~250–400 KB e o armazenamento do plano rende muito mais.
 */
export async function compressImage(file: File): Promise<{ blob: Blob; name: string }> {
  const base = file.name.replace(/\.[^.]+$/, "") || "foto"
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
  } catch {
    throw new Error(`Não foi possível ler a imagem "${file.name}".`)
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Não foi possível processar a imagem.")
  // fundo branco: PNG com transparência não fica preto no JPEG
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY))
  if (!blob) throw new Error("Não foi possível processar a imagem.")
  // se a original já era menor (JPEG bem comprimido), envia a original
  if (file.type === "image/jpeg" && file.size <= blob.size && scale === 1) return { blob: file, name: file.name }
  return { blob, name: `${base}.jpg` }
}
