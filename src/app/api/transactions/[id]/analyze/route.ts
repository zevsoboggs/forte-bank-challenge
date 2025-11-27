import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import axios from 'axios'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Проверка авторизации: либо сессия, либо API ключ для тестирования
    const session = await getServerSession(authOptions)
    const apiKey = request.headers.get('x-api-key')
    const testApiKey = process.env.TEST_API_KEY || 'test-forte-key-123'

    if (!session && apiKey !== testApiKey) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const { id: transactionId } = await params

    // Получаем транзакцию с данными клиента
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Транзакция не найдена' },
        { status: 404 }
      )
    }

    if (!transaction.customer) {
      return NextResponse.json(
        { error: 'Данные клиента не найдены для этой транзакции' },
        { status: 404 }
      )
    }

    // Подготавливаем признаки для ML модели
    const features = {
      amount: transaction.amount,
      hour: transaction.transDateTime.getHours(),
      day_of_week: transaction.transDateTime.getDay(),
      direction: transaction.direction,
      monthly_os_changes: transaction.customer.monthlyOsChanges,
      monthly_phone_model_changes: transaction.customer.monthlyPhoneModelChanges,
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
      fano_factor_login_interval: transaction.customer.fanoFactorLoginInterval,
      zscore_avg_login_interval_7d: transaction.customer.zscoreAvgLoginInterval7d,
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

    // Ищем существующее предсказание для этой транзакции
    const existingPrediction = await prisma.fraudPrediction.findFirst({
      where: { transactionId: transactionId },
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

    let fraudPrediction
    if (existingPrediction) {
      // Обновляем существующее
      fraudPrediction = await prisma.fraudPrediction.update({
        where: { id: existingPrediction.id },
        data: predictionData,
      })
    } else {
      // Создаем новое
      fraudPrediction = await prisma.fraudPrediction.create({
        data: {
          transactionId: transactionId,
          ...predictionData,
        },
      })
    }

    return NextResponse.json({
      success: true,
      prediction: fraudPrediction,
      message: 'Анализ транзакции завершен с помощью OpenAI',
    })
  } catch (error: any) {
    console.error('Transaction analysis error:', error)
    return NextResponse.json(
      { error: error.message || 'Ошибка при анализе транзакции' },
      { status: 500 }
    )
  }
}
