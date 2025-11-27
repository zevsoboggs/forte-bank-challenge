import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { vexaClient } from '@/lib/vexa'

// POST - Connect Vexa bot to meeting and start recording
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { meetingUrl } = body

        if (!meetingUrl) {
            return NextResponse.json(
                { error: 'Meeting URL is required' },
                { status: 400 }
            )
        }

        console.log('🔗 Connecting bot to meeting:', meetingUrl)

        // Extract meeting info from URL
        const meetingInfo = vexaClient.extractMeetingInfo(meetingUrl)

        if (!meetingInfo.platform || !meetingInfo.meetingId) {
            return NextResponse.json(
                { error: 'Invalid meeting URL. Supported: Google Meet, Microsoft Teams' },
                { status: 400 }
            )
        }

        console.log('📋 Meeting info:', meetingInfo)

        // Update meeting with platform and ID
        await prisma.meeting.update({
            where: { id },
            data: {
                meetingUrl,
                meetingPlatform: meetingInfo.platform,
                meetingId: meetingInfo.meetingId,
                vexaBotStatus: 'requesting'
            }
        })

        // Request Vexa bot to join
        const botRequest = await vexaClient.requestBot({
            platform: meetingInfo.platform,
            native_meeting_id: meetingInfo.meetingId,
            passcode: meetingInfo.passcode || undefined,
            language: 'ru',
            bot_name: 'Forte.AI AI Assistant'
        })

        if (!botRequest) {
            await prisma.meeting.update({
                where: { id },
                data: { vexaBotStatus: 'failed' }
            })

            return NextResponse.json(
                { error: 'Failed to request Vexa bot' },
                { status: 500 }
            )
        }

        console.log('✅ Bot requested successfully:', botRequest)

        // Update meeting with bot ID and status
        await prisma.meeting.update({
            where: { id },
            data: {
                vexaBotId: String(botRequest.bot_id || botRequest.id || ''),
                vexaBotStatus: 'active'
            }
        })

        return NextResponse.json({
            success: true,
            botRequest,
            platform: meetingInfo.platform,
            meetingId: meetingInfo.meetingId
        })

    } catch (error: any) {
        console.error('❌ Error connecting bot:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to connect bot' },
            { status: 500 }
        )
    }
}

// GET - Get bot status and fetch transcript
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const meeting = await prisma.meeting.findUnique({
            where: { id }
        })

        if (!meeting) {
            return NextResponse.json(
                { error: 'Meeting not found' },
                { status: 404 }
            )
        }

        if (!meeting.meetingPlatform || !meeting.meetingId) {
            return NextResponse.json(
                { error: 'Meeting not connected to bot' },
                { status: 400 }
            )
        }

        console.log(`📊 Checking status and getting transcript for ${meeting.meetingPlatform}/${meeting.meetingId}`)

        // First, check bot status
        const botStatus = await vexaClient.getBotStatus()
        console.log('Bot status response type:', typeof botStatus, 'isArray:', Array.isArray(botStatus))

        // Handle both array and object with data property
        const botsArray = Array.isArray(botStatus) ? botStatus : (botStatus?.data || botStatus?.bots || [])

        if (botsArray && Array.isArray(botsArray)) {
            const currentBot = botsArray.find(
                (bot: any) => bot.native_meeting_id === meeting.meetingId
            )

            // Update status based on bot state
            if (currentBot) {
                const status = currentBot.status
                console.log(`   Bot status from Vexa: ${status}`)

                if (status === 'dead' || status === 'exited') {
                    // Bot finished, update to completed
                    await prisma.meeting.update({
                        where: { id },
                        data: { vexaBotStatus: 'completed' }
                    })
                } else if (status === 'running') {
                    // Bot still active
                    await prisma.meeting.update({
                        where: { id },
                        data: { vexaBotStatus: 'active' }
                    })
                }
            }
        }

        // Get transcript from Vexa
        const transcript = await vexaClient.getTranscript(
            meeting.meetingPlatform,
            meeting.meetingId
        )

        if (!transcript || !transcript.segments || transcript.segments.length === 0) {
            return NextResponse.json({
                status: meeting.vexaBotStatus,
                transcript: null,
                message: 'Transcript not yet available'
            })
        }

        console.log(`✅ Transcript received (${transcript.segments.length} segments)`)

        // Format transcript from segments with proper timestamps
        const fullTranscript = transcript.segments
            .filter((seg: any) => seg.text && seg.text.trim())
            .map((seg: any) => {
                const speaker = seg.speaker || 'Unknown'
                // Format timestamp from absolute_start_time
                const timestamp = seg.absolute_start_time
                    ? new Date(seg.absolute_start_time).toISOString().substr(11, 8)
                    : '00:00:00'
                return `[${timestamp}] ${speaker}: ${seg.text.trim()}`
            })
            .join('\n\n')

        // Update meeting with transcript
        if (fullTranscript) {
            await prisma.meeting.update({
                where: { id },
                data: {
                    transcript: fullTranscript,
                    vexaBotStatus: 'completed'
                }
            })

            console.log(`✅ Saved transcript (${fullTranscript.length} chars) to database`)
            console.log('🤖 Starting automatic AI analysis...')

            // Automatically analyze the transcript
            try {
                const analysisResponse = await fetch(`${request.url.split('/connect-bot')[0]}/transcribe`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({ transcript: fullTranscript })
                })

                if (analysisResponse.ok) {
                    const analysisData = await analysisResponse.json()
                    console.log(`✅ AI analysis complete! Created ${analysisData.tasksCreated} tasks`)
                } else {
                    console.error('⚠️ Failed to analyze transcript automatically')
                }
            } catch (error) {
                console.error('⚠️ Error during automatic analysis:', error)
            }
        }

        return NextResponse.json({
            status: 'completed',
            transcript,
            fullTranscript,
            autoAnalyzed: true
        })

    } catch (error: any) {
        console.error('❌ Error getting transcript:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to get transcript' },
            { status: 500 }
        )
    }
}

// DELETE - Stop bot and finalize transcript
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const meeting = await prisma.meeting.findUnique({
            where: { id }
        })

        if (!meeting) {
            return NextResponse.json(
                { error: 'Meeting not found' },
                { status: 404 }
            )
        }

        if (!meeting.meetingPlatform || !meeting.meetingId) {
            return NextResponse.json(
                { error: 'Meeting not connected to bot' },
                { status: 400 }
            )
        }

        console.log(`🛑 Stopping bot for ${meeting.meetingPlatform}/${meeting.meetingId}`)

        // Stop the bot
        await vexaClient.stopBot(meeting.meetingPlatform, meeting.meetingId)

        // Get final transcript
        const transcript = await vexaClient.getTranscript(
            meeting.meetingPlatform,
            meeting.meetingId
        )

        let fullTranscript = meeting.transcript || ''
        if (transcript) {
            if (transcript.segments && transcript.segments.length > 0) {
                fullTranscript = transcript.segments
                    .map(seg => `[${seg.timestamp}] ${seg.speaker}: ${seg.text}`)
                    .join('\n\n')
            } else if (transcript.full_text) {
                fullTranscript = transcript.full_text
            }
        }

        // Update meeting
        await prisma.meeting.update({
            where: { id },
            data: {
                transcript: fullTranscript || meeting.transcript,
                vexaBotStatus: 'completed'
            }
        })

        console.log('✅ Bot stopped and transcript saved')

        return NextResponse.json({
            success: true,
            transcriptLength: fullTranscript.length
        })

    } catch (error: any) {
        console.error('❌ Error stopping bot:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to stop bot' },
            { status: 500 }
        )
    }
}
