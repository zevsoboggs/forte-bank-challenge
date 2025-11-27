import { NextResponse } from 'next/server'

const DADATA_API_KEY = process.env.DADATA_API_KEY
const DADATA_SECRET_KEY = process.env.DADATA_SECRET_KEY
const DADATA_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party_kz'
const DADATA_ID_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party_kz'

export async function POST(request: Request) {
    try {
        const { query, type } = await request.json()

        if (!query) {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            )
        }

        const url = type === 'findById' ? DADATA_ID_URL : DADATA_URL

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Token ${DADATA_API_KEY}`,
                // Secret key is not needed for suggestion API, but good to have if we switch to standardization
                // 'X-Secret': DADATA_SECRET_KEY 
            },
            body: JSON.stringify({ query })
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('DaData API Error:', errorData)
            return NextResponse.json(
                { error: 'Failed to fetch data from DaData' },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error('Counterparty API Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}
