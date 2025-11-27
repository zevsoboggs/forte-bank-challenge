'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import { AlertCircle, Check, Shield, BarChart3, Eye, ArrowRight, ChevronRight } from 'lucide-react'

const ACCOUNTS = [
  {
    id: 'admin',
    role: 'Администратор',
    email: 'admin@forte.kz',
    password: 'demo123',
    description: 'Полный доступ ко всем функциям',
    icon: Shield,
    color: 'bg-purple-100 text-purple-700',
    border: 'hover:border-purple-300',
  },
  {
    id: 'analyst',
    role: 'Аналитик',
    email: 'analyst@forte.kz',
    password: 'demo123',
    description: 'Работа с транзакциями и отчетами',
    icon: BarChart3,
    color: 'bg-forte-100 text-forte-primary',
    border: 'border-forte-secondary ring-1 ring-forte-secondary',
    recommended: true,
  },
  {
    id: 'viewer',
    role: 'Просмотр',
    email: 'viewer@forte.kz',
    password: 'demo123',
    description: 'Только просмотр данных',
    icon: Eye,
    color: 'bg-blue-100 text-blue-700',
    border: 'hover:border-blue-300',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Неверный email или пароль')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError('Произошла ошибка при входе')
    } finally {
      setLoading(false)
    }
  }

  const handleAccountSelect = (acc: typeof ACCOUNTS[0]) => {
    setEmail(acc.email)
    setPassword(acc.password)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[600px]">

        {/* Left Side - Login Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col relative">
          <div className="flex-none">
            <Logo className="w-12 h-12" />
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full py-8">
            <div className="mb-10">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                Вход в систему
              </h1>
              <p className="text-gray-500 text-lg">
                Forte.AI GREKdev
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 ml-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-forte-secondary/20 focus:border-forte-secondary outline-none transition-all duration-200 font-medium text-gray-900 placeholder:text-gray-400"
                  placeholder="name@company.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 ml-1">
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-forte-secondary/20 focus:border-forte-secondary outline-none transition-all duration-200 font-medium text-gray-900 placeholder:text-gray-400"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-forte-primary hover:bg-forte-800 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-forte-primary/30 hover:shadow-xl hover:shadow-forte-primary/40 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Вход...</span>
                ) : (
                  <>
                    <span>Войти</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="flex-none mt-auto pt-4 text-center text-sm text-gray-400">
            &copy; 2025 ForteBank. All rights reserved.
          </div>
        </div>

        {/* Right Side - Available Accounts */}
        <div className="w-full lg:w-1/2 bg-forte-gradient p-8 lg:p-12 flex flex-col justify-center text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 max-w-md mx-auto w-full">
            <h2 className="text-3xl font-bold mb-2">Доступные аккаунты</h2>
            <p className="text-white/80 mb-8">Выберите роль для тестирования системы</p>

            <div className="space-y-4">
              {ACCOUNTS.map((acc) => {
                const Icon = acc.icon
                return (
                  <button
                    key={acc.id}
                    onClick={() => handleAccountSelect(acc)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group relative overflow-hidden ${acc.recommended
                      ? 'bg-white shadow-xl transform hover:-translate-y-1'
                      : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10'
                      }`}
                  >
                    {acc.recommended && (
                      <div className="absolute top-0 right-0 bg-forte-secondary text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                        Рекомендуем
                      </div>
                    )}

                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-xl ${acc.recommended ? acc.color : 'bg-white/10 text-white'}`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-bold ${acc.recommended ? 'text-gray-900' : 'text-white'}`}>
                            {acc.role}
                          </h3>
                          {email === acc.email && (
                            <Check size={16} className={acc.recommended ? 'text-forte-secondary' : 'text-white'} />
                          )}
                        </div>
                        <p className={`text-sm mb-2 ${acc.recommended ? 'text-gray-500' : 'text-white/70'}`}>
                          {acc.description}
                        </p>
                        <div className={`text-xs font-mono py-1 px-2 rounded-lg inline-block ${acc.recommended ? 'bg-gray-100 text-gray-600' : 'bg-black/20 text-white/60'
                          }`}>
                          {acc.email}
                        </div>
                      </div>
                      <ChevronRight className={`self-center opacity-0 group-hover:opacity-100 transition-opacity ${acc.recommended ? 'text-gray-400' : 'text-white/50'
                        }`} />
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-10 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <p className="text-sm text-white/90 leading-relaxed">
                <span className="font-bold">Hackathon Demo:</span> Эта версия предназначена для демонстрации возможностей ML-модели выявления мошенничества.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
