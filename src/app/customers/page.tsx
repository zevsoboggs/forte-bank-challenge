'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Users } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import CustomerList from './components/CustomerList'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search
      })
      const response = await fetch(`/api/customers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers)
        setTotalPages(data.pagination.pages)
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers()
    }, 300) // Debounce search
    return () => clearTimeout(timer)
  }, [search, page])

  return (
    <DashboardLayout>
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Клиенты</h1>
            <p className="text-gray-500">Управление базой клиентов и мониторинг активности</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2 text-gray-500">
              <Users size={18} className="text-forte-primary" />
              <span className="font-bold text-gray-900">{customers.length > 0 ? '1000+' : '0'}</span>
              <span className="text-xs uppercase tracking-wider">Всего</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Поиск по ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-forte-primary/20 focus:border-forte-primary outline-none transition-all shadow-sm"
            />
          </div>
          <button className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-forte-primary transition-all flex items-center gap-2 shadow-sm font-medium">
            <Filter size={18} />
            Фильтры
          </button>
        </div>

        {/* Content */}
        <CustomerList
          customers={customers}
          loading={loading}
          onRefresh={fetchCustomers}
        />

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-100 rounded-lg text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Назад
            </button>
            <span className="px-4 py-2 text-gray-600 font-medium">
              Страница {page} из {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-gray-100 rounded-lg text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Вперед
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
