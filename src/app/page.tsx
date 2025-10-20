import Link from "next/link"
import PreNavbar from "@/components/navbar/PreNavbar"
import Footer from '@/components/footer/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <PreNavbar />
      
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="py-20 text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            Welcome to{" "}
            <span className="text-blue-600">TheSmartHost</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Automate your property reporting workflow. Transform 4 hours of manual work into 10 minutes 
            with our PMS-agnostic owner reporting platform for short-term rental managers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/product"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 px-8 py-3 rounded-lg font-medium text-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose TheSmartHost?
            </h2>
            <p className="text-lg text-gray-600">
              Built for property managers, designed for efficiency
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">90% Time Reduction</h3>
              <p className="text-gray-600">
                Reduce monthly reporting from 4 hours to 10 minutes with automated calculations and PDF generation
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">PMS-Agnostic Platform</h3>
              <p className="text-gray-600">
                Works with Hostaway, Airbnb, VRBO exports - one platform for all your booking data
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Client Portal Access</h3>
              <p className="text-gray-600">
                Secure multi-tenant platform where property owners access their monthly reports 24/7
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}