import ManagerSidebar from '@/components/navbar/ManagerSidebar'
import UserNavbar from '@/components/navbar/UserNavbar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <div className="flex">
        <ManagerSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}