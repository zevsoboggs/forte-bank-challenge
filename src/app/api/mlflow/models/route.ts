import { NextResponse } from 'next/server'

const MLFLOW_URL = process.env.MLFLOW_TRACKING_URI || 'https://forte.grekdev.com:5000'

/**
 * @swagger
 * /api/mlflow/models:
 *   get:
 *     summary: List Registered Models
 *     description: Get list of all registered models in MLflow Model Registry
 *     tags:
 *       - MLflow
 *     responses:
 *       200:
 *         description: List of registered models
 *       500:
 *         description: MLflow connection error
 */
export async function GET() {
  try {
    // Try the list endpoint first (GET), then search endpoint (POST) as fallback
    let response = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/registered-models/list?max_results=100`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    // If GET doesn't work, try POST search
    if (response.status === 405) {
      response = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/registered-models/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_results: 100 }),
      })
    }

    if (!response.ok) {
      // Model Registry might not be available or return error
      const errorText = await response.text().catch(() => '')
      console.log('MLflow models response:', response.status, errorText)

      // Return empty list instead of error for common cases
      if (response.status === 404 || response.status === 500 || response.status === 405) {
        return NextResponse.json({
          models: [],
          count: 0,
          message: 'Model Registry not available or no models registered yet.',
        })
      }
      throw new Error(`MLflow responded with ${response.status}`)
    }

    const data = await response.json()

    // Format models
    const models = (data.registered_models || []).map((model: any) => ({
      name: model.name,
      creation_timestamp: model.creation_timestamp,
      last_updated_timestamp: model.last_updated_timestamp,
      description: model.description,
      latest_versions: model.latest_versions?.map((v: any) => ({
        version: v.version,
        status: v.status,
        stage: v.current_stage,
        run_id: v.run_id,
        created_at: v.creation_timestamp,
      })) || [],
      tags: model.tags?.reduce((acc: any, t: any) => {
        acc[t.key] = t.value
        return acc
      }, {}) || {},
    }))

    return NextResponse.json({
      models,
      count: models.length,
    })
  } catch (error) {
    console.error('MLflow models error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MLflow models', details: String(error) },
      { status: 500 }
    )
  }
}
