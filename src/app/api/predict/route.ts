import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import axios from 'axios'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000'

export async function POST(request: Request) {
  try {
    // Проверка аутентификации
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { transactionId, features } = body

    if (!features) {
      return NextResponse.json(
        { error: 'Признаки транзакции обязательны' },
        { status: 400 }
      )
    }

    // Вызов ML сервиса
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, features, {
      timeout: 10000,
    })

    const prediction = mlResponse.data

    // Сохранение предсказания в БД
    if (transactionId) {
      const savedPrediction = await prisma.fraudPrediction.create({
        data: {
          transactionId,
          fraudProbability: prediction.fraud_probability,
          fraudScore: prediction.fraud_score,
          riskLevel: prediction.risk_level,
          modelVersion: prediction.model_version,
          features: features,
          shapValues: prediction.shap_values || {},
          aiAnalysis: prediction.ai_analysis,
          recommendation: prediction.recommendation,
          blocked: prediction.should_block,
        },
      })

      return NextResponse.json({
        ...prediction,
        predictionId: savedPrediction.id,
      })
    }

    return NextResponse.json(prediction)
  } catch (error: any) {
    console.error('Prediction error:', error)

    if (error.response) {
      return NextResponse.json(
        { error: `ML Service error: ${error.response.data.detail || error.message}` },
        { status: error.response.status }
      )
    }

    return NextResponse.json(
      { error: 'Ошибка при получении предсказания' },
      { status: 500 }
    )
  }
}
