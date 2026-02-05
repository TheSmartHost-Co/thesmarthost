'use client'

import { useMemo, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventContentArg, EventClickArg } from '@fullcalendar/core'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Property } from '@/services/types/property'
import ProjectEvent from './ProjectEvent'

interface PropertyRowViewProps {
  projects: CleaningProject[]
  properties: Property[]
  dateRange: { start: string; end: string }
  onProjectClick: (project: CleaningProject) => void
}

export default function PropertyRowView({
  projects,
  properties,
  dateRange,
  onProjectClick,
}: PropertyRowViewProps) {
  const calendarRef = useRef<FullCalendar>(null)

  // Transform properties to FullCalendar resources
  const resources = useMemo(() => {
    return properties.map(property => ({
      id: property.id,
      title: property.listingName || property.internalName || property.address,
      extendedProps: {
        address: property.address,
        isActive: property.isActive,
      },
    }))
  }, [properties])

  // Transform projects to FullCalendar events
  const events = useMemo(() => {
    return projects.map(project => ({
      id: project.id,
      resourceId: project.propertyId,
      title: project.cleanerName || 'Unassigned',
      start: project.scheduledDate,
      end: project.scheduledDate, // Same day events
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
    return <ProjectEvent project={project} />
  }

  // Custom resource label render
  const renderResourceLabel = (info: { resource: { title: string; extendedProps: { address: string } } }) => {
    return (
      <div className="py-2 px-3">
        <div className="font-medium text-gray-900 text-sm truncate">
          {info.resource.title}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {info.resource.extendedProps.address}
        </div>
      </div>
    )
  }

  return (
    <div className="fc-property-view">
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineWeek"
        initialDate={dateRange.start}
        resources={resources}
        events={events}
        resourceAreaWidth="220px"
        resourceAreaHeaderContent="Properties"
        slotDuration={{ days: 1 }}
        slotLabelFormat={{
          weekday: 'short',
          day: 'numeric',
          omitCommas: true,
        }}
        headerToolbar={false}
        height="auto"
        eventClick={handleEventClick}
        eventContent={renderEventContent}
        resourceLabelContent={renderResourceLabel}
        resourceOrder="title"
        nowIndicator={true}
        schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
        eventDisplay="block"
        slotMinWidth={100}
        expandRows={true}
        stickyHeaderDates={true}
        eventMinHeight={40}
      />
      <style jsx global>{`
        .fc-property-view .fc {
          font-family: inherit;
        }
        .fc-property-view .fc-timeline-slot {
          border-color: #e5e7eb;
        }
        .fc-property-view .fc-timeline-slot-frame {
          padding: 4px;
        }
        .fc-property-view .fc-resource-timeline-divider {
          width: 1px;
          background: #e5e7eb;
        }
        .fc-property-view .fc-datagrid-cell-frame {
          padding: 0;
        }
        .fc-property-view .fc-datagrid-cell-cushion {
          padding: 0;
        }
        .fc-property-view .fc-event {
          border: none !important;
          background: transparent !important;
          padding: 2px 4px !important;
          margin: 2px 0 !important;
        }
        .fc-property-view .fc-event-main {
          padding: 0 !important;
        }
        .fc-property-view .fc-timeline-header-row th {
          background: #f9fafb;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6b7280;
          padding: 12px 8px;
        }
        .fc-property-view .fc-datagrid-header .fc-datagrid-cell-frame {
          background: #f9fafb;
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #6b7280;
          padding: 12px 16px;
        }
        .fc-property-view .fc-timeline-lane {
          min-height: 60px;
        }
        .fc-property-view .fc-timeline-lane:hover {
          background: rgba(59, 130, 246, 0.03);
        }
        .fc-property-view .fc-day-today {
          background: rgba(59, 130, 246, 0.05) !important;
        }
        .fc-property-view .fc-scrollgrid {
          border: none;
        }
        .fc-property-view .fc-scrollgrid-section > * {
          border-color: #e5e7eb;
        }
        .fc-property-view .fc-col-header-cell {
          border-color: #e5e7eb;
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
