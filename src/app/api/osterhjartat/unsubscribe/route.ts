import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sendUnsubscribeConfirmation } from '@/lib/osterhjartat/email';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET!, {
    apiVersion: '2026-02-25.clover',
  });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Decode the token to get customer ID
    let customerId: string;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [id] = decoded.split(':');
      customerId = id;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    // Retrieve the customer
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if already unsubscribed
    if ((customer as Stripe.Customer).metadata?.osterhjartat !== 'active') {
      return NextResponse.json({
        message: 'Already unsubscribed',
        alreadyUnsubscribed: true,
      });
    }

    // Update customer metadata to mark as inactive
    await stripe.customers.update(customerId, {
      metadata: {
        osterhjartat: 'inactive',
        osterhjartat_unsubscribed_at: new Date().toISOString(),
      },
    });

    // Send confirmation email
    const customerEmail = (customer as Stripe.Customer).email;
    if (customerEmail) {
      await sendUnsubscribeConfirmation(customerEmail);
    }

    console.log(`Österhjärtat unsubscription completed for ${customerEmail}`);

    return NextResponse.json({
      message: 'Successfully unsubscribed',
      email: customerEmail,
    });
  } catch (error) {
    console.error('Error in unsubscribe:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe' },
      { status: 500 }
    );
  }
}
