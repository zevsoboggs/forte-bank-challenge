'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'

export default function NavigationLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Настройка NProgress
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 200,
      minimum: 0.08,
      easing: 'ease',
      speed: 500,
    })
  }, [])

  useEffect(() => {
    // Завершаем загрузку при изменении маршрута
    NProgress.done()
  }, [pathname, searchParams])

  return null
}
