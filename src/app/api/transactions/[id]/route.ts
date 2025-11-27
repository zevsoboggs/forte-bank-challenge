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
    if (!session) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const { id: transactionId } = await params

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
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
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Транзакция не найдена' },
        { status: 404 }
      )
    }

    // Конвертируем BigInt в строки для JSON serialization
    const serializedTransaction = {
      ...transaction,
      cstDimId: transaction.cstDimId.toString(),
      customer: transaction.customer
        ? {
            ...transaction.customer,
            cstDimId: transaction.customer.cstDimId.toString(),
          }
        : null,
    }

    return NextResponse.json(serializedTransaction)
  } catch (error) {
    console.error('Transaction fetch error:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении транзакции' },
      { status: 500 }
    )
  }
}
