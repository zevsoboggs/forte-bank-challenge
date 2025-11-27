'use client'

import { X, Phone, Smartphone, Calendar, Activity, TrendingUp, AlertTriangle, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Transaction {
    id: string
    transDate: string
    amount: number
    direction: string
    isFraud: boolean
    docNo: string
}

interface Customer {
    id: string
    cstDimId: string
    monthlyOsChanges: number | null
    monthlyPhoneModelChanges: number | null
    lastPhoneModel: string | null
    lastOs: string | null
    loginsLast7Days: number | null
    loginsLast30Days: number | null
    loginFrequency7d: number | null
    loginFrequency30d: number | null
    transactions: Transaction[]
    createdAt: string
}

interface CustomerDetailsModalProps {
    customer: Customer
    onClose: () => void
}

export default function CustomerDetailsModal({ customer, onClose }: CustomerDetailsModalProps) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Клиент #{customer.cstDimId}</h2>
                        <p className="text-gray-500 text-sm">ID: {customer.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Device Info Card */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Smartphone size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900">Устройство</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Модель</span>
                                <span className="font-medium text-gray-900">{customer.lastPhoneModel || 'Неизвестно'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">OS</span>
                                <span className="font-medium text-gray-900">{customer.lastOs || 'Неизвестно'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Смена модели (мес)</span>
                                <span className="font-medium text-gray-900">{customer.monthlyPhoneModelChanges ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Activity Info Card */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                <Activity size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900">Активность</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Входы (7 дней)</span>
                                <span className="font-medium text-gray-900">{customer.loginsLast7Days ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Входы (30 дней)</span>
                                <span className="font-medium text-gray-900">{customer.loginsLast30Days ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Частота (7 дней)</span>
                                <span className="font-medium text-gray-900">{customer.loginFrequency7d?.toFixed(2) ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Risk Info Card (Placeholder logic) */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900">Риск-профиль</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Уровень риска</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">LOW</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Аномалии</span>
                                <span className="font-medium text-gray-900">Нет</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard size={20} className="text-gray-400" />
                    Последние транзакции
                </h3>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Дата</th>
                                <th className="px-6 py-4">Документ</th>
                                <th className="px-6 py-4">Направление</th>
                                <th className="px-6 py-4 text-right">Сумма</th>
                                <th className="px-6 py-4 text-center">Статус</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {customer.transactions && customer.transactions.length > 0 ? (
                                customer.transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-gray-900">
                                            {new Date(tx.transDate).toLocaleDateString('ru-RU')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{tx.docNo}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded text-xs font-bold",
                                                tx.direction === 'IN' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                            )}>
                                                {tx.direction}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                                            {tx.amount.toLocaleString('ru-RU')} ₸
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {tx.isFraud ? (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">FRAUD</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">OK</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                        Нет транзакций
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
