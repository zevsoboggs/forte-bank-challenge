import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: transactionId } = await params

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        predictions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Транзакция не найдена' },
        { status: 404 }
      )
    }

    const prediction = transaction.predictions[0]

    // Формируем полный JSON ответ
    const detailedResponse = {
      transaction: {
        id: transaction.id,
        documentNumber: transaction.docNo,
        customerId: transaction.cstDimId.toString(),
        date: transaction.transDate,
        dateTime: transaction.transDateTime,
        amount: transaction.amount,
        direction: transaction.direction,
        isFraud: transaction.isFraud,
        createdAt: transaction.createdAt,
      },
      customer: transaction.customer
        ? {
            id: transaction.customer.cstDimId.toString(),
            lastPhoneModel: transaction.customer.lastPhoneModel,
            lastOs: transaction.customer.lastOs,
            monthlyOsChanges: transaction.customer.monthlyOsChanges,
            monthlyPhoneModelChanges:
              transaction.customer.monthlyPhoneModelChanges,
            loginActivity: {
              last7Days: transaction.customer.loginsLast7Days,
              last30Days: transaction.customer.loginsLast30Days,
              frequency7d: transaction.customer.loginFrequency7d,
              frequency30d: transaction.customer.loginFrequency30d,
              ratio7dTo30d: transaction.customer.logins7dOver30dRatio,
            },
            loginIntervals: {
              average30d: transaction.customer.avgLoginInterval30d,
              stdDev30d: transaction.customer.stdLoginInterval30d,
              variance30d: transaction.customer.varLoginInterval30d,
              ewm7d: transaction.customer.ewmLoginInterval7d,
              burstiness: transaction.customer.burstinessLoginInterval,
              fanoFactor: transaction.customer.fanoFactorLoginInterval,
              zScoreAvg7d: transaction.customer.zscoreAvgLoginInterval7d,
            },
          }
        : null,
      mlPrediction: prediction
        ? {
            id: prediction.id,
            fraudProbability: prediction.fraudProbability,
            fraudScore: prediction.fraudScore,
            riskLevel: prediction.riskLevel,
            shouldBlock: prediction.blocked,
            modelVersion: prediction.modelVersion,
            createdAt: prediction.createdAt,
            features: prediction.features,
            shapValues: prediction.shapValues,
          }
        : null,
      aiAnalysis: prediction
        ? {
            fingerprint: prediction.analysisFingerprint,
            fraudDetection: {
              analysis: prediction.aiAnalysis,
              recommendation: prediction.recommendation,
            },
            amlCheck: {
              analysis: prediction.amlAnalysis,
            },
            reviewStatus: {
              reviewed: !!prediction.reviewedBy,
              reviewedBy: prediction.reviewedBy,
              reviewedAt: prediction.reviewedAt,
            },
          }
        : null,
      metadata: {
        generatedAt: new Date().toISOString(),
        endpoint: '/api/transactions/[id]/json',
        version: '1.0.0',
      },
    }

    return NextResponse.json(detailedResponse, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    })
  } catch (error) {
    console.error('Transaction JSON fetch error:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении данных транзакции' },
      { status: 500 }
    )
  }
}
