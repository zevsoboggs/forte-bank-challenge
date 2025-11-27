import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import axios from 'axios'
import prisma from '@/lib/prisma'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    // Get recent transactions for drift check
    const recentTransactions = await prisma.transaction.findMany({
      include: { customer: true },
      orderBy: { transDate: 'desc' },
      take: 100,
    })

    if (recentTransactions.length < 10) {
      return NextResponse.json({
        drift_detected: false,
        drift_score: 0,
        features_with_drift: [],
        recommendation: 'Недостаточно данных для проверки drift',
        checked_at: new Date().toISOString(),
      })
    }

    // Transform to ML format
    const transactions = recentTransactions.map((t) => ({
      amount: t.amount,
      hour: t.transDateTime.getHours(),
      day_of_week: t.transDateTime.getDay(),
      direction: t.direction,
      monthly_os_changes: t.customer?.monthlyOsChanges || 0,
      monthly_phone_model_changes: t.customer?.monthlyPhoneModelChanges || 0,
      logins_last_7_days: t.customer?.loginsLast7Days || 0,
      logins_last_30_days: t.customer?.loginsLast30Days || 0,
    }))

    const response = await axios.post(
      `${ML_SERVICE_URL}/drift/check`,
      transactions,
      { timeout: 10000 }
    )

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Drift check error:', error)

    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'ML-сервис недоступен' },
        { status: 503 }
      )
    }

    // If baseline not set, return default response
    if (error.response?.status === 400) {
      return NextResponse.json({
        drift_detected: false,
        drift_score: 0,
        features_with_drift: [],
        recommendation: 'Baseline не установлен. Запустите обучение модели.',
        checked_at: new Date().toISOString(),
      })
    }

    return NextResponse.json(
      { error: 'Ошибка при проверке drift' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Необходимы права администратора' },
        { status: 403 }
      )
    }

    // Get transactions for baseline
    const transactions = await prisma.transaction.findMany({
      include: { customer: true },
      orderBy: { transDate: 'desc' },
      take: 500,
    })

    if (transactions.length < 50) {
      return NextResponse.json(
        { error: 'Недостаточно данных для установки baseline (минимум 50)' },
        { status: 400 }
      )
    }

    // Transform to ML format
    const mlTransactions = transactions.map((t) => ({
      amount: t.amount,
      hour: t.transDateTime.getHours(),
      day_of_week: t.transDateTime.getDay(),
      direction: t.direction,
      monthly_os_changes: t.customer?.monthlyOsChanges || 0,
      monthly_phone_model_changes: t.customer?.monthlyPhoneModelChanges || 0,
      logins_last_7_days: t.customer?.loginsLast7Days || 0,
      logins_last_30_days: t.customer?.loginsLast30Days || 0,
    }))

    const response = await axios.post(
      `${ML_SERVICE_URL}/drift/set-baseline`,
      mlTransactions,
      { timeout: 10000 }
    )

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Set baseline error:', error)
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'ML-сервис недоступен' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Ошибка при установке baseline' },
      { status: 500 }
    )
  }
}
