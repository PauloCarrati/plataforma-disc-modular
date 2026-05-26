/* ══════════════════════════════════════════════════════
   app.js — DISC Platform
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: núcleo da aplicação.
   • CentralDB     — camada de dados com sync hooks
   • MockDB        — contas, sessão e delegação ao CentralDB
   • Estado global — variáveis compartilhadas entre módulos
   • Navegação     — showScreen(), showToast()
   • Quiz          — renderQ(), selectOpt(), nextQ(), prevQ()
   • Identificação — phoneMask(), validateIdentForm()
   • computeResults() — cálculo DISC e salvamento
   • checkExternalMode() — detecção de ?modo=avaliacao
   • init()        — ponto de entrada do sistema

   DEVE SER O PRIMEIRO .js carregado (antes de auth,
   dashboard, reports). Os demais dependem das globais
   definidas aqui: currentSession, lastResult, showScreen,
   MockDB, CentralDB, etc.
══════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════
   CENTRAL DB — Camada de dados unificada
   ════════════════════════════════════════════════════

   ARQUITETURA DE SINCRONIZAÇÃO:
   ┌─────────────────────────────────────────────────┐
   │  window.__DISC_GLOBAL_STORE                     │
   │  Array em memória — compartilhado por TODOS os  │
   │  módulos desta página durante a sessão ativa.   │
   │                                                 │
   │  ➜ localStorage : persistência local (F5 safe)  │
   │  ➜ Backend HTTP : sync entre dispositivos       │
   │    (descomente as opções abaixo para ativar)    │
   └─────────────────────────────────────────────────┘

   ── PARA ATIVAR SINCRONIZAÇÃO REAL ────────────────
   Descomente UMA das opções dentro de CentralDB.push():

   OPÇÃO A — REST API (Node.js / Supabase / Railway):
     await fetch('https://SEU_BACKEND/api/disc/results', {
       method:  'POST',
       headers: { 'Content-Type': 'application/json' },
       body:    JSON.stringify(participant)
     });

   OPÇÃO B — Firebase Firestore (SDK v9 modular):
     import { getFirestore, collection, addDoc }
       from 'firebase/firestore';
     const db = getFirestore(firebaseApp);
     await addDoc(collection(db, 'disc_participants'), participant);

   Quando hospedado em servidor, qualquer dispositivo
   que responda o teste envia para o mesmo banco e o
   Super-Admin vê em tempo real.
════════════════════════════════════════════════════ */

if (!window.__DISC_GLOBAL_STORE) {
  window.__DISC_GLOBAL_STORE = [];
}

const CentralDB = {

  /* Inicializa na startup: funde localStorage → store global */
  init() {
    const saved = JSON.parse(localStorage.getItem('disc_participants') || '[]');
    saved.forEach(p => {
      if (!window.__DISC_GLOBAL_STORE.find(x => x.id === p.id)) {
        window.__DISC_GLOBAL_STORE.push(p);
      }
    });
  },

  /* Grava um novo resultado nos três níveis */
  async push(participant) {
    if (window.__DISC_GLOBAL_STORE.find(x => x.id === participant.id)) return;

    /* 1. Memória global — instantâneo */
    window.__DISC_GLOBAL_STORE.unshift(participant);

    /* 2. localStorage — sobrevive a F5 */
    localStorage.setItem('disc_participants',
      JSON.stringify(window.__DISC_GLOBAL_STORE));

    /* ── DESCOMENTE PARA ATIVAR BACKEND ──────────────────────
    // OPÇÃO A — REST API genérica
    try {
      await fetch('https://SEU_BACKEND/api/disc/results', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(participant)
      });
    } catch (err) {
      console.warn('[CentralDB] Falha no sync com backend:', err);
      // Continua offline — dado já está no localStorage
    }

    // OPÇÃO B — Firebase Firestore (v9 modular)
    // const db = getFirestore(firebaseApp);
    // await addDoc(collection(db, 'disc_participants'), participant);
    ─────────────────────────────────────────────────────────── */
  },

  getAll()          { return [...window.__DISC_GLOBAL_STORE]; },
  getByAccount(id)  { return window.__DISC_GLOBAL_STORE.filter(p => p.account_id === id); },
  getByShareId(sid) { return window.__DISC_GLOBAL_STORE.find(p => p.shareId === sid) || null; },
  delete(id) {
    window.__DISC_GLOBAL_STORE = window.__DISC_GLOBAL_STORE.filter(p => p.id !== id);
    localStorage.setItem('disc_participants',
      JSON.stringify(window.__DISC_GLOBAL_STORE));
  }
};

/* ════════════════════════════════════════════════════
   MOCK DATABASE — contas e sessão
   Participantes delegados inteiramente ao CentralDB.
════════════════════════════════════════════════════ */
const MockDB = {
  /* Contas */
  getAccounts:        ()      => JSON.parse(localStorage.getItem('disc_accounts') || '[]'),
  setAccounts:        (d)     => localStorage.setItem('disc_accounts', JSON.stringify(d)),
  addAccount:         (acc)   => { const l = MockDB.getAccounts(); l.push(acc); MockDB.setAccounts(l); },
  findAccount:        (e, p)  => MockDB.getAccounts().find(a => a.email === e && a.pass === p) || null,
  findAccountByEmail: (email) => MockDB.getAccounts().find(a => a.email === email) || null,

  /* Participantes — delegados ao CentralDB */
  getAllParticipants:  ()      => CentralDB.getAll(),
  addParticipant:     (p)     => CentralDB.push(p),
  getByAccount:       (id)    => CentralDB.getByAccount(id),
  getByShareId:       (sid)   => CentralDB.getByShareId(sid),
  deleteParticipant:  (id)    => CentralDB.delete(id),
  setParticipants:    ()      => {}, // no-op — mantido para compatibilidade

  /* Sessão */
  getSession:   ()  => JSON.parse(localStorage.getItem('disc_session') || 'null'),
  setSession:   (d) => localStorage.setItem('disc_session', JSON.stringify(d)),
  clearSession: ()  => localStorage.removeItem('disc_session')
};

/* ════════════════════════════════════════════════════
   ESTADO GLOBAL
   Variáveis lidas e escritas por todos os módulos.
════════════════════════════════════════════════════ */
let currentSession     = null; // conta logada (gestor ou SUPER_ADMIN)
let currentParticipant = null; // dados do form de identificação
let currentQ           = 0;    // índice da questão atual no quiz
let answers            = new Array(20).fill(null); // respostas do quiz
let lastResult         = null; // último resultado calculado
let pieChart           = null; // instância Chart.js — pizza
let barChart           = null; // instância Chart.js — barras

/* ════════════════════════════════════════════════════
   NAVEGAÇÃO ENTRE TELAS
════════════════════════════════════════════════════ */
const ALL_SCREENS = [
  'screen-auth', 'screen-ident', 'screen-quiz',
  'screen-loading', 'screen-result', 'screen-admin', 'screen-public'
];

function showScreen(id) {
  ALL_SCREENS.forEach(s => document.getElementById(s).classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

/* Toast genérico — usado por dashboard.js e reports.js */
function showToast(msg) {
  const toast = document.getElementById('share-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

/* ════════════════════════════════════════════════════
   QUIZ — renderização e navegação
════════════════════════════════════════════════════ */
function renderQ() {
  const q   = questions[currentQ];
  const idx = currentQ;

  document.getElementById('q-cur').textContent     = idx + 1;
  document.getElementById('q-num-lbl').textContent  = `QUESTÃO ${String(idx + 1).padStart(2,'0')} / 20`;
  document.getElementById('q-text').textContent     = q.text;
  document.getElementById('prog-fill').style.width  = Math.max(5, (idx / 20) * 100) + '%';

  const optsEl = document.getElementById('q-opts');
  optsEl.innerHTML = '';
  q.options.forEach((opt, oi) => {
    const div       = document.createElement('div');
    div.className   = 'q-opt' + (answers[idx] === oi ? ' sel' : '');
    div.innerHTML   = `<div class="opt-ltr">${opt.label}</div><div class="opt-txt">${opt.text}</div>`;
    div.onclick     = () => selectOpt(oi);
    optsEl.appendChild(div);
  });

  document.getElementById('btn-back').disabled         = idx === 0;
  document.getElementById('btn-next').disabled         = answers[idx] === null;
  document.getElementById('btn-next').textContent      = idx === 19 ? 'Finalizar ✓' : 'Próxima →';
}

function selectOpt(oi) {
  answers[currentQ] = oi;
  document.querySelectorAll('.q-opt').forEach((el, i) => el.classList.toggle('sel', i === oi));
  document.getElementById('btn-next').disabled = false;
}

function nextQ() {
  if (answers[currentQ] === null) return;
  if (currentQ === 19) { computeResults(); return; }
  currentQ++;
  renderQ();
}

function prevQ() {
  if (currentQ === 0) return;
  currentQ--;
  renderQ();
}

/* ════════════════════════════════════════════════════
   IDENTIFICAÇÃO DO PARTICIPANTE
════════════════════════════════════════════════════ */
function phoneMask(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if      (v.length > 6) v = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
  else if (v.length > 2) v = '(' + v.slice(0,2) + ') ' + v.slice(2);
  else if (v.length > 0) v = '(' + v;
  el.value = v;
}

function validateIdentForm() {
  const name  = document.getElementById('ident-name').value.trim();
  const phone = document.getElementById('ident-phone').value.replace(/\D/g,'');
  const ok    = name.length >= 3 && phone.length >= 10;
  const btn   = document.getElementById('btn-start-quiz');
  if (btn) btn.disabled = !ok;
  return ok;
}

function startQuiz(event) {
  if (event && event.preventDefault) event.preventDefault();

  const name  = document.getElementById('ident-name').value.trim();
  const phone = document.getElementById('ident-phone').value.replace(/\D/g,'');

  if (name.length < 3) {
    alert('Por favor, informe seu nome completo antes de continuar.');
    document.getElementById('ident-name').focus();
    return;
  }
  if (phone.length < 10) {
    alert('Por favor, informe um telefone válido com DDD antes de continuar.');
    document.getElementById('ident-phone').focus();
    return;
  }

  currentParticipant = {
    name,
    phone: document.getElementById('ident-phone').value.trim(),
    email: document.getElementById('ident-email').value.trim()
  };
  sessionStorage.setItem('disc_current_participant', JSON.stringify(currentParticipant));

  answers  = new Array(20).fill(null);
  currentQ = 0;
  showScreen('screen-quiz');
  renderQ();
}

/* ════════════════════════════════════════════════════
   CÁLCULO DO RESULTADO DISC
   Salva automaticamente via CentralDB.push(),
   vinculando o resultado ao gestor correto.
════════════════════════════════════════════════════ */
function computeResults() {
  showScreen('screen-loading');
  setTimeout(() => {

    /* Recupera dados do participante */
    if (!currentParticipant) {
      const saved = sessionStorage.getItem('disc_current_participant');
      currentParticipant = saved
        ? JSON.parse(saved)
        : { name:'Participante', phone:'', email:'' };
    }

    /* account_id: gestor logado OU gestor do link externo */
    const accountId = currentSession
      ? currentSession.id
      : (sessionStorage.getItem('disc_ext_acc') || 'ACC_DEMO_001');

    /* Contagem de respostas por perfil */
    const scores = { D:0, I:0, S:0, C:0 };
    answers.forEach((ai, qi) => {
      if (ai !== null) scores[questions[qi].options[ai].disc]++;
    });

    const total = 20;
    const pcts  = {
      D: Math.round((scores.D / total) * 100),
      I: Math.round((scores.I / total) * 100),
      S: Math.round((scores.S / total) * 100),
      C: Math.round((scores.C / total) * 100)
    };

    /* Determina perfil principal e secundário */
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const pk     = sorted[0][0];
    const sk     = sorted[1][0];
    /* Secundário: diferença ≤ 3 pontos e pontuação > 0 */
    const hasSec = (sorted[0][1] - sorted[1][1]) <= 3 && sorted[0][1] > 0;

    const shareId = 'share_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    const result = {
      id:           'RES_' + Date.now(),
      account_id:   accountId,
      name:         currentParticipant.name,
      phone:        currentParticipant.phone,
      email:        currentParticipant.email,
      primaryKey:   pk,
      secondaryKey: sk,
      hasSecondary: hasSec,
      scores,
      pcts,
      date:    new Date().toLocaleDateString('pt-BR'),
      shareId,
      origem: currentSession ? 'painel' : 'link_externo'
    };

    MockDB.addParticipant(result);
    lastResult = result;

    /* Limpa dados temporários de sessão */
    sessionStorage.removeItem('disc_current_participant');
    sessionStorage.removeItem('disc_ext_mode');

    showResults(result, 'screen-result');
  }, 1500);
}

/* ════════════════════════════════════════════════════
   MODO AVALIAÇÃO EXTERNA
   Detecta ?modo=avaliacao&acc=ID na URL e pula o login,
   abrindo direto a tela de identificação do participante.
════════════════════════════════════════════════════ */
function checkExternalMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('modo') !== 'avaliacao') return false;

  const accId = params.get('acc');
  sessionStorage.setItem('disc_ext_acc',  accId || 'ACC_DEMO_001');
  sessionStorage.setItem('disc_ext_mode', '1');

  /* Modo externo: mostra banner, oculta badge de gestor */
  const banner = document.getElementById('ext-banner');
  const badge  = document.getElementById('ident-account-badge');
  const backBtn = document.getElementById('btn-back-admin');
  if (banner)  banner.classList.remove('hidden');
  if (badge)   badge.style.display = 'none';
  if (backBtn) backBtn.style.display = 'none';

  ['ident-name','ident-phone','ident-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('btn-start-quiz').disabled = true;

  showScreen('screen-ident');
  return true;
}

/* ════════════════════════════════════════════════════
   INICIALIZAÇÃO — ponto de entrada do sistema
   Executado automaticamente ao carregar a página.
   Ordem de prioridade:
   0. Carrega dados persistidos no store global
   1. ?share=ID       → resultado público
   2. ?modo=avaliacao → avaliação externa
   3. Sessão ativa    → painel do gestor
   4. Padrão          → tela de login
════════════════════════════════════════════════════ */
(function init() {
  /* 0. Funde localStorage no array global em memória */
  CentralDB.init();

  /* 1. Link de resultado compartilhado */
  if (checkPublicShare()) return;

  /* 2. Modo avaliação externa via link */
  if (checkExternalMode()) return;

  /* 3. Sessão de gestor ativa */
  const session = MockDB.getSession();
  if (session) {
    currentSession = session;
    openAdmin();
    return;
  }

  /* 4. Nenhum dos casos → login */
  showScreen('screen-auth');
})();
