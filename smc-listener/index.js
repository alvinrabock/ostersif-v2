const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs')

// Configuration from environment variables
const QUEUE_URL = process.env.SQS_QUEUE_URL
const ACCESS_KEY = process.env.SQS_ACCESS_KEY
const SECRET_ACCESS_KEY = process.env.SQS_SECRET_ACCESS_KEY
const AWS_REGION = process.env.SQS_REGION || 'eu-north-1'
const NEXTJS_WEBHOOK_URL = process.env.NEXTJS_WEBHOOK_URL
const REVALIDATE_SECRET = process.env.SERVICE_BUS_REVALIDATE_SECRET

// Validate required environment variables
if (!QUEUE_URL) {
  console.error('ERROR: SQS_QUEUE_URL is required')
  process.exit(1)
}

if (!ACCESS_KEY || !SECRET_ACCESS_KEY) {
  console.error('ERROR: SQS_ACCESS_KEY and SQS_SECRET_ACCESS_KEY are required')
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

// Create SQS client with credentials from SMC UI portal
const client = new SQSClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
})

console.log('SMC SQS Listener starting...')
console.log(`Queue URL: ${QUEUE_URL}`)
console.log(`Region: ${AWS_REGION}`)
console.log(`Webhook URL: ${NEXTJS_WEBHOOK_URL}`)

/**
 * Parse the SQS message body and extract match event data.
 * SMC Push API message format may vary — we handle multiple field patterns.
 */
function parseMessageBody(rawBody) {
  try {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody
    return {
      matchId: body.matchId || body.id || body['match-id'] || body.match_id,
      leagueId: body.leagueId || body['league-id'] || body.league_id || body.league,
      eventType: body.eventType || body['event-type'] || body.event_type || body.type || 'MATCH_UPDATE',
      raw: body,
    }
  } catch {
    console.warn('Failed to parse message body as JSON:', rawBody)
    return { matchId: null, leagueId: null, eventType: 'UNKNOWN', raw: rawBody }
  }
}

/**
 * Process a single SQS message: extract match data, call Next.js webhook
 */
async function handleMessage(message) {
  const { matchId, leagueId, eventType, raw } = parseMessageBody(message.Body)

  console.log(`[${new Date().toISOString()}] Received message:`)
  console.log(JSON.stringify(raw, null, 2))

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
        timestamp: new Date().toISOString(),
      }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`Triggered revalidation for match ${matchId} (${eventType})`)
      if (result.synced === true) {
        console.log(`  CMS sync: OK`)
      } else if (result.synced === false) {
        console.log(`  CMS sync: FAILED — ${result.syncError || 'unknown'}`)
      }
      // synced === null means sync was not attempted (cache-only event)
    } else {
      const errorText = await response.text()
      console.error(`Webhook failed (${response.status}): ${errorText}`)
    }
  } catch (error) {
    console.error('Error calling webhook:', error.message)
  }

  // Delete message from queue after processing (success or failure on webhook)
  try {
    await client.send(new DeleteMessageCommand({
      QueueUrl: QUEUE_URL,
      ReceiptHandle: message.ReceiptHandle,
    }))
  } catch (error) {
    console.error('Failed to delete message from queue:', error.message)
  }
}

/**
 * Main polling loop — long polls SQS (up to 20s per request)
 */
async function main() {
  const command = new ReceiveMessageCommand({
    QueueUrl: QUEUE_URL,
    MaxNumberOfMessages: 10,
    VisibilityTimeout: 30,
    WaitTimeSeconds: 20, // Long polling — waits up to 20s for messages
  })

  console.log('SQS listener is running (long polling)...')

  while (true) {
    try {
      const response = await client.send(command)
      const messages = response.Messages

      if (messages && messages.length > 0) {
        console.log(`Received ${messages.length} message(s)`)
        for (const message of messages) {
          await handleMessage(message)
        }
      }
    } catch (error) {
      console.error('Error polling SQS:', error.message)
      // Wait 5s before retrying on error to avoid tight error loops
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...')
  process.exit(0)
})
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...')
  process.exit(0)
})

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
