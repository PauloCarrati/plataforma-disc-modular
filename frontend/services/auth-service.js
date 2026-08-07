/* ==========================================================
   PLATAFORMA DISC MODULAR
   services/auth-service.js

   Serviço oficial de autenticação.

   Responsável exclusivamente pela comunicação
   com o Supabase Auth.

========================================================== */

var AuthService = (function () {

    const client = SupabaseService.getClient();

    async function login(email, password) {

        const { data, error } =
            await client.auth.signInWithPassword({

                email: email,

                password: password

            });

        return {

            success: !error,

            data: data,

            error: error

        };

    }

    async function logout() {

        const { error } =
            await client.auth.signOut();

        return {

            success: !error,

            error: error

        };

    }

    async function getSession() {

        const { data, error } =
            await client.auth.getSession();

        return {

            success: !error,

            session: data.session,

            error: error

        };

    }

    async function getUser() {

        const { data, error } =
            await client.auth.getUser();

        return {

            success: !error,

            user: data.user,

            error: error

        };

    }

    async function recoverPassword(email) {

        const { error } =
            await client.auth.resetPasswordForEmail(email);

        return {

            success: !error,

            error: error

        };

    }

    return {

        login,

        logout,

        getSession,

        getUser,

        recoverPassword

    };

})();

window.AuthService = AuthService;

console.log("[DISC] AuthService carregado.");