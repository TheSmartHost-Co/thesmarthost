import CleanerSidebar from '@/components/navbar/CleanerSidebar'
import UserNavbar from '@/components/navbar/UserNavbar'

export default function CleanerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <CleanerSidebar />
      <main className="ml-64 pt-20 p-6">
        {children}
      </main>
    </div>
  )
}
