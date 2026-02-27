import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  sendRegistrationConfirmation,
  sendUpdateConfirmation,
} from '@/lib/osterhjartat/email';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET!, {
    apiVersion: '2026-02-25.clover',
  });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle payment method update
      if (session.metadata?.type === 'osterhjartat_update') {
        const customerId = session.customer as string;
        const setupIntentId = session.setup_intent as string;

        if (customerId && setupIntentId) {
          try {
            const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
            const paymentMethodId = setupIntent.payment_method as string;

            // Attach the new payment method and set as default
            await stripe.paymentMethods.attach(paymentMethodId, {
              customer: customerId,
            });

            await stripe.customers.update(customerId, {
              invoice_settings: {
                default_payment_method: paymentMethodId,
              },
            });

            // Send confirmation email
            const customer = await stripe.customers.retrieve(customerId);
            if (!customer.deleted && customer.email) {
              await sendUpdateConfirmation(customer.email);
            }

            console.log(`Payment method updated for customer ${customerId}`);
          } catch (err) {
            console.error('Error updating payment method:', err);
          }
        }
        break;
      }

      // Only process osterhjartat registrations
      if (session.metadata?.type !== 'osterhjartat') {
        break;
      }

      const customerEmail = session.customer_email;
      const customerName = session.metadata?.name;
      const setupIntentId = session.setup_intent as string;

      if (!customerEmail || !setupIntentId) {
        console.error('Missing customer email or setup intent');
        break;
      }

      try {
        // Get the setup intent to retrieve the payment method
        const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
        const paymentMethodId = setupIntent.payment_method as string;

        // Check if customer already exists
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1,
        });

        let customer: Stripe.Customer;

        if (existingCustomers.data.length > 0) {
          // Update existing customer
          customer = await stripe.customers.update(existingCustomers.data[0].id, {
            name: customerName || undefined,
            metadata: {
              osterhjartat: 'active',
              osterhjartat_registered_at: new Date().toISOString(),
            },
          });
        } else {
          // Create new customer
          customer = await stripe.customers.create({
            email: customerEmail,
            name: customerName || undefined,
            metadata: {
              osterhjartat: 'active',
              osterhjartat_registered_at: new Date().toISOString(),
            },
          });
        }

        // Attach the payment method to the customer and set as default
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        });

        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });

        // Send confirmation email
        await sendRegistrationConfirmation(customerEmail, customerName || customerEmail);

        console.log(`Österhjärtat registration completed for ${customerEmail}`);
      } catch (err) {
        console.error('Error processing checkout session:', err);
      }
      break;
    }

    default:
      // Unhandled event type
      break;
  }

  return NextResponse.json({ received: true });
}
