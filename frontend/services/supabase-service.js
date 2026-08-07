/* ==========================================================
   PLATAFORMA DISC MODULAR

   services/supabase-service.js

   Responsabilidade:

   Inicializar a conexão oficial da plataforma com o Supabase.

   Nenhum outro módulo deverá criar clientes Supabase.

   Todos utilizarão este serviço.

   ========================================================== */

var SupabaseService = (function () {

    const client =
        supabase.createClient(

            window.DISC_CONFIG.SUPABASE_URL,

            window.DISC_CONFIG.SUPABASE_ANON_KEY,

            {

                auth: {

                    persistSession: true,

                    autoRefreshToken: true,

                    detectSessionInUrl: true

                }

            }

        );

    function getClient() {

        return client;

    }

    return {

        getClient: getClient

    };

})();

/* compatibilidade */

window.SupabaseService = SupabaseService;

console.log("[DISC] Supabase Service inicializado.");