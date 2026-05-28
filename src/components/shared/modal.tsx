// components/Modal.js
'use client'
import { ReactNode, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';

interface ModalProps {
    style?: string;
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
    zIndex?: number; // Allow custom z-index for nested modals
    closable?: boolean; // Allow disabling close button and backdrop click
  }

// Module-level counter so stacked modals don't unlock the body while one is still open.
let openModalCount = 0;

const Modal = ({ isOpen, onClose, children, style, zIndex = 60, closable = true }: ModalProps) => {
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
      <div className={`relative bg-white rounded-lg shadow-lg z-10 overflow-y-auto max-h-[70vh] mx-2 ${style}`}>
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
