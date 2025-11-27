'use client'

import { useState } from 'react'
import { Search, ChevronRight, Smartphone, Activity, Loader2 } from 'lucide-react'
import CustomerDetailsModal from './CustomerDetailsModal'

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
    transactionCount: number
    createdAt: string
}

interface CustomerListProps {
    customers: Customer[]
    loading: boolean
    onRefresh: () => void
}

export default function CustomerList({ customers, loading, onRefresh }: CustomerListProps) {
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [detailsLoading, setDetailsLoading] = useState(false)
    const [fullCustomerDetails, setFullCustomerDetails] = useState<any>(null)

    const handleCustomerClick = async (customer: Customer) => {
        setSelectedCustomer(customer)
        setDetailsLoading(true)
        try {
            const response = await fetch(`/api/customers/${customer.id}`)
            if (response.ok) {
                const data = await response.json()
                setFullCustomerDetails(data)
            }
        } catch (error) {
            console.error('Failed to fetch customer details:', error)
        } finally {
            setDetailsLoading(false)
        }
    }

    const handleCloseModal = () => {
        setSelectedCustomer(null)
        setFullCustomerDetails(null)
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 size={40} className="animate-spin mb-4 text-forte-primary" />
                <p>Загрузка клиентов...</p>
            </div>
        )
    }

    if (customers.length === 0) {
        return (
            <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border border-gray-100">
                <p>Клиенты не найдены</p>
            </div>
        )
    }

    return (
        <>
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 text-gray-500 font-medium text-sm">
                        <tr>
                            <th className="px-6 py-4 border-b border-gray-100">ID Клиента</th>
                            <th className="px-6 py-4 border-b border-gray-100">Устройство</th>
                            <th className="px-6 py-4 border-b border-gray-100 text-center">Входы (30д)</th>
                            <th className="px-6 py-4 border-b border-gray-100 text-center">Транзакции</th>
                            <th className="px-6 py-4 border-b border-gray-100 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {customers.map((customer) => (
                            <tr
                                key={customer.id}
                                onClick={() => handleCustomerClick(customer)}
                                className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                            >
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">#{customer.cstDimId}</div>
                                    <div className="text-xs text-gray-400 font-mono">{customer.id.slice(0, 8)}...</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500">
                                            <Smartphone size={14} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{customer.lastPhoneModel || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{customer.lastOs || 'N/A'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                        {customer.loginsLast30Days ?? 0}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                                        {customer.transactionCount ?? 0}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-forte-primary transition-colors">
                                        <ChevronRight size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedCustomer && fullCustomerDetails && (
                <CustomerDetailsModal
                    customer={fullCustomerDetails}
                    onClose={handleCloseModal}
                />
            )}

            {selectedCustomer && !fullCustomerDetails && detailsLoading && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-white" />
                </div>
            )}
        </>
    )
}
