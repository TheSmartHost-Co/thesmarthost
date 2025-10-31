"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUserStore } from '@/store/useUserStore'

export default function PreNavbar() {
  const pathname = usePathname()
  const { profile, getRedirectPath } = useUserStore()
  
  // Check if user is authenticated and on a prelogin page
  const isAuthenticated = !!profile
  const isPreloginPage = pathname === '/' ||
                                 pathname.startsWith('/about') ||
                                 pathname.startsWith('/product') ||
                                 pathname.startsWith('/contact') ||
                                 pathname.startsWith('/login') ||
                                 pathname.startsWith('/signup') ||
                                 pathname.startsWith('/reset-password') ||
                                 pathname.startsWith('/check-email')
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
              TheSmartHost
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link 
                href="/about" 
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-md font-medium transition-colors"
              >
                About
              </Link>
              <Link 
                href="/product" 
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-md font-medium transition-colors"
              >
                Product
              </Link>
              <Link 
                href="/contact" 
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-md font-medium transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>

          {/* Auth Buttons / Dashboard Link */}
          <div className="flex items-center space-x-4">
            {isAuthenticated && isPreloginPage ? (
              <Link
                href={getRedirectPath()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-md font-medium transition-colors"
              >
                Back to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 text-md font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-md font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu - hidden by default */}
      <div className="md:hidden hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
          <Link
            href="/about"
            className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-sm font-medium"
          >
            About
          </Link>
          <Link
            href="/product"
            className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-sm font-medium"
          >
            Product
          </Link>
          <Link
            href="/contact"
            className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-sm font-medium"
          >
            Contact
          </Link>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex flex-col space-y-2 px-3">
              {isAuthenticated && isPreloginPage ? (
                <Link
                  href={getRedirectPath()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium text-center"
                >
                  Back to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-blue-600 block py-2 text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium text-center"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}