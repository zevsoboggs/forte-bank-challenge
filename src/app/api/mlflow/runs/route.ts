import { NextResponse } from 'next/server'

const MLFLOW_URL = process.env.MLFLOW_TRACKING_URI || 'https://forte.grekdev.com:5000'

/**
 * @swagger
 * /api/mlflow/runs:
 *   get:
 *     summary: List MLflow Runs
 *     description: Get history of all training runs
 *     tags:
 *       - MLflow
 *     parameters:
 *       - in: query
 *         name: experiment_id
 *         schema:
 *           type: string
 *         description: Filter by experiment ID
 *       - in: query
 *         name: max_results
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of runs to return
 *     responses:
 *       200:
 *         description: List of runs
 *       500:
 *         description: MLflow connection error
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const experimentId = searchParams.get('experiment_id')
    const maxResults = parseInt(searchParams.get('max_results') || '50')

    // First get experiments to find the default one
    let expId = experimentId
    if (!expId) {
      const expResponse = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/experiments/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_results: 10 }),
      })

      if (expResponse.ok) {
        const expData = await expResponse.json()
        // Find forte-fraud-detection experiment or use first one
        const forteExp = expData.experiments?.find((e: any) =>
          e.name?.includes('forte') || e.name?.includes('fraud')
        )
        expId = forteExp?.experiment_id || expData.experiments?.[0]?.experiment_id
      }
    }

    if (!expId) {
      return NextResponse.json({ runs: [], count: 0, message: 'No experiments found' })
    }

    const response = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/runs/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        experiment_ids: [expId],
        max_results: maxResults,
        order_by: ['start_time DESC'],
      }),
    })

    if (!response.ok) {
      throw new Error(`MLflow responded with ${response.status}`)
    }

    const data = await response.json()

    // Format runs for easier consumption
    const runs = (data.runs || []).map((run: any) => ({
      run_id: run.info?.run_id,
      run_name: run.info?.run_name || run.data?.tags?.find((t: any) => t.key === 'mlflow.runName')?.value,
      status: run.info?.status,
      start_time: run.info?.start_time,
      end_time: run.info?.end_time,
      duration_ms: run.info?.end_time && run.info?.start_time
        ? run.info.end_time - run.info.start_time
        : null,
      metrics: run.data?.metrics?.reduce((acc: any, m: any) => {
        acc[m.key] = m.value
        return acc
      }, {}) || {},
      params: run.data?.params?.reduce((acc: any, p: any) => {
        acc[p.key] = p.value
        return acc
      }, {}) || {},
    }))

    return NextResponse.json({
      runs,
      count: runs.length,
      experiment_id: expId,
    })
  } catch (error) {
    console.error('MLflow runs error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MLflow runs', details: String(error) },
      { status: 500 }
    )
  }
}
