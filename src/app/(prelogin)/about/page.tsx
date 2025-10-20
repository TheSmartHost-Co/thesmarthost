import PreNavbar from "@/components/navbar/PreNavbar"
import Link from "next/link"
import Footer from '@/components/footer/Footer'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PreNavbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28 pb-28">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About TheSmartHost</h1>
          <p className="text-xl text-gray-600">
            Revolutionizing financial reporting for short-term rental property managers
          </p>
        </div>

        <div className="prose prose-lg mx-auto">
          <div className="bg-blue-50 p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700">
              We eliminate the 2-4 hours property managers spend each month manually compiling financial reports. 
              Our PMS-agnostic platform automates data processing from booking platforms like Hostaway, Airbnb, and VRBO, 
              delivering professional branded reports in minutes, not hours.
            </p>
          </div>

          <div className="bg-gray-50 p-8 rounded-lg mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">The Problem We Solve</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Current Manual Process:</h4>
                <ul className="text-gray-700 space-y-1 list-disc list-inside">
                  <li>Dual-screen data entry across multiple platforms</li>
                  <li>Manual fee calculations with error risk</li>
                  <li>Inconsistent report formats</li>
                  <li>Delayed reporting cycles</li>
                  <li>Growth limitations due to time constraints</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Our Automated Solution:</h4>
                <ul className="text-gray-700 space-y-1 list-disc list-inside">
                  <li>Single CSV upload for all bookings</li>
                  <li>Automated financial calculations</li>
                  <li>Standardized branded PDF reports</li>
                  <li>Real-time client portal access</li>
                  <li>90% time reduction (4 hours → 10 minutes)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Built for Property Managers</h3>
              <p className="text-gray-700">
                We understand the pain of manual reporting. Our platform is designed by property managers, 
                for property managers, addressing real workflow challenges with practical automation.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Scalable Growth</h3>
              <p className="text-gray-700">
                Stop being limited by manual processes. Our multi-tenant platform enables you to 
                onboard new clients efficiently without proportional increases in administrative time.
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-lg text-gray-600 mb-6">
              Ready to automate your property reporting?
            </p>
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Start Your Free Trial
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}