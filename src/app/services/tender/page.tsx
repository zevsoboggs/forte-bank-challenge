'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, AlertTriangle, CheckCircle2, Building2, FileText, ChevronRight, Loader2, BrainCircuit, ShieldAlert, Users, Calendar, Coins, ExternalLink, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TenderLot, tenderPlus } from '@/lib/tenderplus'


export default function TenderPage() {
    const [tenders, setTenders] = useState<TenderLot[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTender, setSelectedTender] = useState<TenderLot | null>(null)
    const [analysis, setAnalysis] = useState<any>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [suppliers, setSuppliers] = useState<any[]>([])

    useEffect(() => {
        loadTenders()
    }, [])

    const loadTenders = async () => {
        try {
            // Use local API proxy to avoid CORS issues
            const res = await fetch('/api/procure/tenders')
            const data = await res.json()

            if (data.tenders) {
                setTenders(data.tenders)
            }
        } catch (error) {
            console.error('Failed to load tenders', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAnalyze = async (tender: TenderLot) => {
        setSelectedTender(tender)
        setAnalyzing(true)
        setAnalysis(null)
        setSuppliers([])

        try {
            // 1. Analyze Risks
            const analyzeRes = await fetch('/api/procure/analyze', {
                method: 'POST',
                body: JSON.stringify({ lotId: tender.lotId, tender }) // Pass full tender data
            })
            const analyzeData = await analyzeRes.json()
            setAnalysis(analyzeData)

            // 2. Find Suppliers
            const supplierRes = await fetch('/api/procure/suppliers', {
                method: 'POST',
                body: JSON.stringify({ lotId: tender.lotId })
            })
            const supplierData = await supplierRes.json()
            setSuppliers(supplierData.suppliers)

        } catch (error) {
            console.error('Analysis failed', error)
        } finally {
            setAnalyzing(false)
        }
    }

    return (
        <div className="max-w-[1800px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <BrainCircuit className="text-forte-primary" size={32} />
                        AI-Procure
                    </h1>
                    <p className="text-gray-500 mt-1">Интеллектуальный анализ тендеров и закупок</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-100 flex items-center gap-2 transition-colors">
                        <Filter size={18} /> Фильтры
                    </button>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Поиск по лотам, заказчикам..."
                            className="pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm w-80 focus:ring-2 focus:ring-forte-primary/20 outline-none font-medium transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 h-[calc(100vh-200px)]">
                {/* Tender List */}
                <div className="lg:col-span-5 flex flex-col bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">Актуальные тендеры</h2>
                        <span className="bg-forte-primary/10 text-forte-primary px-3 py-1 rounded-full text-xs font-bold">
                            {tenders.length} лотов
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-forte-primary w-10 h-10" /></div>
                        ) : tenders.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">Нет данных</div>
                        ) : (
                            tenders.map(tender => (
                                <div
                                    key={tender.id}
                                    onClick={() => setSelectedTender(tender)}
                                    className={cn(
                                        "p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md group relative overflow-hidden",
                                        selectedTender?.id === tender.id
                                            ? "bg-forte-primary/5 border-forte-primary ring-1 ring-forte-primary"
                                            : "bg-white border-gray-100 hover:border-gray-300"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">#{tender.lotId}</span>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                            tender.status.includes('Опубликован') ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                        )}>
                                            {tender.status}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-gray-900 mb-3 line-clamp-2 text-sm leading-relaxed group-hover:text-forte-primary transition-colors">
                                        {tender.title}
                                    </h3>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Building2 size={14} className="text-gray-400 shrink-0" />
                                            <span className="truncate">{tender.customer.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <MapPin size={14} className="text-gray-400 shrink-0" />
                                            <span className="truncate">{tender.region}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Calendar size={14} className="text-gray-400 shrink-0" />
                                            <span>До: {tender.endDate ? new Date(tender.endDate).toLocaleDateString() : 'Не указано'}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                        <div className="font-black text-lg text-gray-900">
                                            {tender.amount.toLocaleString()} <span className="text-sm font-medium text-gray-400">₸</span>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-forte-primary transition-colors" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Analysis Panel */}
                <div className="lg:col-span-7 h-full">
                    <AnimatePresence mode="wait">
                        {selectedTender ? (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden h-full flex flex-col"
                            >
                                {/* Header */}
                                <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 bg-gray-200 rounded text-xs font-bold text-gray-600">LOT-{selectedTender.lotId}</span>
                                                <span className="text-gray-400 text-sm">{new Date().toLocaleDateString()}</span>
                                            </div>
                                            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{selectedTender.title}</h2>
                                        </div>
                                        {selectedTender.sourceLink && (
                                            <a
                                                href={selectedTender.sourceLink}
                                                target="_blank"
                                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 text-gray-700 transition-colors flex items-center gap-2"
                                            >
                                                Источник <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="bg-white p-4 rounded-xl border border-gray-100">
                                            <p className="text-xs text-gray-400 mb-1">Бюджет</p>
                                            <p className="font-bold text-xl text-forte-primary">{selectedTender.amount.toLocaleString()} ₸</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-gray-100">
                                            <p className="text-xs text-gray-400 mb-1">Заказчик</p>
                                            <p className="font-bold text-sm text-gray-900 line-clamp-1" title={selectedTender.customer.name}>{selectedTender.customer.name}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-gray-100">
                                            <p className="text-xs text-gray-400 mb-1">Статус</p>
                                            <p className="font-bold text-sm text-gray-900">{selectedTender.status}</p>
                                        </div>
                                    </div>

                                    {!analysis && !analyzing && (
                                        <button
                                            onClick={() => handleAnalyze(selectedTender)}
                                            className="w-full py-4 bg-gradient-to-r from-forte-primary to-forte-secondary text-white rounded-xl font-bold text-lg shadow-lg shadow-forte-primary/20 hover:shadow-forte-primary/40 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                                        >
                                            <BrainCircuit className="animate-pulse" /> Запустить AI-анализ рисков
                                        </button>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                                    {analyzing ? (
                                        <div className="flex flex-col items-center justify-center h-full space-y-8 text-center py-10">
                                            <div className="relative">
                                                <div className="w-24 h-24 border-4 border-gray-100 border-t-forte-primary rounded-full animate-spin" />
                                                <BrainCircuit className="absolute inset-0 m-auto text-forte-primary animate-pulse" size={40} />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-bold text-gray-900">Анализ документации...</h3>
                                                <p className="text-gray-500 max-w-md mx-auto">
                                                    AI проверяет техническую спецификацию, историю заказчика и рыночные цены.
                                                </p>
                                            </div>
                                        </div>
                                    ) : analysis ? (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            {/* Risk Summary */}
                                            <div className={cn(
                                                "p-6 rounded-2xl border-l-4 shadow-sm relative overflow-hidden",
                                                analysis.riskScore > 40 ? "bg-red-50 border-red-500" : "bg-green-50 border-green-500"
                                            )}>
                                                <div className="relative z-10 flex items-start gap-6">
                                                    <div className={cn(
                                                        "p-4 rounded-2xl shadow-sm",
                                                        analysis.riskScore > 40 ? "bg-white text-red-600" : "bg-white text-green-600"
                                                    )}>
                                                        <ShieldAlert size={32} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <h3 className={cn(
                                                                "text-xl font-bold mb-2",
                                                                analysis.riskScore > 40 ? "text-red-900" : "text-green-900"
                                                            )}>
                                                                {analysis.riskScore > 40 ? "Обнаружены риски!" : "Тендер безопасен"}
                                                            </h3>
                                                            <div className="text-right">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">Risk Score</span>
                                                                <span className="text-4xl font-black">{analysis.riskScore}/100</span>
                                                            </div>
                                                        </div>
                                                        <p className={cn(
                                                            "text-sm leading-relaxed font-medium",
                                                            analysis.riskScore > 40 ? "text-red-800" : "text-green-800"
                                                        )}>
                                                            {analysis.aiSummary}
                                                        </p>
                                                    </div>
                                                </div>

                                                {analysis.risks.length > 0 && (
                                                    <div className="mt-6 space-y-3 relative z-10">
                                                        {analysis.risks.map((risk: any, i: number) => (
                                                            <div key={i} className="bg-white/80 backdrop-blur p-4 rounded-xl flex items-start gap-3 text-sm border border-white/50 shadow-sm">
                                                                <AlertTriangle size={18} className="text-orange-500 mt-0.5 shrink-0" />
                                                                <div>
                                                                    <span className="font-bold text-gray-900 block mb-0.5">{risk.factor}</span>
                                                                    <span className="text-gray-600 leading-relaxed">{risk.description}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Suppliers */}
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                    <Users className="text-forte-primary" />
                                                    Рекомендованные поставщики
                                                </h3>
                                                <div className="grid gap-4">
                                                    {suppliers.map((supplier, i) => (
                                                        <div key={i} className="bg-white border border-gray-100 p-5 rounded-xl hover:shadow-md transition-all flex items-center justify-between group">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center font-bold text-gray-400 group-hover:bg-forte-primary group-hover:text-white transition-colors text-lg">
                                                                    {i + 1}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-gray-900 text-lg">{supplier.name}</h4>
                                                                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                                                                        <FileText size={12} /> БИН: {supplier.bin}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1 rounded-lg inline-block mb-1">
                                                                    {supplier.matchScore}% Match
                                                                </div>
                                                                <p className="text-xs text-gray-400 max-w-[200px] truncate">{supplier.reason}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 py-20 opacity-50">
                                            <BrainCircuit size={80} className="mb-6 text-gray-200" />
                                            <p className="text-xl font-bold text-gray-300">Выберите тендер для анализа</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                                <div className="text-center">
                                    <FileText size={64} className="mx-auto mb-6 opacity-30" />
                                    <h3 className="text-xl font-bold text-gray-500 mb-2">Выберите тендер</h3>
                                    <p className="text-gray-400">Выберите лот из списка слева, чтобы увидеть детали и запустить AI-анализ</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>

    )
}
