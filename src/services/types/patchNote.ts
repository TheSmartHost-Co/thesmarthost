export interface PatchNoteImage {
  url: string
  caption: string
}

export interface PatchNote {
  id: string
  userId: string
  title: string
  content: string
  version: string | null
  targetRoles: string[]
  images: PatchNoteImage[]
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  dismissed?: boolean
  dismissCount?: number
  status?: 'draft' | 'published' | 'expired'
}

export interface PatchNotesResponse {
  status: 'success' | 'failed'
  data: PatchNote[]
  message?: string
}

export interface PatchNoteResponse {
  status: 'success' | 'failed'
  data: PatchNote
  message?: string
}

export interface CreatePatchNotePayload {
  title: string
  content: string
  version?: string
  targetRoles: string[]
}

export interface UpdatePatchNotePayload {
  title: string
  content: string
  version?: string
  targetRoles: string[]
  images?: PatchNoteImage[]
}

export interface DeletePatchNoteResponse {
  status: 'success' | 'failed'
  message: string
}

export interface DismissResponse {
  status: 'success' | 'failed'
  message: string
}

export interface ImageUploadResponse {
  status: 'success' | 'failed'
  message: string
  data?: {
    image: PatchNoteImage
    allImages: PatchNoteImage[]
  }
}
