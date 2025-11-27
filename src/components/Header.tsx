'use client'

import { signOut, useSession } from 'next-auth/react'
import { Bell, Search, LogOut, User, ChevronDown, Settings, Menu } from 'lucide-react'
import { useState } from 'react'

interface HeaderProps {
  onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="fixed top-0 left-0 md:left-80 right-0 h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40 transition-all duration-300 ease-in-out">
      <div className="h-full px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-gray-400 hover:text-gray-600 md:hidden"
        >
          <Menu size={24} />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-2xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-forte-primary transition-colors" size={20} />
            <input
              type="text"
              placeholder="Поиск транзакций, клиентов, событий..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-forte-primary/10 focus:bg-white transition-all duration-200 text-sm font-medium text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-6">
          {/* Notifications */}
          <button className="relative p-3 text-gray-400 hover:text-forte-primary hover:bg-forte-primary/5 rounded-xl transition-all duration-200">
            <Bell size={22} />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
          </button>

          <div className="h-8 w-px bg-gray-200"></div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-1.5 pr-3 hover:bg-gray-50 rounded-full transition-all duration-200 border border-transparent hover:border-gray-100"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-forte-primary to-forte-secondary rounded-full flex items-center justify-center shadow-md shadow-forte-primary/20 text-white">
                <span className="font-bold text-sm">{session?.user?.name?.[0] || 'U'}</span>
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-bold text-gray-900 leading-none mb-1">{session?.user?.name}</p>
                <p className="text-xs font-medium text-gray-500">{session?.user?.role}</p>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                ></div>
                <div className="absolute right-0 mt-4 w-64 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 py-2 z-20 animate-in fade-in slide-in-from-top-2">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <p className="text-sm font-bold text-gray-900">{session?.user?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{session?.user?.email}</p>
                  </div>

                  <div className="p-2">
                    <button className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-forte-primary rounded-xl flex items-center space-x-3 transition-colors">
                      <User size={18} />
                      <span>Профиль</span>
                    </button>

                    <button className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-forte-primary rounded-xl flex items-center space-x-3 transition-colors">
                      <Settings size={18} />
                      <span>Настройки</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-50 mt-1 p-2">
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center space-x-3 transition-colors"
                    >
                      <LogOut size={18} />
                      <span>Выйти</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
