import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { sessionId, type } = await request.json() // type: 'BRD', 'USER_STORIES', 'USE_CASES'

        const history = await prisma.analystMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' }
        })

        const conversationText = history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

        let prompt = ''
        if (type === 'BRD') {
            prompt = `На основе следующего диалога создай формальный Документ Бизнес-Требований (BRD) на русском языке.

СТРУКТУРА ДОКУМЕНТА:

# Документ Бизнес-Требований (BRD)

## 1. Цель проекта
Опиши основную цель и ожидаемые результаты проекта.

## 2. Описание
Детальное описание проекта, контекст и предпосылки.

## 3. Scope (Границы проекта)
### В scope:
- Что входит в проект
### Вне scope:
- Что НЕ входит в проект

## 4. Функциональные требования
Пронумерованный список конкретных функций и возможностей системы.

## 5. Бизнес-правила
Список бизнес-правил и ограничений.

## 6. KPI (Ключевые показатели эффективности)
Метрики для измерения успеха проекта.

## 7. Заинтересованные стороны
Список стейкхолдеров и их роли.

## 8. Риски
Потенциальные риски и способы их митигации.

Используй markdown форматирование. Будь конкретным и структурированным.`
        } else if (type === 'USER_STORIES') {
            prompt = `На основе следующего диалога создай список User Stories на русском языке.

Для каждой User Story используй формат:

## User Story: [Название]
**Как** [тип пользователя],
**Я хочу** [действие],
**Чтобы** [цель/результат].

### Acceptance Criteria:
1. [Критерий 1]
2. [Критерий 2]
3. [Критерий 3]

### Priority: [HIGH/MEDIUM/LOW]
### Story Points: [число]

---

Создай минимум 5-7 детальных User Stories с конкретными критериями приёмки.`
        } else {
            prompt = `На основе следующего диалога создай детальную спецификацию Use Case на русском языке.

СТРУКТУРА:

# Use Case: [Название]

## Основная информация
- **ID:** UC-001
- **Название:** [Краткое название]
- **Акторы:** [Кто использует]
- **Приоритет:** [HIGH/MEDIUM/LOW]

## Предусловия
Список условий, которые должны быть выполнены до начала.

## Основной сценарий
1. [Шаг 1]
2. [Шаг 2]
3. [Шаг 3]
...

## Альтернативные сценарии
### Альтернатива 1: [Название]
1. [Шаг]
2. [Шаг]

## Исключительные ситуации
### Ошибка 1: [Описание]
- Действие системы: [что делать]

## Постусловия
Что должно быть достигнуто после успешного выполнения.

Создай несколько Use Cases если в диалоге обсуждается несколько сценариев.`
        }

        const result = await model.generateContent([
            prompt,
            `CONVERSATION HISTORY:\n${conversationText}`
        ])

        const response = result.response
        const text = response.text()

        return NextResponse.json({ content: text })

    } catch (error) {
        console.error('Error generating document:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
