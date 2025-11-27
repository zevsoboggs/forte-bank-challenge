'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import {
    ArrowLeft,
    Building2,
    Calendar,
    MapPin,
    ExternalLink,
    ShieldAlert,
    CheckCircle,
    Sparkles,
    Loader2,
    AlertTriangle,
    Info,
    Briefcase
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

export default function TenderDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [tender, setTender] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [analyzing, setAnalyzing] = useState(false)

    useEffect(() => {
        fetchTender()
    }, [])

    const fetchTender = async () => {
        setLoading(true)
        try {
            const response = await fetch(`/api/tenders/${params.id}`)
            const data = await response.json()
            setTender(data.tender)
        } catch (error) {
            console.error('Error fetching tender:', error)
        } finally {
            setLoading(false)
        }
    }

    const runAnalysis = async () => {
        setAnalyzing(true)
        try {
            const response = await fetch('/api/tenders/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenderId: tender.id })
            })
            const data = await response.json()
            if (data.success) {
                fetchTender() // Refresh to show new analysis
            }
        } catch (error) {
            console.error('Error analyzing tender:', error)
        } finally {
            setAnalyzing(false)
        }
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="w-12 h-12 text-forte-primary animate-spin" />
                </div>
            </DashboardLayout>
        )
    }

    if (!tender) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <p className="text-gray-500">Тендер не найден</p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 text-forte-primary hover:underline"
                    >
                        Вернуться назад
                    </button>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-gray-500 hover:text-forte-primary transition-colors font-medium"
                >
                    <ArrowLeft size={20} className="mr-2" />
                    Назад к поиску
                </button>
            </div>

            {/* Header Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-forte-gradient opacity-5 rounded-full blur-3xl -mr-20 -mt-20 transition-opacity group-hover:opacity-10"></div>

                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                    tender.status === 'Прием заявок' ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-100 text-gray-600 border border-gray-200"
                                )}>
                                    {tender.status}
                                </span>
                                <span className="text-gray-400 text-sm font-mono bg-gray-50 px-2 py-1 rounded-lg">ID: {tender.lotId}</span>
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-6">
                                {tender.title}
                            </h1>
                            <div className="flex flex-wrap gap-6 text-gray-600">
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl">
                                    <Building2 size={18} className="text-forte-primary" />
                                    <span className="font-medium text-gray-900">{tender.customer}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl">
                                    <MapPin size={18} className="text-forte-primary" />
                                    <span className="font-medium text-gray-900">{tender.region}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl">
                                    <Calendar size={18} className="text-forte-primary" />
                                    <span className="font-medium text-gray-900">До {formatDate(tender.deadline)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-auto lg:text-right bg-gray-50 lg:bg-transparent p-6 lg:p-0 rounded-2xl lg:rounded-none border lg:border-none border-gray-100">
                            <p className="text-sm text-gray-500 mb-1 font-medium uppercase tracking-wide">Бюджет</p>
                            <div className="flex items-baseline lg:justify-end gap-2 mb-2">
                                <p className="text-4xl font-bold text-gray-900 tracking-tight">
                                    {formatCurrency(tender.amount)}
                                </p>
                                <p className="text-lg font-bold text-gray-400">{tender.currency}</p>
                            </div>

                            {tender.sourceLink && (
                                <a
                                    href={tender.sourceLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center w-full lg:w-auto px-6 py-3 bg-white border-2 border-forte-primary/20 text-forte-primary font-bold rounded-xl hover:bg-forte-primary hover:text-white transition-all shadow-sm hover:shadow-md"
                                >
                                    Открыть на портале <ExternalLink size={18} className="ml-2" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* AI Analysis Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Analysis Control */}
                    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-3xl p-8 border-2 border-forte-primary/20 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-forte-primary/10 to-transparent rounded-full blur-3xl -mr-10 -mt-10"></div>

                        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                    <div className="p-2 bg-forte-gradient rounded-xl shadow-lg">
                                        <Sparkles className="text-white" size={24} />
                                    </div>
                                    AI Анализ Тендера
                                </h2>
                                <p className="text-gray-600 max-w-md">
                                    Умный анализ рисков, проверка на аффилированность и автоматический подбор надежных поставщиков.
                                </p>
                            </div>
                            <button
                                onClick={runAnalysis}
                                disabled={analyzing}
                                className={cn(
                                    "px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
                                    analyzing
                                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                        : "bg-forte-gradient text-white"
                                )}
                            >
                                {analyzing ? (
                                    <>
                                        <Loader2 size={24} className="animate-spin" />
                                        Анализируем...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={24} />
                                        {tender.risks && tender.risks.length > 0 ? 'Обновить анализ' : 'Запустить AI Анализ'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Risks Section */}
                    {tender.risks && tender.risks.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 px-2">
                                <ShieldAlert className="text-red-500" />
                                Карта Рисков
                            </h3>
                            <div className="grid gap-4">
                                {tender.risks.map((risk: any) => (
                                    <div
                                        key={risk.id}
                                        className={cn(
                                            "p-6 rounded-2xl border transition-all hover:shadow-md",
                                            risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH'
                                                ? "bg-red-50/50 border-red-200 hover:border-red-300"
                                                : risk.riskLevel === 'MEDIUM'
                                                    ? "bg-orange-50/50 border-orange-200 hover:border-orange-300"
                                                    : "bg-blue-50/50 border-blue-200 hover:border-blue-300"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="text-lg font-bold text-gray-900">{risk.factors.factor}</h4>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
                                                risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH'
                                                    ? "bg-red-100 text-red-700"
                                                    : risk.riskLevel === 'MEDIUM'
                                                        ? "bg-orange-100 text-orange-700"
                                                        : "bg-blue-100 text-blue-700"
                                            )}>
                                                {risk.riskLevel}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 leading-relaxed">{risk.aiAnalysis}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suppliers Section */}
                    {tender.suppliers && tender.suppliers.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 px-2">
                                <Briefcase className="text-forte-primary" />
                                Рекомендуемые поставщики
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {tender.suppliers.map((supplier: any) => (
                                    <div key={supplier.id} className="p-6 rounded-2xl bg-white border border-gray-100 hover:border-forte-primary/30 hover:shadow-lg transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-forte-primary/5 transition-colors">
                                                <Building2 size={24} className="text-gray-400 group-hover:text-forte-primary transition-colors" />
                                            </div>
                                            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-lg border border-green-100">
                                                <CheckCircle size={16} />
                                                <span className="text-sm font-bold">{supplier.matchScore}%</span>
                                            </div>
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1" title={supplier.name}>{supplier.name}</h4>
                                        {supplier.bin && <p className="text-xs text-gray-400 font-mono mb-3">БИН: {supplier.bin}</p>}
                                        <p className="text-sm text-gray-600 line-clamp-3">{supplier.reason}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Info Card */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                            <Info className="text-forte-primary" />
                            Детали закупки
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Способ закупки</span>
                                <div className="flex items-center gap-2 text-gray-900 font-medium bg-gray-50 p-3 rounded-xl">
                                    <Briefcase size={18} className="text-gray-400" />
                                    Открытый конкурс
                                </div>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Организатор</span>
                                <div className="flex items-start gap-2 text-gray-900 font-medium bg-gray-50 p-3 rounded-xl">
                                    <Building2 size={18} className="text-gray-400 mt-0.5 shrink-0" />
                                    <span className="text-sm">{tender.customer}</span>
                                </div>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Место поставки</span>
                                <div className="flex items-center gap-2 text-gray-900 font-medium bg-gray-50 p-3 rounded-xl">
                                    <MapPin size={18} className="text-gray-400" />
                                    {tender.region}
                                </div>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Даты</span>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Начало:</span>
                                        <span className="font-medium">{tender.lotBuy?.begin_date ? formatDate(tender.lotBuy.begin_date) : 'Н/Д'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Окончание:</span>
                                        <span className="font-medium text-forte-primary">{formatDate(tender.deadline)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
