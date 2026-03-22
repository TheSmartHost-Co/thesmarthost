'use client'

import { useMemo } from 'react'
import type { CleaningProject, CleaningProjectStatus } from '@/services/types/cleaningProject'
import { isProjectOverdue } from '@/services/cleaningProjectService'
import ProjectEvent from '@/components/turnover/ProjectEvent'

interface SimpleCalendarViewProps {
  projects: CleaningProject[]
  currentDate: Date
  zoomLevel: 7 | 'month'
  selectedDay: string | null
  onDayClick: (dateStr: string) => void
  onProjectClick: (project: CleaningProject) => void
  issueCountsMap?: Record<string, number>
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// --- Month compact bar ---

const monthBarColors: Record<CleaningProjectStatus, string> = {
  pending: 'bg-gray-400',
  assigned: 'bg-amber-400',
  confirmed: 'bg-indigo-400',
  in_progress: 'bg-purple-400',
  completed: 'bg-green-400',
  cancelled: 'bg-gray-400',
}

function MonthBar({ project }: { project: CleaningProject }) {
  const overdue = isProjectOverdue(project)
  const dotClass = overdue ? 'bg-red-400' : (monthBarColors[project.status] || 'bg-gray-400')

  return (
    <div className={`h-1.5 rounded-full ${dotClass}`} />
  )
}

export default function SimpleCalendarView({
  projects,
  currentDate,
  zoomLevel,
  selectedDay,
  onDayClick,
  onProjectClick,
  issueCountsMap = {},
}: SimpleCalendarViewProps) {
  const todayStr = formatLocalDate(new Date())
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Filter out implicit projects and group by date
  const projectsByDate = useMemo(() => {
    const explicit = projects.filter(p => p.assignmentType !== 'implicit')
    const grouped: Record<string, CleaningProject[]> = {}
    for (const p of explicit) {
      const dateKey = p.projectDate.split('T')[0]
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(p)
    }
    // Sort each day by start time
    for (const dayProjects of Object.values(grouped)) {
      dayProjects.sort((a, b) =>
        (a.projectStartTime || '00:00:00').localeCompare(b.projectStartTime || '00:00:00')
      )
    }
    return grouped
  }, [projects])

  // Build the week days (Sun-Sat)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate)
    const dayOfWeek = d.getDay()
    const sunday = new Date(d)
    sunday.setDate(d.getDate() - dayOfWeek)

    const days: { date: Date; dateStr: string }[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday)
      date.setDate(sunday.getDate() + i)
      days.push({ date, dateStr: formatLocalDate(date) })
    }
    return days
  }, [currentDate])

  // Build month grid days
  const monthDays = useMemo(() => {
    if (zoomLevel !== 'month') return []
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const lastOfMonth = new Date(year, month + 1, 0)
    const startDow = firstOfMonth.getDay()

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = []

    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, dateStr: formatLocalDate(d), isCurrentMonth: false })
    }
    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      const date = new Date(year, month, d)
      days.push({ date, dateStr: formatLocalDate(date), isCurrentMonth: true })
    }
    while (days.length % 7 !== 0) {
      const lastDate = days[days.length - 1].date
      const d = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1)
      days.push({ date: d, dateStr: formatLocalDate(d), isCurrentMonth: false })
    }
    return days
  }, [currentDate, zoomLevel])

  // Max projects across any day in the week (for row count)
  const maxProjectsInWeek = useMemo(() => {
    if (zoomLevel === 'month') return 0
    let max = 0
    for (const { dateStr } of weekDays) {
      const count = (projectsByDate[dateStr] || []).length
      if (count > max) max = count
    }
    return max
  }, [weekDays, projectsByDate, zoomLevel])

  // ---- MONTH VIEW ----
  if (zoomLevel === 'month') {
    const maxBars = 3
    return (
      <div className="select-none">
        {/* Day name header row */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {dayNames.map(name => (
            <div key={name} className="py-1.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {name}
            </div>
          ))}
        </div>

        {/* Day cells grid */}
        <div className="grid grid-cols-7">
          {monthDays.map(({ dateStr, date, isCurrentMonth }) => {
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDay
            const dayProjects = projectsByDate[dateStr] || []
            const visibleBars = dayProjects.slice(0, maxBars)
            const overflow = dayProjects.length - maxBars

            return (
              <button
                key={dateStr}
                onClick={() => onDayClick(dateStr)}
                className={`
                  min-h-[88px] sm:min-h-[100px]
                  p-1.5 border-b border-r border-gray-100 text-left
                  transition-colors cursor-pointer
                  ${!isCurrentMonth ? 'opacity-40' : ''}
                  ${isSelected ? 'bg-amber-50/60' : 'hover:bg-gray-50'}
                `}
              >
                {/* Date number */}
                <div className="flex justify-start mb-1">
                  <span className={`
                    inline-flex items-center justify-center text-xs font-semibold
                    ${isToday
                      ? 'w-6 h-6 rounded-full bg-purple-600 text-white'
                      : isSelected
                        ? 'w-6 h-6 rounded-full bg-amber-500 text-white'
                        : 'text-gray-700 w-6 h-6'
                    }
                  `}>
                    {date.getDate()}
                  </span>
                </div>

                {/* Compact colored bars */}
                <div className="space-y-1">
                  {visibleBars.map(p => (
                    <MonthBar key={p.id} project={p} />
                  ))}
                  {overflow > 0 && (
                    <div className="text-[10px] font-medium text-purple-600 px-0.5">
                      +{overflow}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ---- WEEK PLANNER VIEW ----
  const hasProjects = maxProjectsInWeek > 0

  return (
    <div className="select-none">
      {/* Day column headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map(({ dateStr, date }) => {
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDay
          const dayOfWeek = date.getDay()
          const dayName = dayNames[dayOfWeek]

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              className={`
                py-2 text-center cursor-pointer transition-colors
                ${isSelected ? 'bg-amber-50' : 'hover:bg-gray-50'}
              `}
            >
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {dayName}
              </div>
              <div className={`
                inline-flex items-center justify-center text-sm font-bold mt-0.5
                ${isToday
                  ? 'w-7 h-7 rounded-full bg-purple-600 text-white'
                  : isSelected
                    ? 'w-7 h-7 rounded-full bg-amber-500 text-white'
                    : 'text-gray-700'
                }
              `}>
                {date.getDate()}
              </div>
            </button>
          )
        })}
      </div>

      {/* Week planner grid: rows = project slots, columns = days */}
      {hasProjects ? (
        <div className="border-b border-gray-100 min-h-[240px] sm:min-h-[360px]">
          {Array.from({ length: maxProjectsInWeek }, (_, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-7">
              {weekDays.map(({ dateStr }) => {
                const dayProjects = projectsByDate[dateStr] || []
                const project = dayProjects[rowIdx]
                const isSelected = dateStr === selectedDay

                return (
                  <div
                    key={dateStr}
                    className={`
                      p-0.5 sm:p-1.5 border-r border-b border-gray-100
                      ${isSelected ? 'bg-amber-50/40' : ''}
                    `}
                  >
                    {project && (
                      <div
                        className="relative cursor-pointer h-[120px] sm:h-[100px]"
                        onClick={(e) => { e.stopPropagation(); onProjectClick(project) }}
                      >
                        <ProjectEvent
                          project={project}
                          showProperty={true}
                          openIssueCount={issueCountsMap[project.id] || 0}
                          zoomLevel={7}
                          isMobile={typeof window !== 'undefined' && window.innerWidth < 640}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <div className="text-gray-300 text-sm font-medium">No projects this week</div>
          <div className="text-gray-300 text-xs mt-1">Navigate to another week to see your schedule</div>
        </div>
      )}
    </div>
  )
}
