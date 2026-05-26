/* ══════════════════════════════════════════════════════
   auth.js — DISC Platform
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: tudo relacionado a autenticação.
   • Login / Logout / Cadastro
   • Detecção e preenchimento rápido (Demo / Super-Admin)
   • Toggle de visibilidade de senha
   • Dados e credenciais do Super-Admin

   DEPENDE DE (deve ser carregado DEPOIS):
   • app.js        → currentSession, showScreen(), openAdmin()
   • MockDB        → definido em app.js

   EXPÕE (globais chamadas do HTML via onclick=""):
   • switchAuthTab(tab)
   • doLogin()
   • doRegister()
   • loginDemo()
   • loginSuperAdmin()
   • doLogout()
   • togglePassVisibility(inputId, btnId)
══════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════
   SUPER-ADMINISTRADOR
   ⚠ Credenciais hard-coded — em produção mova para
   variável de ambiente ou banco com regra especial.
════════════════════════════════════════════════════ */
const SUPER_ADMIN = {
  id:   'SUPERADMIN',
  name: 'Super-Admin',
  email:'admin@disc.platform',
  pass: 'superdisc2025',
  role: 'superadmin'
};

/* Seed da conta demo — executado uma única vez */
(function seedDemo() {
  if (!MockDB.findAccountByEmail('demo@disc.com')) {
    MockDB.addAccount({
      id: 'ACC_DEMO_001',
      name: 'Conta Demo',
      email: 'demo@disc.com',
      pass: 'demo123',
      createdAt: new Date().toISOString()
    });
  }
})();

/* ════════════════════════════════════════════════════
   NAVEGAÇÃO ENTRE ABAS (Login / Cadastro)
════════════════════════════════════════════════════ */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) =>
    t.classList.toggle('active', i === (tab === 'login' ? 0 : 1))
  );
  document.getElementById('auth-login').classList.toggle('hidden',    tab !== 'login');
  document.getElementById('auth-register').classList.toggle('hidden', tab !== 'register');
}

/* Exibe mensagem de erro ou sucesso no formulário */
function showAuthMsg(id, type, msg) {
  const el = document.getElementById(id);
  el.className   = 'auth-msg ' + type;
  el.textContent = msg;
}

/* ════════════════════════════════════════════════════
   LOGIN
════════════════════════════════════════════════════ */
function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) {
    showAuthMsg('login-msg', 'error', 'Preencha e-mail e senha.');
    return;
  }

  /* Super-Admin tem verificação prioritária */
  if (email === SUPER_ADMIN.email && pass === SUPER_ADMIN.pass) {
    MockDB.setSession(SUPER_ADMIN);
    currentSession = SUPER_ADMIN;
    openAdmin();
    return;
  }

  const account = MockDB.findAccount(email, pass);
  if (!account) {
    showAuthMsg('login-msg', 'error', 'E-mail ou senha incorretos.');
    return;
  }
  MockDB.setSession(account);
  currentSession = account;
  openAdmin();
}

/* ════════════════════════════════════════════════════
   CADASTRO
════════════════════════════════════════════════════ */
function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;

  if (!name || !email || !pass) {
    showAuthMsg('reg-msg', 'error', 'Preencha todos os campos obrigatórios.');
    return;
  }
  if (pass.length < 6) {
    showAuthMsg('reg-msg', 'error', 'Senha deve ter no mínimo 6 caracteres.');
    return;
  }
  if (pass !== pass2) {
    showAuthMsg('reg-msg', 'error', 'As senhas não conferem.');
    return;
  }
  if (MockDB.findAccountByEmail(email)) {
    showAuthMsg('reg-msg', 'error', 'E-mail já cadastrado.');
    return;
  }

  const newAcc = {
    id: 'ACC_' + Date.now(),
    name, email, pass,
    createdAt: new Date().toISOString()
  };
  MockDB.addAccount(newAcc);
  showAuthMsg('reg-msg', 'success', 'Conta criada! Entrando…');
  setTimeout(() => {
    MockDB.setSession(newAcc);
    currentSession = newAcc;
    openAdmin();
  }, 900);
}

/* ════════════════════════════════════════════════════
   ATALHOS DE ACESSO RÁPIDO (Demo e Super-Admin)
════════════════════════════════════════════════════ */
function loginDemo() {
  document.getElementById('login-email').value = 'demo@disc.com';
  document.getElementById('login-pass').value  = 'demo123';
  doLogin();
}

function loginSuperAdmin() {
  document.getElementById('login-email').value = SUPER_ADMIN.email;
  document.getElementById('login-pass').value  = SUPER_ADMIN.pass;
  doLogin();
}

/* ════════════════════════════════════════════════════
   LOGOUT
════════════════════════════════════════════════════ */
function doLogout() {
  MockDB.clearSession();
  currentSession = null;
  showScreen('screen-auth');
}

/* ════════════════════════════════════════════════════
   TOGGLE DE VISIBILIDADE DA SENHA
   Troca type="password" ↔ type="text" e atualiza
   o ícone de olho no botão correspondente.
   Funciona para qualquer campo+botão passados por ID.
════════════════════════════════════════════════════ */
function togglePassVisibility(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if (!input || !btn) return;
  const isShowing = input.type === 'text';
  input.type  = isShowing ? 'password' : 'text';
  btn.classList.toggle('showing', !isShowing);
  btn.title   = isShowing ? 'Mostrar senha' : 'Ocultar senha';
  input.focus(); // mantém foco para não quebrar o fluxo
}
