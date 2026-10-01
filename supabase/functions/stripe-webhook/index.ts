import Stripe from "https://esm.sh/stripe@14.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Missing signature or webhook secret" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const pedidoId = paymentIntent.metadata.pedido_id;

        if (pedidoId) {
          console.log(`Procesando pago exitoso para pedido ${pedidoId}`);

          // El importe cobrado debe coincidir con el total del pedido; si no, no se confirma
          const { data: pedido, error: pedidoError } = await supabase
            .from("pedidos")
            .select("total, observaciones")
            .eq("id", Number(pedidoId))
            .maybeSingle();

          if (pedidoError || !pedido) {
            console.error(`Pedido ${pedidoId} no encontrado al validar el pago:`, pedidoError);
            return new Response(
              JSON.stringify({ error: "Pedido no encontrado" }),
              { status: 500 }
            );
          }

          const expectedCents = Math.round(Number(pedido.total) * 100);
          const receivedCents = paymentIntent.amount_received;
          const receivedCurrency = String(paymentIntent.currency || "").toLowerCase();

          // Moneda distinta de EUR = importe que no cuadra (mismas unidades en otra moneda valen otra cosa)
          if (receivedCurrency !== "eur" || receivedCents !== expectedCents) {
            const nota = receivedCurrency !== "eur"
              ? `Pago en moneda ${receivedCurrency.toUpperCase()} (esperado EUR), importe ${receivedCents}, total ${(expectedCents / 100).toFixed(2)} €, revisar (pago ${paymentIntent.id}).`
              : `Importe cobrado ${(receivedCents / 100).toFixed(2)} € ≠ total ${(expectedCents / 100).toFixed(2)} €, revisar (pago ${paymentIntent.id}).`;
            console.error(`Pedido ${pedidoId}: ${nota}`);

            await supabase
              .from("pedidos")
              .update({
                observaciones: pedido.observaciones ? `${pedido.observaciones}\n${nota}` : nota,
                updated_at: new Date().toISOString(),
              })
              .eq("id", Number(pedidoId));

            // 200 para que Stripe no reintente: requiere revisión manual
            return new Response(
              JSON.stringify({ received: true, warning: "amount_mismatch" }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // MEJORA: Usar RPC para descontar stock de forma segura
          const { data, error } = await supabase.rpc('confirm_order_and_deduct_stock', {
            p_pedido_id: Number(pedidoId)
          });

          if (error) {
            console.error(`Error confirmando pedido ${pedidoId} via RPC:`, error);
            // Retornamos 200 para evitar reintentos infinitos si es un error de lógica de negocio.
            // (Si prefieres que Stripe reintente en caso de error de conexión, usa 500)
            return new Response(
                JSON.stringify({ error: "Error de base de datos actualizando pedido" }),
                { status: 500 }
            );
          }
          
          console.log(`Pedido ${pedidoId} confirmado y stock actualizado:`, data);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const pedidoId = paymentIntent.metadata.pedido_id;

        if (pedidoId) {
          await supabase
            .from("pedidos")
            .update({
              estado: "cancelado",
              observaciones: `Pago fallido: ${paymentIntent.last_payment_error?.message || "Error desconocido"}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", pedidoId);

          console.log(`Pago fallido para pedido ${pedidoId}`);
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
