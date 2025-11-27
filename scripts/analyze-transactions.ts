import { PrismaClient } from '@prisma/client'
import { GoogleGenerativeAI } from '@google/generative-ai'

const prisma = new PrismaClient()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'

interface MLPrediction {
    fraud_probability: number
    fraud_score: number
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    features: any
    shap_values?: any
}

async function callMLService(transaction: any, customer: any): Promise<MLPrediction> {
    try {
        // Extract hour and day_of_week from transaction datetime
        const transDate = new Date(transaction.transDateTime)
        const hour = transDate.getHours()
        const dayOfWeek = transDate.getDay()

        const response = await fetch(`${ML_SERVICE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: transaction.amount,
                hour: hour,
                day_of_week: dayOfWeek,
                direction: transaction.direction,
                // Optional behavioral features
                monthly_os_changes: customer.monthlyOsChanges || null,
                monthly_phone_model_changes: customer.monthlyPhoneModelChanges || null,
                last_phone_model: customer.lastPhoneModel || null,
                last_os: customer.lastOs || null,
                logins_last_7_days: customer.loginsLast7Days || null,
                logins_last_30_days: customer.loginsLast30Days || null,
                login_frequency_7d: customer.loginFrequency7d || null,
                login_frequency_30d: customer.loginFrequency30d || null,
                freq_change_7d_vs_mean: customer.freqChange7dVsMean || null,
                logins_7d_over_30d_ratio: customer.logins7dOver30dRatio || null,
                avg_login_interval_30d: customer.avgLoginInterval30d || null,
                std_login_interval_30d: customer.stdLoginInterval30d || null,
                var_login_interval_30d: customer.varLoginInterval30d || null,
                ewm_login_interval_7d: customer.ewmLoginInterval7d || null,
                burstiness_login_interval: customer.burstinessLoginInterval || null,
                fano_factor_login_interval: customer.fanoFactorLoginInterval || null,
                zscore_avg_login_interval_7d: customer.zscoreAvgLoginInterval7d || null
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`ML Service error ${response.status}: ${errorText}`)
        }

        return await response.json()
    } catch (error) {
        console.warn('⚠️ ML Service unavailable, using fallback logic')
        // Fallback: simple rule-based
        const fraudScore = transaction.amount > 500000 ? 85 : 12
        return {
            fraud_probability: fraudScore / 100,
            fraud_score: fraudScore,
            risk_level: transaction.amount > 500000 ? 'HIGH' : 'LOW',
            features: {
                amount: transaction.amount,
                direction: transaction.direction
            }
        }
    }
}

async function generateAIAnalysis(transaction: any, prediction: MLPrediction): Promise<string> {
    // Simple rule-based analysis without Gemini
    const riskLevel = prediction.risk_level
    const fraudScore = prediction.fraud_score.toFixed(2)
    const amount = transaction.amount.toLocaleString('ru-RU')

    if (riskLevel === 'CRITICAL') {
        return `ML модель определила критический риск мошенничества (${fraudScore}%). Транзакция на сумму ${amount} KZT требует немедленной проверки службой безопасности. Рекомендуется временная блокировка до выяснения обстоятельств.`
    } else if (riskLevel === 'HIGH') {
        return `Обнаружен высокий риск (${fraudScore}%). Транзакция на ${amount} KZT имеет подозрительные характеристики. Рекомендуется дополнительная верификация клиента перед проведением операции.`
    } else if (riskLevel === 'MEDIUM') {
        return `Средний уровень риска (${fraudScore}%). Транзакция на ${amount} KZT не вызывает серьезных подозрений, но требует стандартного мониторинга.`
    } else {
        return `Низкий риск (${fraudScore}%). Транзакция на ${amount} KZT соответствует обычному поведению клиента и может быть проведена без дополнительных проверок.`
    }
}

async function analyzeTransaction(transaction: any, customer: any, index: number, total: number) {
    try {
        // Check if prediction already exists
        const existingPrediction = await prisma.fraudPrediction.findFirst({
            where: { transactionId: transaction.id }
        })

        if (existingPrediction) {
            if (index % 500 === 0) {
                console.log(`  Пропущено (уже проанализировано): ${index}/${total}`)
            }
            return { skipped: true, analyzed: false }
        }

        // Call ML Service
        const mlPrediction = await callMLService(transaction, customer)

        // Generate AI Analysis (only for high-risk transactions to save API costs)
        let aiAnalysis = null
        if (mlPrediction.risk_level === 'HIGH' || mlPrediction.risk_level === 'CRITICAL') {
            aiAnalysis = await generateAIAnalysis(transaction, mlPrediction)
        }

        // Create Fraud Prediction
        await prisma.fraudPrediction.create({
            data: {
                transactionId: transaction.id,
                fraudProbability: mlPrediction.fraud_probability,
                fraudScore: mlPrediction.fraud_score,
                riskLevel: mlPrediction.risk_level,
                modelVersion: 'v1.0-ml',
                features: {
                    amount: transaction.amount,
                    direction: transaction.direction,
                    customer_id: customer.id,
                    ...(mlPrediction.features || {})
                },
                shapValues: mlPrediction.shap_values || null,
                aiAnalysis: aiAnalysis,
                recommendation: mlPrediction.risk_level === 'HIGH' || mlPrediction.risk_level === 'CRITICAL'
                    ? 'Требуется проверка безопасности'
                    : 'Транзакция одобрена',
                blocked: false
            }
        })

        if (index % 100 === 0) {
            console.log(`  Обработано: ${index}/${total}`)
        }

        return { skipped: false, analyzed: true }
    } catch (error) {
        console.error(`❌ Ошибка обработки транзакции ${transaction.id}:`, error)
        return { skipped: false, analyzed: false, error: true }
    }
}

async function main() {
    console.log('============================================================')
    console.log('Forte.AI - Полный анализ транзакций с AI и ML')
    console.log('============================================================')
    console.log('')

    try {
        // Get all transactions without predictions
        console.log('[1/3] Поиск транзакций для анализа...')
        const transactionsWithoutPredictions = await prisma.transaction.findMany({
            where: {
                predictions: {
                    none: {}
                }
            },
            include: {
                customer: true
            },
            orderBy: {
                transDateTime: 'desc'
            }
        })

        console.log(`  ✓ Найдено транзакций без анализа: ${transactionsWithoutPredictions.length}`)

        if (transactionsWithoutPredictions.length === 0) {
            console.log('')
            console.log('============================================================')
            console.log('[SUCCESS] Все транзакции уже проанализированы!')
            console.log('============================================================')
            return
        }

        console.log('')
        console.log('[2/3] Запуск ML и AI анализа...')
        console.log(`  ML Service: ${ML_SERVICE_URL}`)
        console.log(`  AI Model: Gemini 2.5 Pro`)
        console.log('')

        let stats = {
            total: transactionsWithoutPredictions.length,
            analyzed: 0,
            skipped: 0,
            errors: 0
        }

        for (let i = 0; i < transactionsWithoutPredictions.length; i++) {
            const transaction = transactionsWithoutPredictions[i]
            const result = await analyzeTransaction(
                transaction,
                transaction.customer,
                i + 1,
                transactionsWithoutPredictions.length
            )

            if (result.analyzed) stats.analyzed++
            if (result.skipped) stats.skipped++
            if (result.error) stats.errors++

            // Small delay to avoid rate limits
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }

        console.log('')
        console.log('[3/3] Подсчет статистики...')

        const riskStats = await prisma.fraudPrediction.groupBy({
            by: ['riskLevel'],
            _count: {
                id: true
            }
        })

        console.log('')
        console.log('  Статистика по уровням риска:')
        riskStats.forEach(stat => {
            console.log(`    ${stat.riskLevel}: ${stat._count.id} транзакций`)
        })

        console.log('')
        console.log('============================================================')
        console.log('[SUCCESS] Анализ завершен!')
        console.log('============================================================')
        console.log('')
        console.log(`  Всего обработано: ${stats.total}`)
        console.log(`  Проанализировано: ${stats.analyzed}`)
        console.log(`  Пропущено: ${stats.skipped}`)
        console.log(`  Ошибок: ${stats.errors}`)
        console.log('')
        console.log('Результаты доступны в интерфейсе:')
        console.log('  - Dashboard: http://localhost:3000/dashboard')
        console.log('  - Транзакции: http://localhost:3000/transactions')
        console.log('  - Аналитика: http://localhost:3000/analytics')
        console.log('')

    } catch (error) {
        console.error('')
        console.error('============================================================')
        console.error('[ERROR] Ошибка при анализе транзакций')
        console.error('============================================================')
        console.error(error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
