import Stripe from "https://esm.sh/stripe@14.10.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    // Get Stripe secret key from environment
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })
    // Get paymentIntentId from request body
    const { paymentIntentId } = await req.json()
    if (!paymentIntentId) {
      return new Response(
        JSON.stringify({ error: 'paymentIntentId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    // Fetch PaymentIntent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    // Return the payment method types
    return new Response(
      JSON.stringify({
        payment_method_types: paymentIntent.payment_method_types,
        payment_method: paymentIntent.payment_method,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
        amount: paymentIntent.amount,
        amount_received: paymentIntent.amount_received,
        currency: paymentIntent.currency,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Error fetching PaymentIntent:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch PaymentIntent',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
});
