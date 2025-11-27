'use client'

import { useEffect } from 'react'
import Logo from './Logo'

export default function PageLoader() {
  useEffect(() => {
    // Предотвращаем прокрутку во время загрузки
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-xl flex items-center justify-center transition-all duration-500">
      <div className="relative flex flex-col items-center">
        {/* Logo Container with Glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-forte-gradient opacity-20 blur-2xl rounded-full animate-pulse"></div>
          <div className="relative bg-white p-6 rounded-3xl shadow-forte border border-gray-100 animate-float">
            <Logo className="w-16 h-16" />
          </div>
        </div>

        {/* Text with Gradient */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-forte-gradient animate-pulse">
            Forte.AI
          </h2>
          <p className="text-gray-400 text-sm font-medium tracking-wider uppercase">
            Загрузка системы
          </p>
        </div>

        {/* Custom Progress Bar */}
        <div className="mt-8 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-forte-gradient animate-loading-bar rounded-full"></div>
        </div>
      </div>

      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-2 bg-forte-gradient"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-forte-primary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute top-20 left-20 w-40 h-40 bg-forte-secondary/5 rounded-full blur-2xl -z-10 animate-pulse delay-150"></div>
    </div>
  )
}
