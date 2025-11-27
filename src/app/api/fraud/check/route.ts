import { NextResponse } from 'next/server'
import { veriffy } from '@/lib/veriffy'
import { prisma } from '@/lib/prisma'
import { publishTransaction, publishFraudAlert } from '@/lib/kafka'
import axios from 'axios'

const FORTE_API_KEY = process.env.FORTE_API_KEY
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8000'

/**
 * @swagger
 * /api/fraud/check:
 *   post:
 *     summary: Analyze transaction risk and trigger KYC if needed
 *     description: Real-time fraud detection endpoint. Checks transaction details against ML models and triggers Veriffy KYC for high-risk transactions.
 *     tags:
 *       - Anti-Fraud
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - sender
 *               - receiver
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 550000
 *               currency:
 *                 type: string
 *                 example: KZT
 *               sender:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   email:
 *                     type: string
 *               receiver:
 *                 type: object
 *                 properties:
 *                   card:
 *                     type: string
 *     responses:
 *       200:
 *         description: Analysis result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [APPROVED, KYC_REQUIRED, BLOCKED]
 *                 riskLevel:
 *                   type: string
 *                   enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                 fraudScore:
 *                   type: number
 *                 kyc:
 *                   type: object
 *                   properties:
 *                     verificationUrl:
 *                       type: string
 *       401:
 *         description: Unauthorized (Invalid API Key)
 */
export async function POST(req: Request) {
    try {
        // 1. API Key Validation
        const apiKey = req.headers.get('X-API-Key')
        if (!apiKey || apiKey !== FORTE_API_KEY) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid API Key' },
                { status: 401 }
            )
        }

        const body = await req.json()
        const { amount, currency, receiver, sender } = body

        console.log('🔍 Fraud Check Request:', { amount, currency, sender: sender.id })

        // 2. Create or find Customer (using upsert to avoid race conditions)
        const customerDimId = BigInt(sender.id.replace('user_demo_', '') || '123')

        const customer = await prisma.customer.upsert({
            where: { cstDimId: customerDimId },
            update: {}, // No updates needed
            create: {
                cstDimId: customerDimId
            }
        })
        console.log('✅ Customer found/created:', customer.id, 'cstDimId:', customer.cstDimId.toString())

        // 3. Create Transaction
        const transaction = await prisma.transaction.create({
            data: {
                cstDimId: customer.cstDimId,
                transDate: new Date(),
                transDateTime: new Date(),
                amount: amount,
                docNo: `TXN-${Date.now()}`,
                direction: 'OUTGOING',
                isFraud: false // Will be determined by fraud check
            }
        })
        console.log('✅ Transaction created:', transaction.id)

        // 4. Call Real ML Service for Fraud Detection
        let fraudScore = 12
        let fraudProbability = 0.12
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
        let mlPrediction: any = null

        try {
            const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
                amount: amount,
                hour: new Date().getHours(),
                day_of_week: new Date().getDay(),
                direction: 'OUTGOING',
                monthly_os_changes: customer.monthlyOsChanges || 0,
                monthly_phone_model_changes: customer.monthlyPhoneModelChanges || 0,
                last_phone_model: customer.lastPhoneModel || 'Unknown',
                last_os: customer.lastOs || 'Unknown',
                logins_last_7_days: customer.loginsLast7Days || 0,
                logins_last_30_days: customer.loginsLast30Days || 0,
                login_frequency_7d: customer.loginFrequency7d || 0,
                login_frequency_30d: customer.loginFrequency30d || 0,
                freq_change_7d_vs_mean: customer.freqChange7dVsMean || 0,
                logins_7d_over_30d_ratio: customer.logins7dOver30dRatio || 0,
                avg_login_interval_30d: customer.avgLoginInterval30d || 0,
                std_login_interval_30d: customer.stdLoginInterval30d || 0,
                var_login_interval_30d: customer.varLoginInterval30d || 0,
                ewm_login_interval_7d: customer.ewmLoginInterval7d || 0,
                burstiness_login_interval: customer.burstinessLoginInterval || 0,
                fano_factor_login_interval: customer.fanoFactorLoginInterval || 0,
                zscore_avg_login_interval_7d: customer.zscoreAvgLoginInterval7d || 0
            }, { timeout: 5000 })

            mlPrediction = mlResponse.data
            fraudProbability = mlPrediction.fraud_probability
            fraudScore = mlPrediction.fraud_score
            riskLevel = mlPrediction.risk_level
            console.log('✅ ML Prediction:', { fraudScore, riskLevel })
        } catch (mlError: any) {
            console.error('⚠️ ML Service error, using fallback:', mlError.message)
            // Fallback to simple rule-based logic
            const isHighRisk = amount > 500000
            riskLevel = isHighRisk ? 'HIGH' : 'LOW'
            fraudScore = isHighRisk ? 85 : 12
            fraudProbability = fraudScore / 100
        }

        const isHighRisk = riskLevel === 'HIGH' || riskLevel === 'CRITICAL'

        // 4.5. Publish to Kafka for real-time processing
        try {
            await publishTransaction({
                transaction_id: transaction.id,
                cst_dim_id: customer.cstDimId.toString(),
                amount: amount,
                direction: 'OUTGOING',
                trans_date: transaction.transDate.toISOString(),
                trans_datetime: transaction.transDateTime.toISOString(),
                is_fraud: isHighRisk,
                monthly_os_changes: customer.monthlyOsChanges || 0,
                monthly_phone_model_changes: customer.monthlyPhoneModelChanges || 0,
                last_phone_model: customer.lastPhoneModel || 'Unknown',
                last_os: customer.lastOs || 'Unknown',
                logins_last_7_days: customer.loginsLast7Days || 0,
                logins_last_30_days: customer.loginsLast30Days || 0,
            })
            console.log('✅ Published to Kafka')
        } catch (kafkaError: any) {
            console.error('⚠️ Kafka publish error:', kafkaError.message)
        }

        // 5. Create Fraud Prediction
        const fraudPrediction = await prisma.fraudPrediction.create({
            data: {
                transactionId: transaction.id,
                fraudProbability: fraudProbability,
                fraudScore: fraudScore,
                riskLevel: riskLevel,
                modelVersion: 'v1.0-demo',
                features: {
                    amount,
                    currency,
                    receiver: receiver.card
                },
                recommendation: isHighRisk ? 'Verify user identity via KYC' : 'Allow transaction',
                blocked: false
            }
        })
        console.log('✅ Fraud Prediction created:', fraudPrediction.id, 'Risk:', riskLevel)

        let kycSession = null

        // 6. If High Risk, Trigger KYC Flow and Fraud Alert
        if (isHighRisk) {
            // Publish fraud alert to Kafka
            try {
                await publishFraudAlert({
                    transaction_id: transaction.id,
                    customer_id: customer.cstDimId.toString(),
                    amount: amount,
                    fraud_score: fraudScore,
                    risk_level: riskLevel,
                    action: 'FLAGGED',
                    requires_review: true,
                    top_factors: mlPrediction?.top_risk_factors?.slice(0, 3) || []
                })
                console.log('✅ Fraud alert published to Kafka')
            } catch (alertError: any) {
                console.error('⚠️ Failed to publish fraud alert:', alertError.message)
            }

            try {
                console.log('⚠️ High Risk detected. Creating KYC session...')
                kycSession = await veriffy.createSession({
                    userId: sender.id,
                    email: sender.email,
                    firstName: sender.firstName,
                    lastName: sender.lastName,
                    metadata: {
                        transactionAmount: amount,
                        currency: currency,
                        riskLevel: riskLevel,
                        transactionId: transaction.id,
                        fraudPredictionId: fraudPrediction.id
                    }
                })
                console.log('✅ KYC Session created:', kycSession.sessionId)
                console.log('🔗 Verification URL:', kycSession.verificationUrl)
            } catch (error: any) {
                console.error('❌ KYC Session Creation Failed:', error.message)
                // Fallback: Block transaction if KYC fails to start
                await prisma.fraudPrediction.update({
                    where: { id: fraudPrediction.id },
                    data: { blocked: true }
                })
                return NextResponse.json({
                    status: 'BLOCKED',
                    riskLevel: 'CRITICAL',
                    fraudScore: 100,
                    reason: 'High risk transaction and KYC service unavailable',
                    recommendation: 'Transaction blocked due to system error'
                })
            }
        }

        // 7. Return Response
        return NextResponse.json({
            status: isHighRisk ? 'KYC_REQUIRED' : 'APPROVED',
            riskLevel,
            fraudScore,
            transactionId: transaction.id,
            recommendation: isHighRisk ? 'Verify user identity' : 'Allow transaction',
            kyc: kycSession ? {
                verificationUrl: kycSession.verificationUrl,
                sessionId: kycSession.sessionId
            } : null
        })

    } catch (error: any) {
        console.error('❌ Fraud Check Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        )
    }
}
