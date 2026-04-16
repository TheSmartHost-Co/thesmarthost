'use client'

import React from 'react'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import PdfThumbnail from './PdfThumbnail'

interface ReceiptThumbnailProps {
  signedUrl?: string | null
  mimeType?: string | null
  originalName?: string | null
  alt?: string
  /** className applied to the rendered <img> for both image & PDF cases. Typical: "w-full h-full object-cover". */
  imgClassName?: string
  /**
   * Fallback element for non-image / non-PDF files, and while a PDF is loading.
   * Callers pass their own sized icon so the look matches each surface.
   */
  fallback?: React.ReactNode
  /** Target render width for the PDF rasterization. Pick based on display size: 40–80px thumbnails → 160, 200px+ → 400. */
  pdfRenderWidth?: number
}

/**
 * Unified thumbnail for receipts. Renders:
 * - <img> for image/* mime types
 * - first-page raster for application/pdf (via PdfThumbnail)
 * - the provided fallback for anything else or while PDF is loading
 */
const ReceiptThumbnail: React.FC<ReceiptThumbnailProps> = ({
  signedUrl,
  mimeType,
  originalName,
  alt,
  imgClassName = 'w-full h-full object-cover',
  fallback,
  pdfRenderWidth = 400,
}) => {
  const displayAlt = alt ?? originalName ?? ''
  const resolvedFallback = fallback ?? <DocumentTextIcon className="w-5 h-5 text-gray-300" />

  if (!signedUrl) return <>{resolvedFallback}</>

  if (mimeType?.startsWith('image/')) {
    return <img src={signedUrl} alt={displayAlt} className={imgClassName} />
  }

  const isPdf =
    mimeType === 'application/pdf' ||
    mimeType?.includes('pdf') ||
    originalName?.toLowerCase().endsWith('.pdf')

  if (isPdf) {
    return (
      <PdfThumbnail
        url={signedUrl}
        alt={displayAlt}
        imgClassName={imgClassName}
        fallback={resolvedFallback}
        renderWidth={pdfRenderWidth}
      />
    )
  }

  return <>{resolvedFallback}</>
}

export default ReceiptThumbnail
