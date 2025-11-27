import { NextResponse } from 'next/server'

const MLFLOW_URL = process.env.MLFLOW_TRACKING_URI || 'https://forte.grekdev.com:5000'

/**
 * @swagger
 * /api/mlflow/experiments:
 *   get:
 *     summary: List MLflow Experiments
 *     description: Get list of all MLflow experiments
 *     tags:
 *       - MLflow
 *     responses:
 *       200:
 *         description: List of experiments
 *       500:
 *         description: MLflow connection error
 */
export async function GET() {
  try {
    const response = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/experiments/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_results: 100 }),
    })

    if (!response.ok) {
      throw new Error(`MLflow responded with ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      experiments: data.experiments || [],
      count: data.experiments?.length || 0,
    })
  } catch (error) {
    console.error('MLflow experiments error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MLflow experiments', details: String(error) },
      { status: 500 }
    )
  }
}
