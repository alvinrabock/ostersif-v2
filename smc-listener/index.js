const { ServiceBusClient } = require('@azure/service-bus')

// Configuration from environment variables
const CONNECTION_STRING = process.env.SERVICE_BUS_CONNECTION_STRING
const TOPICS = (process.env.SERVICE_BUS_TOPICS || 'p-sb-smc-sef-allsvenskan,p-sb-smc-sef-superettan').split(',')
const SUBSCRIPTION_NAME = process.env.SERVICE_BUS_SUBSCRIPTION || 'FRO01-2213135e-18a2-5d2d-3d26-8e8e2a912123'
const NEXTJS_WEBHOOK_URL = process.env.NEXTJS_WEBHOOK_URL
const REVALIDATE_SECRET = process.env.SERVICE_BUS_REVALIDATE_SECRET

// Validate required environment variables
if (!CONNECTION_STRING) {
  console.error('ERROR: SERVICE_BUS_CONNECTION_STRING is required')
  process.exit(1)
}

if (!NEXTJS_WEBHOOK_URL) {
  console.error('ERROR: NEXTJS_WEBHOOK_URL is required')
  process.exit(1)
}

if (!REVALIDATE_SECRET) {
  console.error('ERROR: SERVICE_BUS_REVALIDATE_SECRET is required')
  process.exit(1)
}

console.log('SMC Service Bus Listener starting...')
console.log(`Topics: ${TOPICS.join(', ')}`)
console.log(`Subscription: ${SUBSCRIPTION_NAME}`)
console.log(`Webhook URL: ${NEXTJS_WEBHOOK_URL}`)

async function processMessage(message, topic) {
  console.log(`[${new Date().toISOString()}] Received message from ${topic}:`)
  console.log(JSON.stringify(message.body, null, 2))

  // Extract match data from message
  // SMC message format may vary - adjust these fields as needed
  const body = message.body || {}
  const matchId = body.matchId || body.id || body.match_id
  const leagueId = body.leagueId || body.league_id || body.league
  const eventType = body.eventType || body.event_type || body.type || 'MATCH_UPDATE'

  if (!matchId) {
    console.warn('Message missing matchId, skipping revalidation')
    return
  }

  try {
    const response = await fetch(NEXTJS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId,
        leagueId,
        eventType,
        secret: REVALIDATE_SECRET,
        topic,
        timestamp: new Date().toISOString()
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`Triggered revalidation for match ${matchId}:`, result)
    } else {
      const errorText = await response.text()
      console.error(`Webhook failed (${response.status}): ${errorText}`)
    }
  } catch (error) {
    console.error('Error calling webhook:', error.message)
  }
}

async function startListener() {
  const sbClient = new ServiceBusClient(CONNECTION_STRING)

  const receivers = []

  for (const topic of TOPICS) {
    try {
      const receiver = sbClient.createReceiver(topic.trim(), SUBSCRIPTION_NAME)

      receiver.subscribe({
        processMessage: async (message) => {
          await processMessage(message, topic)
        },
        processError: async (args) => {
          console.error(`Error from ${topic}:`, args.error)

          // Log additional context
          if (args.errorSource) {
            console.error(`  Error source: ${args.errorSource}`)
          }
        }
      })

      receivers.push(receiver)
      console.log(`Listening to topic: ${topic}`)
    } catch (error) {
      console.error(`Failed to subscribe to ${topic}:`, error.message)
    }
  }

  if (receivers.length === 0) {
    console.error('No topics subscribed successfully, exiting')
    process.exit(1)
  }

  console.log('Service Bus listener is running...')

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...')
    for (const receiver of receivers) {
      await receiver.close()
    }
    await sbClient.close()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

startListener().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
