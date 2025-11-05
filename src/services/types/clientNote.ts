// Client Note Types for HostMetrics Frontend

/**
 * Main Client Note interface
 * Matches backend response format
 */
export interface ClientNote {
  id: string
  clientId: string
  authorId: string
  noteTitle: string
  note: string
  createdAt: string
  updatedAt: string | null
  authorName?: string // From JOIN with profiles table
}

/**
 * Client notes grouped by client (for dashboard overview)
 * Response from getNotesByUserId endpoint
 */
export interface ClientNotesGrouped {
  [clientId: string]: {
    clientName: string
    noteCount: number
    notes: ClientNote[]
  }
}

/**
 * Note counts per client (for table display)
 * Response from getNoteCountsByUserId endpoint
 */
export interface NoteCountsByClient {
  [clientId: string]: number
}

/**
 * Payload for creating a new note
 */
export interface CreateNotePayload {
  clientId: string
  noteTitle: string
  note: string
  authorId: string
}

/**
 * Payload for updating an existing note
 */
export interface UpdateNotePayload {
  noteTitle: string
  note: string
}

/**
 * API response for single note
 */
export interface NoteResponse {
  status: 'success' | 'failed'
  data: ClientNote
  message?: string
}

/**
 * API response for multiple notes
 */
export interface NotesResponse {
  status: 'success' | 'failed'
  data: ClientNote[]
  message?: string
}

/**
 * API response for grouped notes by client
 */
export interface GroupedNotesResponse {
  status: 'success' | 'failed'
  data: ClientNotesGrouped
  message?: string
}

/**
 * API response for note counts
 */
export interface NoteCountsResponse {
  status: 'success' | 'failed'
  data: NoteCountsByClient
  message?: string
}

/**
 * API response for delete operation
 */
export interface DeleteNoteResponse {
  status: 'success' | 'failed'
  message: string
}

/**
 * Note statistics for dashboard
 */
export interface NoteStats {
  totalNotes: number
  notesThisWeek: number
  notesThisMonth: number
  clientsWithNotes: number
  averageNotesPerClient: number
}