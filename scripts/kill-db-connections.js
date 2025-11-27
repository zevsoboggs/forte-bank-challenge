// Script to kill all connections to forte database
const { Client } = require('pg')

async function killConnections() {
    // Connect to postgres database (not forte)
    const client = new Client({
        host: '93.170.73.50',
        port: 5432,
        user: 'admin',
        password: 'Alfa2000',
        database: 'postgres' // Connect to postgres, not forte
    })

    try {
        console.log('🔌 Connecting to PostgreSQL server...')
        await client.connect()

        // Get all connections to forte database
        console.log('📊 Checking active connections...')
        const countResult = await client.query(`
            SELECT COUNT(*) as count
            FROM pg_stat_activity
            WHERE datname = 'forte'
        `)
        console.log(`   Found ${countResult.rows[0].count} active connections to 'forte' database`)

        // Kill all connections to forte database
        console.log('💀 Terminating all connections to forte...')
        const result = await client.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'forte'
              AND pid <> pg_backend_pid()
        `)

        console.log(`✅ Terminated ${result.rowCount} connections`)
        console.log('✨ Database is now clean! You can restart the dev server.')

    } catch (error) {
        console.error('❌ Error:', error.message)
        process.exit(1)
    } finally {
        await client.end()
    }
}

killConnections()
