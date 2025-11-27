import { NextResponse } from 'next/server'

const MLFLOW_URL = process.env.MLFLOW_TRACKING_URI || 'https://forte.grekdev.com:5000'

/**
 * @swagger
 * /api/mlflow/compare:
 *   get:
 *     summary: Compare MLflow Runs
 *     description: Compare metrics across multiple training runs
 *     tags:
 *       - MLflow
 *     parameters:
 *       - in: query
 *         name: run_ids
 *         schema:
 *           type: string
 *         description: Comma-separated list of run IDs to compare
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of latest runs to compare if run_ids not provided
 *     responses:
 *       200:
 *         description: Comparison of runs
 *       500:
 *         description: MLflow connection error
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const runIdsParam = searchParams.get('run_ids')
    const limit = parseInt(searchParams.get('limit') || '5')

    let runIds: string[] = []

    if (runIdsParam) {
      runIds = runIdsParam.split(',').map(id => id.trim())
    } else {
      // Get latest runs from default experiment
      const expResponse = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/experiments/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_results: 10 }),
      })

      if (expResponse.ok) {
        const expData = await expResponse.json()
        const forteExp = expData.experiments?.find((e: any) =>
          e.name?.includes('forte') || e.name?.includes('fraud')
        )
        const expId = forteExp?.experiment_id || expData.experiments?.[0]?.experiment_id

        if (expId) {
          const runsResponse = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/runs/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              experiment_ids: [expId],
              max_results: limit,
              order_by: ['start_time DESC'],
            }),
          })

          if (runsResponse.ok) {
            const runsData = await runsResponse.json()
            runIds = (runsData.runs || []).map((r: any) => r.info?.run_id).filter(Boolean)
          }
        }
      }
    }

    if (runIds.length === 0) {
      return NextResponse.json({
        runs: [],
        comparison: null,
        message: 'No runs found to compare',
      })
    }

    // Fetch details for each run
    const runDetails = await Promise.all(
      runIds.map(async (runId) => {
        const response = await fetch(`${MLFLOW_URL}/api/2.0/mlflow/runs/get?run_id=${runId}`)
        if (!response.ok) return null
        const data = await response.json()
        return data.run
      })
    )

    const validRuns = runDetails.filter(Boolean)

    // Format runs for comparison
    const runs = validRuns.map((run: any) => ({
      run_id: run.info?.run_id,
      run_name: run.info?.run_name,
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

    // Build comparison summary
    const allMetricKeys = new Set<string>()
    runs.forEach(run => {
      Object.keys(run.metrics).forEach(key => allMetricKeys.add(key))
    })

    const comparison: any = {
      metric_comparison: {},
      best_run: null,
    }

    // Compare key metrics
    const keyMetrics = ['test_roc_auc', 'test_f1_score', 'test_precision', 'test_recall', 'cv_ensemble_auc_mean']

    keyMetrics.forEach(metric => {
      if (allMetricKeys.has(metric)) {
        const values = runs.map(r => ({
          run_id: r.run_id,
          value: r.metrics[metric],
        })).filter(v => v.value !== undefined)

        if (values.length > 0) {
          const best = values.reduce((a, b) => a.value > b.value ? a : b)
          const worst = values.reduce((a, b) => a.value < b.value ? a : b)

          comparison.metric_comparison[metric] = {
            values: values,
            best: best,
            worst: worst,
            avg: values.reduce((sum, v) => sum + v.value, 0) / values.length,
          }
        }
      }
    })

    // Find best overall run (by test_roc_auc or cv_ensemble_auc_mean)
    const primaryMetric = 'test_roc_auc'
    const bestMetric = comparison.metric_comparison[primaryMetric]
    if (bestMetric) {
      comparison.best_run = {
        run_id: bestMetric.best.run_id,
        metric: primaryMetric,
        value: bestMetric.best.value,
      }
    }

    return NextResponse.json({
      runs,
      comparison,
      count: runs.length,
    })
  } catch (error) {
    console.error('MLflow compare error:', error)
    return NextResponse.json(
      { error: 'Failed to compare runs', details: String(error) },
      { status: 500 }
    )
  }
}
