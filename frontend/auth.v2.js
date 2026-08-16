/* ==========================================================
   PLATAFORMA DISC MODULAR
   auth.v2.js

   VERSÃO 2.0

   Camada oficial de autenticação.

   Esta versão substitui a autenticação baseada em MockDB
   pelo Supabase Auth, preservando toda a interface da
   aplicação.

========================================================== */

(function () {

"use strict";

/* ==========================================================
   Serviços
========================================================== */

const AuthService = window.AuthService;

/* ==========================================================
   Estado da autenticação
========================================================== */

let currentSession = null;

let currentUser = null;

/* ==========================================================
MENSAGENS DE AUTENTICAÇÃO
Compatibilidade com a interface existente
========================================================== */

function showAuthMsg(id, type, msg) {

    const el =
        document.getElementById(id);

    if (!el) {

        console.warn(
            "[DISC] Elemento de mensagem não encontrado:",
            id
        );

        return;
    }

    el.className =
        "auth-msg " + type;

    el.textContent =
        msg;
}

/* ==========================================================
   Inicialização
========================================================== */

async function initializeAuth() {

    try {

        currentSession =
            await AuthService.getSession();

        currentUser =
            await AuthService.getCurrentAuthUser();

        console.log(
            "[DISC] Auth v2 inicializado."
        );

    }
    catch (error) {

        console.error(
            "[DISC] Erro ao iniciar AuthService:",
            error
        );

    }

}

/* ==========================================================
   MODO DE DESENVOLVIMENTO
========================================================== */

function checkDevMode() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const isDev =
        params.get("dev") === "1";

    const devBlock =
        document.getElementById(
            "dev-access-block"
        );

    if (devBlock) {

        devBlock.style.display =
            isDev ? "block" : "none";

    }

}

/* ==========================================================
   ABAS DE AUTENTICAÇÃO
   Login / Cadastro
========================================================== */

function switchAuthTab(tab) {

    document
        .querySelectorAll(".auth-tab")
        .forEach(function (t, i) {

            t.classList.toggle(
                "active",
                i === (
                    tab === "login"
                        ? 0
                        : 1
                )
            );

        });

    const loginPanel =
        document.getElementById(
            "auth-login"
        );

    const registerPanel =
        document.getElementById(
            "auth-register"
        );

    if (loginPanel) {

        loginPanel.classList.toggle(
            "hidden",
            tab !== "login"
        );

    }

    if (registerPanel) {

        registerPanel.classList.toggle(
            "hidden",
            tab !== "register"
        );

    }

}

/* ==========================================================
   LOGIN
========================================================== */

async function doLogin() {

    const login =
        document
            .getElementById("login-email")
            .value
            .trim();

    const senha =
        document
            .getElementById("login-pass")
            .value;

    if (!login || !senha) {

        showAuthMsg(
            "login-msg",
            "error",
            "Informe seu e-mail (ou telefone) e sua senha."
        );

        return;

    }

    try {

        showAuthMsg(
            "login-msg",
            "success",
            "Autenticando..."
        );

        const result =
            await AuthService.login(
                login,
                senha
            );

        if (!result.success) {

            showAuthMsg(
                "login-msg",
                "error",
                result.message
            );

            return;

        }

        currentSession =
            await AuthService.getSession();

        currentUser =
            await AuthService.getCurrentAuthUser();

        console.log(
            "[DISC] Login realizado.",
            currentUser
        );

        openAdmin();

    }
    catch (error) {

        console.error(error);

        showAuthMsg(
            "login-msg",
            "error",
            "Falha na autenticação."
        );

    }

}

/* ==========================================================
   CADASTRO
========================================================== */

async function doRegister() {

    const nome =
        document
            .getElementById("reg-name")
            .value
            .trim();

    const telefone =
        document
            .getElementById("reg-phone")
            .value
            .trim();

    const email =
        document
            .getElementById("reg-email")
            .value
            .trim();

    const senha =
        document
            .getElementById("reg-pass")
            .value;

    const confirmar =
        document
            .getElementById("reg-pass2")
            .value;

    /* -------------------------
       Validações
    ------------------------- */

    if (!nome) {

        showAuthMsg(
            "reg-msg",
            "error",
            "Informe seu nome."
        );

        return;

    }

    if (!telefone) {

        showAuthMsg(
            "reg-msg",
            "error",
            "Informe seu telefone."
        );

        return;

    }

    if (!email) {

        showAuthMsg(
            "reg-msg",
            "error",
            "Informe seu e-mail."
        );

        return;

    }

    if (!senha) {

        showAuthMsg(
            "reg-msg",
            "error",
            "Informe uma senha."
        );

        return;

    }

    if (senha.length < 6) {

        showAuthMsg(
            "reg-msg",
            "error",
            "A senha deve possuir pelo menos 6 caracteres."
        );

        return;

    }

    if (senha !== confirmar) {

        showAuthMsg(
            "reg-msg",
            "error",
            "As senhas não conferem."
        );

        return;

    }

    showAuthMsg(
        "reg-msg",
        "success",
        "Criando conta..."
    );

    try {

    const result =
        await AuthService.register(
            nome,
            email,
            telefone,
            senha
        );

    if (!result.success) {

        showAuthMsg(
            "reg-msg",
            "error",
            result.message ||
            "Não foi possível criar a conta."
        );

        return;

    }

showAuthMsg(
    "reg-msg",
    "success",
    "✓ Conta criada com sucesso!"
);

console.log(
    "[DISC] Cadastro realizado.",
    result.authUser
);

}
catch (error) {

    console.error(
        "[DISC] Erro no cadastro:",
        error
    );

    showAuthMsg(
        "reg-msg",
        "error",
        "Falha ao criar a conta."
    );

}

}

/* ==========================================================
   LOGOUT
========================================================== */

async function doLogout() {

    try {

        const result =
            await AuthService.logout();

        if (!result.success) {

            console.error(
                "[DISC] Erro ao sair:",
                result.error
            );

            return;

        }

        currentSession = null;

        currentUser = null;

        console.log(
            "[DISC] Logout realizado."
        );

        showScreen("screen-auth");

    }

    catch (error) {

        console.error(
            "[DISC] Erro inesperado no logout:",
            error
        );

    }

}

/* ==========================================================
   Exposição pública
========================================================== */

window.initializeAuth =
    initializeAuth;

    window.doLogin =
    doLogin;

window.doRegister =
doRegister;

window.checkDevMode =
    checkDevMode;

window.doLogout =
    doLogout;

window.switchAuthTab =
    switchAuthTab;

})();