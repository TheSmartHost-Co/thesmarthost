'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ClockIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ArrowPathIcon,
  BellIcon,
  ServerStackIcon,
  CodeBracketIcon,
  CircleStackIcon,
  PlusIcon,
  InformationCircleIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline'

// Feature status badge component
const StatusBadge = ({ status }: { status: 'planned' | 'in-progress' | 'ready' }) => {
  const styles = {
    planned: 'bg-amber-100 text-amber-800 border-amber-200',
    'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
    ready: 'bg-green-100 text-green-800 border-green-200',
  }
  const labels = {
    planned: 'Planned',
    'in-progress': 'In Progress',
    ready: 'Ready',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default function ScheduledReportsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'architecture' | 'implementation'>('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LightBulbIcon },
    { id: 'architecture', label: 'Architecture', icon: ServerStackIcon },
    { id: 'implementation', label: 'Implementation', icon: CodeBracketIcon },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scheduled Reports</h1>
              <p className="text-gray-500">Automate report generation and distribution</p>
            </div>
          </div>
        </div>
        <StatusBadge status="planned" />
      </div>

      {/* Value Proposition Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <RocketLaunchIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">The Game Changer</h2>
            <p className="text-amber-100 mb-4">
              Currently, generating and sending reports takes <span className="font-bold text-white">2-4 hours per client</span> each month.
              With scheduled reports, this becomes <span className="font-bold text-white">fully automated</span> - reducing ongoing effort to near-zero.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                <span>Auto-generate on schedule</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                <span>Email to property owners</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                <span>Track delivery status</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: 1,
                  title: 'Configure Schedule',
                  description: 'Set up monthly or custom schedules for each property or group of properties',
                  icon: CalendarDaysIcon,
                  color: 'blue',
                },
                {
                  step: 2,
                  title: 'Auto-Generate',
                  description: 'Reports automatically generate on the scheduled day (e.g., 1st or 5th of month)',
                  icon: ArrowPathIcon,
                  color: 'green',
                },
                {
                  step: 3,
                  title: 'Email Delivery',
                  description: 'PDFs are automatically emailed to property owners with customizable templates',
                  icon: EnvelopeIcon,
                  color: 'purple',
                },
                {
                  step: 4,
                  title: 'Track & Monitor',
                  description: 'See delivery status, open rates, and download activity for each report',
                  icon: ChartBarIcon,
                  color: 'amber',
                },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center mb-4`}>
                    <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                  </div>
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {item.step}
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* UI Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-gray-400" />
              Schedule Configuration UI
            </h3>

            {/* Mock Schedule Form */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-semibold text-gray-900">Create Report Schedule</h4>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Preview</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Schedule Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Schedule Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Monthly Owner Reports"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled
                  >
                    <option>Monthly</option>
                    <option>Weekly</option>
                    <option>Quarterly</option>
                  </select>
                </div>

                {/* Day of Month */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Generate On Day</label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled
                  >
                    <option>5th of each month</option>
                    <option>1st of each month</option>
                    <option>15th of each month</option>
                    <option>Last day of month</option>
                  </select>
                </div>

                {/* Report Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Format</label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled
                  >
                    <option>PDF</option>
                    <option>PDF + Excel</option>
                    <option>All Formats</option>
                  </select>
                </div>

                {/* Properties */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Properties</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-white border border-gray-300 rounded-xl min-h-[44px]">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                      All Properties
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Or select specific properties</p>
                </div>

                {/* Recipients */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled
                  >
                    <option>Property Owners (all owners of each property)</option>
                    <option>Primary Owner Only</option>
                    <option>Custom Email List</option>
                  </select>
                </div>

                {/* Include Sections */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Include in Report</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Financial Summary', checked: true },
                      { label: 'Booking Details', checked: true },
                      { label: 'Expense Details', checked: false },
                      { label: 'Occupancy Stats', checked: true },
                    ].map((item) => (
                      <label key={item.label} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                          disabled
                        />
                        <span className="text-sm text-gray-700">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors" disabled>
                  Cancel
                </button>
                <button className="px-5 py-2.5 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors flex items-center gap-2" disabled>
                  <PlusIcon className="w-4 h-4" />
                  Create Schedule
                </button>
              </div>
            </div>
          </motion.div>

          {/* Schedules List Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-gray-400" />
                Active Schedules
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {[
                {
                  name: 'Monthly Owner Reports',
                  frequency: 'Monthly on the 5th',
                  properties: 'All Properties (12)',
                  recipients: 'Property Owners',
                  status: 'active',
                  lastRun: 'Jan 5, 2026',
                  nextRun: 'Feb 5, 2026',
                },
                {
                  name: 'VIP Client Reports',
                  frequency: 'Weekly on Monday',
                  properties: 'Premium Listings (3)',
                  recipients: 'Custom List (2)',
                  status: 'active',
                  lastRun: 'Jan 13, 2026',
                  nextRun: 'Jan 20, 2026',
                },
                {
                  name: 'Quarterly Summary',
                  frequency: 'Quarterly',
                  properties: 'All Properties (12)',
                  recipients: 'Myself',
                  status: 'paused',
                  lastRun: 'Oct 1, 2025',
                  nextRun: 'Paused',
                },
              ].map((schedule, index) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        schedule.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {schedule.status === 'active' ? (
                          <PlayIcon className="w-5 h-5 text-green-600" />
                        ) : (
                          <PauseIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{schedule.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{schedule.frequency}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <DocumentTextIcon className="w-3.5 h-3.5" />
                            {schedule.properties}
                          </span>
                          <span className="flex items-center gap-1">
                            <EnvelopeIcon className="w-3.5 h-3.5" />
                            {schedule.recipients}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Next run</div>
                      <div className={`text-sm font-medium ${schedule.status === 'paused' ? 'text-gray-400' : 'text-gray-900'}`}>
                        {schedule.nextRun}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Last: {schedule.lastRun}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Delivery Tracking Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BellIcon className="w-5 h-5 text-gray-400" />
                Delivery Tracking
              </h3>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Sent This Month', value: '24', color: 'blue' },
                  { label: 'Delivered', value: '23', color: 'green' },
                  { label: 'Opened', value: '18', color: 'purple' },
                  { label: 'Downloaded', value: '12', color: 'amber' },
                ].map((stat) => (
                  <div key={stat.label} className={`bg-${stat.color}-50 rounded-xl p-4 border border-${stat.color}-100`}>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Property</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Recipient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sent</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      { property: 'Downtown Loft #1', recipient: 'john@example.com', sent: 'Jan 5, 2026', status: 'Downloaded' },
                      { property: 'Beach House Suite', recipient: 'sarah@example.com', sent: 'Jan 5, 2026', status: 'Opened' },
                      { property: 'Mountain Retreat', recipient: 'mike@example.com', sent: 'Jan 5, 2026', status: 'Delivered' },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.property}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.recipient}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{row.sent}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            row.status === 'Downloaded' ? 'bg-green-100 text-green-800' :
                            row.status === 'Opened' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {/* System Architecture */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <ServerStackIcon className="w-5 h-5 text-gray-400" />
              System Architecture
            </h3>

            {/* Architecture Diagram */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Scheduler */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ClockIcon className="w-10 h-10 text-amber-600" />
                  </div>
                  <div className="font-semibold text-gray-900">Scheduler</div>
                  <div className="text-xs text-gray-500 mt-1">Cron Jobs / Task Queue</div>
                </div>

                <div className="hidden md:block text-3xl text-gray-300">→</div>

                {/* Report Generator */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <DocumentTextIcon className="w-10 h-10 text-blue-600" />
                  </div>
                  <div className="font-semibold text-gray-900">Report Generator</div>
                  <div className="text-xs text-gray-500 mt-1">Existing Report API</div>
                </div>

                <div className="hidden md:block text-3xl text-gray-300">→</div>

                {/* Email Service */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <EnvelopeIcon className="w-10 h-10 text-purple-600" />
                  </div>
                  <div className="font-semibold text-gray-900">Email Service</div>
                  <div className="text-xs text-gray-500 mt-1">SendGrid / Mailgun</div>
                </div>

                <div className="hidden md:block text-3xl text-gray-300">→</div>

                {/* Tracking */}
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ChartBarIcon className="w-10 h-10 text-green-600" />
                  </div>
                  <div className="font-semibold text-gray-900">Tracking</div>
                  <div className="text-xs text-gray-500 mt-1">Webhooks / Pixels</div>
                </div>
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600">
              <p>
                The scheduled reports system extends your existing report generation infrastructure. The key addition is a
                <strong> scheduler service</strong> that runs on the backend and triggers report generation at configured times.
              </p>
            </div>
          </motion.div>

          {/* Database Schema */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <CircleStackIcon className="w-5 h-5 text-gray-400" />
              Database Schema (New Tables)
            </h3>

            <div className="space-y-6">
              {/* report_schedules table */}
              <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                <div className="text-green-400 text-sm font-mono mb-2">-- Report Schedules</div>
                <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap">
{`CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Schedule configuration
  frequency VARCHAR(50) NOT NULL, -- 'monthly', 'weekly', 'quarterly'
  day_of_month INT,               -- 1-31 for monthly
  day_of_week INT,                -- 0-6 for weekly
  time_of_day TIME DEFAULT '09:00:00',
  timezone VARCHAR(50) DEFAULT 'America/Toronto',

  -- Report configuration
  format VARCHAR(20) DEFAULT 'pdf', -- 'pdf', 'excel', 'all'
  include_financial BOOLEAN DEFAULT true,
  include_bookings BOOLEAN DEFAULT true,
  include_expenses BOOLEAN DEFAULT false,
  include_occupancy BOOLEAN DEFAULT true,

  -- Recipients
  recipient_type VARCHAR(50) DEFAULT 'owners', -- 'owners', 'primary_owner', 'custom'
  custom_emails TEXT[],

  -- Email template
  email_subject VARCHAR(500),
  email_body TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'deleted'
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`}
                </pre>
              </div>

              {/* schedule_properties junction */}
              <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                <div className="text-green-400 text-sm font-mono mb-2">-- Schedule ↔ Properties (Many-to-Many)</div>
                <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap">
{`CREATE TABLE schedule_properties (
  schedule_id UUID REFERENCES report_schedules(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  PRIMARY KEY (schedule_id, property_id)
);

-- NULL schedule_properties means "all properties"`}
                </pre>
              </div>

              {/* schedule_runs table */}
              <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
                <div className="text-green-400 text-sm font-mono mb-2">-- Execution History & Tracking</div>
                <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap">
{`CREATE TABLE schedule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES report_schedules(id),

  -- Execution info
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status VARCHAR(20), -- 'running', 'success', 'partial', 'failed'
  error_message TEXT,

  -- Stats
  reports_generated INT DEFAULT 0,
  emails_sent INT DEFAULT 0,
  emails_failed INT DEFAULT 0
);

CREATE TABLE schedule_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES schedule_runs(id),
  report_id UUID REFERENCES reports(id),

  -- Recipient
  recipient_email VARCHAR(255) NOT NULL,
  property_id UUID REFERENCES properties(id),

  -- Delivery tracking
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  downloaded_at TIMESTAMP,

  -- Email service tracking
  email_provider_id VARCHAR(255), -- SendGrid message ID
  status VARCHAR(20) -- 'pending', 'sent', 'delivered', 'opened', 'failed'
);`}
                </pre>
              </div>
            </div>
          </motion.div>

          {/* Backend Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <CodeBracketIcon className="w-5 h-5 text-gray-400" />
              Backend Services Required
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  name: 'Schedule Service',
                  description: 'CRUD operations for report schedules',
                  endpoints: ['POST /schedules', 'GET /schedules', 'PUT /schedules/:id', 'DELETE /schedules/:id'],
                  color: 'blue',
                },
                {
                  name: 'Scheduler Worker',
                  description: 'Background job that checks and executes due schedules',
                  endpoints: ['Cron job (every hour)', 'node-cron or Bull queue'],
                  color: 'amber',
                },
                {
                  name: 'Email Service',
                  description: 'Sends reports via email with tracking',
                  endpoints: ['SendGrid/Mailgun integration', 'Webhook handlers for tracking'],
                  color: 'purple',
                },
                {
                  name: 'Delivery Tracking',
                  description: 'Tracks email opens, downloads, delivery status',
                  endpoints: ['GET /webhook/email-events', 'GET /reports/:id/track-download'],
                  color: 'green',
                },
              ].map((service) => (
                <div key={service.name} className={`border border-${service.color}-200 rounded-xl p-4 bg-${service.color}-50/50`}>
                  <h4 className="font-semibold text-gray-900 mb-2">{service.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                  <div className="space-y-1">
                    {service.endpoints.map((endpoint, idx) => (
                      <code key={idx} className="block text-xs bg-white px-2 py-1 rounded text-gray-700">
                        {endpoint}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'implementation' && (
        <div className="space-y-6">
          {/* Implementation Phases */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <WrenchScrewdriverIcon className="w-5 h-5 text-gray-400" />
              Implementation Roadmap
            </h3>

            <div className="space-y-6">
              {[
                {
                  phase: 'Phase 1',
                  title: 'Database & Backend Foundation',
                  duration: '1-2 weeks',
                  tasks: [
                    'Create database migrations for new tables',
                    'Build schedule CRUD API endpoints',
                    'Create schedule service in Express.js',
                    'Add schedule validation logic',
                  ],
                  status: 'planned',
                },
                {
                  phase: 'Phase 2',
                  title: 'Scheduler Worker',
                  duration: '1 week',
                  tasks: [
                    'Set up Bull queue or node-cron for job scheduling',
                    'Create scheduler worker that runs hourly',
                    'Integrate with existing report generation API',
                    'Handle retries and failure scenarios',
                  ],
                  status: 'planned',
                },
                {
                  phase: 'Phase 3',
                  title: 'Email Integration',
                  duration: '1 week',
                  tasks: [
                    'Set up SendGrid or Mailgun account',
                    'Create email templates for report delivery',
                    'Implement PDF attachment handling',
                    'Set up webhook handlers for delivery tracking',
                  ],
                  status: 'planned',
                },
                {
                  phase: 'Phase 4',
                  title: 'Frontend UI',
                  duration: '1-2 weeks',
                  tasks: [
                    'Create schedule management components',
                    'Build schedule creation/edit modal',
                    'Add delivery tracking dashboard',
                    'Integrate with existing reports page',
                  ],
                  status: 'planned',
                },
                {
                  phase: 'Phase 5',
                  title: 'Testing & Polish',
                  duration: '1 week',
                  tasks: [
                    'End-to-end testing of full flow',
                    'Error handling and edge cases',
                    'Performance optimization',
                    'Documentation',
                  ],
                  status: 'planned',
                },
              ].map((phase, idx) => (
                <div key={phase.phase} className="relative pl-8 pb-6 last:pb-0">
                  {/* Timeline line */}
                  {idx < 4 && (
                    <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                  )}

                  {/* Timeline dot */}
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                    phase.status === 'ready' ? 'bg-green-500' :
                    phase.status === 'in-progress' ? 'bg-blue-500' :
                    'bg-gray-300'
                  }`}>
                    {phase.status === 'ready' && <CheckCircleIcon className="w-4 h-4 text-white" />}
                    {phase.status === 'in-progress' && <ArrowPathIcon className="w-4 h-4 text-white animate-spin" />}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-xs font-medium text-amber-600 uppercase">{phase.phase}</span>
                        <h4 className="font-semibold text-gray-900">{phase.title}</h4>
                      </div>
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                        {phase.duration}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {phase.tasks.map((task, taskIdx) => (
                        <li key={taskIdx} className="flex items-start gap-2 text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0"></div>
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tech Stack Decisions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 text-gray-400" />
              Technology Decisions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Scheduler */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Job Scheduler</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Bull + Redis (Recommended)</div>
                      <div className="text-sm text-gray-500">Reliable, supports retries, delays, priorities</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 opacity-60">
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">node-cron</div>
                      <div className="text-sm text-gray-500">Simpler, no Redis needed, but less robust</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Service */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Email Service</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">SendGrid (Recommended)</div>
                      <div className="text-sm text-gray-500">Great tracking, 100 emails/day free tier</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 opacity-60">
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Mailgun / Resend</div>
                      <div className="text-sm text-gray-500">Good alternatives with similar features</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Frontend Files to Create */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <CloudArrowUpIcon className="w-5 h-5 text-gray-400" />
              Frontend Files to Create
            </h3>

            <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-gray-300 text-sm font-mono whitespace-pre">
{`src/
├── app/(user)/property-manager/scheduled-reports/
│   └── page.tsx                    # This page (convert to functional)
│
├── components/scheduled-reports/
│   ├── create/
│   │   └── createScheduleModal.tsx  # Create/edit schedule modal
│   ├── delete/
│   │   └── deleteScheduleModal.tsx  # Delete confirmation
│   ├── preview/
│   │   └── previewScheduleModal.tsx # View schedule details
│   └── tracking/
│       └── deliveryTrackingModal.tsx # View delivery stats
│
├── services/
│   ├── scheduleService.ts           # CRUD API calls
│   └── types/
│       └── schedule.ts              # TypeScript interfaces
│
└── store/
    └── useScheduleStore.ts          # Optional: Zustand store`}
              </pre>
            </div>
          </motion.div>

          {/* Next Steps CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <RocketLaunchIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">Ready to Build?</h3>
                <p className="text-gray-300 mb-4">
                  This feature requires both frontend and backend work. Start with the backend database
                  migrations and API endpoints, then build out the frontend UI.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg text-sm">
                    Backend: ~3-4 weeks
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-sm">
                    Frontend: ~2-3 weeks
                  </span>
                  <span className="inline-flex items-center px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-sm">
                    Total: ~5-7 weeks
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
