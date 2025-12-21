'use client'

import Link from "next/link"
import PreNavbar from "@/components/navbar/PreNavbar"
import Footer from '@/components/footer/Footer'
import { motion } from 'framer-motion'
import {
  ClockIcon,
  DocumentChartBarIcon,
  CloudArrowUpIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  UsersIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
}

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function Home() {
  const features = [
    {
      icon: ClockIcon,
      title: "90% Time Savings",
      description: "Reduce monthly reporting from 4 hours to just 10 minutes with automated calculations.",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: CloudArrowUpIcon,
      title: "PMS-Agnostic",
      description: "Works with Hostaway, Airbnb, VRBO exports. One platform for all your booking data.",
      color: "from-teal-500 to-teal-600",
    },
    {
      icon: DocumentChartBarIcon,
      title: "Branded Reports",
      description: "Professional PDF reports with your branding, generated automatically every month.",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: ShieldCheckIcon,
      title: "Secure Portal",
      description: "Property owners access their reports 24/7 through a secure, multi-tenant portal.",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: ChartBarIcon,
      title: "Real-time Analytics",
      description: "Interactive dashboards with drill-down capability for revenue and booking insights.",
      color: "from-pink-500 to-pink-600",
    },
    {
      icon: UsersIcon,
      title: "Multi-Owner Support",
      description: "Handle co-ownership with custom commission splits and individual reporting.",
      color: "from-indigo-500 to-indigo-600",
    },
  ]

  const stats = [
    { value: "90%", label: "Time Saved" },
    { value: "10min", label: "Per Report" },
    { value: "100%", label: "Automated" },
  ]

  const testimonials = [
    {
      quote: "TheSmartHost transformed our reporting workflow. What used to take half a day now takes minutes.",
      author: "Sarah Chen",
      role: "Property Manager",
      company: "Urban Stays Co.",
    },
    {
      quote: "The automated PDF reports are professional and our clients love having 24/7 access to their statements.",
      author: "Michael Torres",
      role: "Operations Director",
      company: "Coastal Rentals",
    },
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <PreNavbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center gradient-mesh">
        {/* Background decorations */}
        <div className="absolute inset-0 grid-pattern opacity-60" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
          <motion.div
            initial="initial"
            animate="animate"
            variants={stagger}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            {/* Hero Text */}
            <div className="text-center lg:text-left">
              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6"
              >
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span className="text-sm font-medium text-blue-700">Now in Beta</span>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
              >
                Property Reporting
                <br />
                <span className="text-blue-600">Automated</span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Transform 4 hours of manual work into 10 minutes.
                PMS-agnostic owner reporting platform for short-term rental managers.
              </motion.p>

              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/25 transition-all"
                  >
                    Start Free Trial
                    <ArrowRightIcon className="w-5 h-5" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/product"
                    className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-700 hover:text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
                  >
                    See How It Works
                  </Link>
                </motion.div>
              </motion.div>

              {/* Stats */}
              <motion.div
                variants={fadeInUp}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-12 flex items-center gap-8 justify-center lg:justify-start"
              >
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stat.value}</div>
                    <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Hero Visual */}
            <motion.div
              variants={fadeInUp}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative hidden lg:block"
            >
              {/* Main Dashboard Preview */}
              <div className="relative">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="ml-2 text-xs text-gray-400">TheSmartHost Dashboard</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl">
                      <div>
                        <div className="text-sm text-gray-500">Total Revenue</div>
                        <div className="text-2xl font-bold text-gray-900">$24,580</div>
                      </div>
                      <div className="text-green-600 text-sm font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        12.5%
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Properties", value: "12" },
                        { label: "Bookings", value: "48" },
                        { label: "Reports", value: "36" },
                      ].map((item) => (
                        <div key={item.label} className="p-3 bg-gray-50 rounded-lg text-center">
                          <div className="text-lg font-semibold text-gray-900">{item.value}</div>
                          <div className="text-xs text-gray-500">{item.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="h-24 bg-gradient-to-r from-blue-100 to-blue-50 rounded-lg flex items-end p-3 gap-1">
                      {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((height, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Floating Card - Report */}
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -left-12 top-32 bg-white rounded-xl shadow-xl border border-gray-100 p-4 w-52 z-10"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-md">
                      <CheckCircleIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">Report Ready</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-12">Ocean View Villa - Nov 2024</p>
                </motion.div>

                {/* Floating Card - Time Saved */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -right-8 bottom-16 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                      <ClockIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">3h 50m saved</div>
                      <div className="text-xs text-gray-500">This month</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-gray-300 flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-2.5 bg-gray-400 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Trusted By Section */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-8">
              Works with your favorite platforms
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
              {/* Hostaway */}
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-800">Hostaway</span>
              </motion.div>

              {/* Airbnb */}
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF5A5F] to-[#e04850] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.5 2 5.5 5 5.5 8.5c0 2.5 1.5 4.5 3.5 6.5l3 3 3-3c2-2 3.5-4 3.5-6.5C18.5 5 15.5 2 12 2zm0 9c-1.5 0-2.5-1-2.5-2.5S10.5 6 12 6s2.5 1 2.5 2.5S13.5 11 12 11z"/>
                  </svg>
                </div>
                <span className="font-semibold text-gray-800">Airbnb</span>
              </motion.div>

              {/* VRBO */}
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0057a3] to-[#003d75] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="font-semibold text-gray-800">VRBO</span>
              </motion.div>

              {/* Booking.com */}
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#003b95] to-[#00264d] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">B.</span>
                </div>
                <span className="font-semibold text-gray-800">Booking.com</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 dot-pattern opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to
              <br />
              <span className="text-blue-600">Automate Reporting</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built for property managers who want to spend less time on spreadsheets and more time growing their business.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="h-full bg-white rounded-2xl p-6 border border-gray-100 shadow-sm card-hover">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Simple 4-Step Process
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From CSV upload to professional reports in minutes, not hours.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Upload CSV", desc: "Drag and drop your PMS export file" },
              { step: "2", title: "Auto-Calculate", desc: "System processes all financial data" },
              { step: "3", title: "Review", desc: "Verify calculations in the dashboard" },
              { step: "4", title: "Generate", desc: "One-click branded PDF reports" },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-0.5 bg-gradient-to-r from-blue-200 to-blue-100" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Loved by Property Managers
            </h2>
            <p className="text-lg text-gray-600">
              See what our early adopters are saying
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm card-hover"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 text-lg mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 grid-pattern" />
        </div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Automate Your
              <br />
              Property Reporting?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Join property managers who've reduced their monthly reporting from 4 hours to 10 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow"
                >
                  Start Free Trial
                  <ArrowRightIcon className="w-5 h-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white/30 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors"
                >
                  Schedule Demo
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
