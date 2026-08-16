/* ══════════════════════════════════════════════════════
   dashboard.js — DISC Platform
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: painel do administrador.
     • openAdmin()         — abre e configura o painel
     • adminTab(tab)       — navega entre abas
     • renderOverview()    — cards de estatística e recentes
     • renderParticipants()— tabela completa com filtros
     • filterTable()       — busca + filtro por perfil
     • updateCharts()      — gráficos Chart.js (pizza e barras)
     • deleteResult()      — exclui participante
     • viewPublicResult()  — visualiza resultado como admin
     • buildEvalLink()     — gera URL do link de avaliação
     • copyEvalLink()      — copia link como hiperlink HTML
     • goToIdent()         — abre tela de identificação presencial

   DEPENDE DE (carregado antes):
     disc-engine.js → profileData, DISC_COLORS, DISC_NAMES
     globals.js     → MockDB, currentSession, lastResult,
                       pieChart, barChart, showScreen,
                       showToast, escHtml, getBaseURL

   EXPÕE (chamadas do HTML via onclick):
     openAdmin, goToAdmin, adminTab, goToIdent
     renderOverview, renderParticipants, filterTable
     toggleAllChecks, onCheckChange
     deleteResult, viewPublicResult
     buildEvalLink, copyEvalLink

   ⚠  SEM 'use strict' — necessário para acessar globais.
══════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   PAINEL ADMIN — ABERTURA E CONFIGURAÇÃO
   Autenticação oficial via AuthService / Supabase
════════════════════════════════════════════════════ */
async function openAdmin() {

  try {

    const profile =
      await AuthService.getCurrentProfile();

    if (!profile.success || !profile.usuario) {

      showScreen('screen-auth');

      return;

    }

    currentSession = {

      id:
        profile.usuario.id,

      name:
        profile.usuario.nome,

      email:
        profile.usuario.email,

      phone:
        profile.usuario.telefone,

      role:
        profile.perfil,

      empresa_id:
        profile.empresa

    };

    var isSA =
      profile.perfil === 'superadministrador';


    document.getElementById('sb-aname').textContent =
      currentSession.name;

    document.getElementById('sb-aid').textContent =
      isSA
        ? 'Acesso Global'
        : 'ID: ' + currentSession.id;

    document.getElementById('admin-greeting').textContent =
      'Olá, ' +
      currentSession.name.split(' ')[0] +
      ' 👋';

    document.getElementById('admin-sub').textContent =
      isSA
        ? 'Visão Global — todos os participantes do sistema'
        : 'Resumo das avaliações da sua conta';

    document.getElementById('participants-sub').textContent =
      isSA
        ? 'Todos os participantes do sistema'
        : 'Participantes vinculados à sua conta';


    document
      .getElementById('sb-superadmin-badge')
      .classList
      .toggle('hidden', !isSA);

    document
      .getElementById('btn-new-eval-top')
      .classList
      .toggle('hidden', isSA);

    document
      .getElementById('btn-new-eval-part')
      .classList
      .toggle('hidden', isSA);


    var navNewEval =
      document.getElementById('nav-new-eval');

    if (navNewEval) {

      navNewEval
        .parentElement
        .classList
        .toggle('hidden', isSA);

    }


    var linkBox =
      document.getElementById('eval-link-box');

    var saLinkBox =
      document.getElementById('sa-eval-link-box');

    if (linkBox) {

      linkBox
        .classList
        .toggle('hidden', isSA);

    }

    if (saLinkBox) {

      saLinkBox
        .classList
        .toggle('hidden', !isSA);

    }


    showScreen('screen-admin');

    buildEvalLink();

    adminTab('tab-overview');

  }

  catch (error) {

    console.error(
      '[DISC] Erro ao abrir painel:',
      error
    );

    showScreen('screen-auth');

  }

}


function goToAdmin() {
  openAdmin();
}

/* ════════════════════════════════════════════════════
   FONTE DE DADOS — filtra por conta ou tudo (SA)
════════════════════════════════════════════════════ */
function getMyResults() {
  if (!currentSession) return [];
  if (currentSession.role === 'superadmin') return MockDB.getAllParticipants();
  return MockDB.getByAccount(currentSession.id);
}

/* ════════════════════════════════════════════════════
   NAVEGAÇÃO ENTRE ABAS
════════════════════════════════════════════════════ */
function adminTab(tab) {
  ['tab-overview', 'tab-participants', 'tab-tips'].forEach(function(t) {
    document.getElementById(t).classList.toggle('hidden', t !== tab);
  });
  ['nav-overview', 'nav-participants', 'nav-tips'].forEach(function(n) {
    var el = document.getElementById(n);
    if (el) el.classList.remove('active');
  });
  var map = {
    'tab-overview':     'nav-overview',
    'tab-participants': 'nav-participants',
    'tab-tips':         'nav-tips'
  };
  var active = document.getElementById(map[tab]);
  if (active) active.classList.add('active');

  if (tab === 'tab-overview')     renderOverview();
  if (tab === 'tab-participants') renderParticipants();
}

/* ════════════════════════════════════════════════════
   ABA: VISÃO GERAL
════════════════════════════════════════════════════ */
function renderOverview() {
  var results = getMyResults();
  var counts  = { D:0, I:0, S:0, C:0 };
  results.forEach(function(r) { counts[r.primaryKey]++; });

  var isSA = currentSession && currentSession.role === 'superadmin';
  var externCount = isSA ? results.filter(function(r) { return r.origem === 'link_externo'; }).length : 0;

  var extraStat = isSA
    ? '<div class="stat-card" style="border-left:3px solid var(--accent)">' +
        '<div class="stat-label" style="color:var(--accent)">Via Link Externo</div>' +
        '<div class="stat-value" style="color:var(--accent)">' + externCount + '</div>' +
        '<div class="stat-sub">testes remotos</div>' +
      '</div>'
    : '';

  document.getElementById('stats-grid').innerHTML =
    '<div class="stat-card">' +
      '<div class="stat-label">Total</div>' +
      '<div class="stat-value">' + results.length + '</div>' +
      '<div class="stat-sub">avaliações</div>' +
    '</div>' +
    ['D','I','S','C'].map(function(k) {
      return '<div class="stat-card" style="border-left:3px solid ' + DISC_COLORS[k] + '">' +
        '<div class="stat-label" style="color:' + DISC_COLORS[k] + '">' + DISC_NAMES[k] + '</div>' +
        '<div class="stat-value" style="color:' + DISC_COLORS[k] + '">' + counts[k] + '</div>' +
        '<div class="stat-sub">' + (results.length ? Math.round((counts[k]/results.length)*100) : 0) + '%</div>' +
      '</div>';
    }).join('') + extraStat;

  var tbody  = document.getElementById('recent-tbody');
  var recent = results.slice(0, 5);
  tbody.innerHTML = recent.length
    ? recent.map(function(r) {
        return '<tr>' +
          '<td><strong>' + escHtml(r.name) + '</strong>' +
            (r.origem === 'link_externo'
              ? '<span style="font-size:.68rem;background:rgba(52,152,219,.15);color:var(--c);border-radius:99px;padding:1px 7px;margin-left:6px;">externo</span>'
              : '') +
          '</td>' +
          /* Badge na tabela recente — usa profileCode completo */
          '<td>' + (function(res) {
            var codes = res.profileCodes || [res.primaryKey];
            var badges = codes.map(function(c) {
              return '<span class="disc-badge disc-' + c + '">' + c + '</span>';
            }).join('');
            return badges + '<span style="font-size:.78rem;color:var(--text2);margin-left:5px">' +
              (res.profileCode || res.primaryKey) + '</span>';
          })(r) + '</td>' +
          '<td>' + r.date + '</td>' +
        '</tr>';
      }).join('')
    : '<tr><td colspan="3"><div class="empty-state"><div class="empty-icon">📋</div><p>Nenhuma avaliação ainda.</p></div></td></tr>';
}

/* ════════════════════════════════════════════════════
   ABA: PARTICIPANTES — tabela com filtros e seleção
════════════════════════════════════════════════════ */
var currentFiltered = [];

function renderParticipants(filtered) {
  var results    = filtered !== undefined ? filtered : getMyResults();
  currentFiltered = results;
  var tbody      = document.getElementById('participants-tbody');

  if (!results.length) {
    tbody.innerHTML = '<tr><td colspan="7">' +
      '<div class="empty-state"><div class="empty-icon">🔍</div><p>Nenhum resultado encontrado.</p></div>' +
      '</td></tr>';
    updateCharts([]);
    updateSelCount();
    return;
  }

  tbody.innerHTML = results.map(function(r) {
    return '<tr data-id="' + r.id + '">' +
      '<td style="text-align:center;padding:0 8px">' +
        '<input type="checkbox" class="row-check" checked onchange="onCheckChange()">' +
      '</td>' +
      '<td><strong>' + escHtml(r.name) + '</strong>' +
        (r.origem === 'link_externo'
          ? '<span style="font-size:.65rem;background:rgba(52,152,219,.15);color:var(--c);border-radius:99px;padding:1px 7px;margin-left:6px;font-weight:700;">externo</span>'
          : '') +
      '</td>' +
      '<td>' + escHtml(r.phone) + '</td>' +
      '<td>' + (r.email ? escHtml(r.email) : '<span style="color:var(--text3)">—</span>') + '</td>' +
      '<td>' +
        /* Badge de perfil: mostra cada fator com sua cor DISC */
        (function(res) {
          var codes = res.profileCodes || [res.primaryKey];
          var badges = codes.map(function(c) {
            return '<span class="disc-badge disc-' + c + '">' + c + '</span>';
          }).join('');
          var label = codes.length > 1
            ? codes.map(function(c) { return profileData[c].name; }).join('+')
            : profileData[codes[0]].name;
          return badges + '<span style="font-size:.78rem;color:var(--text2);margin-left:6px">' + label + '</span>';
        })(r) +
      '</td>' +
      '<td>' + r.date + '</td>' +
      '<td>' +
        '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
          '<button class="btn btn-ghost btn-sm" onclick="viewPublicResult(\'' + r.shareId + '\')">👁 Ver</button>' +
          '<button class="btn btn-danger btn-sm" onclick="deleteResult(\'' + r.id + '\')">🗑 Excluir</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  updateSelCount();
  updateCharts(results);
}

/* ════════════════════════════════════════════════════
   FILTRO DE BUSCA E PERFIL
════════════════════════════════════════════════════ */
function filterTable() {
  var query  = document.getElementById('search-input').value.toLowerCase().trim();
  var filter = document.getElementById('filter-disc').value;
  var results = getMyResults();

  if (query) {
    results = results.filter(function(r) {
      return r.name.toLowerCase().includes(query) ||
             r.phone.includes(query) ||
             (r.email && r.email.toLowerCase().includes(query));
    });
  }
  if (filter) {
    results = results.filter(function(r) {
      /* Inclui o resultado se o filtro corresponde a qualquer fator do perfil */
      var codes = r.profileCodes || [r.primaryKey];
      return codes.indexOf(filter) !== -1;
    });
  }
  renderParticipants(results);
}

/* ════════════════════════════════════════════════════
   CHECKBOXES — seleção múltipla e gráficos interativos
════════════════════════════════════════════════════ */
function toggleAllChecks(checked) {
  document.querySelectorAll('.row-check').forEach(function(cb) { cb.checked = checked; });
  onCheckChange();
}

function onCheckChange() {
  updateSelCount();
  var selected = getCheckedResults();
  updateCharts(selected);
}

function updateSelCount() {
  var all      = document.querySelectorAll('.row-check');
  var checked  = document.querySelectorAll('.row-check:checked');
  var selEl    = document.getElementById('sel-count');
  var checkAll = document.getElementById('check-all');
  if (selEl)    selEl.textContent = checked.length + ' de ' + currentFiltered.length + ' selecionados';
  if (checkAll) {
    checkAll.checked       = all.length > 0 && checked.length === all.length;
    checkAll.indeterminate = checked.length > 0 && checked.length < all.length;
  }
}

function getCheckedResults() {
  var checked = document.querySelectorAll('.row-check:checked');
  var ids     = Array.from(checked).map(function(cb) { return cb.closest('tr').dataset.id; });
  return currentFiltered.filter(function(r) { return ids.includes(r.id); });
}

/* ════════════════════════════════════════════════════
   GRÁFICOS CHART.JS — pizza e barras
════════════════════════════════════════════════════ */
function updateCharts(results) {
  var counts = { D:0, I:0, S:0, C:0 };
  results.forEach(function(r) { counts[r.primaryKey]++; });

  var labels = ['D','I','S','C'];
  var data   = labels.map(function(k) { return counts[k]; });
  var colors = labels.map(function(k) { return DISC_COLORS[k]; });
  var bgs    = labels.map(function(k) { return DISC_COLORS[k] + '33'; });

  var pieCtx = document.getElementById('chart-pie');
  if (pieCtx) {
    if (pieChart) { pieChart.destroy(); pieChart = null; }
    pieChart = new Chart(pieCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels.map(function(k) { return DISC_NAMES[k]; }),
        datasets: [{ data: data, backgroundColor: colors, borderColor: '#13131E', borderWidth: 2 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position:'bottom', labels:{ color:'#9896A0', font:{ size:11 }, boxWidth:12 } }
        }
      }
    });
  }

  var barCtx = document.getElementById('chart-bar');
  if (barCtx) {
    if (barChart) { barChart.destroy(); barChart = null; }
    barChart = new Chart(barCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels.map(function(k) { return DISC_NAMES[k]; }),
        datasets: [{
          label: 'Quantidade', data: data,
          backgroundColor: bgs, borderColor: colors, borderWidth: 2, borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks:{ color:'#9896A0', font:{ size:11 } }, grid:{ color:'rgba(255,255,255,.04)' } },
          y: { ticks:{ color:'#9896A0', font:{ size:11 }, stepSize:1 }, grid:{ color:'rgba(255,255,255,.04)' }, beginAtZero:true }
        }
      }
    });
  }
}

/* ════════════════════════════════════════════════════
   AÇÕES SOBRE PARTICIPANTES
════════════════════════════════════════════════════ */
function deleteResult(id) {
  if (!confirm('Tem certeza que deseja excluir este resultado?\nEsta ação não pode ser desfeita.')) return;
  MockDB.deleteParticipant(id);
  renderParticipants();
  renderOverview();
  showToast('🗑 Resultado excluído.');
}

function viewPublicResult(shareId) {
  var r = MockDB.getByShareId(shareId);
  if (!r) return;
  lastResult = r;
  showResults(r, 'screen-result');
  var backBtn = document.getElementById('btn-back-admin');
  if (backBtn) backBtn.style.display = 'inline-flex';
}

/* ════════════════════════════════════════════════════
   LINK DE AVALIAÇÃO REMOTA
   buildEvalLink: preenche a âncora no painel.
   copyEvalLink:  copia URL pura + <a href> HTML rico
                  para ser clicável em e-mail/WhatsApp.
════════════════════════════════════════════════════ */
function buildEvalLink() {
  if (!currentSession) return;
  var isSA = currentSession.role === 'superadmin';
  var base  = getBaseURL();

  if (isSA) {
    var saLink   = base + '?modo=avaliacao&acc=SUPERADMIN';
    window._evalLink = saLink;
    var saAnchor = document.getElementById('sa-eval-link-anchor');
    if (saAnchor) { saAnchor.href = saLink; saAnchor.textContent = saLink; }
    return;
  }

  var link   = base + '?modo=avaliacao&acc=' + currentSession.id;
  window._evalLink = link;
  var anchor = document.getElementById('eval-link-anchor');
  if (anchor) { anchor.href = link; anchor.textContent = link; }

  var warning = document.getElementById('eval-link-warning');
  if (warning) warning.style.display = window.location.protocol === 'file:' ? 'block' : 'none';
}

function copyEvalLink() {
  var url = window._evalLink;
  if (!url) return;

  var htmlLink =
    '<a href="' + url + '" target="_blank" ' +
    'style="color:#3498DB;text-decoration:underline;font-family:Arial,sans-serif;font-size:14px;">' +
    'Clique aqui para Iniciar sua Avaliação DISC</a>';

  if (navigator.clipboard && window.ClipboardItem) {
    var item = new ClipboardItem({
      'text/plain': new Blob([url],      { type: 'text/plain' }),
      'text/html':  new Blob([htmlLink], { type: 'text/html'  })
    });
    navigator.clipboard.write([item])
      .then(function()  { showToast('🔗 Link copiado! Cole num e-mail para ter o hiperlink clicável.'); })
      .catch(function() { _copyFallback(url); });
  } else {
    _copyFallback(url);
  }
}

function _copyFallback(url) {
  navigator.clipboard.writeText(url)
    .then(function()  { showToast('🔗 Link copiado!'); })
    .catch(function() { prompt('Copie o link abaixo:', url); });
}

/* ════════════════════════════════════════════════════
   IR PARA TELA DE IDENTIFICAÇÃO (avaliação presencial)
════════════════════════════════════════════════════ */
function goToIdent() {
  if (!currentSession || currentSession.role === 'superadmin') return;
  document.getElementById('ident-account-name').textContent = currentSession.name;

  var badge  = document.getElementById('ident-account-badge');
  var banner = document.getElementById('ext-banner');
  var backBtn = document.getElementById('btn-back-admin');
  if (badge)   badge.style.display = '';
  if (banner)  banner.classList.add('hidden');
  if (backBtn) backBtn.style.display = 'none';

  ['ident-name', 'ident-phone', 'ident-email'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var btn = document.getElementById('btn-start-quiz');
  if (btn) btn.disabled = true;
  showScreen('screen-ident');
}
