import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type DeleteResult = {
  table: string;
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "No authorization header" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { confirmation } = await req.json().catch(() => ({ confirmation: "" }));
    if (confirmation !== "ELIMINAR") {
      return jsonResponse({ error: "Confirmation text is required" }, 400);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("usuarios")
      .select("id, auth_user_id, email")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const profileId = profile?.id ?? user.id;
    const results: DeleteResult[] = [];

    const safeDelete = async (
      table: string,
      column: string,
      value: string | number | null | undefined,
      required = false,
    ) => {
      if (value === null || value === undefined || value === "") return;

      const { error } = await supabaseAdmin.from(table).delete().eq(column, value);
      const optionalSchemaError =
        !required &&
        error &&
        (error.code === "42P01" ||
          error.code === "42703" ||
          error.message?.includes("Could not find the table") ||
          error.message?.includes("Could not find the") ||
          error.message?.includes("does not exist"));

      results.push({
        table,
        ok: !error || Boolean(optionalSchemaError),
        skipped: Boolean(optionalSchemaError),
        error: error?.message,
      });
    };

    const { data: pedidos } = await supabaseAdmin
      .from("pedidos")
      .select("id")
      .eq("usuario_id", profileId);

    const pedidoIds = pedidos?.map((pedido: { id: number }) => pedido.id) ?? [];

    for (const pedidoId of pedidoIds) {
      const { data: invoices } = await supabaseAdmin
        .from("invoices")
        .select("id")
        .eq("order_id", String(pedidoId));

      for (const invoice of invoices ?? []) {
        await safeDelete("invoice_items", "invoice_id", invoice.id);
      }

      await safeDelete("invoices", "order_id", pedidoId);
      await safeDelete("reembolsos", "pedido_id", pedidoId);
      await safeDelete("facturas", "pedido_id", pedidoId);
      await safeDelete("envios", "pedido_id", pedidoId);
      await safeDelete("documentos", "pedido_id", pedidoId);
      await safeDelete("pedido_detalles", "pedido_id", pedidoId);
    }

    await safeDelete("pedidos", "usuario_id", profileId, true);
    await safeDelete("notificaciones", "usuario_id", profileId, true);
    await safeDelete("reservas", "usuario_id", profileId, true);
    await safeDelete("carritos", "user_id", profileId, true);
    await safeDelete("wishlist", "user_id", profileId, true);
    await safeDelete("usuarios_roles", "user_id", user.id);
    await safeDelete("usuarios_roles", "user_id", profileId);
    await safeDelete("reviews", "usuario_id", user.id);
    await safeDelete("reviews", "usuario_id", profileId);
    await safeDelete("usuarios", "id", profileId, true);

    const blockingError = results.find((result) => !result.ok);
    if (blockingError) {
      return jsonResponse(
        {
          error: `No se pudo eliminar completamente la cuenta. Fallo en ${blockingError.table}: ${blockingError.error}`,
          details: results,
        },
        500,
      );
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      throw deleteAuthError;
    }

    return jsonResponse({ success: true, details: results });
  } catch (error: unknown) {
    console.error("Error in delete-own-account:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500,
    );
  }
});
