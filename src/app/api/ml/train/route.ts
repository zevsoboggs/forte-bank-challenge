import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { spawn } from 'child_process'
import path from 'path'

let trainingProcess: any = null
let trainingLogs: string[] = []
let trainingStatus = 'idle' // idle, training, completed, error

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Необходимы права администратора' },
        { status: 403 }
      )
    }

    if (trainingStatus === 'training') {
      return NextResponse.json(
        { error: 'Обучение уже запущено' },
        { status: 400 }
      )
    }

    // Очищаем логи
    trainingLogs = []
    trainingStatus = 'training'

    // Запускаем обучение
    const mlServicePath = path.join(process.cwd(), 'ml-service')
    const pythonPath = path.join(mlServicePath, '.venv', 'Scripts', 'python.exe')

    trainingProcess = spawn(pythonPath, ['train_model.py'], {
      cwd: mlServicePath,
    })

    trainingProcess.stdout.on('data', (data: Buffer) => {
      const log = data.toString()
      trainingLogs.push(log)
      console.log('[Training]', log)
    })

    trainingProcess.stderr.on('data', (data: Buffer) => {
      const log = data.toString()
      trainingLogs.push(`ERROR: ${log}`)
      console.error('[Training Error]', log)
    })

    trainingProcess.on('close', (code: number) => {
      if (code === 0) {
        trainingStatus = 'completed'
        trainingLogs.push('✅ Обучение завершено успешно!')
      } else {
        trainingStatus = 'error'
        trainingLogs.push(`❌ Обучение завершено с ошибкой (код ${code})`)
      }
      trainingProcess = null
    })

    return NextResponse.json({
      message: 'Обучение запущено',
      status: 'training',
    })
  } catch (error: any) {
    console.error('Training error:', error)
    trainingStatus = 'error'
    return NextResponse.json(
      { error: 'Ошибка при запуске обучения' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      status: trainingStatus,
      logs: trainingLogs,
    })
  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Ошибка при получении статуса' },
      { status: 500 }
    )
  }
}
