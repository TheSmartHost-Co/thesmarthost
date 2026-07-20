// components/Modal.js
'use client'
import { ReactNode, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';

// Escape layering: every open overlay registers here; only the TOP-most layer
// handles Escape, so stacked modals close one at a time (a naive per-modal
// listener would close the whole stack at once). Custom overlays that don't
// use <Modal> (e.g. ImagePreviewModal) can join the stack via useEscapeLayer.
const escapeStack: symbol[] = []

/**
 * Register an overlay as an Escape layer while `active`. When this layer is
 * top-of-stack, Escape calls `onEscape` (unless `enabled` is false — the layer
 * still occupies the stack so layers beneath don't close either).
 */
export function useEscapeLayer(active: boolean, onEscape: () => void, enabled: boolean = true) {
  const idRef = useRef<symbol | null>(null)
  if (idRef.current === null) idRef.current = Symbol('escape-layer')
  const onEscapeRef = useRef(onEscape)
  const enabledRef = useRef(enabled)
  useEffect(() => {
    onEscapeRef.current = onEscape
    enabledRef.current = enabled
  })
  useEffect(() => {
    if (!active) return
    const id = idRef.current!
    escapeStack.push(id)
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (escapeStack[escapeStack.length - 1] !== id) return
      if (enabledRef.current) onEscapeRef.current()
    }
    document.addEventListener('keydown', handler)
    return () => {
      const i = escapeStack.indexOf(id)
      if (i !== -1) escapeStack.splice(i, 1)
      document.removeEventListener('keydown', handler)
    }
  }, [active])
}

interface ModalProps {
    style?: string;
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    zIndex?: number; // Allow custom z-index for nested modals
    closable?: boolean; // Allow disabling close button and backdrop click
    /**
     * Replaces the default box classes entirely (only `relative z-10` is kept).
     * For layouts the default scroll box can't express (e.g. fixed-height
     * flex-column with internal scrolling). Appending conflicting Tailwind
     * utilities via `style` is unreliable — conflicts resolve by stylesheet
     * order, not class order.
     */
    boxClassName?: string;
  }

// Module-level counter so stacked modals don't unlock the body while one is still open.
let openModalCount = 0;

const Modal = ({ isOpen, onClose, children, style, zIndex = 60, closable = true, boxClassName }: ModalProps) => {
  useEscapeLayer(isOpen, onClose, closable)

  useEffect(() => {
    if (!isOpen) return;
    openModalCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.removeProperty('overflow');
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black opacity-10"
        onClick={(e) => {
          e.stopPropagation()
          if (closable) onClose()
        }}
      ></div>

      {/* Modal box */}
      <div className={boxClassName
        ? `relative z-10 ${boxClassName}`
        : `relative bg-white rounded-lg shadow-lg z-10 overflow-y-auto max-h-[70vh] mx-2 ${style}`}>
        {closable && (
          <button
            className="absolute top-2 right-2 text-lg"
            onClick={onClose}
          >
            <XMarkIcon className="w-8 text-black cursor-pointer" />
          </button>
        )}
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
