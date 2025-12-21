'use client'

import PreNavbar from "@/components/navbar/PreNavbar"
import Link from "next/link"
import Footer from '@/components/footer/Footer'
import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  CloudArrowUpIcon,
  CalculatorIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  UsersIcon,
  CubeTransparentIcon,
  BoltIcon,
  ArrowRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

export default function ProductPage() {
  const [activeFeature, setActiveFeature] = useState(0)

  const coreFeatures = [
    {
      icon: CloudArrowUpIcon,
      title: "Unified CSV Processing",
      description: "Single upload interface accepts exports from Hostaway, Airbnb, VRBO with automatic field mapping and validation.",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: CalculatorIcon,
      title: "Financial Calculation Engine",
      description: "Automated computation of Stripe fees, platform taxes, and management fees using configurable formulas.",
      color: "from-teal-500 to-teal-600",
    },
    {
      icon: ChartBarIcon,
      title: "Interactive Dashboard",
      description: "Real-time view of bookings, revenue, and fees with drill-down capability and responsive design.",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: DocumentTextIcon,
      title: "Automated Report Generation",
      description: "One-click PDF creation with branded templates, standardized format, and professional presentation.",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: UsersIcon,
      title: "Multi-Tenant Architecture",
      description: "Secure client portal where property owners can access monthly reports for their properties 24/7.",
      color: "from-pink-500 to-pink-600",
    },
    {
      icon: ShieldCheckIcon,
      title: "Enterprise Security",
      description: "Row-level security, data isolation, audit trails, and secure file storage for financial data protection.",
      color: "from-indigo-500 to-indigo-600",
    },
  ]

  const featureDetails = [
    {
      title: "Smart CSV Upload",
      subtitle: "Drag, drop, done.",
      description: "Our intelligent upload wizard automatically detects your PMS platform, maps fields correctly, and validates data before import. No manual configuration needed.",
      highlights: [
        "Auto-detect PMS platform format",
        "Smart field mapping suggestions",
        "Data validation and error detection",
        "Multi-property batch upload",
      ],
    },
    {
      title: "Automated Calculations",
      subtitle: "Accuracy you can trust.",
      description: "Say goodbye to spreadsheet errors. Our calculation engine handles all fee computations with configurable formulas that match your exact business logic.",
      highlights: [
        "Stripe fee calculations",
        "Platform commission splits",
        "Tax computations",
        "Custom formula support",
      ],
    },
    {
      title: "Real-time Dashboard",
      subtitle: "Insights at a glance.",
      description: "Interactive analytics that let you drill down into every booking, every property, every client. See the full picture of your business performance.",
      highlights: [
        "Revenue trends and forecasts",
        "Booking analytics",
        "Property performance metrics",
        "Client portfolio overview",
      ],
    },
    {
      title: "Professional Reports",
      subtitle: "Your brand, automated.",
      description: "Generate beautifully formatted PDF reports with your branding in one click. Consistent, professional, and ready to share with clients.",
      highlights: [
        "Custom branding support",
        "Standardized format",
        "One-click generation",
        "Email delivery ready",
      ],
    },
  ]

  const workflowSteps = [
    {
      step: "1",
      title: "Upload Your Data",
      description: "Export your bookings from any PMS and drop the CSV into TheSmartHost. Our system automatically identifies the format and maps the data.",
      icon: CloudArrowUpIcon,
    },
    {
      step: "2",
      title: "Auto-Process",
      description: "Watch as the system calculates all fees, taxes, and commissions in seconds. No manual entry, no spreadsheet formulas to maintain.",
      icon: BoltIcon,
    },
    {
      step: "3",
      title: "Review & Verify",
      description: "Check everything in the interactive dashboard. Drill down into any booking or property to verify the numbers before finalizing.",
      icon: ChartBarIcon,
    },
    {
      step: "4",
      title: "Generate Reports",
      description: "One click creates professional, branded PDF reports for each client. Send directly or let them access through the client portal.",
      icon: DocumentTextIcon,
    },
  ]

  const integrations = [
    { name: "Hostaway", status: "Available" },
    { name: "Airbnb", status: "Available" },
    { name: "VRBO", status: "Available" },
    { name: "Booking.com", status: "Coming Soon" },
    { name: "Guesty", status: "Coming Soon" },
    { name: "Lodgify", status: "Coming Soon" },
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <PreNavbar />

      {/* Hero Section */}
      <section className="relative pt-28 pb-12 gradient-mesh">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute top-40 right-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
              <CubeTransparentIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Platform Overview</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              The Complete
              <br />
              <span className="text-blue-600">Property Reporting Platform</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
              PMS-agnostic owner reporting that transforms hours of manual work into minutes of automated precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-blue-500/25 transition-all"
                >
                  Start Free Trial
                  <ArrowRightIcon className="w-5 h-5" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-700 hover:text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg transition-all"
                >
                  Schedule Demo
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Core Capabilities
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to automate your property management reporting workflow
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map((feature, index) => (
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

      {/* Interactive Feature Showcase */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Explore Key Features
            </h2>
            <p className="text-lg text-gray-600">
              Click to learn more about each capability
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Feature Tabs */}
            <div className="space-y-4">
              {featureDetails.map((feature, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setActiveFeature(index)}
                  className={`w-full text-left p-6 rounded-2xl transition-all duration-300 ${
                    activeFeature === index
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md'
                  }`}
                >
                  <h3 className={`text-lg font-semibold mb-1 ${activeFeature === index ? 'text-white' : 'text-gray-900'}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-sm ${activeFeature === index ? 'text-blue-100' : 'text-gray-500'}`}>
                    {feature.subtitle}
                  </p>
                </motion.button>
              ))}
            </div>

            {/* Feature Details */}
            <motion.div
              key={activeFeature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {featureDetails[activeFeature].title}
              </h3>
              <p className="text-blue-600 font-medium mb-4">
                {featureDetails[activeFeature].subtitle}
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                {featureDetails[activeFeature].description}
              </p>
              <ul className="space-y-3">
                {featureDetails[activeFeature].highlights.map((highlight, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-700">{highlight}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From raw data to professional reports in four simple steps
            </p>
          </motion.div>

          <div className="relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute top-24 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" />

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="relative text-center"
                >
                  <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
                    <step.icon className="w-8 h-8" />
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border-2 border-blue-600 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm z-20">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Platform Integrations
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Import data from all major property management platforms
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {integrations.map((integration, index) => (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={`p-6 rounded-2xl text-center ${
                  integration.status === 'Available'
                    ? 'bg-white border border-gray-100 shadow-sm'
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <div className="text-lg font-semibold text-gray-900 mb-2">{integration.name}</div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  integration.status === 'Available'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {integration.status}
                </span>
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
              Ready to Transform Your
              <br />
              Reporting Workflow?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Start your free trial today and see why property managers love TheSmartHost.
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
