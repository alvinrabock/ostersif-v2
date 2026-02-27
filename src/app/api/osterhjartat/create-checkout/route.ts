import { NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET!, {
    apiVersion: '2026-02-25.clover',
  });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const { email, name } = await request.json();

    // Create a Checkout Session in setup mode to save card for future use
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: ['card'],
      customer_email: email,
      metadata: {
        name: name,
        type: 'osterhjartat',
      },
      success_url: `https://ostersif.se/osterhjartat/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://ostersif.se/osterhjartat?avbruten=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
