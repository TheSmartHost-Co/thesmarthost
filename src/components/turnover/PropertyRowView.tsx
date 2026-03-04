'use client'

import { useMemo, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventContentArg, EventClickArg } from '@fullcalendar/core'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Property } from '@/services/types/property'
import type { Booking } from '@/services/types/booking'
import ProjectEvent from './ProjectEvent'
import BookingEvent from './BookingEvent'

interface PropertyRowViewProps {
  projects: CleaningProject[]
  properties: Property[]
  dateRange: { start: string; end: string }
  onProjectClick: (project: CleaningProject) => void
  onBookingClick?: (booking: Booking) => void
  issueCountsMap?: Record<string, number>
  supplyListCountsMap?: Record<string, number>
  bookings?: Booking[]
  zoomLevel?: 7 | 14
}

export default function PropertyRowView({
  projects,
  properties,
  dateRange,
  onProjectClick,
  onBookingClick,
  issueCountsMap = {},
  supplyListCountsMap = {},
  bookings = [],
  zoomLevel = 7,
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
  const projectEvents = useMemo(() => {
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

  // Transform bookings to foreground events
  const bookingEvents = useMemo(() => {
    return bookings.map(booking => {
      // Normalize ISO timestamps to YYYY-MM-DD before creating Date objects
      const checkOut = booking.checkOutDate?.slice(0, 10) || booking.checkInDate.slice(0, 10)
      // FullCalendar uses exclusive end for allDay events, so add 1 day to checkOutDate
      const endDate = new Date(checkOut + 'T00:00:00')
      endDate.setDate(endDate.getDate() + 1)
      const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

      return {
        id: `booking-${booking.id}`,
        resourceId: booking.propertyId,
        title: booking.guestName,
        start: booking.checkInDate.slice(0, 10),
        end: endStr,
        allDay: true,
        extendedProps: {
          isBooking: true,
          booking,
        },
        classNames: ['fc-booking-event'],
      }
    })
  }, [bookings])

  // Merge project + booking events
  const events = useMemo(() => [...projectEvents, ...bookingEvents], [projectEvents, bookingEvents])

  // Compute visible range for FullCalendar based on zoom level
  const fcVisibleRange = useMemo(() => {
    const start = new Date(dateRange.start + 'T00:00:00')
    const end = new Date(start)
    end.setDate(end.getDate() + zoomLevel)
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    return { start: dateRange.start, end: endStr }
  }, [dateRange.start, zoomLevel])

  // Compute wide loaded range for constraining navigation (±17 days buffer)
  const fcLoadedRange = useMemo(() => {
    const center = new Date(dateRange.start + 'T00:00:00')
    const rangeStart = new Date(center)
    rangeStart.setDate(rangeStart.getDate() - 17)
    const rangeEnd = new Date(center)
    rangeEnd.setDate(rangeEnd.getDate() + zoomLevel + 17)
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { start: fmt(rangeStart), end: fmt(rangeEnd) }
  }, [dateRange.start, zoomLevel])

  // Navigate FullCalendar smoothly when dateRange changes (instead of relying on initialDate remount)
  useEffect(() => {
    const api = calendarRef.current?.getApi()
    if (api) {
      api.gotoDate(dateRange.start)
    }
  }, [dateRange.start])

  // Handle event click
  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps.isBooking) {
      const booking = info.event.extendedProps.booking as Booking
      onBookingClick?.(booking)
      return
    }
    const project = info.event.extendedProps.project as CleaningProject | undefined
    if (project) {
      onProjectClick(project)
    }
  }

  // Custom event content render
  const renderEventContent = (eventInfo: EventContentArg) => {
    if (eventInfo.event.extendedProps.isBooking) {
      const booking = eventInfo.event.extendedProps.booking as Booking
      return <BookingEvent booking={booking} isFirstDay={eventInfo.isStart} isLastDay={eventInfo.isEnd} />
    }
    const project = eventInfo.event.extendedProps.project as CleaningProject
    const openIssueCount = issueCountsMap[project.id] || 0
    const pendingSupplyListCount = supplyListCountsMap[project.id] || 0
    return <ProjectEvent project={project} openIssueCount={openIssueCount} pendingSupplyListCount={pendingSupplyListCount} />
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
        initialView="resourceTimeline"
        visibleRange={fcVisibleRange}
        validRange={fcLoadedRange}
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
        firstDay={6}
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
        .fc-property-view .fc-scroller {
          overflow-x: hidden !important;
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
