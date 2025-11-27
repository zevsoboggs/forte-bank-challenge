'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Smartphone, ArrowRight, CheckCircle2, AlertTriangle, Loader2, CreditCard, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MobileDemoPage() {
    const [step, setStep] = useState<'input' | 'processing' | 'kyc' | 'success' | 'blocked'>('input')
    const [amount, setAmount] = useState('')
    const [receiver, setReceiver] = useState('')
    const [kycUrl, setKycUrl] = useState<string | null>(null)
    const [riskData, setRiskData] = useState<any>(null)

    const handleTransfer = async () => {
        setStep('processing')

        try {
            // Simulate API Call to our Anti-Fraud System
            const response = await fetch('/api/fraud/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'demo-api-key' // Demo Key - replace with real key
                },
                body: JSON.stringify({
                    amount: Number(amount),
                    currency: 'KZT',
                    sender: {
                        id: 'user_demo_123',
                        email: 'demo@forte.kz',
                        firstName: 'Demo',
                        lastName: 'User'
                    },
                    receiver: {
                        card: receiver
                    }
                })
            })

            const data = await response.json()
            setRiskData(data)

            if (data.status === 'KYC_REQUIRED') {
                setKycUrl(data.kyc.verificationUrl)
                setStep('kyc')
            } else if (data.status === 'APPROVED') {
                setStep('success')
            } else {
                setStep('blocked')
            }

        } catch (error) {
            console.error('Transfer failed', error)
            setStep('blocked')
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
            {/* Mobile Device Frame */}
            <div className="w-full max-w-[400px] bg-white rounded-[3rem] shadow-2xl border-[8px] border-gray-900 overflow-hidden relative h-[800px] flex flex-col">
                {/* Status Bar */}
                <div className="bg-forte-primary h-12 flex items-center justify-between px-6 text-white text-xs font-medium pt-2">
                    <span>9:41</span>
                    <div className="flex gap-1.5">
                        <div className="w-4 h-4 bg-white/20 rounded-full" />
                        <div className="w-4 h-4 bg-white/20 rounded-full" />
                        <div className="w-4 h-4 bg-white rounded-full" />
                    </div>
                </div>

                {/* App Header */}
                <div className="bg-forte-primary p-6 pb-8 text-white rounded-b-[2rem] shadow-lg relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                            <User size={20} />
                        </div>
                        <span className="font-bold text-lg tracking-wide">ForteApp</span>
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                            <Shield size={20} />
                        </div>
                    </div>
                    <p className="text-white/80 text-sm mb-1">Мой счет</p>
                    <h2 className="text-3xl font-bold">₸ 1,250,000</h2>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-gray-50 p-6 relative overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {step === 'input' && (
                            <motion.div
                                key="input"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Smartphone size={20} className="text-forte-primary" />
                                        Перевод по номеру
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Номер карты / Телефона</label>
                                            <div className="relative">
                                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                                <input
                                                    type="text"
                                                    value={receiver}
                                                    onChange={(e) => setReceiver(e.target.value)}
                                                    placeholder="0000 0000 0000 0000"
                                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-forte-primary/20 font-medium text-gray-900 placeholder:text-gray-300 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Сумма перевода</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900 font-bold">₸</span>
                                                <input
                                                    type="number"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-forte-primary/20 font-bold text-xl text-gray-900 placeholder:text-gray-300 transition-all"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2 text-center">
                                                Лимит без проверки: 500,000 ₸
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleTransfer}
                                    disabled={!amount || !receiver}
                                    className="w-full py-4 bg-forte-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-forte-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    Перевести
                                </button>
                            </motion.div>
                        )}

                        {step === 'processing' && (
                            <motion.div
                                key="processing"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center h-full space-y-6 text-center"
                            >
                                <div className="relative">
                                    <div className="w-24 h-24 border-4 border-gray-100 border-t-forte-primary rounded-full animate-spin" />
                                    <Shield className="absolute inset-0 m-auto text-forte-primary" size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Проверка операции</h3>
                                    <p className="text-gray-500">AI анализирует риски...</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 'kyc' && (
                            <motion.div
                                key="kyc"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6 text-center pt-10"
                            >
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle size={40} className="text-red-500" />
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Подозрительная операция</h3>
                                    <p className="text-gray-500 mb-6 px-4">
                                        Система безопасности выявила высокий риск. Для проведения операции необходимо подтвердить личность.
                                    </p>

                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-8 text-left mx-4 shadow-sm">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-500">Уровень риска</span>
                                            <span className="font-bold text-red-500">CRITICAL</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Fraud Score</span>
                                            <span className="font-bold text-gray-900">{riskData?.fraudScore}/100</span>
                                        </div>
                                    </div>
                                </div>

                                <a
                                    href={kycUrl || '#'}
                                    target="_blank"
                                    className="block w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-[0.98] transition-all mx-auto max-w-[280px]"
                                >
                                    Пройти верификацию
                                </a>

                                <button
                                    onClick={() => setStep('input')}
                                    className="text-gray-400 font-medium text-sm hover:text-gray-600"
                                >
                                    Отменить перевод
                                </button>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center h-full space-y-6 text-center"
                            >
                                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 size={48} className="text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Перевод отправлен</h3>
                                    <p className="text-gray-500">Средства поступят в течение минуты</p>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-gray-100 w-full shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-500">Сумма</span>
                                        <span className="text-xl font-bold">₸ {Number(amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Комиссия</span>
                                        <span className="font-bold text-gray-900">₸ 0</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep('input')}
                                    className="w-full py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold text-lg active:scale-[0.98] transition-all"
                                >
                                    На главную
                                </button>
                            </motion.div>
                        )}

                        {step === 'blocked' && (
                            <motion.div
                                key="blocked"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center h-full space-y-6 text-center px-4"
                            >
                                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                    <Shield size={48} className="text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Операция заблокирована</h3>
                                    <p className="text-gray-600 mb-6 px-2">
                                        Система безопасности обнаружила критический риск мошенничества. Операция не может быть выполнена.
                                    </p>
                                </div>

                                {riskData && (
                                    <div className="bg-red-50 border-2 border-red-200 p-5 rounded-2xl w-full shadow-sm">
                                        <div className="flex justify-between text-sm mb-3">
                                            <span className="text-gray-700 font-medium">Уровень риска</span>
                                            <span className="font-bold text-red-600">{riskData.riskLevel}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-3">
                                            <span className="text-gray-700 font-medium">Fraud Score</span>
                                            <span className="font-bold text-gray-900">{riskData.fraudScore}/100</span>
                                        </div>
                                        {riskData.reason && (
                                            <div className="mt-4 pt-3 border-t border-red-200">
                                                <p className="text-xs text-gray-600 text-left">{riskData.reason}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="bg-gray-50 p-4 rounded-xl w-full">
                                    <p className="text-sm text-gray-600">
                                        Если вы считаете, что это ошибка, свяжитесь с поддержкой:
                                    </p>
                                    <p className="text-forte-primary font-bold mt-2">+7 (700) 123-45-67</p>
                                </div>

                                <button
                                    onClick={() => {
                                        setStep('input')
                                        setAmount('')
                                        setReceiver('')
                                        setRiskData(null)
                                    }}
                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg active:scale-[0.98] transition-all"
                                >
                                    Понятно
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
