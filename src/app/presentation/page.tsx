'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    Shield,
    Gavel,
    Kanban,
    Briefcase,
    ArrowRight,
    CheckCircle2,
    Zap,
    TrendingUp,
    LayoutDashboard,
    BrainCircuit,
    Lock,
    Globe,
    Clock,
    FileText,
    User,
    ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Logo from '@/components/Logo'

const solutions = [
    {
        id: 'fraud',
        title: 'Задача 1: ML Fraud Detection',
        subtitle: 'Безопасность транзакций нового поколения',
        icon: Shield,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-100',
        gradient: 'from-red-500/20 to-red-600/5',
        problem: 'Традиционные системы (Rule-based) пропускают новые виды мошенничества и создают много ложных срабатываний, блокируя честных клиентов. Банк теряет деньги и лояльность.',
        solution: 'Гибридная ML-система с Explainable AI. Мы используем ансамбль моделей (Isolation Forest + XGBoost) для выявления аномалий в реальном времени (<500мс).',
        uniqueness: 'В отличие от "черных ящиков", наша система объясняет каждое решение (SHAP values), что критично для комплаенса и разблокировки клиентов.',
        value: [
            'Снижение финансовых потерь на 35%',
            'Сокращение False Positive на 60%',
            'Мгновенная реакция на новые векторы атак'
        ]
    },
    {
        id: 'procure',
        title: 'Задача 2: AI-Procure Agent',
        subtitle: 'Интеллектуальный анализ закупок',
        icon: Gavel,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        gradient: 'from-blue-500/20 to-blue-600/5',
        problem: 'Ручной анализ тысяч тендеров занимает недели. Сложно выявить аффилированность поставщиков и скрытые риски в документации.',
        solution: 'Автономный AI-агент, который мониторит площадки 24/7, анализирует ТЗ и проверяет поставщиков по 50+ параметрам риска.',
        uniqueness: 'Агент не просто ищет ключевые слова, а понимает контекст закупки и строит граф связей поставщиков для выявления картельных сговоров.',
        value: [
            'Ускорение анализа закупок в 12 раз',
            'Выявление 85% скрытых рисков',
            'Экономия бюджета за счет лучших предложений'
        ]
    },
    {
        id: 'scrum',
        title: 'Задача 3: AI-Scrum Master',
        subtitle: 'Автоматизация процессов разработки',
        icon: Kanban,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-100',
        gradient: 'from-purple-500/20 to-purple-600/5',
        problem: 'Разработчики тратят до 30% времени на обновление задач в Jira, написание отчетов и декомпозицию, вместо написания кода.',
        solution: 'Виртуальный Scrum Master, интегрированный в рабочий процесс. Он сам декомпозирует эпики, обновляет статусы и ведет протоколы встреч.',
        uniqueness: 'Глубокая интеграция с контекстом проекта: AI знает историю задач и компетенции сотрудников, предлагая идеальное распределение нагрузки.',
        value: [
            'Высвобождение 20% времени команды',
            '100% прозрачность прогресса спринта',
            'Автоматическая генерация документации'
        ]
    },
    {
        id: 'analyst',
        title: 'Задача 4: AI Business Analyst',
        subtitle: 'Генерация требований за минуты',
        icon: Briefcase,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
        gradient: 'from-emerald-500/20 to-emerald-600/5',
        problem: 'Бизнес-анализ — узкое горлышко. Написание качественного BRD и User Stories занимает дни, а ошибки на этом этапе стоят дорого.',
        solution: 'Генеративный AI-аналитик, который проводит интервью с заказчиком и мгновенно создает структурированные артефакты (BRD, SRS, UML).',
        uniqueness: 'Использование RAG (Retrieval Augmented Generation) на базе корпоративной базы знаний банка гарантирует соответствие стандартам и регламентам.',
        value: [
            'Сокращение Time-to-Market на 15%',
            'Создание BRD за 10 минут вместо 3 дней',
            'Исключение противоречий в требованиях'
        ]
    }
]

const stats = [
    { label: 'Решений внедрено', value: '4', icon: CheckCircle2 },
    { label: 'Точность моделей', value: '>95%', icon: TrendingUp },
    { label: 'Экономия времени', value: '10x', icon: Clock },
    { label: 'Интеграций', value: 'API First', icon: Globe },
]

export default function PresentationPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-forte-primary/20 overflow-x-hidden">
            {/* Header */}
            <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100/50 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="relative">
                            <div className="absolute inset-0 bg-forte-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <Logo className="w-10 h-10 relative z-10 transition-transform duration-500 group-hover:rotate-12" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-gray-900 group-hover:text-forte-primary transition-colors">Forte.AI</h1>
                            <p className="text-[10px] font-bold text-forte-secondary uppercase tracking-wider">GREKdev Team</p>
                        </div>
                    </div>
                    <Link
                        href="/dashboard"
                        className="px-3 py-2 md:px-6 md:py-2.5 bg-gray-900 text-white rounded-lg md:rounded-xl text-xs md:text-base font-medium hover:bg-forte-primary transition-all flex items-center gap-1.5 md:gap-2 shadow-lg hover:shadow-forte-primary/30 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <LayoutDashboard className="w-4 h-4 md:w-[18px] md:h-[18px]" />
                        <span className="hidden sm:inline">Перейти к</span> Демо
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="min-h-screen flex flex-col justify-center pt-24 pb-12 md:pt-32 md:pb-20 px-4 md:px-6 relative overflow-hidden bg-gradient-to-b from-white via-gray-50/50 to-white">
                {/* Animated Background Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[400px] md:h-[600px] bg-forte-primary/10 rounded-full blur-[60px] md:blur-[100px] -z-10 animate-pulse-slow" />
                <div className="absolute bottom-0 right-0 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-forte-secondary/5 rounded-full blur-[80px] md:blur-[120px] -z-10" />

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-gray-200 shadow-xl text-sm font-bold mb-10 hover:border-forte-primary/50 transition-colors cursor-default"
                        >
                            <Zap size={18} className="text-yellow-400 fill-yellow-400" />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                                Forte Bank Tech Challenge 2025
                            </span>
                        </motion.div>

                        <h1 className="text-4xl md:text-8xl font-bold mb-6 md:mb-8 leading-[1.1] tracking-tight">
                            Интеллект, который <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-forte-primary via-forte-secondary to-forte-primary bg-[length:200%_auto] animate-gradient">
                                работает на Банк
                            </span>
                        </h1>

                        <p className="text-lg md:text-2xl text-gray-600 mb-10 md:mb-16 leading-relaxed max-w-3xl mx-auto font-medium text-balance">
                            Мы создали единую экосистему из 4-х AI-агентов, которые не просто автоматизируют рутину, а принимают взвешенные решения, защищают деньги и ускоряют бизнес.
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                            {stats.map((stat, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 + i * 0.1 }}
                                    className="group p-6 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-100 hover:border-forte-primary/30 hover:shadow-2xl hover:shadow-forte-primary/10 transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="flex justify-center mb-4">
                                        <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                                            <stat.icon className="w-8 h-8 text-forte-primary" />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-forte-primary transition-colors">{stat.value}</div>
                                    <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-gray-400"
                >
                    <ChevronDown size={32} />
                </motion.div>
            </section>

            {/* Solutions Section */}
            <section className="py-16 md:py-32 px-4 md:px-6 bg-gray-50 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12 md:mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">Наши Решения</h2>
                        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                            Комплексный подход к автоматизации и безопасности
                        </p>
                    </div>

                    <div className="space-y-16">
                        {solutions.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.7, delay: index * 0.1 }}
                                className="group relative bg-white rounded-3xl md:rounded-[2.5rem] p-6 md:p-12 shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:shadow-forte-primary/5 transition-all duration-500"
                            >
                                {/* Decorative Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                                <div className={`absolute top-0 right-0 w-96 h-96 ${item.bg} rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 group-hover:scale-110 transition-transform duration-700`} />

                                <div className="relative z-10 grid md:grid-cols-12 gap-12">
                                    {/* Icon & Title */}
                                    <div className="md:col-span-4 flex flex-col justify-between h-full">
                                        <div>
                                            <div className={`w-24 h-24 ${item.bg} rounded-3xl flex items-center justify-center mb-8 shadow-inner group-hover:scale-105 transition-transform duration-500`}>
                                                <item.icon size={48} className={item.color} />
                                            </div>
                                            <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 group-hover:text-gray-900 transition-colors">{item.title}</h3>
                                            <p className={`text-base md:text-lg font-medium ${item.color} opacity-90`}>{item.subtitle}</p>
                                        </div>
                                        <div className="hidden md:block mt-12">
                                            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 text-sm font-bold uppercase tracking-wider shadow-sm">
                                                <BrainCircuit size={18} className="text-forte-primary" />
                                                <span>AI Powered Core</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="md:col-span-8 space-y-10">
                                        <div className="grid md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                    <Lock size={14} /> Проблема
                                                </p>
                                                <p className="text-gray-600 leading-relaxed text-lg">{item.problem}</p>
                                            </div>
                                            <div className="space-y-4">
                                                <p className="text-xs font-bold text-forte-primary uppercase tracking-wider flex items-center gap-2">
                                                    <Zap size={14} /> Наше Решение
                                                </p>
                                                <p className="text-gray-900 font-medium leading-relaxed text-lg">{item.solution}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <CheckCircle2 size={14} /> Уникальность (Secret Sauce)
                                            </p>
                                            <p className="text-gray-800 italic text-lg font-medium">"{item.uniqueness}"</p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Бизнес-эффект</p>
                                            <div className="grid sm:grid-cols-3 gap-4">
                                                {item.value.map((val, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-forte-primary/30 hover:shadow-md transition-all">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${item.bg.replace('bg-', 'bg-').replace('50', '500')}`} />
                                                        <span className="text-sm font-bold text-gray-700 leading-tight">{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About Me Section */}
            <section className="py-16 md:py-32 px-4 md:px-6 bg-white relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-gray-900 rounded-3xl md:rounded-[3rem] p-8 md:p-20 text-white relative overflow-hidden shadow-2xl">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-forte-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 animate-pulse-slow" />
                        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-forte-secondary/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

                        <div className="relative z-10 grid md:grid-cols-12 gap-16 items-center">
                            {/* Photo */}
                            <div className="md:col-span-5 text-center md:text-left">
                                <div className="relative inline-block group">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-forte-primary to-forte-secondary rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                                    <div className="w-48 h-48 md:w-96 md:h-96 rounded-full overflow-hidden border-4 md:border-8 border-white/10 shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
                                        <img
                                            src="/me.png"
                                            alt="Dias"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute bottom-8 right-4 bg-white text-gray-900 p-4 rounded-2xl shadow-xl rotate-6 z-20 group-hover:rotate-0 transition-transform duration-300">
                                        <Globe size={32} className="text-forte-primary" />
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="md:col-span-7 space-y-10">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-forte-secondary text-sm font-bold mb-6 border border-white/10 backdrop-blur-md">
                                        <User size={16} />
                                        Об Авторе
                                    </div>
                                    <h2 className="text-4xl md:text-6xl font-bold mb-4 md:mb-6 tracking-tight">Диас</h2>
                                    <p className="text-lg md:text-2xl text-gray-400 flex flex-col md:flex-row md:items-center gap-2 md:gap-3 font-light">
                                        Fullstack Developer <span className="hidden md:block w-1.5 h-1.5 rounded-full bg-gray-600" /> <span className="md:hidden">-</span> Костанай, Казахстан 🇰🇿
                                    </p>
                                </div>

                                <div className="space-y-8">
                                    <p className="text-xl text-gray-300 leading-relaxed max-w-2xl font-light">
                                        Основатель сертифицированного стартапа <span className="text-white font-medium">Veriffy.me</span> и эксперт в области <span className="text-white font-medium">KYC/AML</span>.
                                        <br /><br />
                                        Я глубоко понимаю специфику банковского комплаенса и важность регуляторных требований. Мой опыт позволяет внедрять Fintech-решения, которые не только технологичны, но и полностью соответствуют стандартам безопасности.
                                    </p>

                                    {/* Key Achievements / Expertise */}
                                    <div className="flex flex-wrap gap-3">
                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-300 flex items-center gap-2">
                                            <Shield size={16} className="text-forte-primary" />
                                            Compliance Expert
                                        </div>
                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-300 flex items-center gap-2">
                                            <Zap size={16} className="text-yellow-400" />
                                            Fintech Founder
                                        </div>
                                        <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-300 flex items-center gap-2">
                                            <BrainCircuit size={16} className="text-purple-400" />
                                            AI Architect
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6 mt-10">
                                    {/* Project 1 */}
                                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

                                        <div className="flex items-center justify-between mb-4 relative z-10">
                                            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                                                <Shield size={24} />
                                            </div>
                                            <a href="https://veriffy.me" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                                veriffy.me <ArrowRight size={12} />
                                            </a>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 relative z-10">KYC/AML Provider</h3>
                                        <p className="text-sm text-gray-400 mb-6 leading-relaxed relative z-10">
                                            Сертифицированное решение для автоматизации KYC/AML процедур. Успешный опыт интеграции в Fintech-компании и банки.
                                        </p>

                                        <div className="flex flex-col gap-2 relative z-10">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Сертификация</p>
                                            <div className="flex gap-2">
                                                <a href="/1.pdf" target="_blank" rel="noopener noreferrer" className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium hover:bg-forte-primary hover:border-forte-primary hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer group/cert">
                                                    <FileText size={14} className="text-gray-400 group-hover/cert:text-white transition-colors" />
                                                    <span>ISO 9001</span>
                                                </a>
                                                <a href="/2.pdf" target="_blank" rel="noopener noreferrer" className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium hover:bg-forte-primary hover:border-forte-primary hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer group/cert">
                                                    <FileText size={14} className="text-gray-400 group-hover/cert:text-white transition-colors" />
                                                    <span>ISO 31000</span>
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Project 2 */}
                                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

                                        <div className="flex items-center justify-between mb-4 relative z-10">
                                            <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                                                <Globe size={24} />
                                            </div>
                                            <span className="text-xs font-bold text-purple-400">MYES.GLOBAL</span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2 relative z-10">Real Estate Aggregator</h3>
                                        <p className="text-sm text-gray-400 leading-relaxed relative z-10">
                                            Международный агрегатор недвижимости (ЮАР, Таиланд). Сделки в пару кликов с юридическим сопровождением.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 md:py-20 px-4 md:px-6 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                            <Logo className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Forte.AI</h2>
                            <p className="text-gray-500 font-medium">Единая экосистема для банка</p>
                        </div>
                    </div>
                    <div className="md:text-right">
                        <p className="text-xl font-bold mb-2 text-gray-900">GREKdev Team</p>
                        <p className="text-gray-500">Разработано специально для Forte Bank Tech Challenge</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
