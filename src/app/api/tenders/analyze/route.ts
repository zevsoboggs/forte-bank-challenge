import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        const apiKey = request.headers.get('x-api-key')
        const testApiKey = process.env.TEST_API_KEY || 'test-forte-key-123'

        if (!session && apiKey !== testApiKey) {
            return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
        }

        const body = await request.json()
        const { tenderId, tenderData, analysisType = 'full', saveToDB = true } = body

        // Получаем данные тендера либо из БД либо из запроса
        let tender: any

        if (tenderId) {
            tender = await prisma.tender.findUnique({
                where: { id: tenderId }
            })

            if (!tender) {
                return NextResponse.json({ error: 'Тендер не найден' }, { status: 404 })
            }
        } else if (tenderData) {
            // Используем данные из запроса (для быстрого анализа без сохранения)
            tender = tenderData
        } else {
            return NextResponse.json({ error: 'Необходим tenderId или tenderData' }, { status: 400 })
        }

        // Формируем детальный промпт в зависимости от типа анализа
        let systemPrompt = ''
        let userPrompt = ''

        switch (analysisType) {
            case 'risk':
                systemPrompt = 'Ты - эксперт по анализу тендеров и закупок. Специализируешься на выявлении рисков, аффилированности, подозрительных паттернов.'
                userPrompt = `Проанализируй тендер на риски:

**Тендер:**
- Название: ${tender.title || 'Н/Д'}
- Заказчик: ${tender.customer || 'Н/Д'}
- Стоимость: ${tender.amount || 0} ${tender.currency || '₸'}
- Регион: ${tender.region || 'Н/Д'}

Верни JSON:
{
  "riskScore": "LOW|MEDIUM|HIGH|CRITICAL",
  "risks": [
    { "level": "CRITICAL", "factor": "Название риска", "description": "Описание" }
  ],
  "affiliationWarnings": ["Признак 1", "Признак 2"],
  "priceAnalysis": "Анализ цены относительно рынка",
  "recommendations": ["Рекомендация 1"]
}`
                break

            case 'supplier':
                systemPrompt = 'Ты - эксперт по подбору поставщиков для госзакупок в Казахстане. Знаешь крупнейшие компании и их специализацию.'
                userPrompt = `Подбери 5 релевантных поставщиков:

**Тендер:**
- Предмет: ${tender.title || 'Н/Д'}
- Бюджет: ${tender.amount || 0} ₸
- Регион: ${tender.region || 'Н/Д'}

Верни JSON:
{
  "suppliers": [
    { "name": "Компания", "bin": "123456789012 или null", "matchScore": 95, "reason": "Почему подходит", "strengths": ["Преимущество 1"] }
  ]
}`
                break

            case 'compliance':
                systemPrompt = 'Ты - специалист по комплаенсу в госзакупках РК. Проверяешь соответствие законодательству.'
                userPrompt = `Проверь соответствие тендера законодательству:

**Тендер:**
${JSON.stringify(tender, null, 2)}

Верни JSON с найденными нарушениями или подтверждением соответствия.`
                break

            default:  // 'full'
                systemPrompt = 'Ты - AI-агент для комплексного анализа тендеров. Анализируешь риски, подбираешь поставщиков, проверяешь compliance.'
                userPrompt = `Проведи полный анализ тендера:

**Данные:**
- Название: ${tender.title || 'Н/Д'}
- Заказчик: ${tender.customer || 'Н/Д'}
- Сумма: ${tender.amount || 0} ${tender.currency || '₸'}
- Регион: ${tender.region || 'Н/Д'}
- Статус: ${tender.status || 'Н/Д'}

Верни JSON:
{
  "summary": "Краткая сводка",
  "riskScore": "LOW|MEDIUM|HIGH|CRITICAL",
  "risks": [
    { "level": "HIGH", "factor": "Фактор риска", "description": "Детали" }
  ],
  "suppliers": [
    { "name": "Компания", "bin": "БИН", "matchScore": 90, "reason": "Причина", "strengths": ["Плюс 1", "Плюс 2"] }
  ],
  "affiliationWarnings": ["Предупреждение об аффилированности"],
  "complianceIssues": ["Несоответствия законодательству"],
  "recommendations": ["Рекомендация 1", "Рекомендация 2"]
}`
        }

        const prompt = userPrompt

        let analysisResult

        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                model: 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                temperature: 0.3,
                max_tokens: 2000,
            })

            analysisResult = JSON.parse(completion.choices[0].message.content || '{}')
        } catch (openaiError) {
            console.error('OpenAI Error:', openaiError)
            return NextResponse.json({
                error: 'Ошибка OpenAI API',
                details: (openaiError as any).message
            }, { status: 500 })
        }

        // Сохранение в БД (опционально)
        if (saveToDB && tenderId) {
            // Save Risks
            await prisma.tenderRisk.deleteMany({ where: { tenderId } })

            const riskMap = { LOW: 1, MEDIUM: 5, HIGH: 8, CRITICAL: 10 }

            if (analysisResult.risks) {
                for (const risk of analysisResult.risks) {
                    await prisma.tenderRisk.create({
                        data: {
                            tenderId,
                            riskLevel: risk.level,
                            factors: { factor: risk.factor, description: risk.description },
                            score: riskMap[risk.level as keyof typeof riskMap] || 5,
                            aiAnalysis: risk.description
                        }
                    })
                }
            }

            // Save Suppliers
            if (analysisResult.suppliers) {
                await prisma.tenderSupplier.deleteMany({ where: { tenderId } })

                for (const supplier of analysisResult.suppliers) {
                    await prisma.tenderSupplier.create({
                        data: {
                            tenderId,
                            name: supplier.name,
                            bin: supplier.bin || null,
                            matchScore: supplier.matchScore,
                            reason: supplier.reason
                        }
                    })
                }
            }
        }

        return NextResponse.json({
            success: true,
            analysisType,
            tender: {
                title: tender.title,
                lot: tender.lot,
                amount: tender.amount
            },
            analysis: analysisResult,
            savedToDB: saveToDB && Boolean(tenderId),
            model: 'gpt-4o-mini',
            analyzedAt: new Date().toISOString()
        })

    } catch (error: any) {
        console.error('Analysis error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to analyze tender' },
            { status: 500 }
        )
    }
}
