'use client';

import { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotificationStore } from '@/store/useNotificationStore';

const tone = {
  success: {
    container: 'border-l-4 border-green-600 bg-white text-gray-900',
    icon: 'text-green-600',
    label: 'Success',
  },
  error: {
    container: 'border-l-4 border-red-600 bg-white text-gray-900',
    icon: 'text-red-600',
    label: 'Error',
  },
  info: {
    container: 'border-l-4 border-blue-700 bg-white text-gray-900',
    icon: 'text-blue-700',
    label: 'Info',
  },
} as const;

const Notification: React.FC = () => {
  const { message, type = 'info', isOpen, closeNotification } = useNotificationStore();
  const styles = tone[type as keyof typeof tone] ?? tone.info;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => closeNotification(), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, closeNotification]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="alert"
          aria-live="assertive"
          className={`
            fixed top-5 right-5 z-70
            w-[min(90vw,28rem)]
            rounded-md
            border border-gray-200
            ${styles.container}
          `}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
        >
          <div className="flex items-start p-3">
            <span className="mt-0.5 mr-3">
              {type === 'success' ? (
                <CheckCircleIcon className={`w-5 h-5 ${styles.icon}`} />
              ) : type === 'error' ? (
                <XCircleIcon className={`w-5 h-5 ${styles.icon}`} />
              ) : (
                <QuestionMarkCircleIcon className={`w-5 h-5 ${styles.icon}`} />
              )}
            </span>

            <div className="flex-1">
              <div className="text-sm font-medium">{styles.label}</div>
              <div className="text-sm text-gray-700">{message}</div>
            </div>

            <button
              onClick={closeNotification}
              className="ml-3 p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              aria-label="Close notification"
            >
              &times;
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification;
