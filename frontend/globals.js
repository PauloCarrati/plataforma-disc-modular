/* ══════════════════════════════════════════════════════
   globals.js — DISC Platform
   ─────────────────────────────────────────────────────
   ARQUIVO CENTRAL DE DEPENDÊNCIAS COMPARTILHADAS

   Este arquivo resolve o problema de "X is not defined"
   que ocorre quando múltiplos módulos JS tentam acessar
   o mesmo objeto mas ele ainda não foi declarado.

   REGRA DE OURO:
   ┌──────────────────────────────────────────────────┐
   │  Tudo que é LIDO por 2 ou mais arquivos .js      │
   │  deve ser DECLARADO aqui, com var (não const/let) │
   │  para garantir escopo verdadeiramente global.     │
   └──────────────────────────────────────────────────┘

   ORDEM NO index.html:
     1. disc-engine.js  (dados DISC — sem dependências)
     2. globals.js      ← ESTE ARQUIVO
     3. app.js          (quiz, computeResults, init)
     4. auth.js         (login, logout, cadastro)
     5. dashboard.js    (painel admin)
     6. reports.js      (resultados e PDF)

   ⚠  SEM 'use strict' — necessário para que var
      declare variáveis no escopo global (window).
══════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   STORE GLOBAL DE PARTICIPANTES
   Array único em memória compartilhado por todos os
   módulos durante a sessão ativa do navegador.
   Inicializado aqui para que qualquer módulo possa
   ler/escrever sem risco de ReferenceError.
════════════════════════════════════════════════════ */
if (!window.__DISC_GLOBAL_STORE) {
  window.__DISC_GLOBAL_STORE = [];
}

/* ════════════════════════════════════════════════════
   CENTRALDB — Camada de persistência de dados
   ─────────────────────────────────────────────────
   Gerencia o ciclo de vida dos resultados DISC:
     1. Memória (window.__DISC_GLOBAL_STORE) — imediato
     2. localStorage                         — F5 safe
     3. Backend HTTP/Firestore               — multi-device
                                               (descomente)

   PARA ATIVAR SYNC REAL ENTRE DISPOSITIVOS:
   Descomente UMA das opções em CentralDB.push().

   OPÇÃO A — REST API (Node / Supabase / Railway):
     await fetch('https://SEU_BACKEND/api/disc/results', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(participant)
     });

   OPÇÃO B — Firebase Firestore (v9 modular):
     await addDoc(
       collection(window._firestore, 'disc_participants'),
       participant
     );
════════════════════════════════════════════════════ */
var CentralDB = {

  /* Startup: carrega localStorage → store global (sem duplicatas) */
  init: function() {
    var saved = JSON.parse(localStorage.getItem('disc_participants') || '[]');
    saved.forEach(function(p) {
      if (!window.__DISC_GLOBAL_STORE.find(function(x) { return x.id === p.id; })) {
        window.__DISC_GLOBAL_STORE.push(p);
      }
    });
  },

  /* Grava um resultado nos dois níveis locais + hook de backend */
  push: function(participant) {
    if (window.__DISC_GLOBAL_STORE.find(function(x) { return x.id === participant.id; })) return;

    /* 1. Memória global — instantâneo */
    window.__DISC_GLOBAL_STORE.unshift(participant);

    /* 2. localStorage — persiste após F5 */
    localStorage.setItem('disc_participants',
      JSON.stringify(window.__DISC_GLOBAL_STORE));

    /* ── DESCOMENTE PARA ATIVAR BACKEND ──────────────────
    // OPÇÃO A — REST API genérica
    fetch('https://SEU_BACKEND/api/disc/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant)
    }).catch(function(err) {
      console.warn('[CentralDB] Falha no sync:', err);
    });

    // OPÇÃO B — Firebase Firestore
    // addDoc(collection(window._firestore,'disc_participants'), participant);
    ───────────────────────────────────────────────────── */
  },

  getAll: function() {
    return window.__DISC_GLOBAL_STORE.slice();
  },

  getByAccount: function(id) {
    return window.__DISC_GLOBAL_STORE.filter(function(p) {
      return p.account_id === id;
    });
  },

  getByShareId: function(sid) {
    return window.__DISC_GLOBAL_STORE.find(function(p) {
      return p.shareId === sid;
    }) || null;
  },

  delete: function(id) {
    window.__DISC_GLOBAL_STORE = window.__DISC_GLOBAL_STORE.filter(function(p) {
      return p.id !== id;
    });
    localStorage.setItem('disc_participants',
      JSON.stringify(window.__DISC_GLOBAL_STORE));
  }
};

/* ════════════════════════════════════════════════════
   MOCKDB — Banco local de contas e sessão
   Participantes delegados ao CentralDB acima.
   Lido por: auth.js, dashboard.js, reports.js, app.js
════════════════════════════════════════════════════ */
var MockDB = {

  /* ── Contas de gestores ── */
  getAccounts: function() {
    return JSON.parse(localStorage.getItem('disc_accounts') || '[]');
  },
  setAccounts: function(d) {
    localStorage.setItem('disc_accounts', JSON.stringify(d));
  },
  addAccount: function(acc) {
    var list = MockDB.getAccounts();
    list.push(acc);
    MockDB.setAccounts(list);
  },
  findAccount: function(email, pass) {
    return MockDB.getAccounts().find(function(a) {
      return a.email === email && a.pass === pass;
    }) || null;
  },
  findAccountByEmail: function(email) {
    return MockDB.getAccounts().find(function(a) {
      return a.email === email;
    }) || null;
  },

  /* Busca conta por telefone (apenas dígitos) e opcionalmente senha.
     pass=null → só verifica existência (para checar duplicata no cadastro). */
  findAccountByPhone: function(phoneDigits, pass) {
    return MockDB.getAccounts().find(function(a) {
      var accDigits = (a.phoneDigits || (a.phone || '').replace(/\D/g, ''));
      if (accDigits !== phoneDigits) return false;
      if (pass === null) return true;       /* só verifica existência */
      return a.pass === pass;
    }) || null;
  },

  /* ── Participantes — delegados ao CentralDB ── */
  getAllParticipants: function()    { return CentralDB.getAll(); },
  addParticipant:    function(p)   { CentralDB.push(p); },
  getByAccount:      function(id)  { return CentralDB.getByAccount(id); },
  getByShareId:      function(sid) { return CentralDB.getByShareId(sid); },
  deleteParticipant: function(id)  { CentralDB.delete(id); },
  setParticipants:   function()    { /* no-op: compatibilidade */ },

  /* ── Sessão do gestor logado ── */
  getSession: function() {
    return JSON.parse(localStorage.getItem('disc_session') || 'null');
  },
  setSession: function(d) {
    localStorage.setItem('disc_session', JSON.stringify(d));
  },
  clearSession: function() {
    localStorage.removeItem('disc_session');
  }
};

/* ════════════════════════════════════════════════════
   ESTADO GLOBAL — variáveis de runtime
   Declaradas com var para serem verdadeiramente globais.
   Lidas e escritas por app.js, auth.js, dashboard.js e reports.js.
════════════════════════════════════════════════════ */
var currentSession     = null;  /* conta logada (gestor ou superadmin) */
var currentParticipant = null;  /* dados do form de identificação      */
var currentQ           = 0;     /* índice da questão atual no quiz     */
/* answers legado removido — substituído por rankAnswers em quiz-engine.js */
var lastResult         = null;  /* último resultado calculado          */

/* ── Estado do ranking (v5) ──
   rankAnswers e RANK_WEIGHTS são declarados em quiz-engine.js.
   Declarados aqui como referência para que globals.js documente
   todas as variáveis de estado da aplicação.
   rankAnswers[i] = array de 4 opções na ordem definida pelo usuário.
   Inicializado como null e preenchido pelo QuizEngine.init(). */
var pieChart           = null;  /* instância Chart.js — gráfico pizza  */
var barChart           = null;  /* instância Chart.js — gráfico barras */

/* ════════════════════════════════════════════════════
   TELAS — lista de IDs usada por showScreen()
════════════════════════════════════════════════════ */
var ALL_SCREENS = [
  'screen-auth', 'screen-ident', 'screen-quiz',
  'screen-loading', 'screen-result', 'screen-admin', 'screen-public',
  'screen-recovery'
];

/* ════════════════════════════════════════════════════
   NAVEGAÇÃO — showScreen() e showToast()
   Definidas aqui porque são usadas por TODOS os módulos.
════════════════════════════════════════════════════ */
function showScreen(id) {
  ALL_SCREENS.forEach(function(s) {
    document.getElementById(s).classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden');
}

function showToast(msg) {
  var toast = document.getElementById('share-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 2800);
}

/* ==========================================================
   MÁSCARA DE LOGIN
   Telefone ou e-mail
========================================================== */

function loginInputMask(el) {

    var val = el.value;

    /* ---------------------------------------------
       Modo e-mail
       Se contém @ ou começa com letra,
       não aplica máscara.
    --------------------------------------------- */

    if (
        val.indexOf('@') !== -1 ||
        /^[a-zA-Z]/.test(val)
    ) {

        return;

    }

    /* ---------------------------------------------
       Modo telefone
    --------------------------------------------- */

    var digits =
        val.replace(/\D/g, '');

    if (digits.length === 0) {

        el.value = '';

        return;

    }

    if (digits.length <= 2) {

        el.value =
            '(' + digits;

    }

    else if (digits.length <= 7) {

        el.value =
            '(' +
            digits.slice(0, 2) +
            ') ' +
            digits.slice(2);

    }

    else if (digits.length <= 11) {

        el.value =
            '(' +
            digits.slice(0, 2) +
            ') ' +
            digits.slice(2, 7) +
            '-' +
            digits.slice(7);

    }

    else {

        digits =
            digits.slice(0, 11);

        el.value =
            '(' +
            digits.slice(0, 2) +
            ') ' +
            digits.slice(2, 7) +
            '-' +
            digits.slice(7);

    }

}

/* ════════════════════════════════════════════════════
   UTILITÁRIO — escHtml()
   Sanitiza strings antes de inserir em innerHTML.
   Usada por dashboard.js (tabela de participantes).
════════════════════════════════════════════════════ */
function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ════════════════════════════════════════════════════
   UTILITÁRIO — getBaseURL()
   Gera a URL base correta para links de avaliação e
   compartilhamento, independente do ambiente:
     • Arquivo local (file://) → caminho do arquivo
     • Servidor (http/https)   → origin + pathname
   Usada por dashboard.js (buildEvalLink) e
   reports.js (shareResult).
════════════════════════════════════════════════════ */
function getBaseURL() {
  if (window.location.protocol === 'file:') {
    return window.location.href.split('?')[0];
  }
  return window.location.origin + window.location.pathname;
}

console.log('[DISC] globals.js carregado — MockDB, CentralDB, estado e utilitários prontos.');
