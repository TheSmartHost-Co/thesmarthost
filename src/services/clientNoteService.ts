// Client Note Service - API calls for client notes management

import apiClient from './apiClient'
import type {
  CreateNotePayload,
  UpdateNotePayload,
  NoteResponse,
  NotesResponse,
  GroupedNotesResponse,
  NoteCountsResponse,
  DeleteNoteResponse,
} from './types/clientNote'

/**
 * Get all notes for all clients belonging to a user (for dashboard overview)
 * Returns notes grouped by client
 * @param userId - User ID (property manager)
 * @returns Promise with grouped notes by client
 */
export async function getNotesByUserId(
  userId: string
): Promise<GroupedNotesResponse> {
  return apiClient<GroupedNotesResponse>(`/client-notes/user/${userId}`)
}

/**
 * Get note counts per client for a user (for table display)
 * @param userId - User ID (property manager) 
 * @returns Promise with note counts by client
 */
export async function getNoteCountsByUserId(
  userId: string
): Promise<NoteCountsResponse> {
  return apiClient<NoteCountsResponse>(`/client-notes/user/${userId}/counts`)
}

/**
 * Get all notes for a specific client (for modal view)
 * @param clientId - Client ID
 * @returns Promise with notes array for the client
 */
export async function getNotesByClientId(
  clientId: string
): Promise<NotesResponse> {
  return apiClient<NotesResponse>(`/client-notes/client/${clientId}`)
}

/**
 * Create a new note
 * @param payload - Note creation data
 * @returns Promise with created note
 */
export async function createNote(
  payload: CreateNotePayload
): Promise<NoteResponse> {
  return apiClient<NoteResponse, CreateNotePayload>('/client-notes', {
    method: 'POST',
    body: payload,
  })
}

/**
 * Update an existing note
 * @param id - Note ID
 * @param payload - Note update data
 * @returns Promise with updated note
 */
export async function updateNote(
  id: string,
  payload: UpdateNotePayload
): Promise<NoteResponse> {
  return apiClient<NoteResponse, UpdateNotePayload>(`/client-notes/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

/**
 * Delete a note
 * @param id - Note ID
 * @returns Promise with success message
 */
export async function deleteNote(id: string): Promise<DeleteNoteResponse> {
  return apiClient<DeleteNoteResponse>(`/client-notes/${id}`, {
    method: 'DELETE',
  })
}