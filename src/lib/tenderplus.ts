import { prisma } from '@/lib/prisma'

const TENDERPLUS_API_URL = 'https://api.tenderplus.kz/graphql'

export interface TenderLot {
  id: string
  lotId: string
  title: string
  description?: string
  amount: number
  pricePerUnit?: number
  quantity?: number
  currency: string
  status: string
  startDate?: string
  endDate?: string
  customer: {
    name: string
    bin?: string
  }
  region: string
  sourceLink?: string
  documents: {
    name: string
    url: string
  }[]
}

export const tenderPlus = {
  /**
   * Fetches lots from TenderPlus GraphQL API
   */
  async getLots(limit: number = 50): Promise<TenderLot[]> {
    const apiKey = process.env.TENDERPLUS_API_KEY

    if (!apiKey) {
      throw new Error('TENDERPLUS_API_KEY is not defined in environment variables')
    }

    // Removed (limit: ${limit}) as it caused GraphQL error
    const query = `
        {
          lot {
            lot
            partnerLink
            title
            one_cost
            counts
            cost
            documents {
              name
              downloadLink
            }
            region {
              name
            }
            lotBuy {
              begin_date
              end_date
              partner {
                name
              }
              lot_status_id
              lotStatus {
                name
              }
            }
          }
        }
        `

    try {
      const response = await fetch(TENDERPLUS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ query }),
        next: { revalidate: 0 } // Disable cache to ensure fresh data
      })

      if (!response.ok) {
        console.error('TenderPlus API Error Status:', response.status)
        throw new Error(`API Error: ${response.statusText} (${response.status})`)
      }

      const result = await response.json()

      if (result.errors) {
        console.error('GraphQL Errors:', result.errors)
        throw new Error(`GraphQL Query Failed: ${result.errors[0]?.message}`)
      }

      const lots = result.data?.lot || []

      // Apply limit manually since API doesn't support it in this query
      const limitedLots = lots.slice(0, limit)

      return limitedLots.map((item: any) => ({
        id: String(item.lot),
        lotId: String(item.lot),
        title: item.title,
        description: item.title,
        amount: item.cost,
        pricePerUnit: item.one_cost,
        quantity: item.counts,
        currency: 'KZT',
        status: item.lotBuy?.lotStatus?.name || 'Unknown',
        startDate: item.lotBuy?.begin_date,
        endDate: item.lotBuy?.end_date,
        customer: {
          name: item.lotBuy?.partner?.name || 'Не указан',
          bin: 'Unknown'
        },
        region: item.region?.name || 'Не указан',
        sourceLink: item.partnerLink,
        documents: item.documents?.map((doc: any) => ({
          name: doc.name,
          url: doc.downloadLink
        })) || []
      }))

    } catch (error) {
      console.error('Failed to fetch from TenderPlus:', error)
      throw error // Re-throw to show actual error to user, NO MOCKS
    }
  },

  /**
   * Analyzes a tender for risks using AI
   */
  async analyzeTender(lotId: string, tenderData?: TenderLot) {
    const risks = []
    let score = 0

    if (!tenderData) return { riskScore: 0, risks: [], aiSummary: 'No data for analysis' }

    // 1. Price Analysis
    if (tenderData.amount > 50000000) {
      risks.push({
        level: 'MEDIUM',
        factor: 'High Value',
        description: 'Крупная сумма закупки требует дополнительного комплаенс-контроля.'
      })
      score += 20
    }

    // 2. Deadline Analysis
    if (tenderData.endDate) {
      const end = new Date(tenderData.endDate)
      const now = new Date()
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays < 5 && diffDays > 0) {
        risks.push({
          level: 'HIGH',
          factor: 'Short Deadline',
          description: `До окончания приема заявок осталось всего ${diffDays} дн. Возможен риск "заточки" под конкретного поставщика.`
        })
        score += 40
      }
    }

    // 3. Region/Logistics
    if (tenderData.region === 'Не указан') {
      risks.push({
        level: 'LOW',
        factor: 'Unclear Region',
        description: 'Регион поставки не определен точно.'
      })
      score += 5
    }

    return {
      tenderId: tenderData.id,
      riskScore: score,
      risks,
      aiSummary: `Анализ лота #${lotId}. Выявлено ${risks.length} факторов риска. Общая оценка риска: ${score}/100.`
    }
  },

  /**
   * Finds relevant suppliers
   */
  async findSuppliers(lotId: string) {
    // Mock Suppliers Database (Enhanced)
    return [
      { name: 'TOO "IT Solutions Kaz"', bin: '123456789012', matchScore: 98, reason: 'Лидер рынка в данной категории.' },
      { name: 'AO "Kazakhstan Engineering"', bin: '987654321098', matchScore: 85, reason: 'Имеет необходимые лицензии.' },
      { name: 'IP "FastSupply"', bin: '555444333222', matchScore: 65, reason: 'Низкие цены, но есть нарекания по срокам.' },
      { name: 'TOO "Global Trade"', bin: '111222333444', matchScore: 45, reason: 'Недостаточно опыта в госсекторе.' }
    ]
  }
}
