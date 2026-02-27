import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sendUpdateCardEmail, sendUnsubscribeEmail } from '@/lib/osterhjartat/email';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET!, {
    apiVersion: '2026-02-25.clover',
  });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const { email, action } = await request.json();

    if (!email || !action) {
      return NextResponse.json(
        { error: 'Email and action are required' },
        { status: 400 }
      );
    }

    // Find customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No registration found for this email' },
        { status: 404 }
      );
    }

    const customer = customers.data[0];

    // Check if customer is active in Österhjärtat
    if (customer.metadata?.osterhjartat !== 'active') {
      return NextResponse.json(
        { error: 'No active registration found for this email' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (action === 'update') {
      // Create a Checkout session in setup mode to update payment method
      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        payment_method_types: ['card'],
        customer: customer.id,
        success_url: `${baseUrl}/osterhjartat/updated`,
        cancel_url: `${baseUrl}/osterhjartat`,
        metadata: {
          type: 'osterhjartat_update',
        },
      });

      // Send email with update link
      if (session.url) {
        await sendUpdateCardEmail(email, session.url);
      }

      return NextResponse.json({
        message: 'Ett mail med en länk för att uppdatera dina kortuppgifter har skickats.',
        emailSent: true,
      });
    }

    if (action === 'unsubscribe') {
      // Create a unique unsubscribe token
      const token = Buffer.from(`${customer.id}:${Date.now()}`).toString(
        'base64'
      );

      const unsubscribeUrl = `${baseUrl}/osterhjartat/unsubscribe?token=${token}`;

      // Send email with unsubscribe link
      await sendUnsubscribeEmail(email, unsubscribeUrl);

      return NextResponse.json({
        message: 'Ett mail med en avregistreringslänk har skickats.',
        emailSent: true,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in manage:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
