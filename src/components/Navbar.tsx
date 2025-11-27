'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import Logo from './Logo'
import { LayoutDashboard, FileSearch, BarChart3, Settings, LogOut } from 'lucide-react'

export default function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <Logo className="w-10 h-10 group-hover:scale-110 transition-transform duration-200" />
            <div>
              <h1 className="text-xl font-bold gradient-text">Forte.AI</h1>
              <p className="text-xs text-gray-500">GREKdev System</p>
            </div>
          </Link>

          <div className="flex items-center space-x-1">
            <NavLink href="/dashboard" icon={<LayoutDashboard size={18} />}>
              Dashboard
            </NavLink>
            <NavLink href="/transactions" icon={<FileSearch size={18} />}>
              Transactions
            </NavLink>
            <NavLink href="/analytics" icon={<BarChart3 size={18} />}>
              Analytics
            </NavLink>
            <NavLink href="/settings" icon={<Settings size={18} />}>
              Settings
            </NavLink>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
              <p className="text-xs text-gray-500">{session?.user?.role}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-forte-secondary hover:bg-forte-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-forte-secondary hover:bg-forte-50 rounded-lg transition-all"
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}
