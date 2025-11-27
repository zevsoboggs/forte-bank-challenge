import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Необходимы права администратора' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const behavioralFile = formData.get('behavioral') as File
    const transactionsFile = formData.get('transactions') as File

    if (!behavioralFile || !transactionsFile) {
      return NextResponse.json(
        { error: 'Необходимо загрузить оба файла' },
        { status: 400 }
      )
    }

    // Создаем директорию для данных
    const dataDir = path.join(process.cwd(), 'ml-service', 'data')
    await mkdir(dataDir, { recursive: true })

    // Сохраняем файлы
    const behavioralBuffer = Buffer.from(await behavioralFile.arrayBuffer())
    const transactionsBuffer = Buffer.from(await transactionsFile.arrayBuffer())

    await writeFile(
      path.join(dataDir, 'behavioral_patterns.csv'),
      behavioralBuffer
    )
    await writeFile(
      path.join(dataDir, 'transactions.csv'),
      transactionsBuffer
    )

    return NextResponse.json({
      message: 'Файлы успешно загружены',
      files: {
        behavioral: 'behavioral_patterns.csv',
        transactions: 'transactions.csv',
      },
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Ошибка при загрузке файлов' },
      { status: 500 }
    )
  }
}
