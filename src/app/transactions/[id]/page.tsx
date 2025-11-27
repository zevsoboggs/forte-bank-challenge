'use client'

import { formatCurrency, formatDate, getRiskLevelBadge, cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Brain,
  Loader2,
  Sparkles,
} from 'lucide-react'

interface Transaction {
  id: string
  cstDimId: string
  transDate: string
  transDateTime: string
  amount: number
  docNo: string
  direction: string
  isFraud: boolean
  customer: {
    cstDimId: string
    lastPhoneModel: string | null
    lastOs: string | null
  } | null
  predictions: Array<{
    id: string
    fraudProbability: number
    fraudScore: number
    riskLevel: string
    modelVersion: string
    aiAnalysis: string | null
    amlAnalysis: string | null
    recommendation: string | null
    analysisFingerprint: string | null
    createdAt: string
  }>
}

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const transactionId = params.id as string

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jsonData, setJsonData] = useState<any>(null)
  const [showJson, setShowJson] = useState(false)

  useEffect(() => {
    fetchTransaction()
    fetchJsonData()
  }, [transactionId])

  const fetchTransaction = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/transactions/${transactionId}`)

      if (!response.ok) {
        throw new Error('Транзакция не найдена')
      }

      const data = await response.json()
      setTransaction(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchJsonData = async () => {
    try {
      const response = await fetch(`/api/transactions/${transactionId}/json`)
      if (response.ok) {
        const data = await response.json()
        setJsonData(data)
      }
    } catch (err) {
      console.error('Failed to fetch JSON data:', err)
    }
  }

  const analyzeWithAI = async () => {
    try {
      setAnalyzing(true)
      const response = await fetch(`/api/transactions/${transactionId}/analyze`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка анализа')
      }

      // Обновляем данные после анализа
      await fetchTransaction()
      await fetchJsonData()
      alert('✅ AI анализ завершен успешно!')
    } catch (err: any) {
      alert(`❌ Ошибка: ${err.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-forte-secondary" size={48} />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !transaction) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Транзакция не найдена
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/transactions')}
            className="px-4 py-2 bg-forte-gradient text-white rounded-lg hover:shadow-forte"
          >
            Вернуться к списку
          </button>
        </div>
      </DashboardLayout>
    )
  }

  const prediction = transaction.predictions[0]
  const riskColor =
    prediction?.riskLevel === 'CRITICAL'
      ? 'text-red-600 bg-red-100'
      : prediction?.riskLevel === 'HIGH'
        ? 'text-orange-600 bg-orange-100'
        : prediction?.riskLevel === 'MEDIUM'
          ? 'text-yellow-600 bg-yellow-100'
          : 'text-green-600 bg-green-100'

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/transactions')}
          className="flex items-center space-x-2 text-gray-500 hover:text-forte-primary mb-6 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Назад к транзакциям</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Транзакция #{transaction.docNo}
              </h1>
              {prediction && (
                <span className={cn(getRiskLevelBadge(prediction.riskLevel), "shadow-sm px-3 py-1 text-sm")}>
                  {prediction.riskLevel}
                </span>
              )}
            </div>
            <p className="text-gray-500 font-mono">ID: {transaction.id}</p>
          </div>

          {/* Кнопка AI анализа */}
          <button
            onClick={analyzeWithAI}
            disabled={analyzing}
            className="flex items-center space-x-2 px-6 py-3 bg-forte-gradient text-white rounded-2xl hover:shadow-forte hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none transform hover:-translate-y-0.5"
          >
            {analyzing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span className="font-medium">Анализ...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span className="font-medium">Анализ с AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fraud Status */}
      {transaction.isFraud && (
        <div className="mb-8 bg-red-50 border border-red-100 rounded-3xl p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-2xl">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-900 mb-1">
              Мошенническая транзакция
            </h3>
            <p className="text-red-700 leading-relaxed">
              Эта транзакция была помечена как мошенническая системой безопасности. Рекомендуется провести детальное расследование.
            </p>
          </div>
        </div>
      )}

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Transaction Details */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-forte-primary rounded-full"></div>
            Детали транзакции
          </h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
              <div className="p-3 bg-white rounded-xl shadow-sm text-forte-secondary">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Сумма транзакции</p>
                <p className="text-2xl font-bold text-gray-900">
                  {transaction.amount.toLocaleString('ru-RU')} ₸
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
              <div className="p-3 bg-white rounded-xl shadow-sm text-forte-secondary">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">Дата и время</p>
                <p className="text-lg font-bold text-gray-900">
                  {new Date(transaction.transDateTime).toLocaleString('ru-RU')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
                <div className="p-2 bg-white rounded-lg shadow-sm text-forte-secondary flex-shrink-0">
                  <MapPin size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium mb-1">Направление</p>
                  <p className="font-mono text-sm font-bold text-gray-900 break-all">
                    {transaction.direction}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition-colors">
                <div className="p-2 bg-white rounded-lg shadow-sm text-forte-secondary">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">ID клиента</p>
                  <p className="font-mono text-sm font-bold text-gray-900">
                    {transaction.cstDimId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ML Prediction */}
        {prediction && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-forte-secondary rounded-full"></div>
              ML Анализ
            </h2>

            <div className="space-y-8">
              <div className="text-center p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      className="text-gray-200"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="64"
                      cy="64"
                    />
                    <circle
                      className="text-forte-primary transition-all duration-1000 ease-out"
                      strokeWidth="8"
                      strokeDasharray={365}
                      strokeDashoffset={365 - (365 * prediction.fraudProbability)}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="58"
                      cx="64"
                      cy="64"
                    />
                  </svg>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {(prediction.fraudProbability * 100).toFixed(1)}%
                    </span>
                    <p className="text-xs text-gray-500 font-medium">Вероятность</p>
                  </div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">
                  Оценка риска: <span className={cn("font-bold", riskColor.split(' ')[0])}>{prediction.riskLevel}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 font-medium">Fraud Score</span>
                    <span className="font-bold text-gray-900">{prediction.fraudScore.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-forte-gradient rounded-full transition-all duration-1000"
                      style={{ width: `${prediction.fraudScore}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-sm text-gray-600 font-medium">Версия модели</span>
                  <span className="font-mono text-sm font-bold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                    {prediction.modelVersion}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Analysis */}
      {prediction?.aiAnalysis && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-forte-gradient opacity-5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>

          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-forte-gradient rounded-2xl shadow-lg shadow-forte-primary/20 text-white">
                <Brain size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  AI Анализ от OpenAI
                </h2>
                <p className="text-sm text-gray-500">Автоматический анализ подозрительной активности</p>
              </div>
            </div>
            {prediction.analysisFingerprint && (
              <div className="text-xs font-mono text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                ID: {prediction.analysisFingerprint}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-forte-primary rounded-full"></span>
                GREKdev
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                {prediction.aiAnalysis}
              </p>
            </div>

            {prediction.amlAnalysis && (
              <div className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100">
                <h3 className="text-sm font-bold text-orange-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  AML Analysis
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                  {prediction.amlAnalysis}
                </p>
              </div>
            )}
          </div>

          {prediction.recommendation && (
            <div className="mt-6 p-6 bg-blue-50/50 border border-blue-100 rounded-2xl relative z-10">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Рекомендация
              </h3>
              <p className="text-blue-800 font-medium leading-relaxed">
                {prediction.recommendation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Customer Info */}
      {transaction.customer && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-gray-400 rounded-full"></div>
            Информация о клиенте
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-500 font-medium mb-1">Модель телефона</p>
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {transaction.customer.lastPhoneModel || 'Н/Д'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-500 font-medium mb-1">Операционная система</p>
              <p className="font-medium text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {transaction.customer.lastOs || 'Н/Д'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* JSON Data Section */}
      {jsonData && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              API Response JSON
            </h2>
            <button
              onClick={() => setShowJson(!showJson)}
              className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-colors text-sm font-medium border border-gray-200"
            >
              {showJson ? 'Скрыть JSON' : 'Показать JSON'}
            </button>
          </div>

          {showJson && (
            <div className="relative group">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
                  alert('✅ JSON скопирован в буфер обмена!')
                }}
                className="absolute top-4 right-4 px-4 py-2 bg-gray-800/80 backdrop-blur-sm text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-all opacity-0 group-hover:opacity-100"
              >
                Копировать
              </button>
              <pre className="bg-gray-900 text-green-400 p-6 rounded-2xl overflow-x-auto text-xs font-mono leading-relaxed shadow-inner">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <p className="text-sm text-blue-900">
              <span className="font-bold mr-2">API Endpoint:</span>
              <code className="bg-white px-2 py-1 rounded-md text-xs border border-blue-100 font-mono text-blue-700 shadow-sm">
                GET /api/transactions/{transactionId}/json
              </code>
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
