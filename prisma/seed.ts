import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Создание демо-пользователей
  const hashedPassword = await bcrypt.hash('demo123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@forte.kz' },
    update: {},
    create: {
      email: 'admin@forte.kz',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@forte.kz' },
    update: {},
    create: {
      email: 'analyst@forte.kz',
      name: 'Fraud Analyst',
      password: hashedPassword,
      role: 'ANALYST',
    },
  })

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@forte.kz' },
    update: {},
    create: {
      email: 'viewer@forte.kz',
      name: 'Viewer User',
      password: hashedPassword,
      role: 'VIEWER',
    },
  })

  console.log('Demo users created:')
  console.log({ admin, analyst, viewer })
  console.log('\nLogin credentials:')
  console.log('Email: analyst@forte.kz')
  console.log('Password: demo123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
