/* ==========================================================
   PLATAFORMA DISC MODULAR
   services/auth-service.js

   Serviço Oficial de Autenticação

   Responsável por toda comunicação entre
   a Plataforma DISC e o Supabase.

========================================================== */

var AuthService = (function () {

    const client = SupabaseService.getClient();

    /* ======================================================
       LOGIN
       Aceita:
           • telefone
           • e-mail
    ====================================================== */

    async function login(login, password) {

        try {

            let email = login.trim();

            /* ---------------------------------------------
               LOGIN POR TELEFONE
            --------------------------------------------- */

            if (!email.includes("@")) {

                const telefone =
                    login.replace(/\D/g, "");

                const { data, error } =
                    await client
                        .from("usuarios")
                        .select("email")
                        .eq("telefone", telefone)
                        .eq("ativo", true)
                        .single();

                if (error || !data) {

                    return {

                        success: false,

                        message:
                            "Telefone não encontrado."

                    };

                }

                email = data.email;

            }

            /* ---------------------------------------------
               LOGIN SUPABASE
            --------------------------------------------- */

            const {

                data,

                error

            } =
            await client.auth.signInWithPassword({

                email,

                password

            });

            if (error) {

                return {

                    success: false,

                    message: error.message,

                    error

                };

            }

            return {

                success: true,

                session: data.session,

                authUser: data.user

            };

        }

        catch (err) {

            console.error(err);

            return {

                success: false,

                message:
                    "Erro inesperado.",

                error: err

            };

        }

    }

/* ======================================================
   CADASTRO DE USUÁRIO
====================================================== */

async function register(
    nome,
    email,
    telefone,
    password
) {

    try {

        const {
            data,
            error
        } =
        await client.auth.signUp({

            email: email,

            password: password,

            options: {

                data: {

                    nome: nome,

                    telefone: telefone

                }

            }

        });

        if (error) {

            return {

                success: false,

                message: error.message,

                error: error

            };

        }

        return {

            success: true,

            session: data.session,

            authUser: data.user

        };

    }

    catch (err) {

        console.error(
            "[AuthService] Erro no cadastro:",
            err
        );

        return {

            success: false,

            message:
                "Não foi possível criar a conta.",

            error: err

        };

    }

}

    /* ======================================================
       LOGOUT
    ====================================================== */

    async function logout() {

        const { error } =
            await client.auth.signOut();

        return {

            success: !error,

            error

        };

    }

    /* ======================================================
       SESSÃO
    ====================================================== */

    async function getSession() {

        const {

            data,

            error

        } =
        await client.auth.getSession();

        return {

            success: !error,

            session: data.session,

            error

        };

    }

    /* ======================================================
       REFRESH SESSION
    ====================================================== */

    async function refreshSession() {

        const {

            data,

            error

        } =
        await client.auth.refreshSession();

        return {

            success: !error,

            session: data.session,

            error

        };

    }

    /* ======================================================
       USUÁRIO AUTH
    ====================================================== */

    async function getCurrentAuthUser() {

        const {

            data,

            error

        } =
        await client.auth.getUser();

        return {

            success: !error,

            authUser: data.user,

            error

        };

    }

    /* ======================================================
       USUÁRIO DA PLATAFORMA
    ====================================================== */

    async function getCurrentUsuario() {

        const auth =
            await getCurrentAuthUser();

        if (!auth.success || !auth.authUser) {

            return {

                success: false,

                usuario: null

            };

        }

        const {

            data,

            error

        } =
        await client

            .from("usuarios")

            .select("*")

            .eq(

                "auth_user_id",

                auth.authUser.id

            )

            .single();

        return {

            success: !error,

            usuario: data,

            error

        };

    }

    /* ======================================================
       PERFIL DO USUÁRIO
    ====================================================== */

    async function getCurrentProfile() {

        const usuario =
            await getCurrentUsuario();

        if (!usuario.success)

            return usuario;

        return {

            success: true,

            perfil:

                usuario.usuario.perfil_acesso,

            empresa:

                usuario.usuario.empresa_id,

            usuario:

                usuario.usuario

        };

    }

    /* ======================================================
       SENHA
    ====================================================== */

    async function recoverPassword(email) {

        const { error } =

            await client.auth.resetPasswordForEmail(

                email

            );

        return {

            success: !error,

            error

        };

    }

    async function updatePassword(newPassword) {

        const { error } =

            await client.auth.updateUser({

                password:

                    newPassword

            });

        return {

            success: !error,

            error

        };

    }

    /* ======================================================
       LOGIN?
    ====================================================== */

    async function isLogged() {

        const session =
            await getSession();

        return session.session != null;

    }

    /* ======================================================
       API PÚBLICA
    ====================================================== */

    return {

        login,

        register,

        logout,

        getSession,

        refreshSession,

        getCurrentAuthUser,

        getCurrentUsuario,

        getCurrentProfile,

        recoverPassword,

        updatePassword,

        isLogged

    };

})();

window.AuthService = AuthService;

console.log(

    "[DISC] AuthService Oficial carregado."

);