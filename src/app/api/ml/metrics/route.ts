import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import axios from 'axios'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000'

/**
 * @swagger
 * /api/ml/metrics:
 *   get:
 *     summary: Get Model Metrics
 *     description: Returns ML model performance metrics (ROC-AUC, F1, Precision, Recall)
 *     tags:
 *       - ML Service
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Model metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roc_auc:
 *                   type: number
 *                 f1_score:
 *                   type: number
 *                 precision:
 *                   type: number
 *                 recall:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: ML service unavailable
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

    const response = await axios.get(`${ML_SERVICE_URL}/model-info`, {
      timeout: 5000,
    })

    return NextResponse.json(response.data)
  } catch (error: any) {
    console.error('Get metrics error:', error)
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'ML-сервис недоступен' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Ошибка при получении метрик' },
      { status: 500 }
    )
  }
}
