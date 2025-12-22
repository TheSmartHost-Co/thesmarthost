'use client';

import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotificationStore } from '@/store/useNotificationStore';

const NOTIFICATION_DURATION = 4000;

const toneStyles = {
  success: {
    container: 'bg-white border-green-200',
    iconBg: 'bg-green-100',
    icon: 'text-green-600',
    progress: 'bg-green-500',
    title: 'text-green-800',
  },
  error: {
    container: 'bg-white border-red-200',
    iconBg: 'bg-red-100',
    icon: 'text-red-600',
    progress: 'bg-red-500',
    title: 'text-red-800',
  },
  info: {
    container: 'bg-white border-blue-200',
    iconBg: 'bg-blue-100',
    icon: 'text-blue-600',
    progress: 'bg-blue-500',
    title: 'text-blue-800',
  },
} as const;

const toneLabels = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
} as const;

const Notification: React.FC = () => {
  const { message, type = 'info', isOpen, closeNotification } = useNotificationStore();
  const styles = toneStyles[type as keyof typeof toneStyles] ?? toneStyles.info;
  const label = toneLabels[type as keyof typeof toneLabels] ?? 'Info';
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isOpen) {
      setProgress(100);
      const startTime = Date.now();

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / NOTIFICATION_DURATION) * 100);
        setProgress(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          closeNotification();
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isOpen, closeNotification]);

  const IconComponent = type === 'success'
    ? CheckCircleIcon
    : type === 'error'
      ? XCircleIcon
      : InformationCircleIcon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="alert"
          aria-live="assertive"
          className={`
            fixed top-20 right-4 sm:right-6 z-[100]
            w-[min(92vw,380px)]
            rounded-2xl
            border
            shadow-xl shadow-gray-900/10
            overflow-hidden
            ${styles.container}
          `}
          initial={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, x: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <div className="flex items-start gap-3 p-4">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
              className={`flex-shrink-0 w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center`}
            >
              <IconComponent className={`w-5 h-5 ${styles.icon}`} />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className={`text-sm font-semibold ${styles.title}`}>{label}</p>
              <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{message}</p>
            </div>

            {/* Close Button */}
            <motion.button
              onClick={closeNotification}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close notification"
            >
              <XMarkIcon className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-gray-100">
            <motion.div
              className={`h-full ${styles.progress}`}
              initial={{ width: '100%' }}
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Notification;
