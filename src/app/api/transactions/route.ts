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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const riskLevel = searchParams.get('riskLevel')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    // Фильтры
    const where: any = {}

    if (riskLevel) {
      where.predictions = {
        some: {
          riskLevel,
        },
      }
    }

    if (startDate || endDate) {
      where.transDate = {}
      if (startDate) where.transDate.gte = new Date(startDate)
      if (endDate) where.transDate.lte = new Date(endDate)
    }

    // Получение транзакций с предсказаниями
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          customer: {
            select: {
              cstDimId: true,
              lastPhoneModel: true,
              lastOs: true,
            },
          },
          predictions: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          transDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    // Конвертируем BigInt в строки для JSON serialization
    const serializedTransactions = transactions.map(tx => ({
      ...tx,
      cstDimId: tx.cstDimId.toString(),
      customer: tx.customer ? {
        ...tx.customer,
        cstDimId: tx.customer.cstDimId.toString(),
      } : null,
    }))

    return NextResponse.json({
      transactions: serializedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Transactions fetch error:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении транзакций' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const transaction = await prisma.transaction.create({
      data: body,
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Transaction creation error:', error)
    return NextResponse.json(
      { error: 'Ошибка при создании транзакции' },
      { status: 500 }
    )
  }
}
