import Stripe from "https://esm.sh/stripe@14.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Estados en los que un pedido NO web ya no se puede pagar (pagado o cerrado)
const NON_PAYABLE_STATES = ["procesando", "enviado", "completado", "cancelado", "devolucion"];
const SUPER_ADMIN_ROLE_ID = 1;
// La moneda la fija el servidor: si la eligiera el cliente, podría pagar el mismo número de unidades en una moneda más barata
const CURRENCY = "eur";

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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

    // El "amount" y la "currency" que envía el cliente se ignoran: el importe sale de pedidos.total, siempre en euros
    const { metadata = {} } = await req.json();
    const pedidoId = Number(metadata?.pedido_id);

    if (!metadata?.pedido_id || !Number.isInteger(pedidoId) || pedidoId <= 0) {
      return jsonResponse({ error: "Falta el pedido a pagar (pedido_id)." }, 400);
    }

    // Usuario que hace la petición (verify_jwt ya garantiza un JWT válido)
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Usuario no autenticado." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id, rol_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .select("id, usuario_id, tipo, estado, total")
      .eq("id", pedidoId)
      .maybeSingle();

    if (pedidoError || !pedido) {
      return jsonResponse({ error: "Pedido no encontrado." }, 404);
    }

    // Solo el propietario o un super_admin (rol 1). No se usa is_admin(): incluye el rol de cliente.
    const isOwner = !!usuario && pedido.usuario_id === usuario.id;
    const isSuperAdmin = usuario?.rol_id === SUPER_ADMIN_ROLE_ID;
    if (!isOwner && !isSuperAdmin) {
      return jsonResponse({ error: "No tienes permiso para pagar este pedido." }, 403);
    }

    const payable = pedido.tipo === "interno"
      ? pedido.estado === "payment_pending"
      : !NON_PAYABLE_STATES.includes(pedido.estado);
    if (!payable) {
      return jsonResponse({ error: "Este pedido no está pendiente de pago." }, 409);
    }

    const amountCents = Math.round(Number(pedido.total) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return jsonResponse({ error: "El importe del pedido no es válido." }, 409);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: CURRENCY,
      metadata: { ...metadata, pedido_id: String(pedido.id) },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return jsonResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }, 200);
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});
