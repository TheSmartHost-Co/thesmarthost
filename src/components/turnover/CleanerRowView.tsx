'use client'

import { useMemo, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventContentArg, EventClickArg } from '@fullcalendar/core'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import ProjectEvent from './ProjectEvent'

interface CleanerRowViewProps {
  projects: CleaningProject[]
  cleaners: Cleaner[]
  dateRange: { start: string; end: string }
  onProjectClick: (project: CleaningProject) => void
  issueCountsMap?: Record<string, number> // projectId -> open issue count
  supplyListCountsMap?: Record<string, number> // projectId -> pending supply list count
}

export default function CleanerRowView({
  projects,
  cleaners,
  dateRange,
  onProjectClick,
  issueCountsMap = {},
  supplyListCountsMap = {},
}: CleanerRowViewProps) {
  const calendarRef = useRef<FullCalendar>(null)

  // Transform cleaners to FullCalendar resources, with "Unassigned" as first row
  const resources = useMemo(() => {
    const unassignedCount = projects.filter(p => !p.cleanerId).length

    const cleanerResources = cleaners.map(cleaner => ({
      id: cleaner.id,
      title: cleaner.name,
      extendedProps: {
        email: cleaner.email,
        phone: cleaner.phone,
        isUnassigned: false,
      },
    }))

    // Add unassigned row at the top
    return [
      {
        id: 'unassigned',
        title: 'Unassigned',
        extendedProps: {
          email: null,
          phone: null,
          isUnassigned: true,
          count: unassignedCount,
        },
      },
      ...cleanerResources,
    ]
  }, [cleaners, projects])

  // Transform projects to FullCalendar events
  const events = useMemo(() => {
    return projects.map(project => ({
      id: project.id,
      resourceId: project.cleanerId || 'unassigned',
      title: project.propertyName || 'Unknown Property',
      start: project.scheduledDate,
      end: project.scheduledDate,
      allDay: true,
      extendedProps: {
        project,
      },
      classNames: getEventClassNames(project),
    }))
  }, [projects])

  // Handle event click
  const handleEventClick = (info: EventClickArg) => {
    const project = info.event.extendedProps.project as CleaningProject | undefined
    if (project) {
      onProjectClick(project)
    }
  }

  // Custom event content render
  const renderEventContent = (eventInfo: EventContentArg) => {
    const project = eventInfo.event.extendedProps.project as CleaningProject
    const openIssueCount = issueCountsMap[project.id] || 0
    const pendingSupplyListCount = supplyListCountsMap[project.id] || 0
    return <ProjectEvent project={project} showProperty openIssueCount={openIssueCount} pendingSupplyListCount={pendingSupplyListCount} />
  }

  // Custom resource label render
  const renderResourceLabel = (info: {
    resource: {
      id: string
      title: string
      extendedProps: {
        email: string | null
        phone: string | null
        isUnassigned: boolean
        count?: number
      }
    }
  }) => {
    const { isUnassigned, email, phone, count } = info.resource.extendedProps

    if (isUnassigned) {
      return (
        <div className="py-2 px-3 bg-amber-50/50">
          <div className="font-medium text-amber-700 text-sm flex items-center gap-2">
            {info.resource.title}
            {count !== undefined && count > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-600 rounded">
                {count}
              </span>
            )}
          </div>
          <div className="text-xs text-amber-600">Needs assignment</div>
        </div>
      )
    }

    return (
      <div className="py-2 px-3">
        <div className="font-medium text-gray-900 text-sm">{info.resource.title}</div>
        <div className="text-xs text-gray-500 truncate">{email || phone || 'No contact'}</div>
      </div>
    )
  }

  return (
    <div className="fc-cleaner-view">
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineWeek"
        initialDate={dateRange.start}
        resources={resources}
        events={events}
        resourceAreaWidth="220px"
        resourceAreaHeaderContent="Cleaners"
        slotDuration={{ days: 1 }}
        slotLabelFormat={{
          weekday: 'short',
          day: 'numeric',
          omitCommas: true,
        }}
        headerToolbar={false}
        firstDay={6}
        height="auto"
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        resourceLabelContent={renderResourceLabel}
        nowIndicator={true}
        schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
        eventDisplay="block"
        slotMinWidth={100}
        expandRows={true}
        stickyHeaderDates={true}
        eventMinHeight={40}
      />
      <style jsx global>{`
        .fc-cleaner-view .fc {
          font-family: inherit;
        }
        .fc-cleaner-view .fc-timeline-slot {
          border-color: #e5e7eb;
        }
        .fc-cleaner-view .fc-timeline-slot-frame {
          padding: 4px;
        }
        .fc-cleaner-view .fc-resource-timeline-divider {
          width: 1px;
          background: #e5e7eb;
        }
        .fc-cleaner-view .fc-datagrid-cell-frame {
          padding: 0;
        }
        .fc-cleaner-view .fc-datagrid-cell-cushion {
          padding: 0;
        }
        .fc-cleaner-view .fc-event {
          border: none !important;
          background: transparent !important;
          padding: 2px 4px !important;
          margin: 2px 0 !important;
        }
        .fc-cleaner-view .fc-event-main {
          padding: 0 !important;
        }
        .fc-cleaner-view .fc-timeline-header-row th {
          background: #f9fafb;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6b7280;
          padding: 12px 8px;
        }
        .fc-cleaner-view .fc-datagrid-header .fc-datagrid-cell-frame {
          background: #f9fafb;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6b7280;
          padding: 12px 16px;
        }
        .fc-cleaner-view .fc-timeline-lane {
          min-height: 60px;
        }
        .fc-cleaner-view .fc-timeline-lane:hover {
          background: rgba(59, 130, 246, 0.03);
        }
        .fc-cleaner-view .fc-day-today {
          background: rgba(59, 130, 246, 0.05) !important;
        }
        .fc-cleaner-view .fc-scrollgrid {
          border: none;
        }
        .fc-cleaner-view .fc-scrollgrid-section > * {
          border-color: #e5e7eb;
        }
        .fc-cleaner-view .fc-col-header-cell {
          border-color: #e5e7eb;
        }
        /* Special styling for unassigned row */
        .fc-cleaner-view .fc-datagrid-body tr:first-child .fc-datagrid-cell {
          background: rgba(251, 191, 36, 0.05);
          border-bottom: 2px solid #fcd34d;
        }
        .fc-cleaner-view .fc-timeline-body tr:first-child .fc-timeline-lane {
          background: rgba(251, 191, 36, 0.05);
          border-bottom: 2px solid #fcd34d;
        }
      `}</style>
    </div>
  )
}

// Helper to get event class names based on status
function getEventClassNames(project: CleaningProject): string[] {
  const classes = ['fc-project-event']

  if (!project.cleanerId) {
    classes.push('fc-project-unassigned')
  }

  if (project.isSameDayTurnover) {
    classes.push('fc-project-sameday')
  }

  classes.push(`fc-project-${project.status}`)

  return classes
}
