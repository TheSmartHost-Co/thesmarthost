'use client'

import Notification from '../../components/shared/notification';


export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Notification />
      {children}
    </>
  );
}
