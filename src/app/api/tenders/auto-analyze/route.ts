import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import OpenAI from 'openai'
import { updateAnalysisState, getAnalysisState } from '../auto-analyze-status/route'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

const INTERESTING_CRITERIA = {
    minAmount: 1000000,
    maxAmount: 500000000,
}

// Фоновая функция анализа
async function runBackgroundAnalysis(limit: number) {
    const stats = { analyzed: 0, interesting: 0, highRisk: 0, errors: 0 }
    const logs: string[] = []

    updateAnalysisState({
        running: true,
        stats,
        logs,
        progress: { current: 0, total: 0, message: 'Поиск тендеров...', currentTender: '' }
    })

    try {
        const tendersToAnalyze = await prisma.tender.findMany({
            where: {
                risks: { none: {} },
                amount: { gte: INTERESTING_CRITERIA.minAmount, lte: INTERESTING_CRITERIA.maxAmount }
            },
            take: limit,
            orderBy: { createdAt: 'desc' }
        })

        logs.push(`🚀 Найдено ${tendersToAnalyze.length} тендеров для анализа`)
        updateAnalysisState({
            progress: { current: 0, total: tendersToAnalyze.length, message: `Найдено ${tendersToAnalyze.length} тендеров`, currentTender: '' },
            logs: [...logs]
        })

        for (let i = 0; i < tendersToAnalyze.length; i++) {
            const tender = tendersToAnalyze[i]

            try {
                logs.push(`🔍 [${i + 1}/${tendersToAnalyze.length}] ${tender.title.substring(0, 60)}...`)
                updateAnalysisState({
                    progress: {
                        current: i + 1,
                        total: tendersToAnalyze.length,
                        message: `Анализ ${i + 1}/${tendersToAnalyze.length}`,
                        currentTender: tender.title
                    },
                    logs: logs.slice(-15)
                })

                const systemPrompt = 'Ты - AI-агент для анализа тендеров. Анализируешь риски, подбираешь поставщиков.'
                const userPrompt = `Анализ тендера:
- Название: ${tender.title}
- Заказчик: ${tender.customer || 'Н/Д'}
- Сумма: ${tender.amount} ₸
- Регион: ${tender.region || 'Н/Д'}

Верни JSON:
{
  "riskScore": "LOW|MEDIUM|HIGH|CRITICAL",
  "risks": [{ "level": "MEDIUM", "factor": "Название", "description": "Описание" }],
  "suppliers": [{ "name": "Компания", "bin": "БИН", "matchScore": 85, "reason": "Причина", "strengths": ["Плюс"] }],
  "recommendations": ["Рекомендация"]
}`

                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    model: 'gpt-4o-mini',
                    response_format: { type: 'json_object' },
                    temperature: 0.3,
                    max_tokens: 1500,
                })

                const analysis = JSON.parse(completion.choices[0].message.content || '{}')

                // Сохраняем риски
                const riskMap = { LOW: 1, MEDIUM: 5, HIGH: 8, CRITICAL: 10 }
                if (analysis.risks && Array.isArray(analysis.risks)) {
                    for (const risk of analysis.risks) {
                        await prisma.tenderRisk.create({
                            data: {
                                tenderId: tender.id,
                                riskLevel: risk.level || 'MEDIUM',
                                factors: { factor: risk.factor, description: risk.description },
                                score: riskMap[risk.level as keyof typeof riskMap] || 5,
                                aiAnalysis: risk.description
                            }
                        })
                    }
                }

                // Сохраняем поставщиков
                if (analysis.suppliers && Array.isArray(analysis.suppliers)) {
                    for (const supplier of analysis.suppliers) {
                        await prisma.tenderSupplier.create({
                            data: {
                                tenderId: tender.id,
                                name: supplier.name,
                                bin: supplier.bin || null,
                                matchScore: supplier.matchScore || 50,
                                reason: supplier.reason
                            }
                        })
                    }
                }

                stats.analyzed++

                const isHighRisk = analysis.riskScore === 'HIGH' || analysis.riskScore === 'CRITICAL'
                const hasGoodSuppliers = analysis.suppliers && analysis.suppliers.length >= 3

                if (isHighRisk) stats.highRisk++
                if (hasGoodSuppliers || tender.amount > 10000000) stats.interesting++

                const emoji = isHighRisk ? '🔴' : '🟢'
                logs.push(`${emoji} ${tender.lotId}: ${analysis.riskScore}`)

                updateAnalysisState({ stats, logs: logs.slice(-15) })

            } catch (error) {
                console.error(`Error analyzing ${tender.lotId}:`, error)
                stats.errors++
                logs.push(`❌ Ошибка: ${tender.lotId}`)
                updateAnalysisState({ stats, logs: logs.slice(-15) })
            }
        }

        logs.push(`🎉 Завершено! Проанализировано: ${stats.analyzed}, Интересных: ${stats.interesting}, Рисков: ${stats.highRisk}`)
        updateAnalysisState({
            running: false,
            stats,
            logs: logs.slice(-15),
            progress: {
                current: stats.analyzed,
                total: tendersToAnalyze.length,
                message: 'Анализ завершен',
                currentTender: ''
            }
        })

    } catch (error) {
        console.error('Background analysis error:', error)
        logs.push(`❌ Критическая ошибка: ${(error as Error).message}`)
        updateAnalysisState({
            running: false,
            logs: logs.slice(-15)
        })
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const state = getAnalysisState()
        if (state.running) {
            return NextResponse.json({
                success: false,
                message: 'Анализ уже запущен'
            }, { status: 400 })
        }

        const { limit = 20 } = await request.json()

        // Запускаем анализ в фоне (не ждем завершения)
        runBackgroundAnalysis(limit).catch(console.error)

        return NextResponse.json({
            success: true,
            message: 'Анализ запущен в фоновом режиме'
        })

    } catch (error: any) {
        console.error('Start analysis error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to start analysis' },
            { status: 500 }
        )
    }
}
