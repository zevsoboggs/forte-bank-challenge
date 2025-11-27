'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Calendar,
  Filter
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { cn } from '@/lib/utils'

const COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'] // Low, Medium, High, Critical

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/analytics?days=${timeRange}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-forte-secondary/20 border-t-forte-secondary rounded-full animate-spin"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-forte-primary font-bold text-xs">
              AI
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Prepare data for Pie Chart
  const riskDistribution = [
    { name: 'Низкий', value: data.riskStats.find((s: any) => s.level === 'LOW')?.count || 0 },
    { name: 'Средний', value: data.riskStats.find((s: any) => s.level === 'MEDIUM')?.count || 0 },
    { name: 'Высокий', value: data.riskStats.find((s: any) => s.level === 'HIGH')?.count || 0 },
    { name: 'Критический', value: data.riskStats.find((s: any) => s.level === 'CRITICAL')?.count || 0 },
  ]

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Аналитика</h1>
          <p className="text-gray-600">
            Детальный анализ мошеннических паттернов и трендов
          </p>
        </div>

        <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-gray-200">
          <button
            onClick={() => setTimeRange('7')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              timeRange === '7'
                ? "bg-forte-gradient text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            7 дней
          </button>
          <button
            onClick={() => setTimeRange('30')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              timeRange === '30'
                ? "bg-forte-gradient text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            30 дней
          </button>
          <button
            onClick={() => setTimeRange('90')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              timeRange === '90'
                ? "bg-forte-gradient text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            3 месяца
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
              <Activity size={24} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
              +12.5%
            </span>
          </div>
          <p className="text-gray-500 text-sm font-medium mb-1">Всего транзакций</p>
          <h3 className="text-3xl font-bold text-gray-900">{data.totalPredictions.toLocaleString()}</h3>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 rounded-2xl text-red-600">
              <ShieldCheck size={24} />
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
              {((data.blockedCount / data.totalPredictions) * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-gray-500 text-sm font-medium mb-1">Заблокировано угроз</p>
          <h3 className="text-3xl font-bold text-gray-900">{data.blockedCount.toLocaleString()}</h3>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-forte-primary/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-forte-50 rounded-2xl text-forte-primary">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
              Avg
            </span>
          </div>
          <p className="text-gray-500 text-sm font-medium mb-1">Средний риск</p>
          <h3 className="text-3xl font-bold text-gray-900">
            {(data.dailyStats.reduce((acc: any, curr: any) => acc + curr.avgProbability, 0) / data.dailyStats.length * 100).toFixed(1)}%
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Main Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-6 bg-forte-primary rounded-full"></div>
                Динамика транзакций
              </h2>
              <p className="text-sm text-gray-500 mt-1">Объем транзакций и уровень риска по дням</p>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyStats}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A0221" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4A0221" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#4A0221"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  name="Всего транзакций"
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stroke="#EF4444"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorHigh)"
                  name="Высокий риск"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-1 h-6 bg-forte-secondary rounded-full"></div>
            Распределение риска
          </h2>

          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <p className="text-3xl font-bold text-gray-900">{data.totalPredictions}</p>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Всего</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {riskDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
