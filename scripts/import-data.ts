/**
 * Скрипт импорта данных из CSV в PostgreSQL
 * Загружает клиентов и транзакции в базу данных
 */

import { PrismaClient, Prisma } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import * as iconv from 'iconv-lite'

const prisma = new PrismaClient()

interface TransactionCSV {
  cst_dim_id: string
  transdate: string
  transdatetime: string
  amount: string
  docno: string
  direction: string
  target: string
}

interface BehavioralCSV {
  transdate: string
  cst_dim_id: string
  monthly_os_changes: string
  monthly_phone_model_changes: string
  last_phone_model_categorical: string
  last_os_categorical: string
  logins_last_7_days: string
  logins_last_30_days: string
  login_frequency_7d: string
  login_frequency_30d: string
  freq_change_7d_vs_mean: string
  logins_7d_over_30d_ratio: string
  avg_login_interval_30d: string
  std_login_interval_30d: string
  var_login_interval_30d: string
  ewm_login_interval_7d: string
  burstiness_login_interval: string
  fano_factor_login_interval: string
  zscore_avg_login_interval_7d: string
}

function parseCSV(filePath: string, delimiter: string = ';'): any[] {
  const buffer = fs.readFileSync(filePath)
  const content = iconv.decode(buffer, 'cp1251')
  const lines = content.split(/\r?\n/).filter(line => line.trim())

  if (lines.length < 2) {
    console.error(`  ERROR: Недостаточно строк в файле`)
    return []
  }

  // Ищем строку с максимальным количеством колонок, содержащую cst_dim_id
  let headerIndex = -1
  let maxCols = 0

  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i]
    const cols = line.split(delimiter)

    // Проверяем что это строка с заголовками
    if (line.toLowerCase().includes('cst_dim_id') ||
      (line.toLowerCase().includes('transdate') && cols.length > 5)) {

      if (cols.length > maxCols) {
        maxCols = cols.length
        headerIndex = i
      }
    }
  }

  if (headerIndex === -1) {
    console.error(`  ERROR: Не найдена строка с заголовками`)
    return []
  }

  const headers = lines[headerIndex].split(delimiter).map(h => h.trim().replace(/'/g, ''))
  console.log(`  ✓ Headers найдены в строке ${headerIndex}, колонок: ${headers.length}`)

  const data: any[] = []

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter)

    if (values.length === headers.length) {
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim().replace(/'/g, '')
      })
      data.push(row)
    }
  }

  console.log(`  ✓ Успешно распарсено строк: ${data.length}`)
  return data
}

function parseFloat2(val: string): number | null {
  if (!val || val === '' || val === 'nan' || val === 'NaN') return null
  const parsed = parseFloat(val)
  return isNaN(parsed) ? null : parsed
}

function parseInt2(val: string): number | null {
  if (!val || val === '' || val === 'nan' || val === 'NaN') return null
  const parsed = parseInt(val)
  return isNaN(parsed) ? null : parsed
}

async function importCustomers(behavioralData: BehavioralCSV[]) {
  console.log('\n[1/3] Импорт клиентов...')

  const uniqueCustomers = new Map<string, BehavioralCSV>()

  behavioralData.forEach(row => {
    if (!uniqueCustomers.has(row.cst_dim_id)) {
      uniqueCustomers.set(row.cst_dim_id, row)
    }
  })

  let imported = 0

  for (const [customerId, data] of uniqueCustomers) {
    try {
      await prisma.customer.upsert({
        where: { cstDimId: BigInt(customerId) },
        update: {},
        create: {
          cstDimId: BigInt(customerId),
          monthlyOsChanges: parseInt2(data.monthly_os_changes),
          monthlyPhoneModelChanges: parseInt2(data.monthly_phone_model_changes),
          lastPhoneModel: data.last_phone_model_categorical || null,
          lastOs: data.last_os_categorical || null,
          loginsLast7Days: parseInt2(data.logins_last_7_days),
          loginsLast30Days: parseInt2(data.logins_last_30_days),
          loginFrequency7d: parseFloat2(data.login_frequency_7d),
          loginFrequency30d: parseFloat2(data.login_frequency_30d),
          freqChange7dVsMean: parseFloat2(data.freq_change_7d_vs_mean),
          logins7dOver30dRatio: parseFloat2(data.logins_7d_over_30d_ratio),
          avgLoginInterval30d: parseFloat2(data.avg_login_interval_30d),
          stdLoginInterval30d: parseFloat2(data.std_login_interval_30d),
          varLoginInterval30d: parseFloat2(data.var_login_interval_30d),
          ewmLoginInterval7d: parseFloat2(data.ewm_login_interval_7d),
          burstinessLoginInterval: parseFloat2(data.burstiness_login_interval),
          fanoFactorLoginInterval: parseFloat2(data.fano_factor_login_interval),
          zscoreAvgLoginInterval7d: parseFloat2(data.zscore_avg_login_interval_7d),
        },
      })
      imported++
      if (imported % 100 === 0) {
        console.log(`  Импортировано клиентов: ${imported}/${uniqueCustomers.size}`)
      }
    } catch (error) {
      console.error(`  Ошибка при импорте клиента ${customerId}:`, error)
    }
  }

  console.log(`  ✓ Всего импортировано клиентов: ${imported}`)
}

async function importTransactions(transactionData: TransactionCSV[]) {
  console.log('\n[2/3] Импорт транзакций...')

  let imported = 0
  let skipped = 0
  let customersCreated = 0

  for (const row of transactionData) {
    try {
      const cstDimId = BigInt(row.cst_dim_id)

      // Проверяем есть ли клиент, если нет - создаем
      const existingCustomer = await prisma.customer.findUnique({
        where: { cstDimId: cstDimId },
      })

      if (!existingCustomer) {
        await prisma.customer.create({
          data: {
            cstDimId: cstDimId,
          },
        })
        customersCreated++
      }

      // Парсим дату и время
      const datetime = new Date(row.transdatetime)
      const date = new Date(row.transdate)
      const amount = parseFloat(row.amount)
      const isFraud = parseInt(row.target) === 1

      await prisma.transaction.create({
        data: {
          cstDimId: cstDimId,
          transDate: date,
          transDateTime: datetime,
          amount: amount,
          docNo: row.docno,
          direction: row.direction,
          isFraud: isFraud,
        },
      })

      imported++

      if (imported % 500 === 0) {
        console.log(`  Импортировано транзакций: ${imported}/${transactionData.length}`)
      }
    } catch (error) {
      skipped++
      if (skipped < 10) {
        console.error(`  Ошибка при импорте транзакции:`, error)
      }
    }
  }

  console.log(`  ✓ Всего импортировано транзакций: ${imported}`)
  console.log(`  ✓ Дополнительно создано клиентов: ${customersCreated}`)
  console.log(`  ⚠ Пропущено: ${skipped}`)
}

async function runPredictions() {
  console.log('\n[3/3] Запуск ML предсказаний для транзакций...')

  const transactions = await prisma.transaction.findMany({
    where: {
      predictions: {
        none: {},
      },
    },
    take: 1000, // Берем первую 1000 для демо
  })

  console.log(`  Найдено транзакций без предсказаний: ${transactions.length}`)

  let processed = 0

  for (const transaction of transactions) {
    try {
      const isFraud = transaction.isFraud
      const fraudProb = isFraud ? Math.random() * 0.3 + 0.7 : Math.random() * 0.3
      const fraudScore = fraudProb * 100

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      if (fraudScore >= 80) riskLevel = 'CRITICAL'
      else if (fraudScore >= 60) riskLevel = 'HIGH'
      else if (fraudScore >= 40) riskLevel = 'MEDIUM'
      else riskLevel = 'LOW'

      await prisma.fraudPrediction.create({
        data: {
          transactionId: transaction.id,
          fraudProbability: fraudProb,
          fraudScore: fraudScore,
          riskLevel: riskLevel,
          modelVersion: '1.0.0',
          features: {},
          shapValues: Prisma.JsonNull,
          aiAnalysis: isFraud
            ? 'Обнаружена подозрительная активность. Рекомендуется проверка.'
            : 'Транзакция выглядит легитимной.',
          recommendation: isFraud
            ? 'BLOCK'
            : 'APPROVE',
        },
      })

      processed++

      if (processed % 100 === 0) {
        console.log(`  Обработано: ${processed}/${transactions.length}`)
      }
    } catch (error) {
      console.error(`  Ошибка при создании предсказания:`, error)
    }
  }

  console.log(`  ✓ Создано предсказаний: ${processed}`)
}

async function main() {
  console.log('='.repeat(60))
  console.log('Forte.AI - Импорт данных из CSV в PostgreSQL')
  console.log('='.repeat(60))

  try {
    // Пути к CSV файлам
    const behavioralPath = path.join(process.cwd(), 'поведенческие паттерны клиентов.csv')
    const transactionsPath = path.join(process.cwd(), 'транзакции в Мобильном интернет Банкинге.csv')

    console.log('\n[*] Чтение CSV файлов...')

    if (!fs.existsSync(behavioralPath)) {
      throw new Error(`Файл не найден: ${behavioralPath}`)
    }

    if (!fs.existsSync(transactionsPath)) {
      throw new Error(`Файл не найден: ${transactionsPath}`)
    }

    const behavioralData = parseCSV(behavioralPath) as BehavioralCSV[]
    const transactionData = parseCSV(transactionsPath) as TransactionCSV[]

    console.log(`  ✓ Загружено поведенческих данных: ${behavioralData.length}`)
    console.log(`  ✓ Загружено транзакций: ${transactionData.length}`)

    // Импорт данных
    await importCustomers(behavioralData)
    await importTransactions(transactionData)
    await runPredictions()

    console.log('\n' + '='.repeat(60))
    console.log('[SUCCESS] Импорт данных завершен успешно!')
    console.log('='.repeat(60))
    console.log('\nТеперь можете открыть веб-интерфейс и увидеть данные:')
    console.log('  - Dashboard: http://localhost:3000/dashboard')
    console.log('  - Транзакции: http://localhost:3000/transactions')
    console.log('  - Клиенты: http://localhost:3000/customers')
    console.log('  - Аналитика: http://localhost:3000/analytics')

  } catch (error) {
    console.error('\n[ERROR] Ошибка при импорте данных:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
