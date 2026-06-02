/* ══════════════════════════════════════════════════════
   app.js — DISC Platform v5
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: lógica de aplicação central.
     • Quiz com sistema de ranking (drag-and-drop)
     • Identificação do participante
     • Cálculo do resultado DISC (computeResults)
     • Modo de avaliação externa (checkExternalMode)
     • Inicialização do sistema (init)

   DEPENDE DE (carregado antes):
     disc-engine.js → questions, RANK_WEIGHTS (via quiz-engine)
     globals.js     → MockDB, CentralDB, currentSession,
                       currentParticipant, currentQ,
                       lastResult, showScreen, ALL_SCREENS
     quiz-engine.js → QuizEngine, rankAnswers,
                       RANK_WEIGHTS, TOTAL_QUESTIONS

   EXPÕE:
     renderQ()
     nextQ(), prevQ()
     phoneMask(), validateIdentForm(), startQuiz()
     computeResults()
     checkExternalMode()

   ⚠  SEM 'use strict' — necessário para acessar globais.
══════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   QUIZ — renderização com sistema de ranking
════════════════════════════════════════════════════ */

/**
 * renderQ — renderiza a questão atual com o sistema de ranking.
 * Preserva o ranking já salvo se o participante voltou à questão.
 */
function renderQ() {
  var q   = questions[currentQ];
  var idx = currentQ;

  /* ── Atualiza cabeçalho ── */
  document.getElementById('q-cur').textContent     = idx + 1;
  document.getElementById('q-num-lbl').textContent =
    'QUESTÃO ' + String(idx + 1).padStart(2, '0') + ' / ' + TOTAL_QUESTIONS;
  document.getElementById('q-text').textContent    = q.text;

  /* ── Barra de progresso ── */
  var pct = Math.max(5, (idx / TOTAL_QUESTIONS) * 100);
  document.getElementById('prog-fill').style.width = pct + '%';

  /* ── Mini-mapa de pontos ── */
  _updateDots(idx);

  /* ── Container das opções ── */
  var optsEl = document.getElementById('q-opts');
  optsEl.innerHTML = '';

  /* Inicializa o QuizEngine para esta questão.
     Se já foi respondida, restaura o ranking salvo. */
  var savedRank = QuizEngine.getRank(idx);
  QuizEngine.init(optsEl, q, idx, savedRank, function(ranking) {
    /* Chamado sempre que o participante muda a ordem */
    _onRankChange(idx, ranking);
  });

  /* ── Navegação ── */
  document.getElementById('btn-back').disabled    = (idx === 0);
  var isLast = idx === TOTAL_QUESTIONS - 1;
  var nextBtn = document.getElementById('btn-next');
  nextBtn.textContent = isLast ? 'Ver Resultado ✓' : 'Próxima →';
  /* Sempre habilitado — a ordem aleatória inicial já é uma resposta válida */
  nextBtn.disabled    = false;

  /* ── Indicador de confirmação de ordem ── */
  _updateConfirmBadge(idx);
}

/**
 * _onRankChange — callback chamado pelo QuizEngine após cada reordenação.
 * Atualiza o badge de confirmação e habilita navegação.
 */
function _onRankChange(qIdx, ranking) {
  /* Marca a questão como "interagida" para distinção futura */
  if (!window._rankInteracted) window._rankInteracted = {};
  window._rankInteracted[qIdx] = true;

  _updateConfirmBadge(qIdx);
  _updateDots(currentQ);

  /* Habilita o botão caso estivesse desabilitado */
  var nextBtn = document.getElementById('btn-next');
  if (nextBtn) nextBtn.disabled = false;
}

/**
 * _updateConfirmBadge — exibe "✓ Ordem confirmada" na barra de navegação
 * quando o participante interagiu com o ranking desta questão.
 */
function _updateConfirmBadge(qIdx) {
  var badge = document.getElementById('rank-confirm-badge');
  if (!badge) return;
  var interacted = window._rankInteracted && window._rankInteracted[qIdx];
  badge.textContent = interacted ? '✓ Ordem registrada' : 'Arraste para ordenar';
  badge.className   = interacted
    ? 'rank-confirm-badge rank-confirm-badge--done'
    : 'rank-confirm-badge';
}

/**
 * _updateDots — atualiza o mini-mapa de progresso na barra superior.
 */
function _updateDots(currentIdx) {
  var container = document.getElementById('quiz-dots');
  if (!container) return;

  container.innerHTML = '';
  for (var i = 0; i < TOTAL_QUESTIONS; i++) {
    var dot = document.createElement('div');
    dot.className = 'quiz-dot';
    var interacted = window._rankInteracted && window._rankInteracted[i];
    if (i < currentIdx || interacted) dot.classList.add('dot-done');
    if (i === currentIdx)             dot.classList.add('dot-current');
    container.appendChild(dot);
  }
}

/* ════════════════════════════════════════════════════
   NAVEGAÇÃO ENTRE QUESTÕES
════════════════════════════════════════════════════ */
function nextQ() {
  /* A questão sempre tem um ranking (gerado pelo init),
     então nunca bloqueia a navegação. */
  if (currentQ === TOTAL_QUESTIONS - 1) {
    computeResults();
    return;
  }
  currentQ++;
  renderQ();
  /* Scroll suave ao topo do card */
  var card = document.getElementById('q-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function prevQ() {
  if (currentQ === 0) return;
  currentQ--;
  renderQ();
  var card = document.getElementById('q-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  /* Reseta o estado do quiz */
  QuizEngine.reset();
  window._rankInteracted = {};
  currentQ = 0;

  showScreen('screen-quiz');
  renderQ();
}

/* ════════════════════════════════════════════════════
   CÁLCULO DO RESULTADO DISC — Sistema de Pesos
   ─────────────────────────────────────────────────
   Para cada questão, cada posição recebe um peso:
     Posição 0 (mais parecido) → peso 4
     Posição 1                 → peso 3
     Posição 2                 → peso 2
     Posição 3 (menos parecido)→ peso 1

   A pontuação bruta de cada perfil (D, I, S, C)
   é a soma dos pesos de todas as opções daquele
   perfil em todas as questões.

   Pontuação máxima possível por perfil:
     20 questões × peso máximo 4 = 80 pontos
   Pontuação mínima:
     20 questões × peso mínimo 1 = 20 pontos

   ── PREPARADO PARA MOTOR MATEMÁTICO FUTURO ──────
   O motor atual usa apenas a soma ponderada simples.
   Para implementar normalização, ipsatização ou
   pesos diferenciados por questão, basta substituir
   a lógica dentro deste bloco sem mudar a estrutura
   do rankAnswers[].
════════════════════════════════════════════════════ */
function computeResults() {
  showScreen('screen-loading');
  setTimeout(function() {

    /* Recupera dados do participante */
    if (!currentParticipant) {
      var saved = sessionStorage.getItem('disc_current_participant');
      currentParticipant = saved
        ? JSON.parse(saved)
        : { name: 'Participante', phone: '', email: '' };
    }

    var accountId = currentSession
      ? currentSession.id
      : (sessionStorage.getItem('disc_ext_acc') || 'ACC_DEMO_001');

    /* ════════════════════════════════════════════════
       MOTOR DE PONTUAÇÃO DISC — Escala 200 pts
       ────────────────────────────────────────────
       Pesos por posição: 1º=4, 2º=3, 3º=2, 4º=1
       20 questões × (4+3+2+1) = 20 × 10 = 200 pts totais
       Soma D+I+S+C é sempre exatamente 200 pts.
       Cada perfil: mín=20 pts, máx=80 pts.

       BUG 3,4,5 CORRIGIDOS:
       - scores contém pontos reais (não percentual)
       - MAX_SCORE_TOTAL = 200 (soma de todos os perfis)
       - MAX_SCORE_PER   = 80  (máximo de um perfil)
       - pcts removido — toda a plataforma usa 'pts'
       - SEC_THRESHOLD ajustado para escala 80 pts
    ════════════════════════════════════════════════ */

    /* Pontuação máxima por perfil: 20q × peso_máximo(4) = 80 */
    var MAX_SCORE_PER   = TOTAL_QUESTIONS * RANK_WEIGHTS[0]; /* 80  */
    /* Soma total garantida: 20q × soma_pesos(10) = 200 */
    var MAX_SCORE_TOTAL = TOTAL_QUESTIONS *
      RANK_WEIGHTS.reduce(function(a, b) { return a + b; }, 0); /* 200 */

    /* Lê window.rankAnswers para garantir dados persistidos reais */
    var rankData = window.rankAnswers;

    /* ── Pontuação ponderada ── */
    var scores = { D: 0, I: 0, S: 0, C: 0 };
    for (var qi = 0; qi < TOTAL_QUESTIONS; qi++) {
      var rank = rankData[qi];
      if (!rank) continue;
      rank.forEach(function(opt, pos) {
        scores[opt.disc] += RANK_WEIGHTS[pos];
      });
    }

    /* ════════════════════════════════════════════════
       IDENTIFICAÇÃO DO PERFIL — Regra Oficial v9
       ────────────────────────────────────────────
       buildProfileResult() (disc-engine.js):
         • Ordena D/I/S/C do maior ao menor
         • Seleciona todos com score >= 51 pts
         • Se nenhum >= 51, usa apenas o maior
         • Retorna profileCode, profileCodes[], combo
       Elimina SEC_THRESHOLD anterior (diferença de %).
    ════════════════════════════════════════════════ */
    var profile = buildProfileResult(scores);

    /* pcts: barras visuais 0–100% (baseado em max 80 pts/perfil) */
    var pcts = {
      D: Math.round((scores.D / MAX_SCORE_PER) * 100),
      I: Math.round((scores.I / MAX_SCORE_PER) * 100),
      S: Math.round((scores.S / MAX_SCORE_PER) * 100),
      C: Math.round((scores.C / MAX_SCORE_PER) * 100)
    };

    var shareId = 'share_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    var result = {
      id:           'RES_' + Date.now(),
      account_id:   accountId,
      name:         currentParticipant.name,
      phone:        currentParticipant.phone,
      email:        currentParticipant.email,

      /* ── Campos de perfil — nova estrutura v9 ── */
      profileCode:  profile.profileCode,   /* ex: 'SC', 'DIS', 'D' */
      profileCodes: profile.profileCodes,  /* ex: ['S','C']         */
      primaryKey:   profile.primaryKey,    /* ex: 'S'               */
      secondaryKey: profile.secondaryKey,  /* ex: 'C' ou null       */
      hasSecondary: profile.hasSecondary,  /* true se >= 2 fatores  */

      scores:  scores,
      pcts:    pcts,
      date:    new Date().toLocaleDateString('pt-BR'),
      shareId: shareId,
      origem:  currentSession ? 'painel' : 'link_externo',

      /* ── Metadados do motor (debug + backend futuro) ── */
      _engine: {
        version:        'v9-profile-threshold-51',
        maxScorePer:    MAX_SCORE_PER,
        maxScoreTotal:  MAX_SCORE_TOTAL,
        threshold:      PROFILE_THRESHOLD,
        aboveThreshold: profile.aboveThreshold,
        rankSnapshot:   window.rankAnswers.slice()

        /* ── PONTO DE INTEGRAÇÃO FUTURA ─────────────
           fetch('/api/quiz/submit', {
             method: 'POST',
             body: JSON.stringify({
               participantId: result.id,
               profileCode: profile.profileCode,
               scores: scores,
               rankings: rankAnswers
             })
           });
        ─────────────────────────────────────────────── */
      }
    };

    MockDB.addParticipant(result);
    lastResult = result;

    sessionStorage.removeItem('disc_current_participant');
    sessionStorage.removeItem('disc_ext_mode');

    showResults(result, 'screen-result');
  }, 1500);
}

/* ════════════════════════════════════════════════════
   MODO AVALIAÇÃO EXTERNA (?modo=avaliacao)
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
   INICIALIZAÇÃO
   Ordem de prioridade:
     0. CentralDB.init() — carrega localStorage → memória
     1. checkDevMode()   — exibe atalhos se ?dev=1
     2. checkPublicShare() — resultado público ?share=
     3. checkExternalMode() — avaliação via link ?modo=
     4. Sessão ativa    — painel do gestor
     5. Padrão          — tela de login
════════════════════════════════════════════════════ */
(function init() {
  CentralDB.init();
  checkDevMode();
  if (checkPublicShare())    return;
  if (checkExternalMode())   return;
  var session = MockDB.getSession();
  if (session) {
    currentSession = session;
    openAdmin();
    return;
  }
  showScreen('screen-auth');
})();
