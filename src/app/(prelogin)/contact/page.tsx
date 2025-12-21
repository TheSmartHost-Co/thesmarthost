'use client'

import PreNavbar from "@/components/navbar/PreNavbar"
import Link from "next/link"
import Footer from '@/components/footer/Footer'
import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  EnvelopeIcon,
  ClockIcon,
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    subject: 'Schedule a Demo',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormState(prev => ({
      ...prev,
      [e.target.id]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  const contactInfo = [
    {
      icon: EnvelopeIcon,
      title: "Email Us",
      lines: ["support@thesmarthost.com", "sales@thesmarthost.com"],
    },
    {
      icon: ClockIcon,
      title: "Response Time",
      lines: ["Demo requests within 24 hours", "Support same business day"],
    },
    {
      icon: MapPinIcon,
      title: "Location",
      lines: ["San Francisco, CA", "Remote-first team"],
    },
  ]

  const faqItems = [
    {
      question: "How long does the free trial last?",
      answer: "The free trial lasts 14 days with full access to all features. No credit card required.",
    },
    {
      question: "Which PMS platforms do you support?",
      answer: "We currently support Hostaway, Airbnb, and VRBO exports. More integrations are coming soon.",
    },
    {
      question: "Can I import data from multiple properties?",
      answer: "Yes! Our platform supports unlimited properties and clients with batch import capabilities.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade security with row-level isolation, encrypted storage, and regular audits.",
    },
  ]

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <PreNavbar />

      {/* Hero Section */}
      <section className="relative pt-28 pb-8 gradient-mesh">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute top-40 right-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Get in Touch</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Let's Start a
              <br />
              <span className="text-blue-600">Conversation</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Ready to automate your property reporting? We'd love to hear from you and discuss how TheSmartHost can transform your workflow.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-16">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3"
            >
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-premium">
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                      <CheckCircleIcon className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Message Sent!</h3>
                    <p className="text-gray-600 mb-6">
                      Thank you for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => {
                        setIsSubmitted(false)
                        setFormState({
                          name: '',
                          email: '',
                          company: '',
                          subject: 'Schedule a Demo',
                          message: '',
                        })
                      }}
                      className="text-blue-600 font-medium hover:text-blue-700"
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            id="name"
                            value={formState.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Your full name"
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="email"
                            value={formState.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="your@email.com"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                            Company <span className="text-gray-400">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            id="company"
                            value={formState.company}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Your company name"
                          />
                        </div>
                        <div>
                          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                            Subject
                          </label>
                          <select
                            id="subject"
                            value={formState.subject}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          >
                            <option>Schedule a Demo</option>
                            <option>Pricing and Plans</option>
                            <option>Technical Integration</option>
                            <option>PMS Compatibility</option>
                            <option>General Questions</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                          Message
                        </label>
                        <textarea
                          id="message"
                          rows={5}
                          value={formState.message}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          placeholder="Tell us about your property management workflow and reporting needs..."
                        />
                      </div>

                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-70"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Sending...
                          </>
                        ) : (
                          <>
                            Send Message
                            <PaperAirplaneIcon className="w-5 h-5" />
                          </>
                        )}
                      </motion.button>
                    </form>
                  </>
                )}
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 space-y-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>

              {contactInfo.map((info, index) => (
                <motion.div
                  key={info.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <info.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{info.title}</h3>
                    {info.lines.map((line, i) => (
                      <p key={i} className="text-gray-600 text-sm">{line}</p>
                    ))}
                  </div>
                </motion.div>
              ))}

              {/* Quick Start CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-8 p-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl text-white"
              >
                <h3 className="font-semibold text-lg mb-2">Ready to get started?</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Skip the form and jump right into a free trial. No credit card required.
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-white text-blue-600 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors"
                >
                  Start Free Trial
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-gray-600">
              Quick answers to common questions
            </p>
          </motion.div>

          <div className="space-y-4">
            {faqItems.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600">{faq.answer}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <p className="text-gray-600">
              Have more questions?{' '}
              <a href="mailto:support@thesmarthost.com" className="text-blue-600 font-medium hover:text-blue-700">
                Email us directly
              </a>
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
