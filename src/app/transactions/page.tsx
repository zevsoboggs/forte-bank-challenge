'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { formatCurrency, formatDate, getRiskLevelBadge, cn } from '@/lib/utils'
import { Search, Filter, AlertCircle, CheckCircle, XCircle, Sparkles, Loader2 } from 'lucide-react'

export default function TransactionsPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [riskFilter, setRiskFilter] = useState<string>('')
  const [batchAnalyzing, setBatchAnalyzing] = useState(false)
  const [batchProgress, setBatchProgress] = useState<any>(null)
  const [showBatchModal, setShowBatchModal] = useState(false)

  useEffect(() => {
    fetchTransactions()
  }, [page, riskFilter])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      let url = `/api/transactions?page=${page}&limit=20`
      if (riskFilter) {
        url += `&riskLevel=${riskFilter}`
      }

      const response = await fetch(url)
      const data = await response.json()

      setTransactions(data.transactions || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const startBatchAnalysis = async (limit: number) => {
    setBatchAnalyzing(true)
    setShowBatchModal(true)
    setBatchProgress(null)

    try {
      const response = await fetch('/api/transactions/batch-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit,
          onlyWithoutPredictions: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка массового анализа')
      }

      const data = await response.json()
      setBatchProgress(data)

      // Обновляем список транзакций после завершения
      await fetchTransactions()
    } catch (err: any) {
      alert(`❌ Ошибка: ${err.message}`)
    } finally {
      setBatchAnalyzing(false)
    }
  }

  if (loading) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Транзакции</h1>
        <p className="text-gray-600">
          История проверенных транзакций с результатами анализа
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Filters */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative max-w-md">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Поиск по ID транзакции, клиента..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-forte-secondary focus:border-transparent outline-none transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <Filter size={20} className="text-forte-primary" />
                <select
                  value={riskFilter}
                  onChange={(e) => {
                    setRiskFilter(e.target.value)
                    setPage(1)
                  }}
                  className="bg-transparent border-none focus:ring-0 text-gray-700 font-medium cursor-pointer outline-none"
                >
                  <option value="">Все уровни риска</option>
                  <option value="CRITICAL">Критический</option>
                  <option value="HIGH">Высокий</option>
                  <option value="MEDIUM">Средний</option>
                  <option value="LOW">Низкий</option>
                </select>
              </div>

              <button
                onClick={() => startBatchAnalysis(100)}
                disabled={batchAnalyzing}
                className="flex items-center gap-2 px-6 py-3 bg-forte-gradient text-white rounded-2xl hover:shadow-forte hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none transform hover:-translate-y-0.5 font-medium"
              >
                {batchAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Анализ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Массовая проверка</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Дата/Время
                </th>
                <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Клиент ID
                </th>
                <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Уровень риска
                </th>
                <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Вероятность
                </th>
                <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((transaction) => {
                const prediction = transaction.predictions?.[0]

                return (
                  <tr
                    key={transaction.id}
                    className="hover:bg-gray-50/80 transition-colors group"
                  >
                    <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatDate(transaction.transDateTime)}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-mono text-gray-500">
                      {transaction.cstDimId}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      {prediction && (
                        <span className={cn(getRiskLevelBadge(prediction.riskLevel), "shadow-sm")}>
                          {prediction.riskLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-gray-900">
                      {prediction && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-forte-gradient rounded-full"
                              style={{ width: `${prediction.fraudProbability * 100}%` }}
                            />
                          </div>
                          <span>{(prediction.fraudProbability * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      {prediction?.blocked ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                          <XCircle size={14} className="mr-1.5" />
                          Заблокирована
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100">
                          <CheckCircle size={14} className="mr-1.5" />
                          Разрешена
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-sm">
                      <button
                        onClick={() =>
                          router.push(`/transactions/${transaction.id}`)
                        }
                        className="text-gray-400 hover:text-forte-primary font-medium transition-colors group-hover:translate-x-1 transform duration-200 flex items-center gap-1"
                      >
                        Подробнее
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-gray-100 px-8 py-6 flex items-center justify-between bg-gray-50/30">
          <p className="text-sm text-gray-500 font-medium">
            Страница {page} из {totalPages}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Назад
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-5 py-2.5 text-sm font-medium text-white bg-forte-primary rounded-xl hover:bg-forte-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-forte-primary/20"
            >
              Далее
            </button>
          </div>
        </div>
      </div>

      {/* Batch Analysis Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowBatchModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-forte-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-forte-primary" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Массовый анализ</h2>
              <p className="text-gray-600 mt-1">
                Проверка транзакций через ML-модель
              </p>
            </div>

            {batchAnalyzing ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-12 h-12 text-forte-secondary animate-spin mb-4" />
                  <p className="text-lg font-medium text-gray-900">Анализируем данные...</p>
                  <p className="text-sm text-gray-500">Это может занять некоторое время</p>
                </div>
              </div>
            ) : batchProgress ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-2xl text-center">
                    <p className="text-2xl font-bold text-green-600">{batchProgress.successCount || 0}</p>
                    <p className="text-xs text-green-800 font-medium uppercase tracking-wider mt-1">Успешно</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl text-center">
                    <p className="text-2xl font-bold text-blue-600">{batchProgress.total || 0}</p>
                    <p className="text-xs text-blue-800 font-medium uppercase tracking-wider mt-1">Всего</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Всего транзакций</span>
                    <span className="font-bold text-gray-900">{batchProgress.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Успешно</span>
                    <span className="font-bold text-green-600">{batchProgress.successCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Ошибки</span>
                    <span className="font-bold text-red-600">{batchProgress.errorCount || 0}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowBatchModal(false)}
                  className="w-full py-3 bg-forte-gradient text-white rounded-xl font-bold shadow-lg hover:shadow-forte transition-all"
                >
                  Готово
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Нет данных для отображения</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
