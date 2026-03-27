import apiClient from './apiClient'
import type {
  PatchNotesResponse,
  PatchNoteResponse,
  CreatePatchNotePayload,
  UpdatePatchNotePayload,
  DeletePatchNoteResponse,
  DismissResponse,
  ImageUploadResponse,
} from './types/patchNote'

export async function getAllPatchNotes(): Promise<PatchNotesResponse> {
  return apiClient<PatchNotesResponse>('/patch-notes')
}

export async function getPublishedPatchNotes(): Promise<PatchNotesResponse> {
  return apiClient<PatchNotesResponse>('/patch-notes/published')
}

export async function getUnreadPatchNotes(): Promise<PatchNotesResponse> {
  return apiClient<PatchNotesResponse>('/patch-notes/unread')
}

export async function getPatchNoteById(id: string): Promise<PatchNoteResponse> {
  return apiClient<PatchNoteResponse>(`/patch-notes/${id}`)
}

export async function createPatchNote(data: CreatePatchNotePayload): Promise<PatchNoteResponse> {
  return apiClient<PatchNoteResponse, CreatePatchNotePayload>('/patch-notes', {
    method: 'POST',
    body: data,
  })
}

export async function updatePatchNote(id: string, data: UpdatePatchNotePayload): Promise<PatchNoteResponse> {
  return apiClient<PatchNoteResponse, UpdatePatchNotePayload>(`/patch-notes/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function publishPatchNote(id: string): Promise<PatchNoteResponse> {
  return apiClient<PatchNoteResponse>(`/patch-notes/${id}/publish`, {
    method: 'PATCH',
  })
}

export async function deletePatchNote(id: string): Promise<DeletePatchNoteResponse> {
  return apiClient<DeletePatchNoteResponse>(`/patch-notes/${id}`, {
    method: 'DELETE',
  })
}

export async function dismissPatchNote(id: string): Promise<DismissResponse> {
  return apiClient<DismissResponse>(`/patch-notes/${id}/dismiss`, {
    method: 'POST',
  })
}

export async function dismissAllPatchNotes(): Promise<DismissResponse> {
  return apiClient<DismissResponse>('/patch-notes/dismiss-all', {
    method: 'POST',
  })
}

export async function uploadPatchNoteImage(noteId: string, file: File, caption?: string): Promise<ImageUploadResponse> {
  const formData = new FormData()
  formData.append('image', file)
  if (caption) formData.append('caption', caption)
  return apiClient<ImageUploadResponse>(`/patch-notes/${noteId}/upload-image`, {
    method: 'POST',
    body: formData as unknown as ImageUploadResponse,
  })
}
