// Script to kill all connections using Prisma
// This connects to postgres database to kill forte connections

const { PrismaClient } = require('@prisma/client')

async function killConnections() {
    // Create temporary Prisma client for postgres database
    const tempPrisma = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://admin:Alfa2000@93.170.73.50:5432/postgres?schema=public'
            }
        }
    })

    try {
        console.log('🔌 Connecting to PostgreSQL server (postgres database)...')

        // Get connection count
        console.log('📊 Checking active connections...')
        const countResult = await tempPrisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM pg_stat_activity
            WHERE datname = 'forte'
        `
        console.log(`   Found ${countResult[0].count} active connections to 'forte' database`)

        // Kill all connections
        console.log('💀 Terminating all connections to forte...')
        const result = await tempPrisma.$executeRaw`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'forte'
              AND pid <> pg_backend_pid()
        `

        console.log(`✅ Terminated connections successfully`)
        console.log('✨ Database is now clean! You can restart the dev server.')

    } catch (error) {
        console.error('❌ Error:', error.message)
        console.error(error)
        process.exit(1)
    } finally {
        await tempPrisma.$disconnect()
    }
}

killConnections()
