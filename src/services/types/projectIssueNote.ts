// Types for Project Issue Notes (threaded PM ↔ cleaner conversation)

export type IssueNoteAuthorType = 'pm' | 'cleaner'

export interface IssueNote {
  id: string
  issueId: string
  authorId: string
  authorType: IssueNoteAuthorType
  authorName: string
  body: string
  createdAt: string
}

export interface CreateIssueNotePayload {
  authorId: string
  body: string
}

// API Response Types
export interface IssueNoteResponse {
  status: 'success' | 'failed'
  message?: string
  data: IssueNote
}

export interface IssueNotesResponse {
  status: 'success' | 'failed'
  message?: string
  data: IssueNote[]
}

export interface DeleteIssueNoteResponse {
  status: 'success' | 'failed'
  message?: string
}
