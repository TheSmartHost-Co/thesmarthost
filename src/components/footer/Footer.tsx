'use client'

import { FC } from 'react'

const Footer: FC = () => {
  const year = new Date().getFullYear()
  const supportEmail = 'support@thesmarthost.com'
  const subject = 'Technical Support Request'
  const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`

  return (
    <footer className="hidden md:block fixed bottom-0 w-full bg-white text-gray-700 border-t border-gray-300 z-30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-4 py-4">
        {/* Copyright */}
        <div className="flex items-center mb-4 md:mb-0">
          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
          <span>{year} TheSmartHost — All rights reserved</span>
        </div>

        {/* Contact */}
        <div className="flex items-center mb-4 md:mb-0">
          <a href={mailto} className="flex items-center hover:underline hover:text-blue-600 transition-colors">
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {supportEmail}
          </a>
        </div>

        {/* Social Icons */}
        <div className="flex space-x-4">
          <a href="https://twitter.com/thesmarthost" aria-label="Twitter" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://facebook.com/thesmarthost" aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 transition-colors">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a href="https://linkedin.com/company/thesmarthost" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a href="https://instagram.com/thesmarthost" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="hover:text-pink-600 transition-colors">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.73-3.016-1.8L4.27 17.94l-1.88-1.88 2.752-1.164c-1.069-.568-1.799-1.719-1.799-3.016 0-1.89 1.533-3.423 3.423-3.423s3.423 1.533 3.423 3.423c0 1.297-.73 2.448-1.8 3.016l1.164 2.752-1.88 1.88-2.752-1.164c-.568 1.069-1.719 1.799-3.016 1.799zm7.569 0c-1.297 0-2.448-.73-3.016-1.8l-1.164 2.752-1.88-1.88 2.752-1.164c-1.069-.568-1.799-1.719-1.799-3.016 0-1.89 1.533-3.423 3.423-3.423s3.423 1.533 3.423 3.423c0 1.297-.73 2.448-1.8 3.016l1.164 2.752-1.88 1.88-2.752-1.164c-.568 1.069-1.719 1.799-3.016 1.799z"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer