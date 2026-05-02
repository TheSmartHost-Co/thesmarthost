'use client'

import React from 'react'

interface FormulaHelpPanelProps {
  sectionMode: 'header' | 'field' | 'table'
}

const FormulaHelpPanel: React.FC<FormulaHelpPanelProps> = ({ sectionMode }) => {
  return (
    <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 space-y-3">
      <h4 className="font-semibold text-gray-800 text-xs uppercase tracking-wider">Formula Reference</h4>

      {sectionMode === 'header' && <HeaderHelp />}
      {sectionMode === 'field' && <FieldHelp />}
      {sectionMode === 'table' && <TableHelp />}
    </div>
  )
}

const HeaderHelp: React.FC = () => (
  <div className="space-y-2">
    <HelpSection title="Variable Substitution">
      <HelpExample formula="{propertyName}" desc="Property listing name" />
      <HelpExample formula="{propertyName} - {monthName} {year}" desc="Combine text with variables" />
      <HelpExample formula="{primaryOwnerName}" desc="Primary owner name" />
      <HelpExample formula="{reportPeriod}" desc="Full reporting period string" />
      <HelpExample formula="{logo}" desc="Display uploaded company logo (must be used alone)" />
    </HelpSection>
    <p className="text-[11px] text-gray-500 italic">
      Header fields support variable substitution only — no arithmetic.
    </p>
  </div>
)

const FieldHelp: React.FC = () => (
  <div className="space-y-2">
    <HelpSection title="Aggregate Functions">
      <HelpExample formula="SUM(totalPayout)" desc="Sum a column across all bookings" />
      <HelpExample formula="AVG(nightlyRate)" desc="Average of a column" />
      <HelpExample formula="COUNT()" desc="Total number of bookings" />
      <HelpExample formula="MIN(netEarnings)" desc="Minimum value" />
      <HelpExample formula="MAX(netEarnings)" desc="Maximum value" />
    </HelpSection>

    <HelpSection title="Conditional Aggregates">
      <HelpExample formula="SUMIF(totalPayout, platform, '=', 'Airbnb')" desc="Sum where platform is Airbnb" />
      <HelpExample formula="COUNTIF(totalPayout, numNights, '>=', '7')" desc="Count bookings with 7+ nights" />
      <p className="text-[11px] text-gray-500">
        Operators: <code className="font-mono bg-gray-200 px-1 rounded">=</code>{' '}
        <code className="font-mono bg-gray-200 px-1 rounded">!=</code>{' '}
        <code className="font-mono bg-gray-200 px-1 rounded">&lt;</code>{' '}
        <code className="font-mono bg-gray-200 px-1 rounded">&gt;</code>{' '}
        <code className="font-mono bg-gray-200 px-1 rounded">&lt;=</code>{' '}
        <code className="font-mono bg-gray-200 px-1 rounded">&gt;=</code>
      </p>
    </HelpSection>

    <HelpSection title="Cross-Section References">
      <HelpExample formula="SUM({booking_details.mgmt_fee})" desc="Sum a column from a table section" />
      <HelpExample formula="{revenue.total_payout} - SUM({expense_details.amount})" desc="Combine section values" />
    </HelpSection>

    <HelpSection title="Arithmetic">
      <HelpExample formula="SUM(totalPayout) - SUM({expenses.amount})" desc="Subtraction" />
      <HelpExample formula="{total_revenue} * 0.15" desc="Multiply by a constant" />
    </HelpSection>
  </div>
)

const TableHelp: React.FC = () => (
  <div className="space-y-2">
    <HelpSection title="Direct Columns (text/date/numeric/currency)">
      <HelpExample formula="guestName" desc="Just the column name — no braces or functions" />
      <HelpExample formula="checkInDate" desc="Date columns render formatted dates" />
      <HelpExample formula="totalPayout" desc="Currency columns render with $ formatting" />
    </HelpSection>

    <HelpSection title="Calculated Columns">
      <HelpExample formula="{nightlyRate} * {numNights}" desc="Arithmetic with column refs in braces" />
      <HelpExample formula="{mgmtFee} + {cleaningFee}" desc="Add two columns" />
    </HelpSection>

    <HelpSection title="IF() Conditional">
      <HelpExample
        formula="IF(platform, '=', 'Airbnb', {mgmtFee} * 1.1, {mgmtFee})"
        desc="Different value based on condition"
      />
      <p className="text-[11px] text-gray-500">
        Syntax: <code className="font-mono bg-gray-200 px-1 rounded">IF(field, &apos;op&apos;, &apos;value&apos;, trueExpr, falseExpr)</code>
      </p>
    </HelpSection>

    <HelpSection title="Totals Row">
      <p className="text-[11px] text-gray-500">
        Set a totals function (SUM, AVG, COUNT) per column to add a footer row.
        SUM/AVG only work on numeric and currency columns.
      </p>
    </HelpSection>
  </div>
)

// --- Shared sub-components ---

const HelpSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h5 className="font-medium text-gray-700 mb-1">{title}</h5>
    <div className="space-y-1">{children}</div>
  </div>
)

const HelpExample: React.FC<{ formula: string; desc: string }> = ({ formula, desc }) => (
  <div className="flex items-start gap-2">
    <code className="font-mono text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-800 shrink-0 break-all">
      {formula}
    </code>
    <span className="text-[11px] text-gray-500">{desc}</span>
  </div>
)

export default FormulaHelpPanel
