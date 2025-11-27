import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import axios from 'axios'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000'

interface AnalysisResult {
  transactionId: string
  success: boolean
  error?: string
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const apiKey = request.headers.get('x-api-key')
    const testApiKey = process.env.TEST_API_KEY || 'test-forte-key-123'

    if (!session && apiKey !== testApiKey) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { limit = 100, onlyWithoutPredictions = true } = body

    // Получаем транзакции для анализа
    const whereClause: any = {}

    if (onlyWithoutPredictions) {
      whereClause.predictions = {
        none: {},
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        customer: true,
      },
      take: limit,
      orderBy: {
        transDate: 'desc',
      },
    })

    console.log(`[BATCH] Starting analysis of ${transactions.length} transactions`)

    const results: AnalysisResult[] = []
    let successCount = 0
    let errorCount = 0

    // Обрабатываем транзакции пакетами
    for (const transaction of transactions) {
      try {
        if (!transaction.customer) {
          results.push({
            transactionId: transaction.id,
            success: false,
            error: 'Нет данных клиента',
          })
          errorCount++
          continue
        }

        // Подготавливаем признаки для ML модели
        const features = {
          amount: transaction.amount,
          hour: transaction.transDateTime.getHours(),
          day_of_week: transaction.transDateTime.getDay(),
          direction: transaction.direction,
          monthly_os_changes: transaction.customer.monthlyOsChanges,
          monthly_phone_model_changes:
            transaction.customer.monthlyPhoneModelChanges,
          last_phone_model: transaction.customer.lastPhoneModel,
          last_os: transaction.customer.lastOs,
          logins_last_7_days: transaction.customer.loginsLast7Days,
          logins_last_30_days: transaction.customer.loginsLast30Days,
          login_frequency_7d: transaction.customer.loginFrequency7d,
          login_frequency_30d: transaction.customer.loginFrequency30d,
          freq_change_7d_vs_mean: transaction.customer.freqChange7dVsMean,
          logins_7d_over_30d_ratio: transaction.customer.logins7dOver30dRatio,
          avg_login_interval_30d: transaction.customer.avgLoginInterval30d,
          std_login_interval_30d: transaction.customer.stdLoginInterval30d,
          var_login_interval_30d: transaction.customer.varLoginInterval30d,
          ewm_login_interval_7d: transaction.customer.ewmLoginInterval7d,
          burstiness_login_interval: transaction.customer.burstinessLoginInterval,
          fano_factor_login_interval:
            transaction.customer.fanoFactorLoginInterval,
          zscore_avg_login_interval_7d:
            transaction.customer.zscoreAvgLoginInterval7d,
        }

        // Вызываем ML сервис
        let mlResponse
        try {
          mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, features, {
            timeout: 30000,
          })
        } catch (error: any) {
          if (error.code === 'ECONNREFUSED') {
            return NextResponse.json(
              {
                error:
                  'ML-сервис недоступен. Запустите: python ml-service/serve.py',
              },
              { status: 503 }
            )
          }
          throw error
        }

        const prediction = mlResponse.data

        // Определяем risk level
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
        if (prediction.fraud_score >= 80) riskLevel = 'CRITICAL'
        else if (prediction.fraud_score >= 60) riskLevel = 'HIGH'
        else if (prediction.fraud_score >= 40) riskLevel = 'MEDIUM'
        else riskLevel = 'LOW'

        // Ищем существующее предсказание
        const existingPrediction = await prisma.fraudPrediction.findFirst({
          where: { transactionId: transaction.id },
        })

        const predictionData = {
          fraudProbability: prediction.fraud_probability,
          fraudScore: prediction.fraud_score,
          riskLevel: riskLevel,
          modelVersion: prediction.model_version,
          features: prediction.features || {},
          shapValues: prediction.shap_values || null,
          aiAnalysis: prediction.ai_analysis || null,
          amlAnalysis: prediction.aml_analysis || null,
          recommendation: prediction.recommendation || null,
          analysisFingerprint: prediction.analysis_fingerprint || null,
        }

        if (existingPrediction) {
          await prisma.fraudPrediction.update({
            where: { id: existingPrediction.id },
            data: predictionData,
          })
        } else {
          await prisma.fraudPrediction.create({
            data: {
              transactionId: transaction.id,
              ...predictionData,
            },
          })
        }

        results.push({
          transactionId: transaction.id,
          success: true,
        })
        successCount++

        // Задержка между запросами к OpenAI (500ms)
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (err: any) {
        console.error(
          `[BATCH] Error analyzing transaction ${transaction.id}:`,
          err.message
        )
        results.push({
          transactionId: transaction.id,
          success: false,
          error: err.message,
        })
        errorCount++
      }
    }

    console.log(
      `[BATCH] Completed: ${successCount} success, ${errorCount} errors`
    )

    return NextResponse.json({
      success: true,
      total: transactions.length,
      successCount,
      errorCount,
      results,
      message: `Проанализировано ${successCount} из ${transactions.length} транзакций`,
    })
  } catch (error: any) {
    console.error('Batch analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при массовом анализе' },
      { status: 500 }
    )
  }
}
