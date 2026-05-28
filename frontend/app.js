/* ══════════════════════════════════════════════════════
   app.js — DISC Platform
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: lógica de aplicação central.
     • Quiz (renderQ, selectOpt, nextQ, prevQ)
     • Identificação (phoneMask, validateIdentForm, startQuiz)
     • Cálculo do resultado (computeResults)
     • Modo de avaliação externa (checkExternalMode)
     • Inicialização do sistema (init)

   DEPENDE DE (deve ser carregado DEPOIS):
     disc-engine.js → questions (banco de questões)
     globals.js     → MockDB, CentralDB, currentSession,
                       currentParticipant, currentQ, answers,
                       lastResult, showScreen, ALL_SCREENS

   EXPÕE (chamadas do HTML via onclick / oninput):
     renderQ(), selectOpt(oi), nextQ(), prevQ()
     phoneMask(el), validateIdentForm(), startQuiz(event)
     computeResults(), checkExternalMode()

   ⚠  SEM 'use strict' — globals.js já garante o escopo.
══════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   QUIZ — renderização e navegação por questão
════════════════════════════════════════════════════ */
function renderQ() {
  var q   = questions[currentQ];
  var idx = currentQ;

  document.getElementById('q-cur').textContent     = idx + 1;
  document.getElementById('q-num-lbl').textContent = 'QUESTÃO ' + String(idx + 1).padStart(2, '0') + ' / 20';
  document.getElementById('q-text').textContent    = q.text;
  document.getElementById('prog-fill').style.width = Math.max(5, (idx / 20) * 100) + '%';

  var optsEl = document.getElementById('q-opts');
  optsEl.innerHTML = '';
  q.options.forEach(function(opt, oi) {
    var div       = document.createElement('div');
    div.className = 'q-opt' + (answers[idx] === oi ? ' sel' : '');
    div.innerHTML = '<div class="opt-ltr">' + opt.label + '</div>' +
                    '<div class="opt-txt">' + opt.text  + '</div>';
    div.onclick   = (function(i) { return function() { selectOpt(i); }; })(oi);
    optsEl.appendChild(div);
  });

  document.getElementById('btn-back').disabled    = (idx === 0);
  document.getElementById('btn-next').disabled    = (answers[idx] === null);
  document.getElementById('btn-next').textContent = (idx === 19) ? 'Finalizar ✓' : 'Próxima →';
}

function selectOpt(oi) {
  answers[currentQ] = oi;
  document.querySelectorAll('.q-opt').forEach(function(el, i) {
    el.classList.toggle('sel', i === oi);
  });
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
  var v = el.value.replace(/\D/g, '');
  if (v.length > 11) v = v.slice(0, 11);
  if      (v.length > 6) v = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
  else if (v.length > 2) v = '(' + v.slice(0,2) + ') ' + v.slice(2);
  else if (v.length > 0) v = '(' + v;
  el.value = v;
}

function validateIdentForm() {
  var name  = document.getElementById('ident-name').value.trim();
  var phone = document.getElementById('ident-phone').value.replace(/\D/g, '');
  var ok    = name.length >= 3 && phone.length >= 10;
  var btn   = document.getElementById('btn-start-quiz');
  if (btn) btn.disabled = !ok;
  return ok;
}

function startQuiz(event) {
  if (event && event.preventDefault) event.preventDefault();

  var name  = document.getElementById('ident-name').value.trim();
  var phone = document.getElementById('ident-phone').value.replace(/\D/g, '');

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
    name:  name,
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
   Conta respostas por perfil → determina principal e
   secundário (regra: diferença ≤ 3 pontos) → salva
   via MockDB.addParticipant (que delega ao CentralDB).
════════════════════════════════════════════════════ */
function computeResults() {
  showScreen('screen-loading');
  setTimeout(function() {

    /* Recupera dados do participante (fallback para sessionStorage) */
    if (!currentParticipant) {
      var saved = sessionStorage.getItem('disc_current_participant');
      currentParticipant = saved
        ? JSON.parse(saved)
        : { name: 'Participante', phone: '', email: '' };
    }

    /* account_id: gestor logado OU conta do link externo */
    var accountId = currentSession
      ? currentSession.id
      : (sessionStorage.getItem('disc_ext_acc') || 'ACC_DEMO_001');

    /* Contagem de respostas por perfil */
    var scores = { D:0, I:0, S:0, C:0 };
    answers.forEach(function(ai, qi) {
      if (ai !== null) scores[questions[qi].options[ai].disc]++;
    });

    var total = 20;
    var pcts  = {
      D: Math.round((scores.D / total) * 100),
      I: Math.round((scores.I / total) * 100),
      S: Math.round((scores.S / total) * 100),
      C: Math.round((scores.C / total) * 100)
    };

    /* Perfil principal e secundário */
    var sorted = Object.entries(scores).sort(function(a, b) { return b[1] - a[1]; });
    var pk     = sorted[0][0];
    var sk     = sorted[1][0];
    var hasSec = (sorted[0][1] - sorted[1][1]) <= 3 && sorted[0][1] > 0;

    var shareId = 'share_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    var result = {
      id:           'RES_' + Date.now(),
      account_id:   accountId,
      name:         currentParticipant.name,
      phone:        currentParticipant.phone,
      email:        currentParticipant.email,
      primaryKey:   pk,
      secondaryKey: sk,
      hasSecondary: hasSec,
      scores:       scores,
      pcts:         pcts,
      date:         new Date().toLocaleDateString('pt-BR'),
      shareId:      shareId,
      origem:       currentSession ? 'painel' : 'link_externo'
    };

    MockDB.addParticipant(result);
    lastResult = result;

    sessionStorage.removeItem('disc_current_participant');
    sessionStorage.removeItem('disc_ext_mode');

    showResults(result, 'screen-result');
  }, 1500);
}

/* ════════════════════════════════════════════════════
   MODO AVALIAÇÃO EXTERNA
   Detecta ?modo=avaliacao&acc=ID na URL.
   Se presente: pula login e abre tela de identificação.
════════════════════════════════════════════════════ */
function checkExternalMode() {
  var params = new URLSearchParams(window.location.search);
  if (params.get('modo') !== 'avaliacao') return false;

  var accId = params.get('acc');
  sessionStorage.setItem('disc_ext_acc',  accId || 'ACC_DEMO_001');
  sessionStorage.setItem('disc_ext_mode', '1');

  var banner  = document.getElementById('ext-banner');
  var badge   = document.getElementById('ident-account-badge');
  var backBtn = document.getElementById('btn-back-admin');
  if (banner)  banner.classList.remove('hidden');
  if (badge)   badge.style.display = 'none';
  if (backBtn) backBtn.style.display = 'none';

  ['ident-name', 'ident-phone', 'ident-email'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('btn-start-quiz').disabled = true;

  showScreen('screen-ident');
  return true;
}

/* ════════════════════════════════════════════════════
   INICIALIZAÇÃO — ponto de entrada do sistema
   Executada automaticamente quando app.js termina de
   carregar (após disc-engine.js, globals.js).

   Prioridade de roteamento:
     0. Inicializa CentralDB (localStorage → memória)
     1. ?share=ID        → resultado público
     2. ?modo=avaliacao  → avaliação via link externo
     3. Sessão ativa     → painel do gestor
     4. Padrão           → tela de login
════════════════════════════════════════════════════ */
(function init() {
  /* 0. Funde localStorage no store global em memória */
  CentralDB.init();

  /* 1. Modo de desenvolvimento (?dev=1) — exibe atalhos ocultos no login */
  checkDevMode();

  /* 2. Link de resultado público */
  if (checkPublicShare()) return;

  /* 2. Modo avaliação externa */
  if (checkExternalMode()) return;

  /* 3. Sessão de gestor ativa */
  var session = MockDB.getSession();
  if (session) {
    currentSession = session;
    openAdmin();
    return;
  }

  /* 4. Tela de login */
  showScreen('screen-auth');
})();
