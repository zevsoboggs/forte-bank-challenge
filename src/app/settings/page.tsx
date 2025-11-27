'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Settings,
  Bell,
  Shield,
  User,
  LogOut,
  Moon,
  Sun,
  Globe,
  Smartphone,
  Key,
  Mail,
  Check,
  Save
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'profile' | 'notifications' | 'security' | 'system'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  // Mock state for settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weekly_report: false,
    security_alert: true
  })

  const [system, setSystem] = useState({
    theme: 'light',
    language: 'ru'
  })

  const handleSave = () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }, 1000)
  }

  const tabs = [
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'security', label: 'Безопасность', icon: Shield },
    { id: 'system', label: 'Система', icon: Settings },
  ]

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Настройки</h1>
          <p className="text-gray-600">
            Управление профилем и параметрами системы
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className={cn(
            "flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all shadow-md",
            saved
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-forte-gradient text-white hover:shadow-forte hover:scale-[1.02]"
          )}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            <Check size={20} />
          ) : (
            <Save size={20} />
          )}
          <span>{saved ? 'Сохранено!' : 'Сохранить изменения'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as Tab)}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                      activeTab === tab.id
                        ? "bg-forte-gradient text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-50 hover:text-forte-primary"
                    )}
                  >
                    <Icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Quick Info Card */}
          <div className="mt-6 bg-forte-primary/5 rounded-3xl p-6 border border-forte-primary/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-forte-gradient flex items-center justify-center text-white font-bold">
                {session?.user?.name?.[0] || 'U'}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{session?.user?.name}</p>
                <p className="text-xs text-gray-500">{session?.user?.role}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 space-y-2">
              <p>Last login: {new Date().toLocaleDateString()}</p>
              <p>IP: 192.168.1.1</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 min-h-[500px]">

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Личные данные</h2>
                  <p className="text-sm text-gray-500">Информация о вашем аккаунте</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Имя пользователя</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        defaultValue={session?.user?.name || ''}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-forte-secondary focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Email адрес</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        defaultValue={session?.user?.email || ''}
                        disabled
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Роль</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        defaultValue={session?.user?.role || ''}
                        disabled
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Фото профиля</h3>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-forte-gradient flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {session?.user?.name?.[0] || 'U'}
                    </div>
                    <div className="space-y-3">
                      <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                        Загрузить новое фото
                      </button>
                      <p className="text-xs text-gray-500">
                        JPG, GIF или PNG. Максимальный размер 1MB.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Настройки уведомлений</h2>
                  <p className="text-sm text-gray-500">Выберите, как и когда вы хотите получать оповещения</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-forte-secondary">
                        <Mail size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Email уведомления</h3>
                        <p className="text-sm text-gray-500">Получать важные обновления на почту</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.email}
                        onChange={() => setNotifications({ ...notifications, email: !notifications.email })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-forte-light/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forte-secondary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-forte-secondary">
                        <Bell size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Push уведомления</h3>
                        <p className="text-sm text-gray-500">Мгновенные оповещения в браузере</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.push}
                        onChange={() => setNotifications({ ...notifications, push: !notifications.push })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-forte-light/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forte-secondary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm text-forte-secondary">
                        <Shield size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Алерты безопасности</h3>
                        <p className="text-sm text-gray-500">Уведомления о подозрительных входах</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.security_alert}
                        onChange={() => setNotifications({ ...notifications, security_alert: !notifications.security_alert })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-forte-light/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forte-secondary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Безопасность</h2>
                  <p className="text-sm text-gray-500">Защита вашего аккаунта и данных</p>
                </div>

                <div className="space-y-6">
                  <div className="p-6 border border-gray-200 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-forte-50 rounded-xl text-forte-secondary">
                          <Key size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">Смена пароля</h3>
                          <p className="text-sm text-gray-500">Последнее изменение: 30 дней назад</p>
                        </div>
                      </div>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                        Изменить
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="password"
                          placeholder="Текущий пароль"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-forte-secondary outline-none text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="password"
                          placeholder="Новый пароль"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-forte-secondary outline-none text-sm"
                        />
                        <input
                          type="password"
                          placeholder="Подтвердите пароль"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-forte-secondary outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border border-gray-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-forte-50 rounded-xl text-forte-secondary">
                        <Smartphone size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">Двухфакторная аутентификация</h3>
                        <p className="text-sm text-gray-500">Дополнительный уровень защиты</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-forte-light/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forte-secondary"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Системные настройки</h2>
                  <p className="text-sm text-gray-500">Внешний вид и локализация</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 border border-gray-200 rounded-2xl">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Moon size={20} />
                      Тема оформления
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSystem({ ...system, theme: 'light' })}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                          system.theme === 'light'
                            ? "border-forte-secondary bg-forte-50 text-forte-secondary"
                            : "border-gray-200 hover:border-gray-300 text-gray-600"
                        )}
                      >
                        <Sun size={24} />
                        <span className="font-bold text-sm">Светлая</span>
                      </button>
                      <button
                        onClick={() => setSystem({ ...system, theme: 'dark' })}
                        className={cn(
                          "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                          system.theme === 'dark'
                            ? "border-forte-secondary bg-forte-50 text-forte-secondary"
                            : "border-gray-200 hover:border-gray-300 text-gray-600"
                        )}
                      >
                        <Moon size={24} />
                        <span className="font-bold text-sm">Темная</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-6 border border-gray-200 rounded-2xl">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Globe size={20} />
                      Язык интерфейса
                    </h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setSystem({ ...system, language: 'ru' })}
                        className={cn(
                          "w-full p-3 rounded-xl border transition-all flex items-center justify-between",
                          system.language === 'ru'
                            ? "border-forte-secondary bg-forte-50 text-forte-secondary"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        <span className="font-medium">Русский</span>
                        {system.language === 'ru' && <Check size={18} />}
                      </button>
                      <button
                        onClick={() => setSystem({ ...system, language: 'en' })}
                        className={cn(
                          "w-full p-3 rounded-xl border transition-all flex items-center justify-between",
                          system.language === 'en'
                            ? "border-forte-secondary bg-forte-50 text-forte-secondary"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        <span className="font-medium">English</span>
                        {system.language === 'en' && <Check size={18} />}
                      </button>
                      <button
                        onClick={() => setSystem({ ...system, language: 'kz' })}
                        className={cn(
                          "w-full p-3 rounded-xl border transition-all flex items-center justify-between",
                          system.language === 'kz'
                            ? "border-forte-secondary bg-forte-50 text-forte-secondary"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        <span className="font-medium">Қазақша</span>
                        {system.language === 'kz' && <Check size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
