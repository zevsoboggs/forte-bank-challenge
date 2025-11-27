// Vexa API Integration for Meeting Transcription
// API Key stored in environment variable

const VEXA_API_KEY = process.env.VEXA_API_KEY || 'z5dUYlTqAvX9lUIjgm4dhuVnifFcPwo2NgVPb3nl'
const VEXA_BASE_URL = 'https://api.cloud.vexa.ai'

const VEXA_HEADERS = {
    'X-API-Key': VEXA_API_KEY,
    'Content-Type': 'application/json'
}

export interface VexaBotRequest {
    platform: 'google_meet' | 'teams'
    native_meeting_id: string
    passcode?: string // Required for Teams
    language?: string
    bot_name?: string
}

export interface VexaTranscript {
    id: number
    platform: string
    native_meeting_id: string
    status: string
    start_time?: string
    end_time?: string
    segments: Array<{
        start: number
        end: number
        text: string
        language: string
        speaker: string | null
        created_at: string
        absolute_start_time?: string
        absolute_end_time?: string
    }>
    full_text?: string
}

export const vexaClient = {
    // Request bot to join meeting
    async requestBot(data: VexaBotRequest): Promise<any | null> {
        if (!VEXA_API_KEY) {
            console.error('⚠️ VEXA_API_KEY not configured')
            return null
        }

        try {
            console.log(`🤖 Requesting Vexa bot for ${data.platform} meeting: ${data.native_meeting_id}`)

            const response = await fetch(`${VEXA_BASE_URL}/bots`, {
                method: 'POST',
                headers: VEXA_HEADERS,
                body: JSON.stringify({
                    platform: data.platform,
                    native_meeting_id: data.native_meeting_id,
                    ...(data.passcode && { passcode: data.passcode }),
                    language: data.language || 'ru',
                    bot_name: data.bot_name || 'Forte.AI AI Assistant'
                })
            })

            if (!response.ok) {
                const error = await response.text()
                console.error('❌ Failed to request Vexa bot:', error)
                return null
            }

            const result = await response.json()
            console.log(`✅ Vexa bot requested successfully:`, result)
            return result
        } catch (error) {
            console.error('❌ Error requesting Vexa bot:', error)
            return null
        }
    },

    // Get real-time transcript
    async getTranscript(platform: string, nativeMeetingId: string): Promise<VexaTranscript | null> {
        if (!VEXA_API_KEY) {
            console.error('⚠️ VEXA_API_KEY not configured')
            return null
        }

        try {
            const response = await fetch(
                `${VEXA_BASE_URL}/transcripts/${platform}/${nativeMeetingId}`,
                {
                    headers: VEXA_HEADERS
                }
            )

            if (!response.ok) {
                const error = await response.text()
                console.error('❌ Failed to get transcript:', error)
                return null
            }

            const result = await response.json()
            return result
        } catch (error) {
            console.error('❌ Error getting transcript:', error)
            return null
        }
    },

    // Get bot status
    async getBotStatus(): Promise<any[] | null> {
        if (!VEXA_API_KEY) {
            console.error('⚠️ VEXA_API_KEY not configured')
            return null
        }

        try {
            const response = await fetch(`${VEXA_BASE_URL}/bots/status`, {
                headers: VEXA_HEADERS
            })

            if (!response.ok) {
                const error = await response.text()
                console.error('❌ Failed to get bot status:', error)
                return null
            }

            return await response.json()
        } catch (error) {
            console.error('❌ Error getting bot status:', error)
            return null
        }
    },

    // Stop bot
    async stopBot(platform: string, nativeMeetingId: string): Promise<any | null> {
        if (!VEXA_API_KEY) {
            console.error('⚠️ VEXA_API_KEY not configured')
            return null
        }

        try {
            console.log(`🛑 Stopping Vexa bot for ${platform} meeting: ${nativeMeetingId}`)

            const response = await fetch(
                `${VEXA_BASE_URL}/bots/${platform}/${nativeMeetingId}`,
                {
                    method: 'DELETE',
                    headers: VEXA_HEADERS
                }
            )

            if (!response.ok) {
                const error = await response.text()
                console.error('❌ Failed to stop bot:', error)
                return null
            }

            const result = await response.json()
            console.log(`✅ Vexa bot stopped:`, result)
            return result
        } catch (error) {
            console.error('❌ Error stopping bot:', error)
            return null
        }
    },

    // List meetings
    async listMeetings(): Promise<any[] | null> {
        if (!VEXA_API_KEY) {
            console.error('⚠️ VEXA_API_KEY not configured')
            return null
        }

        try {
            const response = await fetch(`${VEXA_BASE_URL}/meetings`, {
                headers: VEXA_HEADERS
            })

            if (!response.ok) {
                const error = await response.text()
                console.error('❌ Failed to list meetings:', error)
                return null
            }

            return await response.json()
        } catch (error) {
            console.error('❌ Error listing meetings:', error)
            return null
        }
    },

    // Update meeting metadata
    async updateMeeting(
        platform: string,
        nativeMeetingId: string,
        data: {
            name?: string
            participants?: string[]
            languages?: string[]
            notes?: string
        }
    ): Promise<any | null> {
        if (!VEXA_API_KEY) {
            console.error('⚠️ VEXA_API_KEY not configured')
            return null
        }

        try {
            const response = await fetch(
                `${VEXA_BASE_URL}/meetings/${platform}/${nativeMeetingId}`,
                {
                    method: 'PATCH',
                    headers: VEXA_HEADERS,
                    body: JSON.stringify({ data })
                }
            )

            if (!response.ok) {
                const error = await response.text()
                console.error('❌ Failed to update meeting:', error)
                return null
            }

            return await response.json()
        } catch (error) {
            console.error('❌ Error updating meeting:', error)
            return null
        }
    },

    // Extract meeting ID from URL
    extractMeetingInfo(meetingUrl: string): {
        platform: 'google_meet' | 'teams' | null
        meetingId: string | null
        passcode: string | null
    } {
        // Google Meet: https://meet.google.com/abc-defg-hij
        const googleMeetMatch = meetingUrl.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)
        if (googleMeetMatch) {
            return {
                platform: 'google_meet',
                meetingId: googleMeetMatch[1],
                passcode: null
            }
        }

        // Microsoft Teams: https://teams.live.com/meet/9387167464734?p=qxJanYOcdjN4d6UlGa
        const teamsMatch = meetingUrl.match(/teams\.(live|microsoft)\.com\/meet\/(\d+)/)
        const teamsPasscodeMatch = meetingUrl.match(/[?&]p=([^&]+)/)

        if (teamsMatch) {
            return {
                platform: 'teams',
                meetingId: teamsMatch[2],
                passcode: teamsPasscodeMatch ? teamsPasscodeMatch[1] : null
            }
        }

        return {
            platform: null,
            meetingId: null,
            passcode: null
        }
    }
}
