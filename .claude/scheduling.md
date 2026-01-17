i love this feature  High-Impact Features (Game Changers)

  1. Scheduled Report Generation & Auto-Distribution

  Current State: Reports are generated manually, downloaded, then emailed separately to clients.

  Opportunity:
  - Schedule monthly reports to auto-generate on the 1st/5th of each month
  - Auto-email to clients with PDF attachment
  - Track delivery status (sent, opened, downloaded)

  Why it matters: This is your core value prop - reducing 2-4 hours → 10 minutes. Automating distribution
 could reduce it further to near-zero ongoing effort.

  ┌─────────────────────────────────────────────────────────┐
  │  Report Schedule Configuration                          │
  ├─────────────────────────────────────────────────────────┤
  │  Generate: [Monthly ▼] on day [5 ▼]                     │
  │  Format: [PDF ▼]                                        │
  │  Recipients: [All property owners ▼]                    │
  │  Include: ☑ Financial Summary  ☑ Expense Details       │
  │           ☑ Occupancy Stats    ☐ Raw Bookings          │
  └─────────────────────────────────────────────────────────┘
i really really love this idea, i think btw we can just use resend via api key , so we'll just use 
resend in the backend to send it to clients, and we'll add a feature so that the user can cc themselves 
and also rather than only letting the user select existing clients, we can also let them just enter 
emails, and they can enter multiple emails, and they can also send a test email to themselves, what do 
you think of this? i think we can start building it out now, atleast the report schedule configuration, 
what do you think we should start with on the backend/schema side of things? use feature-dev and 
investigate our existing reports section , service etc 
/Users/husseinsaab/Documents/GitHub/thesmarthost/src/services/reportService.ts 
/Users/husseinsaab/Documents/GitHub/thesmarthost/src/app/(user)/property-manager/reports/page.tsx 
/Users/husseinsaab/Documents/GitHub/thesmarthost-backend/routes/reports.routes.js 
/Users/husseinsaab/Documents/GitHub/thesmarthost-backend/queries/reports.queries.js 
/Users/husseinsaab/Documents/GitHub/thesmarthost-backend/controllers/reports.controller.js create table 
public.report_files (
  id uuid not null default gen_random_uuid (),
  report_id uuid not null,
  format text not null,
  file_path text not null,
  version_number bigint not null,
  is_current boolean not null,
  generated_at timestamp with time zone not null default now(),
  notes text null,
  constraint report_files_pkey primary key (id),
  constraint report_files_report_id_fkey foreign KEY (report_id) references reports (id) on update 
CASCADE
) TABLESPACE pg_default; create table public.report_properties (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  report_id uuid null,
  property_id uuid null,
  constraint report_properties_pkey primary key (id),
  constraint report_properties_property_id_fkey foreign KEY (property_id) references properties (id) on 
update CASCADE on delete CASCADE,
  constraint report_properties_report_id_fkey foreign KEY (report_id) references reports (id) on update 
CASCADE on delete CASCADE
) TABLESPACE pg_default; create table public.reports (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  start_date date not null,
  end_date date not null,
  updated_at timestamp with time zone null,
  constraint reports_pkey primary key (id)
) TABLESPACE pg_default; , and like i said, well just install resend npm install, and well use a resend 
api key to do it 


Phase 4: Backend Schema & Architecture Design

  System Architecture

  ┌─────────────────────────────────────────────────────────────────────┐
  │                        SUPABASE POSTGRES                            │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │  pg_cron (cron.job)                                          │   │
  │  │  "Every hour, check report_schedules for due schedules"      │   │
  │  └──────────────────────────┬──────────────────────────────────┘   │
  │                             │ HTTP via pg_net                       │
  └─────────────────────────────┼───────────────────────────────────────┘
                                ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                     EXPRESS.JS BACKEND                              │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │  POST /api/schedules/execute                                 │   │
  │  │  1. Find schedules where next_run_at <= NOW()                │   │
  │  │  2. For each schedule:                                       │   │
  │  │     - Generate reports (reuse existing report generation)    │   │
  │  │     - Send emails via Resend                                 │   │
  │  │     - Record in schedule_runs + schedule_deliveries          │   │
  │  │     - Update next_run_at                                     │   │
  │  └─────────────────────────────────────────────────────────────┘   │
  │                             │                                       │
  │                             ▼                                       │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │  Resend API                                                  │   │
  │  │  - Send PDF attachments                                      │   │
  │  │  - Track: sent, delivered, opened                            │   │
  │  └──────────────────────────┬──────────────────────────────────┘   │
  │                             │ Webhook                               │
  │                             ▼                                       │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │  POST /api/webhooks/resend                                   │   │
  │  │  - Update schedule_deliveries status                         │   │
  │  │  - Record opened_at, delivered_at                            │   │
  │  └─────────────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────────────┘

  ---
  Database Schema

  -- ============================================================
  -- REPORT SCHEDULES - Main schedule configuration
  -- ============================================================
  CREATE TABLE public.report_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Schedule identity
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Schedule timing
    frequency VARCHAR(50) NOT NULL DEFAULT 'monthly',  -- 'monthly', 'weekly', 'biweekly', 'quarterly'
    day_of_month INT,           -- 1-28 for monthly (use 28 for "last day")
    day_of_week INT,            -- 0-6 for weekly (0 = Sunday)
    time_of_day TIME DEFAULT '09:00:00',
    timezone VARCHAR(100) DEFAULT 'America/Toronto',

    -- Report date range configuration
    date_range_type VARCHAR(50) DEFAULT 'previous_month',  -- 'previous_month', 'last_30_days', 'last_7_days', 'custom'
    custom_days_back INT,       -- For 'custom' type: generate report for last N days

    -- Report configuration
    format VARCHAR(20) DEFAULT 'pdf',      -- 'pdf', 'csv', 'excel'
    report_mode VARCHAR(50) DEFAULT 'per_property',  -- 'per_property' or 'combined_portfolio'
    logo_id UUID REFERENCES logos(id) ON DELETE SET NULL,

    -- Email configuration (hybrid: template + customizable)
    email_subject_template VARCHAR(500) DEFAULT '{property_name} - {month} {year} Report',
    email_body_template TEXT,    -- NULL = use system default template
    cc_self BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,

    -- pg_cron integration
    cron_job_id BIGINT,         -- Reference to cron.job.jobid (for updates/deletes)

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Index for finding due schedules
  CREATE INDEX idx_schedules_next_run ON report_schedules(next_run_at)
    WHERE is_active = true;
  CREATE INDEX idx_schedules_user ON report_schedules(user_id);

  -- ============================================================
  -- SCHEDULE PROPERTIES - Which properties are included
  -- ============================================================
  CREATE TABLE public.schedule_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES report_schedules(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(schedule_id, property_id)
  );

  CREATE INDEX idx_schedule_properties_schedule ON schedule_properties(schedule_id);

  -- ============================================================
  -- SCHEDULE RECIPIENTS - Who receives the reports
  -- Supports: existing clients, custom emails, or both
  -- ============================================================
  CREATE TABLE public.schedule_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES report_schedules(id) ON DELETE CASCADE,

    -- Recipient type: 'client' (linked to client record) or 'custom' (just email)
    recipient_type VARCHAR(20) NOT NULL DEFAULT 'custom',  -- 'client', 'custom'

    -- For 'client' type
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

    -- For 'custom' type (or override email for client)
    email VARCHAR(255),
    name VARCHAR(255),        -- Display name for custom recipients

    -- Which properties does this recipient receive? (NULL = all in schedule)
    -- This allows: "John gets Property A reports, Jane gets Property B reports"
    property_filter_ids UUID[],  -- NULL = receives all properties in schedule

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure we have either client_id or email
    CONSTRAINT recipient_has_contact CHECK (
      (recipient_type = 'client' AND client_id IS NOT NULL) OR
      (recipient_type = 'custom' AND email IS NOT NULL)
    )
  );

  CREATE INDEX idx_schedule_recipients_schedule ON schedule_recipients(schedule_id);

  -- ============================================================
  -- SCHEDULE RUNS - Execution history
  -- ============================================================
  CREATE TABLE public.schedule_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES report_schedules(id) ON DELETE CASCADE,

    -- Execution info
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Status: 'running', 'completed', 'partial_failure', 'failed'
    status VARCHAR(50) DEFAULT 'running',
    error_message TEXT,

    -- Stats
    reports_generated INT DEFAULT 0,
    emails_sent INT DEFAULT 0,
    emails_failed INT DEFAULT 0,

    -- What period was this report for?
    report_start_date DATE,
    report_end_date DATE,

    -- Trigger source: 'scheduled', 'manual', 'test'
    trigger_type VARCHAR(50) DEFAULT 'scheduled'
  );

  CREATE INDEX idx_schedule_runs_schedule ON schedule_runs(schedule_id);
  CREATE INDEX idx_schedule_runs_started ON schedule_runs(started_at DESC);

  -- ============================================================
  -- SCHEDULE DELIVERIES - Individual email tracking
  -- ============================================================
  CREATE TABLE public.schedule_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES schedule_runs(id) ON DELETE CASCADE,

    -- What was sent
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,

    -- Email tracking (updated via Resend webhooks)
    resend_email_id VARCHAR(255),   -- Resend's message ID
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'sent', 'delivered', 'opened', 'bounced', 'failed'

    -- Timestamps (updated via webhooks)
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,

    -- Download tracking (updated when user clicks our signed URL)
    downloaded_at TIMESTAMP WITH TIME ZONE,
    download_count INT DEFAULT 0,

    -- Error info
    error_message TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  CREATE INDEX idx_schedule_deliveries_run ON schedule_deliveries(run_id);
  CREATE INDEX idx_schedule_deliveries_resend ON schedule_deliveries(resend_email_id);
  CREATE INDEX idx_schedule_deliveries_status ON schedule_deliveries(status);

  -- ============================================================
  -- EMAIL TEMPLATES - Reusable email templates
  -- ============================================================
  CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- NULL = system template

    name VARCHAR(255) NOT NULL,
    subject_template VARCHAR(500) NOT NULL,
    body_template TEXT NOT NULL,      -- HTML with placeholders

    is_system BOOLEAN DEFAULT false,  -- System templates can't be deleted
    is_default BOOLEAN DEFAULT false, -- User's default template

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Insert system default template
  INSERT INTO email_templates (name, subject_template, body_template, is_system, is_default)
  VALUES (
    'Professional Default',
    '{property_name} - {month} {year} Financial Report',
    '<html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <p>Dear {owner_name},</p>
        <p>Please find attached your financial report for <strong>{property_name}</strong> covering the period of <strong>{report_period}</strong>.</p>
        <p>This report includes:</p>
        <ul>
          <li>Booking summary and details</li>
          <li>Revenue breakdown</li>
          <li>Management fees and expenses</li>
          <li>Net earnings</li>
        </ul>
        <p>If you have any questions, please don''t hesitate to reach out.</p>
        <p>Best regards,<br/>{sender_name}<br/>{company_name}</p>
      </body>
    </html>',
    true,
    true
  );

  ---
  Backend API Endpoints

  # Schedule Management (CRUD)
  POST   /api/schedules           # Create new schedule
  GET    /api/schedules           # List all schedules for user
  GET    /api/schedules/:id       # Get schedule details
  PUT    /api/schedules/:id       # Update schedule
  DELETE /api/schedules/:id       # Delete schedule (also removes cron job)
  PATCH  /api/schedules/:id/toggle # Activate/deactivate schedule

  # Schedule Execution
  POST   /api/schedules/:id/test  # Send test email to self
  POST   /api/schedules/:id/run   # Manually trigger schedule now
  POST   /api/schedules/execute   # Called by pg_cron (internal)

  # Delivery Tracking
  GET    /api/schedules/:id/runs          # Get run history
  GET    /api/schedules/runs/:runId       # Get run details with deliveries
  GET    /api/reports/track/:deliveryId   # Track download (updates downloaded_at)

  # Resend Webhook
  POST   /api/webhooks/resend     # Resend delivery events

  # Email Templates
  GET    /api/email-templates     # List templates (system + user)
  POST   /api/email-templates     # Create custom template
  PUT    /api/email-templates/:id # Update template
  DELETE /api/email-templates/:id # Delete template (not system ones)

  ---
  Key Backend Files to Create

  thesmarthost-backend/
  ├── routes/
  │   ├── schedule.routes.js         # Schedule CRUD routes
  │   └── webhook.routes.js          # ADD Resend webhook handler
  │
  ├── controllers/
  │   ├── schedule.controller.js     # Schedule CRUD logic
  │   ├── scheduleRunner.controller.js # Execution logic (calls report generation)
  │   └── emailTemplate.controller.js  # Template CRUD
  │
  ├── queries/
  │   ├── schedule.queries.js        # SQL for schedules
  │   └── emailTemplate.queries.js   # SQL for templates
  │
  ├── services/
  │   └── resendService.js           # Resend API wrapper
  │
  └── templates/
      └── reportEmail.html           # Default email template (HTML)

  ---
  pg_cron Setup

  We'll create ONE master cron job that runs every hour and checks for due schedules:

  -- Enable required extensions (run in Supabase SQL editor)
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;

  -- Create master cron job that runs every hour
  SELECT cron.schedule(
    'check-report-schedules',
    '0 * * * *',  -- Every hour at minute 0
    $$
    SELECT net.http_post(
      url := 'https://your-backend.com/api/schedules/execute',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cron-Secret', 'your-secret-key'
      ),
      body := jsonb_build_object('trigger', 'cron')
    );
    $$
  );

  ---
  Frontend Ideas (for later)

  src/
  ├── app/(user)/property-manager/scheduled-reports/
  │   └── page.tsx                    # Convert concept page to functional
  │
  ├── components/scheduled-reports/
  │   ├── create/
  │   │   └── CreateScheduleModal.tsx # Multi-step schedule creation
  │   ├── list/
  │   │   └── ScheduleCard.tsx        # Schedule list item with status
  │   ├── runs/
  │   │   └── RunHistoryModal.tsx     # View execution history
  │   ├── recipients/
  │   │   └── RecipientSelector.tsx   # Select clients + add custom emails
  │   └── templates/
  │       └── EmailTemplateEditor.tsx # Edit email templates
  │
  ├── services/
  │   ├── scheduleService.ts          # Schedule API calls
  │   └── types/schedule.ts           # TypeScript interfaces
  │
  └── store/
      └── useScheduleStore.ts         # Optional: Zustand for schedule state

  UI Flow:
  1. Schedule List - Cards showing active/paused schedules with next run time
  2. Create Modal - Multi-step: Properties → Recipients → Email Config → Schedule → Review
  3. Run History - Timeline of executions with success/failure status
  4. Delivery Tracking - Table showing sent/delivered/opened/downloaded per recipient
  5. Test Email - Send yourself a preview before activating

  ---
  Summary of Decisions

  | Aspect         | Decision                                         |
  |----------------|--------------------------------------------------|
  | Scheduling     | Supabase pg_cron → hits backend endpoint         |
  | Date Range     | Configurable (default: previous month)           |
  | Email Template | Hybrid: system default + user customizable       |
  | Tracking       | Full: sent → delivered → opened → downloaded     |
  | Report Mode    | User choice: per-property OR combined portfolio  |
  | Recipients     | Clients + custom emails + per-property filtering |
  | Email Service  | Resend via API key                               |

  ---
  Does this architecture look good? If yes, I'll start implementing the backend - beginning with:

  1. Database migrations (the SQL above)
  2. scheduleService.js (Resend integration)
  3. schedule.queries.js + schedule.controller.js
  4. schedule.routes.js
