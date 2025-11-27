import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = registerSchema.parse(body)

    // Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      )
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 12)

    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ANALYST',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      { message: 'Пользователь успешно создан', user },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Произошла ошибка при регистрации' },
      { status: 500 }
    )
  }
}
