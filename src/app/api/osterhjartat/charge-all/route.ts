import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET!, {
    apiVersion: '2026-02-25.clover',
  });
}

// Amount in öre (96 kr = 9600 öre)
const CHARGE_AMOUNT = 9600;
const CHARGE_CURRENCY = 'sek';
const PRODUCT_ID = 'prod_U3RrN3hT05ox57';

export async function POST(request: Request) {
  // Verify admin API key
  const ADMIN_API_KEY = process.env.OSTERHJARTAT_ADMIN_API_KEY;
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '');

  if (!ADMIN_API_KEY || apiKey !== ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const { matchDescription } = await request.json();

    // Find all active Österhjärtat customers
    const customers: Stripe.Customer[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.customers.list({
        limit: 100,
        starting_after: startingAfter,
      });

      const activeCustomers = response.data.filter(
        (customer) => customer.metadata?.osterhjartat === 'active'
      );

      customers.push(...activeCustomers);
      hasMore = response.has_more;

      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    console.log(`Found ${customers.length} active Österhjärtat customers`);

    const results = {
      total: customers.length,
      successful: 0,
      failed: 0,
      errors: [] as { customerId: string; email: string; error: string }[],
    };

    // Charge each customer
    for (const customer of customers) {
      try {
        // Get the default payment method
        const defaultPaymentMethod =
          customer.invoice_settings?.default_payment_method;

        if (!defaultPaymentMethod) {
          results.failed++;
          results.errors.push({
            customerId: customer.id,
            email: customer.email || 'unknown',
            error: 'No default payment method',
          });
          continue;
        }

        // Create a payment intent and charge immediately
        await stripe.paymentIntents.create({
          amount: CHARGE_AMOUNT,
          currency: CHARGE_CURRENCY,
          customer: customer.id,
          payment_method: defaultPaymentMethod as string,
          off_session: true,
          confirm: true,
          description: `Österhjärtat - ${matchDescription || 'Vinst'}`,
          metadata: {
            type: 'osterhjartat',
            product_id: PRODUCT_ID,
            match_description: matchDescription || '',
          },
        });

        results.successful++;
        console.log(`Charged customer ${customer.email}`);
      } catch (err) {
        results.failed++;
        const error = err as Error;
        results.errors.push({
          customerId: customer.id,
          email: customer.email || 'unknown',
          error: error.message,
        });
        console.error(`Failed to charge ${customer.email}:`, error.message);
      }
    }

    return NextResponse.json({
      message: `Charged ${results.successful} of ${results.total} customers`,
      results,
    });
  } catch (error) {
    console.error('Error in charge-all:', error);
    return NextResponse.json(
      { error: 'Failed to process charges' },
      { status: 500 }
    );
  }
}
