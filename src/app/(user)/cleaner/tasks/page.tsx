'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ClipboardDocumentListIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getCleanerSchedule } from '@/services/cleanerService'
import {
  acceptProject,
  declineProject,
  startProject,
  unstartProject,
  completeProject,
  getMissingGroupsFromError,
} from '@/services/cleaningProjectService'
import { getOpenIssues } from '@/services/projectIssueService'
import { getSupplyListsByProject } from '@/services/supplyListService'
import { getPendingTimeChangeRequest } from '@/services/timeChangeRequestService'
import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Cleaner } from '@/services/types/cleaner'
import ProjectCard from '@/components/cleaner-portal/ProjectCard'
import ChecklistModal from '@/components/cleaner-portal/ChecklistModal'
import type { ChecklistTab } from '@/components/cleaner-portal/checklist/ChecklistTabs'
import RequestTimeChangeModal from '@/components/cleaner-portal/RequestTimeChangeModal'
import ViewPendingTimeChangeModal from '@/components/cleaner-portal/ViewPendingTimeChangeModal'
import ViewIssuesModal from '@/components/turnover/issues/ViewIssuesModal'
import { useDeepLink, type DeepLinkResult } from '@/hooks/useDeepLink'

// Date grouping helper
function groupProjectsByDate(projects: CleaningProject[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const groups = {
    today: [] as CleaningProject[],
    tomorrow: [] as CleaningProject[],
    thisWeek: [] as CleaningProject[],
    later: [] as CleaningProject[],
    completed: [] as CleaningProject[],
  }

  projects.forEach(project => {
    // Completed projects go to their own section
    if (project.status === 'completed') {
      groups.completed.push(project)
      return
    }

    // Handle both ISO timestamp (2026-02-01T05:00:00.000Z) and date string (2026-02-01) formats
    const dateStr = project.projectDate.split('T')[0]
    const projectDateObj = new Date(dateStr + 'T00:00:00')
    projectDateObj.setHours(0, 0, 0, 0)

    if (projectDateObj.getTime() === today.getTime()) {
      groups.today.push(project)
    } else if (projectDateObj.getTime() === tomorrow.getTime()) {
      groups.tomorrow.push(project)
    } else if (projectDateObj > today && projectDateObj < nextWeek) {
      groups.thisWeek.push(project)
    } else if (projectDateObj >= nextWeek) {
      groups.later.push(project)
    }
    // Past dates that aren't completed - put in today for attention
    else if (projectDateObj < today) {
      groups.today.push(project)
    }
  })

  // Sort each group by date and time
  const sortByDateTime = (a: CleaningProject, b: CleaningProject) => {
    const dateStrA = a.projectDate.split('T')[0]
    const dateStrB = b.projectDate.split('T')[0]
    const dateA = new Date(dateStrA + 'T' + (a.projectStartTime || '00:00:00'))
    const dateB = new Date(dateStrB + 'T' + (b.projectStartTime || '00:00:00'))
    return dateA.getTime() - dateB.getTime()
  }

  groups.today.sort(sortByDateTime)
  groups.tomorrow.sort(sortByDateTime)
  groups.thisWeek.sort(sortByDateTime)
  groups.later.sort(sortByDateTime)
  groups.completed.sort((a, b) => sortByDateTime(b, a)) // Most recent first

  return groups
}

/**
 * Deep-link handler (renders nothing).
 * Reads ?projectId from URL; when projects are loaded, opens the matching checklist modal.
 */
function CleanerDeepLinkHandler({
  projects,
  loading,
  onOpenChecklist,
}: {
  projects: CleaningProject[]
  loading: boolean
  onOpenChecklist: (project: CleaningProject) => void
}) {
  const { t } = useTranslation('cleanerPortal')
  const showNotification = useNotificationStore((state) => state.showNotification)

  const handleDeepLink = useCallback((result: DeepLinkResult) => {
    if (!result.projectId) return
    const project = projects.find(p => p.id === result.projectId)
    if (project && project.assignmentType !== 'implicit') {
      onOpenChecklist(project)
    } else {
      showNotification(t('taskNotFound'), 'info')
    }
  }, [projects, onOpenChecklist, showNotification])

  useDeepLink(handleDeepLink, !loading && projects.length >= 0)

  return null
}

export default function CleanerTasksPage() {
  const { t } = useTranslation('cleanerPortal')
  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // State
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [projects, setProjects] = useState<CleaningProject[]>([])
  const [issueCountsMap, setIssueCountsMap] = useState<Record<string, number>>({})
  const [supplyListCountsMap, setSupplyListCountsMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [selectedProject, setSelectedProject] = useState<CleaningProject | null>(null)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [checklistInitialTab, setChecklistInitialTab] = useState<ChecklistTab | undefined>(undefined)
  const [showViewIssuesModal, setShowViewIssuesModal] = useState(false)
  const [issuesProject, setIssuesProject] = useState<CleaningProject | null>(null)

  // Time change request state
  const [showTimeChangeModal, setShowTimeChangeModal] = useState(false)
  const [selectedProjectForTimeChange, setSelectedProjectForTimeChange] = useState<CleaningProject | null>(null)
  const [pendingTimeChangeProjectIds, setPendingTimeChangeProjectIds] = useState<Set<string>>(new Set())
  const [showViewPendingTimeChangeModal, setShowViewPendingTimeChangeModal] = useState(false)
  const [viewPendingProject, setViewPendingProject] = useState<CleaningProject | null>(null)

  // Fetch cleaner data and projects using unified schedule endpoint
  const fetchData = useCallback(async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      const today = new Date()
      const startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 7) // Include recent past
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 30) // Next 30 days

      // 1. Unified schedule endpoint — returns cleaner, properties, projects, bookings
      const scheduleRes = await getCleanerSchedule(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
      )
      if (scheduleRes.status !== 'success') {
        throw new Error(scheduleRes.message || 'Could not load schedule')
      }

      const cleanerData = {
        ...scheduleRes.data.cleaner,
        assignedProperties: scheduleRes.data.assignedProperties,
      } as Cleaner
      setCleaner(cleanerData)

      // Projects come pre-scoped from backend (explicit + implicit)
      const allProjects = scheduleRes.data.cleaningProjects
      setProjects(allProjects)

      // 2. Fetch issue/supply badges only for explicit projects
      const explicitProjects = allProjects.filter(p => p.assignmentType !== 'implicit')

      const issuesRes = await getOpenIssues(cleanerData.userId)
      if (issuesRes.status === 'success') {
        const countsMap: Record<string, number> = {}
        issuesRes.data.forEach(issue => {
          if (issue.projectId && explicitProjects.some(p => p.id === issue.projectId)) {
            countsMap[issue.projectId] = (countsMap[issue.projectId] || 0) + 1
          }
        })
        setIssueCountsMap(countsMap)
      }

      // Fetch supply lists per-project (cleaner-safe endpoint)
      const supplyResults = await Promise.all(
        explicitProjects.map(p => getSupplyListsByProject(p.id).catch(() => null))
      )
      const slCountsMap: Record<string, number> = {}
      supplyResults.forEach((res, idx) => {
        if (res?.status === 'success') {
          const pendingCount = res.data.filter((sl: { status: string }) => sl.status === 'pending').length
          if (pendingCount > 0) {
            slCountsMap[explicitProjects[idx].id] = pendingCount
          }
        }
      })
      setSupplyListCountsMap(slCountsMap)

      // 3. Fetch pending time change requests for active explicit projects
      const activeProjects = explicitProjects.filter(p =>
        ['assigned', 'confirmed', 'in_progress'].includes(p.status)
      )
      const tcResults = await Promise.all(
        activeProjects.map(p => getPendingTimeChangeRequest(p.id).catch(() => null))
      )
      const tcIds = new Set<string>()
      tcResults.forEach((res, idx) => {
        if (res?.status === 'success' && res.data) {
          tcIds.add(activeProjects[idx].id)
        }
      })
      setPendingTimeChangeProjectIds(tcIds)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks'
      setError(message)
      console.error('Error loading tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Group projects by date
  const groupedProjects = useMemo(() => groupProjectsByDate(projects), [projects])

  // Action handlers
  const handleAccept = async (projectId: string) => {
    try {
      const res = await acceptProject(projectId)
      if (res.status === 'success') {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? res.data : p
        ))
        showNotification(t('taskAccepted'), 'success')
      } else {
        showNotification(res.message || t('failedToAcceptTask'), 'error')
      }
    } catch (err) {
      console.error('Error accepting task:', err)
      showNotification(t('errorAcceptingTask'), 'error')
    }
  }

  const handleDecline = async (projectId: string) => {
    try {
      const res = await declineProject(projectId)
      if (res.status === 'success') {
        // Remove from list since it's no longer assigned to this cleaner
        setProjects(prev => prev.filter(p => p.id !== projectId))
        showNotification(t('taskDeclined'), 'info')
      } else {
        showNotification(res.message || t('failedToDeclineTask'), 'error')
      }
    } catch (err) {
      console.error('Error declining task:', err)
      showNotification(t('errorDecliningTask'), 'error')
    }
  }

  const handleStart = async (projectId: string) => {
    try {
      const res = await startProject(projectId)
      if (res.status === 'success') {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? res.data : p
        ))
        showNotification(t('taskStarted'), 'success')
        // Open checklist modal with the updated project data from response
        setSelectedProject(res.data)
        setShowChecklistModal(true)
      } else {
        showNotification(res.message || t('failedToStartTask'), 'error')
      }
    } catch (err) {
      console.error('Error starting task:', err)
      showNotification(t('errorStartingTask'), 'error')
    }
  }

  const handleUnbegin = async (projectId: string) => {
    try {
      const res = await unstartProject(projectId)
      if (res.status === 'success') {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? res.data : p
        ))
        showNotification(t('projectRevertedToConfirmed'), 'info')
        // Update the selected project in modal if open
        if (selectedProject?.id === projectId) {
          setSelectedProject(res.data)
        }
      } else {
        showNotification(res.message || t('failedToUnbeginTask'), 'error')
      }
    } catch (err) {
      console.error('Error unbeginning task:', err)
      showNotification(t('errorUnbeginningTask'), 'error')
    }
  }

  const handleComplete = async (projectId: string) => {
    try {
      const res = await completeProject(projectId)
      if (res.status === 'success') {
        setProjects(prev => prev.map(p =>
          p.id === projectId ? res.data : p
        ))
        showNotification(t('taskCompleted'), 'success')
      } else {
        showNotification(res.message || t('failedToCompleteTask'), 'error')
      }
    } catch (err) {
      // Walkthrough completion gate: backend returns 400 with missingGroups.
      // Open the modal on the walkthrough tab so the cleaner can fix it
      // without leaving the page.
      const missing = getMissingGroupsFromError(err)
      if (missing && missing.length > 0) {
        showNotification(t('uploadWalkthroughPhotos', { groups: missing.join(', ') }), 'error')
        const proj = projects.find(p => p.id === projectId)
        if (proj) {
          setSelectedProject(proj)
          setChecklistInitialTab('walkthrough')
          setShowChecklistModal(true)
        }
        return
      }
      console.error('Error completing task:', err)
      showNotification(
        err instanceof Error ? err.message : t('errorCompletingTask'),
        'error'
      )
    }
  }

  const handleViewChecklist = (project: CleaningProject) => {
    if (project.assignmentType === 'implicit') return
    setSelectedProject(project)
    setChecklistInitialTab(undefined)
    setShowChecklistModal(true)
  }

  const handleViewIssues = (project: CleaningProject) => {
    setIssuesProject(project)
    setShowViewIssuesModal(true)
  }

  const handleProjectComplete = (completedProject: CleaningProject) => {
    setProjects(prev => prev.map(p =>
      p.id === completedProject.id ? completedProject : p
    ))
  }

  const handleRequestTimeChange = (project: CleaningProject) => {
    setSelectedProjectForTimeChange(project)
    setShowTimeChangeModal(true)
  }

  const handleViewPendingTimeChange = (project: CleaningProject) => {
    setViewPendingProject(project)
    setShowViewPendingTimeChangeModal(true)
  }

  const handleTimeChangeSubmitted = () => {
    // Add project to pending set so badge shows immediately
    if (selectedProjectForTimeChange) {
      setPendingTimeChangeProjectIds(prev => new Set(prev).add(selectedProjectForTimeChange.id))
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">{t('errorLoadingTasks')}</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            {t('tryAgain')}
          </button>
        </motion.div>
      </div>
    )
  }

  // Count active tasks
  const activeCount = groupedProjects.today.length +
    groupedProjects.tomorrow.length +
    groupedProjects.thisWeek.length +
    groupedProjects.later.length

  // Empty state
  if (activeCount === 0 && groupedProjects.completed.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('myTasks')}</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">{t('yourAssignedProjects')}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto">
            <ClipboardDocumentListIcon className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">{t('noTasksAssigned')}</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            {t('noTasksAssignedDescription')}
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Deep-link handler (requires Suspense for useSearchParams) */}
      <Suspense fallback={null}>
        <CleanerDeepLinkHandler
          projects={projects}
          loading={loading}
          onOpenChecklist={handleViewChecklist}
        />
      </Suspense>

      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('myTasks')}</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">
          {activeCount > 0
            ? t('activeTaskCount', { count: activeCount })
            : t('allCaughtUp')
          }
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
        <StatCard
          icon={ClockIcon}
          label={t('today')}
          value={groupedProjects.today.length}
          color="purple"
          highlight={groupedProjects.today.length > 0}
        />
        <StatCard
          icon={CalendarDaysIcon}
          label={t('tomorrow')}
          value={groupedProjects.tomorrow.length}
          color="blue"
        />
        <StatCard
          icon={CalendarDaysIcon}
          label={t('thisWeek')}
          value={groupedProjects.thisWeek.length}
          color="indigo"
        />
        <StatCard
          icon={CheckCircleIcon}
          label={t('completed')}
          value={groupedProjects.completed.length}
          color="green"
        />
      </div>

      {/* Task Groups */}
      <div className="space-y-6">
        {/* Today */}
        {groupedProjects.today.length > 0 && (
          <TaskGroup
            title={t('today')}
            titleColor="text-purple-700"
            bgColor="bg-purple-50"
            projects={groupedProjects.today}
            issueCountsMap={issueCountsMap}
            supplyListCountsMap={supplyListCountsMap}
            pendingTimeChangeProjectIds={pendingTimeChangeProjectIds}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onStart={handleStart}
            onComplete={handleComplete}
            onUnbegin={handleUnbegin}
            onViewChecklist={handleViewChecklist}
            onViewIssues={handleViewIssues}
            onRequestTimeChange={handleRequestTimeChange}
            onViewPendingTimeChange={handleViewPendingTimeChange}
          />
        )}

        {/* Tomorrow */}
        {groupedProjects.tomorrow.length > 0 && (
          <TaskGroup
            title={t('tomorrow')}
            titleColor="text-blue-700"
            bgColor="bg-blue-50"
            projects={groupedProjects.tomorrow}
            issueCountsMap={issueCountsMap}
            supplyListCountsMap={supplyListCountsMap}
            pendingTimeChangeProjectIds={pendingTimeChangeProjectIds}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onStart={handleStart}
            onComplete={handleComplete}
            onUnbegin={handleUnbegin}
            onViewChecklist={handleViewChecklist}
            onViewIssues={handleViewIssues}
            onRequestTimeChange={handleRequestTimeChange}
            onViewPendingTimeChange={handleViewPendingTimeChange}
          />
        )}

        {/* This Week */}
        {groupedProjects.thisWeek.length > 0 && (
          <TaskGroup
            title={t('thisWeek')}
            titleColor="text-indigo-700"
            bgColor="bg-indigo-50"
            projects={groupedProjects.thisWeek}
            issueCountsMap={issueCountsMap}
            supplyListCountsMap={supplyListCountsMap}
            pendingTimeChangeProjectIds={pendingTimeChangeProjectIds}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onStart={handleStart}
            onComplete={handleComplete}
            onUnbegin={handleUnbegin}
            onViewChecklist={handleViewChecklist}
            onViewIssues={handleViewIssues}
            onRequestTimeChange={handleRequestTimeChange}
            onViewPendingTimeChange={handleViewPendingTimeChange}
          />
        )}

        {/* Later */}
        {groupedProjects.later.length > 0 && (
          <TaskGroup
            title={t('upcoming')}
            titleColor="text-gray-700"
            bgColor="bg-gray-50"
            projects={groupedProjects.later}
            issueCountsMap={issueCountsMap}
            supplyListCountsMap={supplyListCountsMap}
            pendingTimeChangeProjectIds={pendingTimeChangeProjectIds}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onStart={handleStart}
            onComplete={handleComplete}
            onUnbegin={handleUnbegin}
            onViewChecklist={handleViewChecklist}
            onViewIssues={handleViewIssues}
            onRequestTimeChange={handleRequestTimeChange}
            onViewPendingTimeChange={handleViewPendingTimeChange}
          />
        )}

        {/* Completed (collapsed by default) */}
        {groupedProjects.completed.length > 0 && (
          <CompletedSection projects={groupedProjects.completed} onViewChecklist={handleViewChecklist} onViewIssues={handleViewIssues} issueCountsMap={issueCountsMap} />
        )}
      </div>

      {/* Checklist Modal */}
      {selectedProject && (
        <ChecklistModal
          isOpen={showChecklistModal}
          onClose={() => {
            setShowChecklistModal(false)
            setSelectedProject(null)
            setChecklistInitialTab(undefined)
          }}
          project={selectedProject}
          initialTab={checklistInitialTab}
          onProjectComplete={handleProjectComplete}
          onRequestTimeChange={() => {
            setShowChecklistModal(false)
            if (selectedProject) handleRequestTimeChange(selectedProject)
          }}
          onAccept={handleAccept}
          onDecline={async (projectId: string) => {
            await handleDecline(projectId)
            setShowChecklistModal(false)
            setSelectedProject(null)
          }}
          onStart={handleStart}
          onUnbegin={handleUnbegin}
        />
      )}

      {/* View Issues Modal (direct from card) */}
      {issuesProject && (
        <ViewIssuesModal
          isOpen={showViewIssuesModal}
          onClose={() => {
            setShowViewIssuesModal(false)
            setIssuesProject(null)
          }}
          projectId={issuesProject.id}
          projectName={issuesProject.propertyName}
          isPM={false}
          onIssuesChanged={() => {
            // Refresh issue counts
            fetchData()
          }}
        />
      )}

      {/* Request Time Change Modal */}
      {selectedProjectForTimeChange && cleaner && (
        <RequestTimeChangeModal
          isOpen={showTimeChangeModal}
          onClose={() => {
            setShowTimeChangeModal(false)
            setSelectedProjectForTimeChange(null)
          }}
          project={selectedProjectForTimeChange}
          cleanerId={cleaner.id}
          onSubmitted={handleTimeChangeSubmitted}
        />
      )}

      {/* View Pending Time Change Modal */}
      {viewPendingProject && (
        <ViewPendingTimeChangeModal
          isOpen={showViewPendingTimeChangeModal}
          onClose={() => {
            setShowViewPendingTimeChangeModal(false)
            setViewPendingProject(null)
          }}
          project={viewPendingProject}
        />
      )}
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: number
  color: 'purple' | 'blue' | 'indigo' | 'green'
  highlight?: boolean
}

function StatCard({ icon: Icon, label, value, color, highlight }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    green: 'bg-green-50 text-green-700 border-green-100',
  }

  return (
    <div className={`
      rounded-xl border p-3 sm:p-3 ${colorClasses[color]}
      ${highlight ? 'ring-2 ring-purple-300 ring-offset-1' : ''}
    `}>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 opacity-70" />
        <span className="text-[11px] sm:text-xs font-medium opacity-70">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{value}</p>
    </div>
  )
}

// Task Group Component
interface TaskGroupProps {
  title: string
  titleColor: string
  bgColor: string
  projects: CleaningProject[]
  issueCountsMap: Record<string, number>
  supplyListCountsMap: Record<string, number>
  pendingTimeChangeProjectIds: Set<string>
  onAccept: (id: string) => Promise<void>
  onDecline: (id: string) => Promise<void>
  onStart: (id: string) => Promise<void>
  onComplete: (id: string) => Promise<void>
  onUnbegin: (id: string) => Promise<void>
  onViewChecklist: (project: CleaningProject) => void
  onViewIssues: (project: CleaningProject) => void
  onRequestTimeChange: (project: CleaningProject) => void
  onViewPendingTimeChange: (project: CleaningProject) => void
}

function TaskGroup({
  title,
  titleColor,
  bgColor,
  projects,
  issueCountsMap,
  supplyListCountsMap,
  pendingTimeChangeProjectIds,
  onAccept,
  onDecline,
  onStart,
  onComplete,
  onUnbegin,
  onViewChecklist,
  onViewIssues,
  onRequestTimeChange,
  onViewPendingTimeChange,
}: TaskGroupProps) {
  return (
    <div>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${bgColor} mb-3`}>
        <span className={`text-sm font-semibold ${titleColor}`}>{title}</span>
        <span className={`text-xs font-medium ${titleColor} opacity-70`}>
          ({projects.length})
        </span>
      </div>
      <div className="space-y-3">
        {projects.map(project => {
          const implicit = project.assignmentType === 'implicit'
          return (
            <ProjectCard
              key={project.id}
              project={project}
              isImplicit={implicit}
              openIssueCount={implicit ? 0 : (issueCountsMap[project.id] || 0)}
              pendingSupplyListCount={implicit ? 0 : (supplyListCountsMap[project.id] || 0)}
              hasPendingTimeChange={implicit ? false : pendingTimeChangeProjectIds.has(project.id)}
              onAccept={implicit ? undefined : onAccept}
              onDecline={implicit ? undefined : onDecline}
              onStart={implicit ? undefined : onStart}
              onComplete={implicit ? undefined : onComplete}
              onUnbegin={implicit ? undefined : onUnbegin}
              onViewChecklist={implicit ? undefined : onViewChecklist}
              onViewIssues={implicit ? undefined : onViewIssues}
              onRequestTimeChange={implicit ? undefined : onRequestTimeChange}
              onViewPendingTimeChange={implicit ? undefined : onViewPendingTimeChange}
            />
          )
        })}
      </div>
    </div>
  )
}

// Completed Section (collapsible)
function CompletedSection({ projects, onViewChecklist, onViewIssues, issueCountsMap = {} }: { projects: CleaningProject[], onViewChecklist?: (project: CleaningProject) => void, onViewIssues?: (project: CleaningProject) => void, issueCountsMap?: Record<string, number> }) {
  const { t } = useTranslation('cleanerPortal')
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer"
      >
        <CheckCircleIcon className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {t('recentlyCompleted', { count: projects.length })}
        </span>
        <span className="text-xs">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 space-y-3"
        >
          {projects.slice(0, 5).map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              openIssueCount={issueCountsMap[project.id] || 0}
              onViewChecklist={onViewChecklist}
              onViewIssues={onViewIssues}
            />
          ))}
          {projects.length > 5 && (
            <p className="text-sm text-gray-500 text-center py-2">
              {t('moreCompletedTasks', { count: projects.length - 5 })}
            </p>
          )}
        </motion.div>
      )}
    </div>
  )
}
