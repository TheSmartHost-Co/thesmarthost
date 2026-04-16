'use client'

import React, { useEffect, useRef, useState } from 'react'

// Module-level cache so a given PDF is only rendered once per page session,
// even if the consuming component unmounts and re-mounts (e.g. pagination).
const thumbnailCache = new Map<string, string>()

// Lazy, one-time pdfjs-dist setup. Dynamic-imported so it never runs on the server.
let pdfjsLibPromise: Promise<typeof import('pdfjs-dist')> | null = null

function getPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((pdfjsLib) => {
      // Worker copied from node_modules/pdfjs-dist/build/pdf.worker.min.mjs during install
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs'
      return pdfjsLib
    })
  }
  return pdfjsLibPromise
}

interface PdfThumbnailProps {
  url: string
  alt?: string
  /** className applied to the rendered <img> once ready. */
  imgClassName?: string
  /** Element shown while loading or on failure. */
  fallback?: React.ReactNode
  /** Target pixel width for the rendered page. Higher = sharper, slower. */
  renderWidth?: number
}

/**
 * Renders the first page of a PDF as a raster thumbnail.
 * Uses pdfjs-dist to rasterize page 1 to a canvas, then displays as <img>.
 */
const PdfThumbnail: React.FC<PdfThumbnailProps> = ({
  url,
  alt = 'PDF preview',
  imgClassName = '',
  fallback = null,
  renderWidth = 400,
}) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(() => thumbnailCache.get(url) ?? null)
  const [failed, setFailed] = useState(false)
  const cancelRef = useRef(false)

  useEffect(() => {
    cancelRef.current = false

    const cached = thumbnailCache.get(url)
    if (cached) {
      setThumbUrl(cached)
      setFailed(false)
      return
    }

    setThumbUrl(null)
    setFailed(false)

    let pdfDoc: { destroy: () => Promise<void> } | null = null

    ;(async () => {
      try {
        const pdfjsLib = await getPdfjs()
        if (cancelRef.current) return

        const loadingTask = pdfjsLib.getDocument({ url, isEvalSupported: false })
        const pdf = await loadingTask.promise
        pdfDoc = pdf as unknown as { destroy: () => Promise<void> }
        if (cancelRef.current) return

        const page = await pdf.getPage(1)
        if (cancelRef.current) return

        const baseViewport = page.getViewport({ scale: 1 })
        const scale = renderWidth / baseViewport.width
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const canvasContext = canvas.getContext('2d')
        if (!canvasContext) throw new Error('Canvas 2D context unavailable')

        await page.render({ canvasContext, viewport }).promise
        if (cancelRef.current) return

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        thumbnailCache.set(url, dataUrl)
        if (!cancelRef.current) setThumbUrl(dataUrl)
      } catch (err) {
        console.warn('[PdfThumbnail] Failed to render PDF preview:', err)
        if (!cancelRef.current) setFailed(true)
      } finally {
        try { await pdfDoc?.destroy() } catch { /* ignore */ }
      }
    })()

    return () => {
      cancelRef.current = true
    }
  }, [url, renderWidth])

  if (thumbUrl) {
    return <img src={thumbUrl} alt={alt} className={imgClassName} />
  }

  // Loading or failed: render the provided fallback (or nothing).
  // We intentionally don't distinguish loading vs failure visually — both land on the icon.
  return <>{fallback}</>
}

export default PdfThumbnail
