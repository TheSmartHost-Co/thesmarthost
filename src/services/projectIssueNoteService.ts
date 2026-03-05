import apiClient from './apiClient'
import type {
  IssueNotesResponse,
  IssueNoteResponse,
  CreateIssueNotePayload,
  DeleteIssueNoteResponse
} from './types/projectIssueNote'

/**
 * Get all notes for an issue (ascending order for chat thread)
 */
export function getNotesByIssue(issueId: string): Promise<IssueNotesResponse> {
  return apiClient<IssueNotesResponse>(`/project-issues/${issueId}/notes`)
}

/**
 * Create a new note on an issue
 */
export function createIssueNote(
  issueId: string,
  payload: CreateIssueNotePayload
): Promise<IssueNoteResponse> {
  return apiClient<IssueNoteResponse, CreateIssueNotePayload>(
    `/project-issues/${issueId}/notes`,
    {
      method: 'POST',
      body: payload
    }
  )
}

/**
 * Delete a note from an issue
 */
export function deleteIssueNote(
  issueId: string,
  noteId: string
): Promise<DeleteIssueNoteResponse> {
  return apiClient<DeleteIssueNoteResponse>(
    `/project-issues/${issueId}/notes/${noteId}`,
    {
      method: 'DELETE'
    }
  )
}
