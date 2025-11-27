import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Статистика по рискам
    const riskStats = await prisma.fraudPrediction.groupBy({
      by: ['riskLevel'],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    })

    // Заблокированные транзакции
    const blockedCount = await prisma.fraudPrediction.count({
      where: {
        blocked: true,
        createdAt: {
          gte: startDate,
        },
      },
    })

    // Топ факторы риска (агрегация)
    const predictions = await prisma.fraudPrediction.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        riskLevel: {
          in: ['HIGH', 'CRITICAL'],
        },
      },
      select: {
        shapValues: true,
      },
      take: 100,
    })

    // Временная статистика
    const dailyStats = await prisma.fraudPrediction.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
        riskLevel: true,
        fraudProbability: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Группировка по дням
    const dailyGrouped = dailyStats.reduce((acc: any, pred) => {
      const date = pred.createdAt.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          total: 0,
          high: 0,
          medium: 0,
          low: 0,
          avgProbability: 0,
        }
      }
      acc[date].total++
      if (pred.riskLevel === 'HIGH' || pred.riskLevel === 'CRITICAL') {
        acc[date].high++
      } else if (pred.riskLevel === 'MEDIUM') {
        acc[date].medium++
      } else {
        acc[date].low++
      }
      acc[date].avgProbability += pred.fraudProbability
      return acc
    }, {})

    // Вычисление средних вероятностей
    Object.values(dailyGrouped).forEach((day: any) => {
      day.avgProbability = day.avgProbability / day.total
    })

    return NextResponse.json({
      riskStats: riskStats.map((stat) => ({
        level: stat.riskLevel,
        count: stat._count,
      })),
      blockedCount,
      totalPredictions: dailyStats.length,
      dailyStats: Object.values(dailyGrouped),
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении аналитики' },
      { status: 500 }
    )
  }
}
