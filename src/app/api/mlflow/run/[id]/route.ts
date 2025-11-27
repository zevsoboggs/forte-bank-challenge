import { NextResponse } from 'next/server'

const MLFLOW_URL = process.env.MLFLOW_TRACKING_URI || 'https://forte.grekdev.com:5000'

/**
 * @swagger
 * /api/mlflow/run/{id}:
 *   get:
 *     summary: Get Run Details
 *     description: Get detailed information about a specific MLflow run
 *     tags:
 *       - MLflow
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MLflow Run ID
 *     responses:
 *       200:
 *         description: Run details
 *       404:
 *         description: Run not found
 *       500:
 *         description: MLflow connection error
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params

    const response = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/runs/get?run_id=${runId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 })
      }
      throw new Error(`MLflow responded with ${response.status}`)
    }

    const data = await response.json()
    const run = data.run

    // Format response
    const formattedRun = {
      run_id: run.info?.run_id,
      run_name: run.info?.run_name,
      experiment_id: run.info?.experiment_id,
      status: run.info?.status,
      start_time: run.info?.start_time,
      end_time: run.info?.end_time,
      duration_ms: run.info?.end_time && run.info?.start_time
        ? run.info.end_time - run.info.start_time
        : null,
      artifact_uri: run.info?.artifact_uri,
      lifecycle_stage: run.info?.lifecycle_stage,
      metrics: run.data?.metrics?.reduce((acc: any, m: any) => {
        acc[m.key] = {
          value: m.value,
          timestamp: m.timestamp,
          step: m.step,
        }
        return acc
      }, {}) || {},
      params: run.data?.params?.reduce((acc: any, p: any) => {
        acc[p.key] = p.value
        return acc
      }, {}) || {},
      tags: run.data?.tags?.reduce((acc: any, t: any) => {
        acc[t.key] = t.value
        return acc
      }, {}) || {},
    }

    return NextResponse.json(formattedRun)
  } catch (error) {
    console.error('MLflow run details error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch run details', details: String(error) },
      { status: 500 }
    )
  }
}
