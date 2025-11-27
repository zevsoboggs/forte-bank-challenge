import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import axios from 'axios'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000'

/**
 * @swagger
 * /api/ml/threshold:
 *   get:
 *     summary: Get Fraud Threshold
 *     description: Returns current fraud detection threshold value
 *     tags:
 *       - ML Service
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Current threshold
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 threshold:
 *                   type: number
 *                   example: 0.5
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Update Fraud Threshold
 *     description: Update the fraud detection threshold (Admin only)
 *     tags:
 *       - ML Service
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               threshold:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 example: 0.5
 *     responses:
 *       200:
 *         description: Threshold updated
 *       400:
 *         description: Invalid threshold value
 *       403:
 *         description: Admin access required
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    const response = await axios.get(`${ML_SERVICE_URL}/threshold`, {
      timeout: 5000,
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Get threshold error:', error)
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'ML-сервис недоступен' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Ошибка при получении порога' },
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

    const body = await request.json()
    const { threshold } = body

    if (threshold === undefined || threshold < 0 || threshold > 1) {
      return NextResponse.json(
        { error: 'Порог должен быть числом от 0 до 1' },
        { status: 400 }
      )
    }

    const response = await axios.post(
      `${ML_SERVICE_URL}/threshold`,
      { threshold },
      { timeout: 5000 }
    )

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Update threshold error:', error)
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'ML-сервис недоступен' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Ошибка при обновлении порога' },
      { status: 500 }
    )
  }
}
