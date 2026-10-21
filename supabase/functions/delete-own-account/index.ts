import { createClient } from "npm:@supabase/supabase-js@2.58.0";

// Borrado de la propia cuenta (web: Ajustes; app: Mi cuenta → Eliminar mi cuenta).
// Pide la contraseña y la palabra ELIMINAR. Los datos personales se borran o anonimizan
// en el servidor (anonimizar_cuenta_cliente) y después se borra la cuenta de acceso.
// Pedidos y facturas se conservan sin datos personales del perfil: hay obligación legal
// de guardarlos. No se permite a cuentas del personal ni con pedidos pagados en curso.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BLOCKED: Record<string, string> = {
  es_personal: "Las cuentas del personal no se pueden eliminar desde aquí. Contacta con la administración de la librería.",
  pedidos_en_curso: "Tienes pedidos pagados que aún no has recibido. Podrás eliminar tu cuenta cuando te lleguen.",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método no permitido" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "Inicia sesión para eliminar tu cuenta." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const noSession = { auth: { autoRefreshToken: false, persistSession: false } };
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, noSession);
  const supabaseUser = createClient(supabaseUrl, anonKey, { ...noSession, global: { headers: { Authorization: authHeader } } });

  try {
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Tu sesión ha caducado. Vuelve a iniciar sesión." }, 401);

    const { password, confirmation } = await req.json().catch(() => ({ password: "", confirmation: "" }));
    if (confirmation !== "ELIMINAR") return jsonResponse({ error: "Escribe ELIMINAR para confirmar." }, 400);
    if (!password || typeof password !== "string") return jsonResponse({ error: "Escribe tu contraseña." }, 400);
    if (!user.email) return jsonResponse({ error: "No se puede comprobar la contraseña de esta cuenta." }, 400);

    const { error: passwordError } = await createClient(supabaseUrl, anonKey, noSession)
      .auth.signInWithPassword({ email: user.email, password });
    if (passwordError) return jsonResponse({ error: "La contraseña no es correcta." }, 401);

    const { data: result, error: rpcError } = await supabaseAdmin.rpc("anonimizar_cuenta_cliente", { p_auth_user_id: user.id });
    if (rpcError) throw rpcError;
    const outcome = result as { ok: boolean; codigo: string; pedidos?: number[] };
    if (!outcome?.ok) {
      return jsonResponse({ error: BLOCKED[outcome?.codigo] ?? "No se ha podido eliminar la cuenta.", code: outcome?.codigo, pedidos: outcome?.pedidos }, 409);
    }

    // La ficha ya está desvinculada: borrar la cuenta de acceso no arrastra pedidos ni facturas.
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) throw deleteAuthError;

    return jsonResponse({ success: true, code: outcome.codigo });
  } catch (error: unknown) {
    console.error("Error in delete-own-account:", error);
    return jsonResponse({ error: "No se ha podido eliminar la cuenta. Inténtalo de nuevo más tarde." }, 500);
  }
});
