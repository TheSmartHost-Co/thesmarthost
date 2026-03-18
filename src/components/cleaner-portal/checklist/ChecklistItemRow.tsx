'use client'

import {
  CheckCircleIcon,
  CameraIcon,
  TrashIcon,
  MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline'
import type { ProjectChecklistItem } from '@/services/types/cleaningProject'
import { useIsMobile } from '@/hooks/useIsMobile'

interface ChecklistItemRowProps {
  item: ProjectChecklistItem
  onToggle: () => void
  onUploadPhoto: (file: File) => void
  onDeletePhoto: () => void
  onViewPhoto: (url: string) => void
  isUploading: boolean
  isToggling: boolean
  readOnly?: boolean
}

export default function ChecklistItemRow({
  item,
  onToggle,
  onUploadPhoto,
  onDeletePhoto,
  onViewPhoto,
  isUploading,
  isToggling,
  readOnly,
}: ChecklistItemRowProps) {
  const isMobile = useIsMobile()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUploadPhoto(file)
    }
  }

  return (
    <div className={`
      flex items-start gap-3 p-4 border-b border-gray-50 last:border-b-0
      ${item.isCompleted ? 'bg-green-50/50' : ''}
    `}>
      {/* Checkbox */}
      <button
        onClick={readOnly ? undefined : onToggle}
        disabled={isToggling || readOnly}
        className={`flex-shrink-0 mt-0.5 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <div className={`
          w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
          ${item.isCompleted
            ? 'bg-green-500 border-green-500 text-white'
            : readOnly ? 'border-gray-200' : 'border-gray-300 hover:border-purple-400'
          }
          ${isToggling ? 'opacity-50' : ''}
          ${readOnly && !item.isCompleted ? 'opacity-50' : ''}
        `}>
          {isToggling ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : item.isCompleted ? (
            <CheckCircleIcon className="w-4 h-4" />
          ) : null}
        </div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
          {item.taskDescription}
        </p>

        {/* Photo Section */}
        {item.requiresPhoto && (
          <div className="mt-2">
            {item.photoUrl ? (
              <div className="inline-flex flex-col gap-1">
                <div className="relative inline-flex items-end gap-2">
                  <div className="relative group">
                    <img
                      src={item.photoUrl}
                      alt="Uploaded photo"
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => onViewPhoto(item.photoUrl!)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        target.parentElement?.classList.add('bg-gray-100')
                      }}
                    />
                    {/* View overlay on hover */}
                    <div
                      className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      onClick={() => onViewPhoto(item.photoUrl!)}
                    >
                      <MagnifyingGlassPlusIcon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={onDeletePhoto}
                      disabled={isUploading}
                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
                      title="Delete photo"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {(item.photoTakenAt || item.photoUploadedAt) && (
                  <span className="text-[10px] text-gray-400">
                    {item.photoTakenAt
                      ? `Taken ${new Date(item.photoTakenAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                      : `Uploaded ${new Date(item.photoUploadedAt!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                    }
                  </span>
                )}
              </div>
            ) : readOnly ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-400">
                <CameraIcon className="w-3.5 h-3.5" />
                Photo Required
              </span>
            ) : (
              <label className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors
                ${isUploading
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }
              `}>
                {isUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CameraIcon className="w-3.5 h-3.5" />
                    Add Photo (Required)
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/heic"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                  {...(isMobile ? { capture: 'environment' as const } : {})}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
