'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Shield, AlertTriangle, CheckCircle, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react'
import { formatCurrency, formatPercent } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'

const RISK_COLORS = {
  CRITICAL: '#DC2626',
  HIGH: '#F97316',
  MEDIUM: '#FBBF24',
  LOW: '#10B981',
}

const CHART_COLORS = {
  primary: '#A51652',
  secondary: '#B8335F',
  accent: '#F99184',
  background: '#FFF5F7',
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics?days=30')
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-8">
          <div className="h-12 w-1/3 bg-gray-200 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded-3xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded-3xl"></div>
            <div className="h-96 bg-gray-200 rounded-3xl"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const riskStatsData = analytics?.riskStats || []
  const pieData = riskStatsData.map((stat: any) => ({
    name: stat.level,
    value: stat.count,
  }))

  const totalPredictions = analytics?.totalPredictions || 0
  const blockedCount = analytics?.blockedCount || 0
  const blockedRate = totalPredictions > 0 ? blockedCount / totalPredictions : 0

  const criticalCount =
    riskStatsData.find((s: any) => s.level === 'CRITICAL')?.count || 0
  const highCount =
    riskStatsData.find((s: any) => s.level === 'HIGH')?.count || 0

  return (
    <DashboardLayout>
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
            Обзор системы
          </h1>
          <p className="text-gray-500 text-lg">
            Мониторинг транзакций и выявление угроз в реальном времени
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2 shadow-sm">
            <Filter size={18} />
            <span>Фильтры</span>
          </button>
          <button className="px-4 py-2.5 bg-forte-primary text-white rounded-xl font-medium hover:bg-forte-800 transition-colors shadow-lg shadow-forte-primary/25">
            Скачать отчет
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="Всего проверок"
          value={totalPredictions.toLocaleString()}
          icon={<Activity className="text-white" size={24} />}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          trend="+12.5%"
          trendUp={true}
          description="За последние 30 дней"
        />
        <StatCard
          title="Заблокировано"
          value={blockedCount.toLocaleString()}
          icon={<Shield className="text-white" size={24} />}
          gradient="bg-gradient-to-br from-forte-primary to-forte-secondary"
          subtitle={formatPercent(blockedRate)}
          description="От общего объема"
        />
        <StatCard
          title="Критический риск"
          value={criticalCount.toLocaleString()}
          icon={<AlertTriangle className="text-white" size={24} />}
          gradient="bg-gradient-to-br from-red-500 to-red-600"
          trend="-2.4%"
          trendUp={false}
          description="Требуют внимания"
        />
        <StatCard
          title="Высокий риск"
          value={highCount.toLocaleString()}
          icon={<TrendingUp className="text-white" size={24} />}
          gradient="bg-gradient-to-br from-orange-400 to-orange-500"
          trend="+5.1%"
          trendUp={true}
          description="Подозрительная активность"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Daily Trend - Takes up 2 columns */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Динамика рисков</h2>
              <p className="text-sm text-gray-500 mt-1">Тренды выявления угроз за 30 дней</p>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                <span className="text-gray-600">Высокий</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                <span className="text-gray-600">Средний</span>
              </span>
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.dailyStats || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stroke="#F97316"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorHigh)"
                  name="Высокий риск"
                />
                <Area
                  type="monotone"
                  dataKey="medium"
                  stroke="#FBBF24"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMedium)"
                  name="Средний риск"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution - Takes up 1 column */}
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Распределение</h2>
            <p className="text-sm text-gray-500 mt-1">Доли уровней риска</p>
          </div>

          <div className="flex-1 min-h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS]}
                      strokeWidth={0}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-900">{totalPredictions > 0 ? '100' : '0'}%</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Всего</span>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {pieData.map((entry: any) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: RISK_COLORS[entry.name as keyof typeof RISK_COLORS] }}
                  />
                  <span className="text-gray-600 font-medium">{entry.name}</span>
                </div>
                <span className="font-bold text-gray-900">{entry.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Levels Bar Chart */}
      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900">Детальная статистика</h2>
          <p className="text-sm text-gray-500 mt-1">Количество операций по уровням риска</p>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskStatsData} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis
                dataKey="level"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: '#F3F4F6' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              />
              <Bar dataKey="count" radius={[12, 12, 12, 12]}>
                {riskStatsData.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={RISK_COLORS[entry.level as keyof typeof RISK_COLORS]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatCard({
  title,
  value,
  icon,
  gradient,
  subtitle,
  trend,
  trendUp,
  description
}: {
  title: string
  value: string
  icon: React.ReactNode
  gradient: string
  subtitle?: string
  trend?: string
  trendUp?: boolean
  description?: string
}) {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3.5 rounded-2xl ${gradient} shadow-lg shadow-gray-200`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs font-bold ${trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}>
            {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            <span>{trend}</span>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <div className="flex items-baseline space-x-2">
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
          {subtitle && (
            <span className="text-sm font-bold text-forte-primary">{subtitle}</span>
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-400 mt-2 font-medium">{description}</p>
        )}
      </div>

      {/* Decorative background blob */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gray-50 rounded-full blur-2xl group-hover:bg-gray-100 transition-colors duration-300 pointer-events-none" />
    </div>
  )
}
