import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UsuarioConRoles {
  id: string;
  email: string;
  created_at: string;
  roles: any[];
  rol_principal?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is authenticated and has admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create client with user's token to verify their session
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has admin role - try both sistemas (usuarios and usuarios_roles)
    let isAdmin = false;

    // Verificar en la tabla usuarios (sistema principal)
    const { data: usuario, error: usuarioError } = await supabaseAdmin
      .from("usuarios")
      .select("rol_id, roles(nombre)")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (usuario && !usuarioError) {
      const rolNombre = usuario.roles?.nombre;
      isAdmin = rolNombre === "admin" || rolNombre === "webmaster" || rolNombre === "super_admin";
    }

    // Si no se encontró en usuarios, verificar en usuarios_roles (sistema alternativo)
    if (!isAdmin) {
      const { data: userRoles, error: rolesError } = await supabaseAdmin
        .from("usuarios_roles")
        .select("rol_id, roles(nombre)")
        .eq("user_id", user.id)
        .eq("activo", true);

      if (!rolesError && userRoles) {
        isAdmin = userRoles.some(
          (ur: any) =>
            ur.roles?.nombre === "admin" ||
            ur.roles?.nombre === "webmaster" ||
            ur.roles?.nombre === "super_admin"
        );
      }
    }

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // List all users using admin client
    const { data: authUsers, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      throw authError;
    }

    // Get roles for each user
    const usuariosConRoles: UsuarioConRoles[] = [];

    for (const authUser of authUsers.users) {
      let roles: any[] = [];
      let rolPrincipal: any = undefined;

      // Primero intentar obtener de la tabla usuarios (sistema principal)
      const { data: usuarioData, error: usuarioErr } = await supabaseAdmin
        .from("usuarios")
        .select(`
          rol_id,
          roles (
            id,
            nombre,
            display_name,
            descripcion,
            nivel_jerarquia,
            activo,
            es_sistema
          )
        `)
        .eq("auth_user_id", authUser.id)
        .maybeSingle();

      if (!usuarioErr && usuarioData?.roles) {
        roles = [usuarioData.roles];
        rolPrincipal = usuarioData.roles;
      }

      // Si no tiene rol en usuarios, intentar usuarios_roles
      if (roles.length === 0) {
        const { data: rolesData, error: rolesErr } = await supabaseAdmin
          .from("usuarios_roles")
          .select(`
            rol_id,
            activo,
            roles (
              id,
              nombre,
              display_name,
              descripcion,
              nivel_jerarquia,
              activo,
              es_sistema
            )
          `)
          .eq("user_id", authUser.id)
          .eq("activo", true);

        if (!rolesErr && rolesData) {
          roles = rolesData.map((r: any) => r.roles).filter(Boolean);
          rolPrincipal = roles.length > 0
            ? roles.reduce((prev: any, current: any) =>
                prev.nivel_jerarquia < current.nivel_jerarquia ? prev : current
              )
            : undefined;
        }
      }

      usuariosConRoles.push({
        id: authUser.id,
        email: authUser.email || "",
        created_at: authUser.created_at,
        roles,
        rol_principal: rolPrincipal,
      });
    }

    return new Response(
      JSON.stringify({ users: usuariosConRoles }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in admin-list-users:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
