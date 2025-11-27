import { prisma } from '@/lib/prisma'

const VERIFFY_API_URL = 'https://veriffy.me/api/v1'
const API_KEY = process.env.VERIFFY_API_KEY

if (!API_KEY) {
    console.warn('VERIFFY_API_KEY is not set')
}

interface CreateSessionParams {
    userId?: string
    email?: string
    firstName?: string
    lastName?: string
    metadata?: Record<string, any>
}

interface VerificationResponse {
    sessionId: string
    sessionToken: string
    verificationUrl: string
    expiresAt: string
}

interface VerificationStatus {
    id: string
    status: 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW'
    fraudScore: number
    fraudRiskLevel: string
    faceMatchScore?: number
    documentType?: string
}

export const veriffy = {
    /**
     * Creates a new verification session for iframe/widget integration
     */
    async createSession(params: CreateSessionParams): Promise<VerificationResponse> {
        if (!API_KEY) throw new Error('Veriffy API Key missing')

        console.log('📤 Calling Veriffy API:', `${VERIFFY_API_URL}/sessions`)
        console.log('📝 Request params:', params)

        const response = await fetch(`${VERIFFY_API_URL}/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
            body: JSON.stringify(params),
        })

        console.log('📥 Veriffy API response status:', response.status)

        if (!response.ok) {
            const error = await response.text()
            console.error('❌ Veriffy API Error:', error)
            throw new Error(`Veriffy API Error: ${error}`)
        }

        const data = await response.json()
        console.log('✅ Veriffy response data:', data)
        console.log('🔗 Verification URL from Veriffy (original):', data.verificationUrl)

        // Fix localhost URL to veriffy.me
        let verificationUrl = data.verificationUrl
        if (verificationUrl.includes('localhost:3000')) {
            verificationUrl = verificationUrl.replace('http://localhost:3000', 'https://veriffy.me')
            console.log('🔧 Fixed verification URL:', verificationUrl)
        }

        // Persist session in database
        await prisma.verificationSession.create({
            data: {
                sessionId: data.sessionId,
                sessionToken: data.sessionToken,
                verificationUrl: verificationUrl,
                status: 'PENDING',
                metadata: params.metadata || {},
            }
        })

        return {
            ...data,
            verificationUrl: verificationUrl
        }
    },

    /**
     * Retrieves verification status by ID
     */
    async getVerification(verificationId: string): Promise<VerificationStatus> {
        if (!API_KEY) throw new Error('Veriffy API Key missing')

        const response = await fetch(`${VERIFFY_API_URL}/verifications/${verificationId}`, {
            method: 'GET',
            headers: {
                'X-API-Key': API_KEY,
            },
        })

        if (!response.ok) {
            throw new Error('Failed to fetch verification status')
        }

        const data = await response.json()
        return data.verification
    },

    /**
     * Updates local session status from Veriffy
     */
    async syncSessionStatus(sessionId: string) {
        // In a real scenario, we might need to lookup the verification ID from the session
        // For this demo, we'll assume we can query by session ID or that the webhook handles it
        // This is a placeholder for the polling logic
        return null
    }
}
