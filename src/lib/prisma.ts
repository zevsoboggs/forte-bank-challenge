import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  connectionCount: number
}

// Initialize connection counter
if (!globalForPrisma.connectionCount) {
  globalForPrisma.connectionCount = 0
}

// Create a single Prisma Client instance with very aggressive connection limits
function createPrismaClient() {
  const client = new PrismaClient({
    log: ['error'],
  })

  // Track connections
  globalForPrisma.connectionCount++
  console.log(`📊 Prisma Client #${globalForPrisma.connectionCount} created`)

  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Aggressive cleanup - disconnect after each request in development
if (process.env.NODE_ENV === 'development') {
  // Set a timeout to disconnect if idle
  let disconnectTimeout: NodeJS.Timeout | null = null

  const scheduleDisconnect = () => {
    if (disconnectTimeout) clearTimeout(disconnectTimeout)

    disconnectTimeout = setTimeout(async () => {
      console.log('⏳ Prisma Client idle, disconnecting...')
      await prisma.$disconnect()
    }, 30000) // Disconnect after 30 seconds of inactivity
  }

  // Hook into Prisma queries to reset timeout
  const originalQuery = (prisma as any)._engine.query
  if (originalQuery) {
    (prisma as any)._engine.query = function(...args: any[]) {
      scheduleDisconnect()
      return originalQuery.apply(this, args)
    }
  }
}

// Cleanup connections on various exit signals
const cleanup = async () => {
  console.log('🔌 Disconnecting Prisma Client...')
  try {
    await prisma.$disconnect()
    console.log('✅ Prisma Client disconnected')
  } catch (e) {
    console.error('❌ Error disconnecting:', e)
  }
}

process.on('beforeExit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

export default prisma
