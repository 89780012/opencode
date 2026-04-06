import type { ChatImageInput } from "@/types/chat"

type ImageCap = {
  attachment?: boolean
  modalities?: {
    input?: string[]
  }
  capabilities?: {
    attachment?: boolean
    input?: {
      image?: boolean
    }
  }
  vision?: boolean
}

export const imageTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"]
export const imageMax = 10 * 1024 * 1024
export const imageCount = 4

const types = new Set(imageTypes)

function data(file: File, mime: string) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.addEventListener("error", () => resolve(""))
    reader.addEventListener("load", () => {
      const value = typeof reader.result === "string" ? reader.result : ""
      const idx = value.indexOf(",")
      if (idx === -1) {
        resolve(value)
        return
      }
      resolve(`data:${mime};base64,${value.slice(idx + 1)}`)
    })
    reader.readAsDataURL(file)
  })
}

export function imageModel(model?: ImageCap) {
  if (typeof model?.vision === "boolean") return model.vision
  if (model?.capabilities?.input?.image) return true
  if (model?.modalities?.input?.includes("image")) return true
  if (model?.capabilities?.attachment) return true
  return model?.attachment === true
}

export async function imagePart(file: File) {
  const mime = file.type.trim().toLowerCase()
  if (!types.has(mime)) return { err: "type" as const }
  if (file.size > imageMax) return { err: "size" as const }

  const url = await data(file, mime)
  if (!url) return { err: "read" as const }

  const part: ChatImageInput = {
    id: crypto.randomUUID(),
    filename: file.name,
    mime,
    url,
  }
  return { part }
}
