import { Kafka, Producer, logLevel } from 'kafkajs'

const KAFKA_BROKERS = process.env.KAFKA_BOOTSTRAP_SERVERS || 'kafka:9092'

// Kafka Topics
export const TOPICS = {
  TRANSACTIONS_RAW: 'transactions_raw',
  TRANSACTIONS_SCORED: 'transactions_scored',
  FRAUD_ALERTS: 'fraud_alerts',
  MODEL_METRICS: 'model_metrics',
}

// Singleton Kafka instance
let kafka: Kafka | null = null
let producer: Producer | null = null
let isConnected = false

function getKafka(): Kafka {
  if (!kafka) {
    kafka = new Kafka({
      clientId: 'forte-web',
      brokers: KAFKA_BROKERS.split(','),
      logLevel: logLevel.WARN,
      retry: {
        initialRetryTime: 100,
        retries: 3,
      },
    })
  }
  return kafka
}

async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = getKafka().producer()
  }

  if (!isConnected) {
    try {
      await producer.connect()
      isConnected = true
      console.log('[Kafka] Producer connected')
    } catch (error) {
      console.error('[Kafka] Failed to connect producer:', error)
      throw error
    }
  }

  return producer
}

export interface TransactionEvent {
  transaction_id: string
  cst_dim_id: string
  amount: number
  direction: string
  trans_date: string
  trans_datetime: string
  is_fraud: boolean
  // Customer features
  monthly_os_changes?: number
  monthly_phone_model_changes?: number
  last_phone_model?: string
  last_os?: string
  logins_last_7_days?: number
  logins_last_30_days?: number
  login_frequency_7d?: number
  login_frequency_30d?: number
  freq_change_7d_vs_mean?: number
  logins_7d_over_30d_ratio?: number
  avg_login_interval_30d?: number
  std_login_interval_30d?: number
  var_login_interval_30d?: number
  ewm_login_interval_7d?: number
  burstiness_login_interval?: number
  fano_factor_login_interval?: number
  zscore_avg_login_interval_7d?: number
  // Derived features
  hour?: number
  day_of_week?: number
}

export async function publishTransaction(transaction: TransactionEvent): Promise<boolean> {
  try {
    const prod = await getProducer()

    // Add derived features
    const date = new Date(transaction.trans_datetime)
    const enrichedTransaction = {
      ...transaction,
      hour: date.getHours(),
      day_of_week: date.getDay(),
      timestamp: new Date().toISOString(),
    }

    await prod.send({
      topic: TOPICS.TRANSACTIONS_RAW,
      messages: [
        {
          key: transaction.transaction_id,
          value: JSON.stringify(enrichedTransaction),
        },
      ],
    })

    console.log(`[Kafka] Published transaction: ${transaction.transaction_id}`)
    return true
  } catch (error) {
    console.error('[Kafka] Failed to publish transaction:', error)
    return false
  }
}

export async function publishFraudAlert(alert: any): Promise<boolean> {
  try {
    const prod = await getProducer()

    await prod.send({
      topic: TOPICS.FRAUD_ALERTS,
      messages: [
        {
          key: alert.transaction_id,
          value: JSON.stringify({
            ...alert,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    })

    console.log(`[Kafka] Published fraud alert: ${alert.transaction_id}`)
    return true
  } catch (error) {
    console.error('[Kafka] Failed to publish alert:', error)
    return false
  }
}

export async function disconnectKafka(): Promise<void> {
  if (producer && isConnected) {
    await producer.disconnect()
    isConnected = false
    console.log('[Kafka] Producer disconnected')
  }
}
