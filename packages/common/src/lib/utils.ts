import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.avi']
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.aac']

export type AttachmentKind = 'image' | 'video' | 'audio' | 'file'

// Chat attachments are stored as a bare URL (messages.attachment_url) -- the
// original filename is discarded at upload time, so type is inferred from
// the extension. Good enough to pick a rendering mode; not a real MIME check.
function extensionOf(url: string): string {
  const path = url.split(/[?#]/)[0]
  const match = /\.[a-z0-9]+$/i.exec(path)
  return match ? match[0].toLowerCase() : ''
}

export function getAttachmentKind(url: string): AttachmentKind {
  const ext = extensionOf(url)
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video'
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio'
  return 'file'
}

export function isImageAttachment(url: string) {
  return getAttachmentKind(url) === 'image'
}
