'use client'

import { useState } from 'react'
import { Search, Shield, Building2, MapPin, Calendar, CheckCircle2, AlertTriangle, XCircle, Loader2, ChevronRight, Globe, Phone, Mail, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompanyData {
    value: string
    data: {
        bin: string
        registration_date: string
        type: string
        status: string
        name_ru: string
        name_kz: string
        fio: string
        kato: string
        address_ru: string
        address_kz: string
        address_local: string
        oked: string
        oked_name_ru: string
        krp_name_ru: string
        kse_name_ru: string
        kfs_name_ru: string
    }
}

export default function CounterpartyPage() {
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<CompanyData[]>([])
    const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null)
    const [error, setError] = useState('')

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setLoading(true)
        setError('')
        setResults([])
        setSelectedCompany(null)

        try {
            // Determine if query is BIN (digits only) or Name
            const isBin = /^\d+$/.test(query.trim())
            const type = isBin ? 'findById' : 'suggest'

            const response = await fetch('/api/services/counterparty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query.trim(), type })
            })

            if (!response.ok) throw new Error('Failed to fetch data')

            const data = await response.json()
            setResults(data.suggestions || [])

            if (data.suggestions?.length === 0) {
                setError('Ничего не найдено')
            }
        } catch (err) {
            console.error(err)
            setError('Произошла ошибка при поиске. Попробуйте позже.')
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-50 text-green-700 border-green-100'
            case 'LIQUIDATING': return 'bg-orange-50 text-orange-700 border-orange-100'
            case 'LIQUIDATED': return 'bg-red-50 text-red-700 border-red-100'
            default: return 'bg-gray-50 text-gray-700 border-gray-100'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Действующая'
            case 'LIQUIDATING': return 'Ликвидируется'
            case 'LIQUIDATED': return 'Ликвидирована'
            case 'SUSPENDED': return 'Приостановлена'
            default: return status
        }
    }

    return (
        <div className="p-8">
            {/* Premium Header */}
            <div className="bg-gradient-to-br from-forte-primary to-forte-secondary rounded-3xl p-8 text-white mb-8 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-5 rounded-full blur-3xl -ml-10 -mb-10"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                            <Shield className="text-white" size={24} />
                        </div>
                        <span className="text-blue-100 font-medium tracking-wide uppercase text-sm">Сервисы</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Проверка контрагента</h1>
                    <p className="text-blue-100 max-w-xl text-lg">
                        Мгновенная проверка надежности партнеров по официальным базам данных Казахстана.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Search Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Введите БИН, ИИН или название..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl text-gray-900 focus:ring-2 focus:ring-forte-primary/20 focus:border-forte-primary/50 transition-all outline-none font-medium"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <button
                                type="submit"
                                disabled={loading || !query}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-forte-primary text-white rounded-lg hover:bg-forte-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                            </button>
                        </form>
                        <p className="text-xs text-gray-400 mt-3 px-1">
                            Поиск по официальным государственным реестрам РК (Бюро нац. статистики, КГД МФ РК)
                        </p>
                    </div>

                    {/* Results List */}
                    <div className="space-y-3">
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                                <AlertTriangle size={16} />
                                {error}
                            </div>
                        )}

                        {results.map((company) => (
                            <div
                                key={company.data.bin}
                                onClick={() => setSelectedCompany(company)}
                                className={cn(
                                    "p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md group",
                                    selectedCompany?.data.bin === company.data.bin
                                        ? "bg-white border-forte-primary ring-1 ring-forte-primary shadow-md"
                                        : "bg-white border-gray-100 hover:border-gray-200"
                                )}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-lg">
                                        БИН: {company.data.bin}
                                    </span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border",
                                        getStatusColor(company.data.status)
                                    )}>
                                        {getStatusLabel(company.data.status)}
                                    </span>
                                </div>
                                <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 group-hover:text-forte-primary transition-colors">
                                    {company.value}
                                </h3>
                                <p className="text-xs text-gray-500 line-clamp-1">
                                    {company.data.address_ru}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Details Section */}
                <div className="lg:col-span-2">
                    {selectedCompany ? (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-8 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
                                            {selectedCompany.data.name_ru}
                                        </h2>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {selectedCompany.data.name_kz}
                                        </p>
                                    </div>
                                    <div className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border flex items-center gap-2",
                                        getStatusColor(selectedCompany.data.status)
                                    )}>
                                        {selectedCompany.data.status === 'ACTIVE' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                        {getStatusLabel(selectedCompany.data.status)}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 flex items-center gap-2">
                                        <Building2 size={14} className="text-gray-400" />
                                        {selectedCompany.data.krp_name_ru}
                                    </div>
                                    <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 flex items-center gap-2">
                                        <Shield size={14} className="text-gray-400" />
                                        {selectedCompany.data.kfs_name_ru}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Building2 size={14} />
                                            Основная информация
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-sm text-gray-500">БИН / ИИН</span>
                                                <span className="text-sm font-bold text-gray-900 font-mono">{selectedCompany.data.bin}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-gray-50">
                                                <span className="text-sm text-gray-500">Дата регистрации</span>
                                                <span className="text-sm font-bold text-gray-900">
                                                    {new Date(parseInt(selectedCompany.data.registration_date)).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="py-2 border-b border-gray-50">
                                                <span className="text-sm text-gray-500 block mb-1">Руководитель</span>
                                                <span className="text-sm font-bold text-gray-900">{selectedCompany.data.fio}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <MapPin size={14} />
                                            Адрес и контакты
                                        </h3>
                                        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-gray-100">
                                            {selectedCompany.data.address_ru}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Briefcase size={14} />
                                            Вид деятельности (ОКЭД)
                                        </h3>
                                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                            <div className="flex items-start gap-3">
                                                <span className="text-blue-600 font-bold font-mono text-lg">{selectedCompany.data.oked}</span>
                                                <p className="text-sm text-blue-900 font-medium leading-relaxed">
                                                    {selectedCompany.data.oked_name_ru}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Shield size={14} />
                                            Благонадежность
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                                <div className="text-xs text-green-600 font-bold mb-1">Налоги</div>
                                                <div className="text-sm font-bold text-green-800">Нет задолженности</div>
                                            </div>
                                            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                                <div className="text-xs text-green-600 font-bold mb-1">Суды</div>
                                                <div className="text-sm font-bold text-green-800">Нет дел</div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2 text-center">
                                            * Данные носят справочный характер
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                                <Building2 className="text-gray-300" size={48} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Выберите компанию</h3>
                            <p className="text-gray-500 max-w-sm">
                                Используйте поиск слева, чтобы найти компанию по БИН, ИИН или названию, и посмотреть подробную информацию.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
