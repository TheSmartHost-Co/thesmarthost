'use client'

import { usePathname } from 'next/navigation'
import Notification from '../../components/shared/notification'
import UserNavbar from '../../components/navbar/UserNavbar'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPropertyManagerRoute = pathname?.startsWith('/property-manager')

  return (
    <>
      <Notification />
      {!isPropertyManagerRoute && <UserNavbar />}
      <div className={!isPropertyManagerRoute ? 'pt-16' : ''}>
        {children}
      </div>
    </>
  )
}
