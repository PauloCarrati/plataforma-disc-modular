/* ══════════════════════════════════════════════════════
   auth.js — DISC Platform v4
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: autenticação, acesso e recuperação.

   ARQUITETURA DE ACESSO (v4):
   ┌────────────────────────────────────────────────────┐
   │  INTERFACE PÚBLICA  →  login + criar conta apenas  │
   │  ACESSO INTERNO     →  URL ?dev=1                  │
   │    Exibe botões Demo e Super-Admin ocultos na UI   │
   │    Usado por: devs, testes e administração interna │
   │                                                    │
   │  FUTURO (backend real):                            │
   │    • trocar ?dev=1 por painel /admin separado      │
   │    • mover SUPER_ADMIN para variável de ambiente   │
   │    • recovery → endpoint de e-mail real            │
   └────────────────────────────────────────────────────┘

   DEPENDE DE: globals.js (MockDB, currentSession, showScreen)
   EXPÕE:
     switchAuthTab, doLogin, doRegister
     loginDemo, loginSuperAdmin        ← apenas via ?dev=1
     doLogout, togglePassVisibility
     showRecovery, recoveryNext,
     recoveryBack, doResetPassword
     checkDevMode
══════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   SUPER-ADMINISTRADOR
   ⚠ Em produção: mover para variável de ambiente
     ou regra especial no banco de dados.
════════════════════════════════════════════════════ */
var SUPER_ADMIN = {
  id:   'SUPERADMIN',
  name: 'Super-Admin',
  email:'admin@disc.platform',
  pass: 'superdisc2025',
  role: 'superadmin'
};

/* Seed da conta demo — executado uma vez ao carregar */
(function seedDemo() {
  if (!MockDB.findAccountByEmail('demo@disc.com')) {
    MockDB.addAccount({
      id:        'ACC_DEMO_001',
      name:      'Conta Demo',
      email:     'demo@disc.com',
      pass:      'demo123',
      createdAt: new Date().toISOString()
    });
  }
})();

/* ════════════════════════════════════════════════════
   MODO DE DESENVOLVIMENTO — ?dev=1
   Exibe os atalhos Demo e Super-Admin na tela de login.
   Invisível para usuários comuns na URL pública.

   Como acessar:
     http://localhost/index.html?dev=1
     file:///caminho/index.html?dev=1

   Em produção SaaS:
     • Remova o bloco HTML #dev-access-block do index.html
       e use uma rota /admin separada com autenticação
       por IP ou 2FA.
════════════════════════════════════════════════════ */
function checkDevMode() {
  var params  = new URLSearchParams(window.location.search);
  var isDev   = params.get('dev') === '1';
  var devBlock = document.getElementById('dev-access-block');
  if (devBlock) devBlock.style.display = isDev ? 'block' : 'none';
}

/* ════════════════════════════════════════════════════
   ABAS DE AUTENTICAÇÃO (Login / Cadastro)
════════════════════════════════════════════════════ */
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(function(t, i) {
    t.classList.toggle('active', i === (tab === 'login' ? 0 : 1));
  });
  document.getElementById('auth-login').classList.toggle('hidden',    tab !== 'login');
  document.getElementById('auth-register').classList.toggle('hidden', tab !== 'register');
}

function showAuthMsg(id, type, msg) {
  var el         = document.getElementById(id);
  el.className   = 'auth-msg ' + type;
  el.textContent = msg;
}

/* ════════════════════════════════════════════════════
   LOGIN
════════════════════════════════════════════════════ */
function doLogin() {
  var email = document.getElementById('login-email').value.trim();
  var pass  = document.getElementById('login-pass').value;

  if (!email || !pass) {
    showAuthMsg('login-msg', 'error', 'Preencha e-mail e senha.');
    return;
  }

  /* Super-Admin — verificação prioritária */
  if (email === SUPER_ADMIN.email && pass === SUPER_ADMIN.pass) {
    MockDB.setSession(SUPER_ADMIN);
    currentSession = SUPER_ADMIN;
    openAdmin();
    return;
  }

  var account = MockDB.findAccount(email, pass);
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
  var name  = document.getElementById('reg-name').value.trim();
  var email = document.getElementById('reg-email').value.trim();
  var pass  = document.getElementById('reg-pass').value;
  var pass2 = document.getElementById('reg-pass2').value;

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
    showAuthMsg('reg-msg', 'error', 'E-mail já cadastrado. Tente fazer login.');
    return;
  }

  var newAcc = {
    id:        'ACC_' + Date.now(),
    name:      name,
    email:     email,
    pass:      pass,
    createdAt: new Date().toISOString()
  };
  MockDB.addAccount(newAcc);
  showAuthMsg('reg-msg', 'success', '✓ Conta criada com sucesso! Entrando…');
  setTimeout(function() {
    MockDB.setSession(newAcc);
    currentSession = newAcc;
    openAdmin();
  }, 900);
}

/* ════════════════════════════════════════════════════
   ATALHOS DE DESENVOLVIMENTO
   Só aparecem quando ?dev=1 está na URL.
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
════════════════════════════════════════════════════ */
function togglePassVisibility(inputId, btnId) {
  var input     = document.getElementById(inputId);
  var btn       = document.getElementById(btnId);
  if (!input || !btn) return;
  var isShowing = input.type === 'text';
  input.type    = isShowing ? 'password' : 'text';
  btn.classList.toggle('showing', !isShowing);
  btn.title     = isShowing ? 'Mostrar senha' : 'Ocultar senha';
  input.focus();
}

/* ════════════════════════════════════════════════════
   RECUPERAÇÃO DE SENHA — 3 etapas
   ─────────────────────────────────────────────────
   Etapa 1 (request) : usuário informa o e-mail
   Etapa 2 (token)   : código simulado é exibido
                        (substituir por e-mail real)
   Etapa 3 (reset)   : nova senha + confirmação
   Etapa 4 (success) : confirmação visual

   PREPARADO PARA BACKEND REAL:
   Na Etapa 1, descomente o fetch() abaixo e aponte
   para seu endpoint de e-mail (SendGrid, Resend, etc).
   Na Etapa 3, envie o token + nova senha para a API
   em vez de salvar direto no localStorage.
════════════════════════════════════════════════════ */

/* Estado interno do fluxo de recovery */
var _recovery = {
  step:    1,       /* etapa atual: 1, 2, 3 */
  email:   '',      /* e-mail informado      */
  token:   '',      /* token gerado          */
  account: null     /* conta encontrada      */
};

/* Abre a tela de recuperação e reseta o estado */
function showRecovery() {
  _recovery = { step: 1, email: '', token: '', account: null };
  _recoveryRenderStep(1);
  ALL_SCREENS.forEach(function(s) {
    document.getElementById(s).classList.add('hidden');
  });
  document.getElementById('screen-recovery').classList.remove('hidden');
}

/* Volta para o login a partir da tela de recovery */
function recoveryBack() {
  document.getElementById('screen-recovery').classList.add('hidden');
  showScreen('screen-auth');
}

/* Atualiza indicador de etapas (bolinhas) */
function _recoveryUpdateDots(step) {
  document.querySelectorAll('.step-dot').forEach(function(dot, i) {
    var n = i + 1;
    dot.classList.remove('active', 'done');
    if (n === step)  dot.classList.add('active');
    if (n < step)    dot.classList.add('done');
  });
}

/* Exibe somente o step correto */
function _recoveryRenderStep(step) {
  _recovery.step = step;
  document.querySelectorAll('.recovery-step').forEach(function(el) {
    el.classList.remove('active');
  });
  var active = document.getElementById('rec-step-' + step);
  if (active) active.classList.add('active');
  _recoveryUpdateDots(step);
}

/* Avança para o próximo passo com validação */
function recoveryNext(step) {
  if (step === 1) {
    /* ── Etapa 1: valida e-mail ── */
    var email   = document.getElementById('rec-email').value.trim().toLowerCase();
    var msgEl   = document.getElementById('rec-msg-1');
    msgEl.className   = 'auth-msg';
    msgEl.textContent = '';

    if (!email) {
      msgEl.className   = 'auth-msg error';
      msgEl.textContent = 'Informe seu e-mail cadastrado.';
      return;
    }

    var account = MockDB.findAccountByEmail(email);

    /* ── DESCOMENTE PARA BACKEND REAL ────────────────────
    // Envie o e-mail pelo seu serviço (SendGrid, Resend…)
    // fetch('/api/auth/forgot-password', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email: email })
    // });
    // Neste ponto: sempre avance (não revele se o e-mail existe)
    ─────────────────────────────────────────────────────── */

    /* Para UX de segurança: sempre avança (não revela se e-mail existe) */
    _recovery.email   = email;
    _recovery.account = account;

    /* Gera token simulado de 6 dígitos */
    _recovery.token = String(Math.floor(100000 + Math.random() * 900000));

    /* Exibe o token na tela (em produção: enviar por e-mail) */
    var tokenValEl = document.getElementById('rec-token-value');
    var tokenEmailEl = document.getElementById('rec-token-email');
    if (tokenValEl)   tokenValEl.textContent  = _recovery.token;
    if (tokenEmailEl) tokenEmailEl.textContent = email;

    var btnEl = document.getElementById('rec-btn-1');
    if (btnEl) { btnEl.innerHTML = '⏳ Enviando…'; btnEl.disabled = true; }
    setTimeout(function() {
      if (btnEl) { btnEl.innerHTML = 'Enviar Código →'; btnEl.disabled = false; }
      _recoveryRenderStep(2);
    }, 900);

  } else if (step === 2) {
    /* ── Etapa 2: valida token ── */
    var inputToken = document.getElementById('rec-token-input').value.trim();
    var msgEl2     = document.getElementById('rec-msg-2');
    msgEl2.className   = 'auth-msg';
    msgEl2.textContent = '';

    if (!inputToken) {
      msgEl2.className   = 'auth-msg error';
      msgEl2.textContent = 'Digite o código de verificação.';
      return;
    }
    if (inputToken !== _recovery.token) {
      msgEl2.className   = 'auth-msg error';
      msgEl2.textContent = 'Código incorreto. Verifique e tente novamente.';
      document.getElementById('rec-token-input').value = '';
      return;
    }

    /* ── DESCOMENTE PARA BACKEND REAL ────────────────────
    // await fetch('/api/auth/verify-token', {
    //   method: 'POST',
    //   body: JSON.stringify({ email: _recovery.email, token: inputToken })
    // });
    ─────────────────────────────────────────────────────── */

    _recoveryRenderStep(3);

  } else if (step === 3) {
    /* ── Etapa 3: redefine a senha ── */
    var newPass  = document.getElementById('rec-new-pass').value;
    var confPass = document.getElementById('rec-conf-pass').value;
    var msgEl3   = document.getElementById('rec-msg-3');
    msgEl3.className   = 'auth-msg';
    msgEl3.textContent = '';

    if (!newPass) {
      msgEl3.className   = 'auth-msg error';
      msgEl3.textContent = 'Digite a nova senha.';
      return;
    }
    if (newPass.length < 6) {
      msgEl3.className   = 'auth-msg error';
      msgEl3.textContent = 'A senha deve ter no mínimo 6 caracteres.';
      return;
    }
    if (newPass !== confPass) {
      msgEl3.className   = 'auth-msg error';
      msgEl3.textContent = 'As senhas não conferem.';
      return;
    }

    /* Persiste a nova senha no localStorage (MockDB) */
    if (_recovery.account) {
      var accounts = MockDB.getAccounts();
      accounts = accounts.map(function(a) {
        if (a.email === _recovery.email) {
          a.pass = newPass;
        }
        return a;
      });
      MockDB.setAccounts(accounts);
    }

    /* ── DESCOMENTE PARA BACKEND REAL ────────────────────
    // await fetch('/api/auth/reset-password', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     email: _recovery.email,
    //     token: _recovery.token,
    //     newPassword: newPass
    //   })
    // });
    ─────────────────────────────────────────────────────── */

    _recoveryRenderStep(4);
  }
}

/* Reenvia o código (reseta token e volta ao step 2 com novo token) */
function recoveryResend() {
  _recovery.token = String(Math.floor(100000 + Math.random() * 900000));
  var tokenValEl  = document.getElementById('rec-token-value');
  if (tokenValEl) tokenValEl.textContent = _recovery.token;
  document.getElementById('rec-token-input').value = '';
  var msgEl = document.getElementById('rec-msg-2');
  msgEl.className   = 'auth-msg success';
  msgEl.textContent = '✓ Novo código gerado com sucesso.';
  setTimeout(function() {
    msgEl.className = 'auth-msg'; msgEl.textContent = '';
  }, 3000);
}

/* Indicador de força da senha em tempo real */
function checkPassStrength(inputId) {
  var val  = document.getElementById(inputId).value;
  var fill = document.getElementById('pass-strength-fill');
  var lbl  = document.getElementById('pass-strength-label');
  if (!fill || !lbl) return;

  var score = 0;
  if (val.length >= 6)                    score++;
  if (val.length >= 10)                   score++;
  if (/[A-Z]/.test(val))                  score++;
  if (/[0-9]/.test(val))                  score++;
  if (/[^A-Za-z0-9]/.test(val))           score++;

  var levels = [
    { pct:'0%',   color:'transparent',     txt:''           },
    { pct:'20%',  color:'#FF4D4D',         txt:'Muito fraca'},
    { pct:'40%',  color:'#ff8c42',         txt:'Fraca'      },
    { pct:'60%',  color:'#FFCC00',         txt:'Razoável'   },
    { pct:'80%',  color:'#2ECC71',         txt:'Forte'      },
    { pct:'100%', color:'#1a8a4a',         txt:'Muito forte'}
  ];
  var l = levels[score];
  fill.style.width      = l.pct;
  fill.style.background = l.color;
  lbl.textContent       = l.txt;
  lbl.style.color       = l.color;
}
