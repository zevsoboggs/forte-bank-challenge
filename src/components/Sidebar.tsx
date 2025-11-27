'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'
import Logo from './Logo'
import NProgress from 'nprogress'
import {
  LayoutDashboard,
  FileSearch,
  BarChart3,
  Settings,
  Shield,
  TrendingUp,
  Users,
  ChevronRight,
  Bot,
  Kanban,
  Gavel,
  Briefcase,
  Code,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: 'Транзакции',
    icon: FileSearch,
    href: '/transactions',
  },
  {
    title: 'Аналитика',
    icon: BarChart3,
    href: '/analytics',
  },
  {
    title: 'Клиенты',
    icon: Users,
    href: '/customers',
  },
  {
    title: 'ML Модель',
    icon: TrendingUp,
    href: '/model',
  },
  {
    title: 'Настройки',
    icon: Settings,
    href: '/settings',
  },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleNavigation = (href: string) => {
    if (pathname === href) return

    NProgress.start()
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-screen w-80 bg-white border-r border-gray-100 flex flex-col z-50 shadow-xl shadow-gray-100/50 transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="p-8 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <Logo className="w-10 h-10 group-hover:scale-110 transition-transform duration-200" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Forte.AI</h1>
              <p className="text-[10px] font-bold text-forte-secondary uppercase tracking-wider">GREKdev</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 md:hidden"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto scrollbar-hide">
          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Меню</p>
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <li key={item.href}>
                  <button
                    onClick={() => handleNavigation(item.href)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-3 rounded-2xl transition-all duration-200 group',
                      isActive
                        ? 'bg-forte-primary text-white shadow-lg shadow-forte-primary/20'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                      isPending && 'opacity-50 cursor-wait'
                    )}
                    disabled={isPending || isActive}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <Icon size={20} className={cn(isActive ? 'text-white' : 'text-gray-400 group-hover:text-forte-primary transition-colors', 'flex-shrink-0')} />
                      <span className="font-medium whitespace-nowrap text-sm truncate">{item.title}</span>
                    </div>
                    {isActive && <ChevronRight size={16} className="text-white/50 flex-shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 mt-8">Сервисы</p>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => handleNavigation('/services/tender')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-3 rounded-2xl transition-all duration-200 group',
                  pathname.startsWith('/services/tender')
                    ? 'bg-forte-primary text-white shadow-lg shadow-forte-primary/20'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                  isPending && 'opacity-50 cursor-wait'
                )}
                disabled={isPending || pathname.startsWith('/services/tender')}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <Gavel size={20} className={cn(pathname.startsWith('/services/tender') ? 'text-white' : 'text-gray-400 group-hover:text-forte-primary transition-colors', 'flex-shrink-0')} />
                  <span className="font-medium whitespace-nowrap text-sm truncate">AI Закупки</span>
                </div>
                {pathname.startsWith('/services/tender') && (
                  <ChevronRight size={16} className="text-white/50 flex-shrink-0" />
                )}
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigation('/services/scrum')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-3 rounded-2xl transition-all duration-200 group',
                  pathname.startsWith('/services/scrum')
                    ? 'bg-forte-primary text-white shadow-lg shadow-forte-primary/20'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                  isPending && 'opacity-50 cursor-wait'
                )}
                disabled={isPending || pathname.startsWith('/services/scrum')}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <Kanban size={20} className={cn(pathname.startsWith('/services/scrum') ? 'text-white' : 'text-gray-400 group-hover:text-forte-primary transition-colors', 'flex-shrink-0')} />
                  <span className="font-medium whitespace-nowrap text-sm truncate">AI-Scrum Master</span>
                </div>
                {pathname.startsWith('/services/scrum') ? (
                  <ChevronRight size={16} className="text-white/50 flex-shrink-0" />
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-forte-secondary/10 text-forte-secondary text-[10px] font-bold uppercase flex-shrink-0">New</span>
                )}
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigation('/services/business-analyst')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-3 rounded-2xl transition-all duration-200 group',
                  pathname.startsWith('/services/business-analyst')
                    ? 'bg-forte-primary text-white shadow-lg shadow-forte-primary/20'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                  isPending && 'opacity-50 cursor-wait'
                )}
                disabled={isPending || pathname.startsWith('/services/business-analyst')}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <Briefcase size={20} className={cn(pathname.startsWith('/services/business-analyst') ? 'text-white' : 'text-gray-400 group-hover:text-forte-primary transition-colors', 'flex-shrink-0')} />
                  <span className="font-medium whitespace-nowrap text-sm truncate">AI Business Analyst</span>
                </div>
                {pathname.startsWith('/services/business-analyst') ? (
                  <ChevronRight size={16} className="text-white/50 flex-shrink-0" />
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-forte-secondary/10 text-forte-secondary text-[10px] font-bold uppercase flex-shrink-0">New</span>
                )}
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigation('/services/counterparty')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-3 rounded-2xl transition-all duration-200 group',
                  pathname.startsWith('/services/counterparty')
                    ? 'bg-forte-primary text-white shadow-lg shadow-forte-primary/20'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                  isPending && 'opacity-50 cursor-wait'
                )}
                disabled={isPending || pathname.startsWith('/services/counterparty')}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <Shield size={20} className={cn(pathname.startsWith('/services/counterparty') ? 'text-white' : 'text-gray-400 group-hover:text-forte-primary transition-colors', 'flex-shrink-0')} />
                  <span className="font-medium whitespace-nowrap text-sm truncate">Проверка контрагента</span>
                </div>
                {pathname.startsWith('/services/counterparty') ? (
                  <ChevronRight size={16} className="text-white/50 flex-shrink-0" />
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-forte-secondary/10 text-forte-secondary text-[10px] font-bold uppercase flex-shrink-0">New</span>
                )}
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNavigation('/settings/developer')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-3 rounded-2xl transition-all duration-200 group',
                  pathname.startsWith('/settings/developer')
                    ? 'bg-forte-primary text-white shadow-lg shadow-forte-primary/20'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                  isPending && 'opacity-50 cursor-wait'
                )}
                disabled={isPending || pathname.startsWith('/settings/developer')}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <Code size={20} className={cn(pathname.startsWith('/settings/developer') ? 'text-white' : 'text-gray-400 group-hover:text-forte-primary transition-colors', 'flex-shrink-0')} />
                  <span className="font-medium whitespace-nowrap text-sm truncate">Developer API</span>
                </div>
                {pathname.startsWith('/settings/developer') && (
                  <ChevronRight size={16} className="text-white/50 flex-shrink-0" />
                )}
              </button>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  )
}
