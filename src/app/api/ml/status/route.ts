import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import axios from 'axios'
import { readFile } from 'fs/promises'
import path from 'path'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000'

/**
 * @swagger
 * /api/ml/status:
 *   get:
 *     summary: Get ML Service Status
 *     description: Returns the current status of ML service and model information
 *     tags:
 *       - ML Service
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: ML service status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mlService:
 *                   type: object
 *                   properties:
 *                     online:
 *                       type: boolean
 *                     version:
 *                       type: string
 *                     modelLoaded:
 *                       type: boolean
 *                 model:
 *                   type: object
 *       401:
 *         description: Unauthorized
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

    // Проверяем ML-сервис
    let mlServiceStatus = {
      online: false,
      version: null,
      modelLoaded: false,
    }

    try {
      const response = await axios.get(`${ML_SERVICE_URL}/health`, {
        timeout: 3000,
      })
      mlServiceStatus = {
        online: true,
        version: response.data.model_version,
        modelLoaded: response.data.model_loaded,
      }
    } catch (error) {
      // ML service недоступен
    }

    // Читаем метаданные модели
    let modelMetadata = null
    try {
      const metadataPath = path.join(
        process.cwd(),
        'ml-service',
        'models',
        'metadata.json'
      )
      const metadataContent = await readFile(metadataPath, 'utf-8')
      modelMetadata = JSON.parse(metadataContent)
    } catch (error) {
      // Модель не обучена
    }

    return NextResponse.json({
      mlService: mlServiceStatus,
      model: modelMetadata,
    })
  } catch (error: any) {
    console.error('ML Status error:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении статуса' },
      { status: 500 }
    )
  }
}
