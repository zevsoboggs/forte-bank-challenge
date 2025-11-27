'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Cpu,
  GitMerge,
  Zap,
  Shield,
  Brain,
  Server,
  Database,
  ArrowRight,
  CheckCircle2,
  Layers,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  Play,
  FileText,
  Sliders,
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Gauge
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ModelPage() {
  const { data: session } = useSession()
  const [mlStatus, setMlStatus] = useState<any>(null)
  const [trainingStatus, setTrainingStatus] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [training, setTraining] = useState(false)
  const [behavioralFile, setBehavioralFile] = useState<File | null>(null)
  const [transactionsFile, setTransactionsFile] = useState<File | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  // New states for enhanced features
  const [modelMetrics, setModelMetrics] = useState<any>(null)
  const [threshold, setThreshold] = useState<number>(0.67)
  const [tempThreshold, setTempThreshold] = useState<number>(0.67)
  const [updatingThreshold, setUpdatingThreshold] = useState(false)
  const [driftReport, setDriftReport] = useState<any>(null)
  const [loadingDrift, setLoadingDrift] = useState(false)

  useEffect(() => {
    fetchMLStatus()
    fetchModelMetrics()
    fetchDriftReport()
    const interval = setInterval(fetchTrainingStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  const fetchMLStatus = async () => {
    try {
      const response = await fetch('/api/ml/status')
      const data = await response.json()
      setMlStatus(data)
    } catch (error) {
      console.error('Error fetching ML status:', error)
    }
  }

  const fetchModelMetrics = async () => {
    try {
      const response = await fetch('/api/ml/metrics')
      if (response.ok) {
        const data = await response.json()
        setModelMetrics(data)
        if (data.optimal_threshold) {
          setThreshold(data.optimal_threshold)
          setTempThreshold(data.optimal_threshold)
        }
      }
    } catch (error) {
      console.error('Error fetching model metrics:', error)
    }
  }

  const fetchDriftReport = async () => {
    setLoadingDrift(true)
    try {
      const response = await fetch('/api/ml/drift')
      if (response.ok) {
        const data = await response.json()
        setDriftReport(data)
      }
    } catch (error) {
      console.error('Error fetching drift report:', error)
    } finally {
      setLoadingDrift(false)
    }
  }

  const updateThreshold = async () => {
    setUpdatingThreshold(true)
    try {
      const response = await fetch('/api/ml/threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: tempThreshold }),
      })
      if (response.ok) {
        const data = await response.json()
        setThreshold(data.new_threshold)
        alert(`Порог успешно обновлён: ${data.old_threshold.toFixed(4)} → ${data.new_threshold.toFixed(4)}`)
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error}`)
      }
    } catch (error) {
      alert('Ошибка при обновлении порога')
    } finally {
      setUpdatingThreshold(false)
    }
  }

  const fetchTrainingStatus = async () => {
    try {
      const response = await fetch('/api/ml/train')
      const data = await response.json()
      setTrainingStatus(data)
      if (data.logs) {
        setLogs(data.logs)
      }
      if (data.status === 'completed' || data.status === 'error') {
        setTraining(false)
        fetchMLStatus()
      }
    } catch (error) {
      // Ignore polling errors
    }
  }

  const handleUpload = async () => {
    if (!behavioralFile || !transactionsFile) {
      alert('Необходимо загрузить оба файла')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('behavioral', behavioralFile)
    formData.append('transactions', transactionsFile)

    try {
      const response = await fetch('/api/ml/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        alert('Файлы успешно загружены!')
      } else {
        const error = await response.json()
        alert(`Ошибка: ${error.error}`)
      }
    } catch (error) {
      alert('Ошибка при загрузке файлов')
    } finally {
      setUploading(false)
    }
  }

  const handleStartTraining = async () => {
    setTraining(true)
    setLogs([])

    try {
      const response = await fetch('/api/ml/train', {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Ошибка: ${error.error}`)
        setTraining(false)
      }
    } catch (error) {
      alert('Ошибка при запуске обучения')
      setTraining(false)
    }
  }

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <DashboardLayout>
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">ML Service Control</h1>
            <p className="text-xl text-gray-500 max-w-3xl">
              Управление моделью, мониторинг статуса и архитектурный обзор.
            </p>
          </div>
          <button
            onClick={fetchMLStatus}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow-md text-gray-700"
          >
            <RefreshCw size={18} />
            <span className="font-medium">Обновить статус</span>
          </button>
        </div>

        {/* Status Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-forte-gradient opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>

          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-4 rounded-2xl",
                mlStatus?.mlService?.online ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
              )}>
                <Server size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Статус ML-сервиса</h2>
                <p className="text-sm text-gray-500">Текущее состояние сервера инференса</p>
              </div>
            </div>

            {mlStatus?.mlService?.online ? (
              <div className="flex items-center gap-3 px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-100">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <span className="font-bold text-sm">Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2 bg-red-50 text-red-700 rounded-full border border-red-100">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                <span className="font-bold text-sm">Offline</span>
              </div>
            )}
          </div>

          {mlStatus?.mlService?.online ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-3 mb-2 text-gray-500">
                  <Database size={18} />
                  <span className="text-sm font-medium">Версия модели</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 font-mono">
                  {mlStatus?.mlService?.version || 'N/A'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-3 mb-2 text-gray-500">
                  <Brain size={18} />
                  <span className="text-sm font-medium">Статус загрузки</span>
                </div>
                <div className="flex items-center gap-2">
                  {mlStatus?.mlService?.modelLoaded ? (
                    <>
                      <CheckCircle size={20} className="text-green-500" />
                      <p className="text-lg font-bold text-gray-900">Загружена</p>
                    </>
                  ) : (
                    <>
                      <XCircle size={20} className="text-red-500" />
                      <p className="text-lg font-bold text-gray-900">Не загружена</p>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-3 mb-2 text-gray-500">
                  <Cpu size={18} />
                  <span className="text-sm font-medium">Endpoint</span>
                </div>
                <p className="text-sm font-mono text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-200 inline-block">
                  http://ml-service:8000
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-red-900 mb-1">Сервис недоступен</h3>
                <p className="text-red-700 text-sm mb-3">
                  ML-сервис не отвечает. Убедитесь, что сервер запущен и доступен по сети.
                </p>
                <code className="text-xs font-mono bg-red-100 text-red-800 px-3 py-2 rounded-lg block w-fit">
                  python ml-service/app/main.py
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Model Metrics Section */}
        {modelMetrics && mlStatus?.mlService?.online && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-purple-50 text-purple-600">
                  <BarChart3 size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Метрики модели</h2>
                  <p className="text-sm text-gray-500">Производительность на тестовой выборке</p>
                </div>
              </div>
              <span className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-bold">
                v{modelMetrics.version}
              </span>
            </div>

            {/* Performance Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                  <Target size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">ROC-AUC</span>
                </div>
                <p className="text-3xl font-bold text-blue-700">
                  {modelMetrics.metrics?.test_scores?.roc_auc
                    ? (modelMetrics.metrics.test_scores.roc_auc * 100).toFixed(1)
                    : '—'}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                  <CheckCircle size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Precision</span>
                </div>
                <p className="text-3xl font-bold text-green-700">
                  {modelMetrics.metrics?.test_scores?.precision
                    ? (modelMetrics.metrics.test_scores.precision * 100).toFixed(1)
                    : '—'}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-600 mb-2">
                  <Activity size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Recall</span>
                </div>
                <p className="text-3xl font-bold text-yellow-700">
                  {modelMetrics.metrics?.test_scores?.recall
                    ? (modelMetrics.metrics.test_scores.recall * 100).toFixed(1)
                    : '—'}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-2 text-purple-600 mb-2">
                  <TrendingUp size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">F1-Score</span>
                </div>
                <p className="text-3xl font-bold text-purple-700">
                  {modelMetrics.metrics?.test_scores?.f1_score
                    ? (modelMetrics.metrics.test_scores.f1_score * 100).toFixed(1)
                    : '—'}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-2 text-orange-600 mb-2">
                  <Gauge size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">F2-Score</span>
                </div>
                <p className="text-3xl font-bold text-orange-700">
                  {modelMetrics.metrics?.test_scores?.f2_score
                    ? (modelMetrics.metrics.test_scores.f2_score * 100).toFixed(1)
                    : '—'}%
                </p>
              </div>
            </div>

            {/* Cross-Validation Results */}
            {modelMetrics.metrics?.cv_scores && (
              <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Layers size={16} />
                  Cross-Validation (5-fold)
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">LightGBM AUC</p>
                    <p className="text-lg font-bold text-gray-900">
                      {(modelMetrics.metrics.cv_scores.lgb_auc_mean * 100).toFixed(1)}%
                      <span className="text-sm text-gray-500 font-normal ml-1">
                        (±{(modelMetrics.metrics.cv_scores.lgb_auc_std * 100).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">XGBoost AUC</p>
                    <p className="text-lg font-bold text-gray-900">
                      {(modelMetrics.metrics.cv_scores.xgb_auc_mean * 100).toFixed(1)}%
                      <span className="text-sm text-gray-500 font-normal ml-1">
                        (±{(modelMetrics.metrics.cv_scores.xgb_auc_std * 100).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Ensemble AUC</p>
                    <p className="text-lg font-bold text-forte-primary">
                      {(modelMetrics.metrics.cv_scores.ensemble_auc_mean * 100).toFixed(1)}%
                      <span className="text-sm text-gray-500 font-normal ml-1">
                        (±{(modelMetrics.metrics.cv_scores.ensemble_auc_std * 100).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Importance */}
            {modelMetrics.feature_importance && Object.keys(modelMetrics.feature_importance).length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <BarChart3 size={16} />
                  Feature Importance (Top 10)
                </h3>
                <div className="space-y-3">
                  {Object.entries(modelMetrics.feature_importance)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 10)
                    .map(([feature, importance]) => (
                      <div key={feature} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-600 w-48 truncate">{feature}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full bg-forte-gradient rounded-full transition-all duration-500"
                            style={{ width: `${importance}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-900 w-16 text-right">
                          {(importance as number).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Threshold Control Section (Admin Only) */}
        {isAdmin && mlStatus?.mlService?.online && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-orange-50 text-orange-600">
                  <Sliders size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Настройка порога срабатывания</h2>
                  <p className="text-sm text-gray-500">
                    Транзакции с fraud_probability ≥ порог будут заблокированы
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full uppercase tracking-wider">
                Admin Only
              </span>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <div className="flex items-center gap-8">
                <div className="flex-1">
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">Порог блокировки</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {(tempThreshold * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tempThreshold * 100}
                    onChange={(e) => setTempThreshold(Number(e.target.value) / 100)}
                    className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-6
                      [&::-webkit-slider-thumb]:h-6
                      [&::-webkit-slider-thumb]:bg-forte-primary
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-webkit-slider-thumb]:hover:scale-110"
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>0% (блокировать все)</span>
                    <span>50%</span>
                    <span>100% (ничего не блокировать)</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={updateThreshold}
                    disabled={updatingThreshold || tempThreshold === threshold}
                    className="px-6 py-3 bg-forte-gradient text-white rounded-xl font-bold
                      hover:shadow-forte transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingThreshold ? 'Сохранение...' : 'Применить'}
                  </button>
                  {tempThreshold !== threshold && (
                    <button
                      onClick={() => setTempThreshold(threshold)}
                      className="px-6 py-2 text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Сбросить
                    </button>
                  )}
                </div>
              </div>

              {tempThreshold !== threshold && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-sm text-yellow-800">
                  Текущий порог: <strong>{(threshold * 100).toFixed(1)}%</strong> → Новый: <strong>{(tempThreshold * 100).toFixed(1)}%</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Drift Monitoring */}
        {mlStatus?.mlService?.online && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-4 rounded-2xl",
                  driftReport?.drift_detected ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                )}>
                  <Activity size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Data Drift Мониторинг</h2>
                  <p className="text-sm text-gray-500">Отслеживание изменений в данных</p>
                </div>
              </div>
              <button
                onClick={fetchDriftReport}
                disabled={loadingDrift}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <RefreshCw size={16} className={loadingDrift ? 'animate-spin' : ''} />
                <span className="text-sm font-medium">Проверить</span>
              </button>
            </div>

            {driftReport ? (
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-2xl flex items-center gap-4",
                  driftReport.drift_detected
                    ? "bg-red-50 border border-red-100"
                    : "bg-green-50 border border-green-100"
                )}>
                  {driftReport.drift_detected ? (
                    <AlertCircle className="text-red-600" size={24} />
                  ) : (
                    <CheckCircle className="text-green-600" size={24} />
                  )}
                  <div>
                    <p className={cn(
                      "font-bold",
                      driftReport.drift_detected ? "text-red-900" : "text-green-900"
                    )}>
                      {driftReport.drift_detected ? 'Обнаружен Data Drift!' : 'Drift не обнаружен'}
                    </p>
                    <p className={cn(
                      "text-sm",
                      driftReport.drift_detected ? "text-red-700" : "text-green-700"
                    )}>
                      {driftReport.recommendation}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-500">Drift Score</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      driftReport.drift_score > 0.5 ? "text-red-600" :
                      driftReport.drift_score > 0.3 ? "text-yellow-600" : "text-green-600"
                    )}>
                      {(driftReport.drift_score * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {driftReport.features_with_drift?.length > 0 && (
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Признаки с drift</h4>
                    <div className="space-y-2">
                      {driftReport.features_with_drift.map((f: any) => (
                        <div key={f.feature} className="flex items-center justify-between p-2 bg-white rounded-lg">
                          <span className="font-mono text-sm text-gray-600">{f.feature}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-gray-500">
                              {f.baseline_mean.toFixed(2)} → {f.current_mean.toFixed(2)}
                            </span>
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-bold",
                              f.change_percent > 0 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {f.change_percent > 0 ? '+' : ''}{f.change_percent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Нажмите "Проверить" для анализа drift</p>
              </div>
            )}
          </div>
        )}

        {/* Training Section (Admin Only) */}
        {isAdmin ? (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Обучение модели</h2>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wider">
                Admin Only
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="relative group">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Поведенческие паттерны (CSV)
                </label>
                <div className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
                  behavioralFile
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-forte-secondary hover:bg-gray-50"
                )}>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setBehavioralFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {behavioralFile ? (
                    <div className="flex flex-col items-center text-green-700">
                      <CheckCircle size={48} className="mb-3" />
                      <p className="font-bold text-sm truncate max-w-full px-4">{behavioralFile.name}</p>
                      <p className="text-xs mt-1">{(behavioralFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-500">
                      <Upload size={48} className="mb-3 text-gray-400 group-hover:text-forte-secondary transition-colors" />
                      <p className="font-medium text-sm">Перетащите файл или кликните</p>
                      <p className="text-xs mt-1 text-gray-400">поведенческие паттерны.csv</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative group">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Транзакции (CSV)
                </label>
                <div className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
                  transactionsFile
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-forte-secondary hover:bg-gray-50"
                )}>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setTransactionsFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {transactionsFile ? (
                    <div className="flex flex-col items-center text-green-700">
                      <CheckCircle size={48} className="mb-3" />
                      <p className="font-bold text-sm truncate max-w-full px-4">{transactionsFile.name}</p>
                      <p className="text-xs mt-1">{(transactionsFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-500">
                      <Upload size={48} className="mb-3 text-gray-400 group-hover:text-forte-secondary transition-colors" />
                      <p className="font-medium text-sm">Перетащите файл или кликните</p>
                      <p className="text-xs mt-1 text-gray-400">транзакции.csv</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={handleUpload}
                disabled={!behavioralFile || !transactionsFile || uploading}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-white border border-gray-200 text-gray-900 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm"
              >
                <Upload size={20} />
                <span>{uploading ? 'Загрузка...' : '1. Загрузить данные'}</span>
              </button>

              <button
                onClick={handleStartTraining}
                disabled={training || trainingStatus?.status === 'training'}
                className="flex-[2] flex items-center justify-center space-x-2 px-6 py-4 bg-forte-gradient text-white rounded-xl hover:shadow-forte hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-md"
              >
                {training ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Обучение модели...</span>
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    <span>2. Запустить обучение</span>
                  </>
                )}
              </button>
            </div>

            {/* Training Status */}
            {trainingStatus?.status === 'training' && (
              <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <RefreshCw size={20} className="text-blue-600 animate-spin" />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900">Обучение в процессе</h4>
                      <p className="text-xs text-blue-700">Это может занять несколько минут</p>
                    </div>
                  </div>
                  <span className="text-blue-800 font-mono font-bold">Running...</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full animate-progress-indeterminate"></div>
                </div>
              </div>
            )}

            {trainingStatus?.status === 'completed' && (
              <div className="mt-8 bg-green-50 border border-green-100 rounded-2xl p-6 flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-green-900">Обучение успешно завершено!</h4>
                  <p className="text-sm text-green-700">Новая модель активна и готова к работе.</p>
                </div>
              </div>
            )}

            {trainingStatus?.status === 'error' && (
              <div className="mt-8 bg-red-50 border border-red-100 rounded-2xl p-6 flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <XCircle size={24} className="text-red-600" />
                </div>
                <div>
                  <h4 className="font-bold text-red-900">Ошибка при обучении</h4>
                  <p className="text-sm text-red-700">Проверьте логи для получения деталей.</p>
                </div>
              </div>
            )}

            {/* Logs */}
            {logs.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  Логи процесса
                </h3>
                <div className="bg-gray-900 text-green-400 rounded-2xl p-6 h-64 overflow-y-auto font-mono text-xs shadow-inner custom-scrollbar">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                      <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-100 rounded-3xl p-8 flex items-start gap-4 mb-12">
            <div className="p-3 bg-yellow-100 rounded-xl text-yellow-700">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-yellow-900 mb-2">Доступ ограничен</h3>
              <p className="text-yellow-800 text-sm leading-relaxed">
                Функции обучения модели доступны только пользователям с ролью <strong>Администратор</strong>.
                Если вам необходим доступ, пожалуйста, обратитесь к системному администратору.
              </p>
            </div>
          </div>
        )}

        {/* Architecture Improvements Grid */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <Server className="text-forte-primary" />
          Архитектурные улучшения
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
              <Layers size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Модульная структура</h3>
            <p className="text-gray-500 leading-relaxed">
              Монолитный код разделен на независимые модули: Core, Services, API и Schemas.
              Это упрощает поддержку, тестирование и масштабирование системы.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Асинхронность</h3>
            <p className="text-gray-500 leading-relaxed">
              Тяжелые ML-вычисления вынесены в отдельный пул потоков (ThreadPoolExecutor),
              что предотвращает блокировку основного цикла событий и обеспечивает отзывчивость API.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-6 text-green-600">
              <GitMerge size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Параллельный AI</h3>
            <p className="text-gray-500 leading-relaxed">
              Запросы к OpenAI для анализа мошенничества и AML-проверки выполняются параллельно,
              сокращая общее время обработки транзакции в 2 раза.
            </p>
          </div>
        </div>

        {/* Workflow Visualization */}
        <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <Cpu className="text-forte-primary" />
          Как это работает
        </h2>

        <div className="relative mb-16">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 hidden md:block z-0"></div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-forte-primary group-hover:text-white transition-colors">
                <Database size={24} />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">1. Данные</h4>
              <p className="text-xs text-gray-500">Сбор транзакционных и поведенческих данных</p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-forte-primary group-hover:text-white transition-colors">
                <Cpu size={24} />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">2. Ансамбль</h4>
              <p className="text-xs text-gray-500">LightGBM + XGBoost для точного скоринга</p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-forte-primary group-hover:text-white transition-colors">
                <Brain size={24} />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">3. SHAP</h4>
              <p className="text-xs text-gray-500">Объяснение решения модели (Feature Importance)</p>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-forte-primary group-hover:text-white transition-colors">
                <Shield size={24} />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">4. AI Анализ</h4>
              <p className="text-xs text-gray-500">LLM анализ контекста и AML проверка</p>
            </div>

            {/* Step 5 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center group hover:-translate-y-1 transition-transform duration-300">
              <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-500 group-hover:text-white transition-colors">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="font-bold text-gray-900 mb-2">5. Решение</h4>
              <p className="text-xs text-gray-500">Финальный вердикт и рекомендации</p>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-gray-900 rounded-3xl p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-forte-primary/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-8">Технологический стек</h2>
            <div className="flex flex-wrap gap-4">
              {['Python 3.11', 'FastAPI', 'LightGBM', 'XGBoost', 'SHAP', 'OpenAI GPT-4o', 'Docker', 'Pydantic'].map((tech) => (
                <span key={tech} className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-xl font-medium border border-white/10 hover:bg-white/20 transition-colors cursor-default">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
