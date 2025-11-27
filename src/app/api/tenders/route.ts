import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { tenderPlusClient } from '@/lib/tenderplus'

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const keyword = searchParams.get('q') || undefined
        const regionId = searchParams.get('regionId') ? parseInt(searchParams.get('regionId')!) : undefined
        const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : undefined
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '100')
        const showOnlyAnalyzed = searchParams.get('analyzed') === 'true'

        // If showing only analyzed, fetch from DB instead of TenderPlus
        if (showOnlyAnalyzed) {
            const skip = (page - 1) * limit

            const where: any = {
                risks: { some: {} } // Has at least one risk (analyzed)
            }

            if (keyword) {
                where.title = { contains: keyword, mode: 'insensitive' }
            }
            if (regionId) {
                where.region = { contains: searchParams.get('regionId')!, mode: 'insensitive' }
            }

            const [analyzedTenders, totalCount] = await Promise.all([
                prisma.tender.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        risks: true,
                        suppliers: {
                            orderBy: { matchScore: 'desc' }
                        }
                    }
                }),
                prisma.tender.count({ where })
            ])

            const pageCount = Math.ceil(totalCount / limit)

            return NextResponse.json({
                tenders: analyzedTenders,
                totalCount,
                pageCount,
                currentPage: page,
                limitPage: limit
            })
        }

        // Fetch from TenderPlus with filters and pagination
        const result = await tenderPlusClient.searchTenders({
            keyword,
            regionId,
            categoryId,
            page,
            limit
        })

        // Cache in DB with batching to avoid connection issues
        const savedTenders = []
        const BATCH_SIZE = 5 // Process 5 tenders at a time to avoid connection pool exhaustion

        for (let i = 0; i < result.tenders.length; i += BATCH_SIZE) {
            const batch = result.tenders.slice(i, i + BATCH_SIZE)

            const batchPromises = batch.map(async (tender) => {
                // Convert "2022-05-11" strings to Date objects or null
                const deadline = tender.lotBuy.end_date ? new Date(tender.lotBuy.end_date) : null

                // Upsert tender
                return prisma.tender.upsert({
                    where: { lotId: tender.lot },
                    update: {
                        title: tender.title,
                        amount: tender.cost || tender.one_cost * tender.counts,
                        status: tender.lotBuy.lotStatus.name,
                        deadline: deadline,
                        customer: tender.lotBuy.partner.name,
                        region: tender.region.name,
                        sourceLink: tender.partnerLink,
                    },
                    create: {
                        lotId: tender.lot,
                        title: tender.title,
                        amount: tender.cost || tender.one_cost * tender.counts,
                        currency: 'KZT', // Default
                        status: tender.lotBuy.lotStatus.name,
                        deadline: deadline,
                        customer: tender.lotBuy.partner.name,
                        region: tender.region.name,
                        sourceLink: tender.partnerLink,
                    },
                    include: {
                        risks: true,
                        suppliers: {
                            orderBy: { matchScore: 'desc' }
                        }
                    }
                })
            })

            const batchResults = await Promise.all(batchPromises)
            savedTenders.push(...batchResults)
        }

        return NextResponse.json({
            tenders: savedTenders,
            totalCount: result.totalCount,
            pageCount: result.pageCount,
            currentPage: result.currentPage,
            limitPage: result.limitPage
        })
    } catch (error: any) {
        console.error('Error fetching tenders:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch tenders' },
            { status: 500 }
        )
    }
}
