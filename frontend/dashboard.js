/* ══════════════════════════════════════════════════════
   dashboard.js — DISC Platform
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: painel do administrador.
   • Abertura e configuração do painel (openAdmin)
   • Navegação entre abas (overview, participants, tips)
   • Renderização de estatísticas e tabela de participantes
   • Busca, filtro e seleção múltipla
   • Gráficos Chart.js (pizza e barras)
   • Exclusão de participantes
   • Geração e cópia do link de avaliação remota

   DEPENDE DE (carregado depois):
   • app.js        → currentSession, showScreen(), showToast()
   • auth.js       → SUPER_ADMIN (referenciado indiretamente)
   • disc-engine.js→ profileData, DISC_COLORS, DISC_NAMES

   EXPÕE:
   • openAdmin(), adminTab(), goToAdmin()
   • renderOverview(), renderParticipants()
   • filterTable(), toggleAllChecks(), onCheckChange()
   • deleteResult(), viewPublicResult()
   • buildEvalLink(), copyEvalLink()
   • goToIdent()
══════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════
   PAINEL ADMIN — ABERTURA E CONFIGURAÇÃO
════════════════════════════════════════════════════ */
function openAdmin() {
  currentSession = MockDB.getSession();
  if (!currentSession) { showScreen('screen-auth'); return; }

  const isSA = currentSession.role === 'superadmin';

  /* Preenche cabeçalho da sidebar */
  document.getElementById('sb-aname').textContent = currentSession.name;
  document.getElementById('sb-aid').textContent   = isSA ? 'Acesso Global' : 'ID: ' + currentSession.id;
  document.getElementById('admin-greeting').textContent = 'Olá, ' + currentSession.name.split(' ')[0] + ' 👋';
  document.getElementById('admin-sub').textContent =
    isSA ? 'Visão Global — todos os participantes do sistema' : 'Resumo das avaliações da sua conta';
  document.getElementById('participants-sub').textContent =
    isSA ? 'Todos os participantes do sistema' : 'Participantes vinculados à sua conta';

  /* Badge e botões condicionais ao perfil */
  document.getElementById('sb-superadmin-badge').classList.toggle('hidden', !isSA);
  document.getElementById('btn-new-eval-top').classList.toggle('hidden', isSA);
  document.getElementById('btn-new-eval-part').classList.toggle('hidden', isSA);
  document.getElementById('nav-new-eval').parentElement.classList.toggle('hidden', isSA);

  /* Visibilidade das caixas de link (admin comum vs. super-admin) */
  const linkBox   = document.getElementById('eval-link-box');
  const saLinkBox = document.getElementById('sa-eval-link-box');
  if (linkBox)   linkBox.classList.toggle('hidden', isSA);
  if (saLinkBox) saLinkBox.classList.toggle('hidden', !isSA);

  showScreen('screen-admin');
  buildEvalLink();
  adminTab('tab-overview');
}

function goToAdmin() { openAdmin(); }

/* ════════════════════════════════════════════════════
   FONTE DE DADOS — filtra por conta ou retorna tudo (SA)
════════════════════════════════════════════════════ */
function getMyResults() {
  if (!currentSession) return [];
  if (currentSession.role === 'superadmin') return MockDB.getAllParticipants();
  return MockDB.getByAccount(currentSession.id);
}

/* ════════════════════════════════════════════════════
   NAVEGAÇÃO ENTRE ABAS DO PAINEL
════════════════════════════════════════════════════ */
function adminTab(tab) {
  ['tab-overview','tab-participants','tab-tips'].forEach(t =>
    document.getElementById(t).classList.toggle('hidden', t !== tab)
  );
  ['nav-overview','nav-participants','nav-tips'].forEach(n => {
    const el = document.getElementById(n);
    if (el) el.classList.remove('active');
  });
  const map = {
    'tab-overview':     'nav-overview',
    'tab-participants': 'nav-participants',
    'tab-tips':         'nav-tips'
  };
  const el = document.getElementById(map[tab]);
  if (el) el.classList.add('active');

  if (tab === 'tab-overview')     renderOverview();
  if (tab === 'tab-participants') renderParticipants();
}

/* ════════════════════════════════════════════════════
   ABA: VISÃO GERAL — cards de estatística + tabela recente
════════════════════════════════════════════════════ */
function renderOverview() {
  const results = getMyResults();
  const counts  = { D:0, I:0, S:0, C:0 };
  results.forEach(r => counts[r.primaryKey]++);

  const isSA = currentSession && currentSession.role === 'superadmin';

  /* Card extra apenas para super-admin: total de testes via link externo */
  const externCount = isSA ? results.filter(r => r.origem === 'link_externo').length : null;
  const extraStat   = isSA
    ? `<div class="stat-card" style="border-left:3px solid var(--accent)">
        <div class="stat-label" style="color:var(--accent)">Via Link Externo</div>
        <div class="stat-value" style="color:var(--accent)">${externCount}</div>
        <div class="stat-sub">testes remotos</div>
      </div>`
    : '';

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total</div>
      <div class="stat-value">${results.length}</div>
      <div class="stat-sub">avaliações</div>
    </div>
    ${['D','I','S','C'].map(k => `
      <div class="stat-card" style="border-left:3px solid ${DISC_COLORS[k]}">
        <div class="stat-label" style="color:${DISC_COLORS[k]}">${DISC_NAMES[k]}</div>
        <div class="stat-value" style="color:${DISC_COLORS[k]}">${counts[k]}</div>
        <div class="stat-sub">${results.length ? Math.round((counts[k]/results.length)*100) : 0}%</div>
      </div>`).join('')}
    ${extraStat}`;

  /* Avaliações recentes (últimas 5) */
  const tbody  = document.getElementById('recent-tbody');
  const recent = results.slice(0, 5);
  tbody.innerHTML = recent.length
    ? recent.map(r => `
        <tr>
          <td>
            <strong>${r.name}</strong>
            ${r.origem === 'link_externo'
              ? '<span style="font-size:.68rem;background:rgba(52,152,219,.15);color:var(--c);border-radius:99px;padding:1px 7px;margin-left:6px;">externo</span>'
              : ''}
          </td>
          <td><span class="disc-badge disc-${r.primaryKey}">${r.primaryKey} — ${profileData[r.primaryKey].name}</span></td>
          <td>${r.date}</td>
        </tr>`).join('')
    : `<tr><td colspan="3">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>Nenhuma avaliação ainda.</p>
        </div></td></tr>`;
}

/* ════════════════════════════════════════════════════
   ABA: PARTICIPANTES — tabela completa com filtros
   currentFiltered: estado local dos resultados visíveis
════════════════════════════════════════════════════ */
let currentFiltered = [];

function renderParticipants(filtered) {
  const results   = filtered !== undefined ? filtered : getMyResults();
  currentFiltered = results;
  const tbody     = document.getElementById('participants-tbody');

  if (!results.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Nenhum resultado encontrado.</p>
      </div></td></tr>`;
    updateCharts([]);
    updateSelCount();
    return;
  }

  tbody.innerHTML = results.map(r => `
    <tr data-id="${r.id}">
      <td style="text-align:center;padding:0 8px">
        <input type="checkbox" class="row-check" checked onchange="onCheckChange()"
               style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">
      </td>
      <td>
        <strong>${escHtml(r.name)}</strong>
        ${r.origem === 'link_externo'
          ? '<span style="font-size:.65rem;background:rgba(52,152,219,.15);color:var(--c);border-radius:99px;padding:1px 7px;margin-left:6px;font-weight:700;">externo</span>'
          : ''}
      </td>
      <td>${escHtml(r.phone)}</td>
      <td>${r.email ? escHtml(r.email) : '<span style="color:var(--text3)">—</span>'}</td>
      <td>
        <span class="disc-badge disc-${r.primaryKey}">${r.primaryKey}</span>
        ${r.hasSecondary
          ? `<span class="disc-badge disc-${r.secondaryKey}" style="margin-left:4px">${r.secondaryKey}</span>`
          : ''}
        <span style="font-size:.8rem;color:var(--text2);margin-left:6px">
          ${profileData[r.primaryKey].name}
        </span>
      </td>
      <td>${r.date}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="viewPublicResult('${r.shareId}')">👁 Ver</button>
          <button class="btn btn-danger btn-sm" onclick="deleteResult('${r.id}')">🗑 Excluir</button>
        </div>
      </td>
    </tr>`).join('');

  updateSelCount();
  updateCharts(results);
}

/* Sanitiza strings para evitar XSS em innerHTML */
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ════════════════════════════════════════════════════
   FILTRO DE BUSCA E DISC
════════════════════════════════════════════════════ */
function filterTable() {
  const query  = document.getElementById('search-input').value.toLowerCase().trim();
  const filter = document.getElementById('filter-disc').value;
  let results  = getMyResults();

  if (query) {
    results = results.filter(r =>
      r.name.toLowerCase().includes(query) ||
      r.phone.includes(query) ||
      (r.email && r.email.toLowerCase().includes(query))
    );
  }
  if (filter) {
    results = results.filter(r =>
      r.primaryKey === filter ||
      (r.hasSecondary && r.secondaryKey === filter)
    );
  }
  renderParticipants(results);
}

/* ════════════════════════════════════════════════════
   CHECKBOXES — seleção múltipla e contador
════════════════════════════════════════════════════ */
function toggleAllChecks(checked) {
  document.querySelectorAll('.row-check').forEach(cb => cb.checked = checked);
  onCheckChange();
}

function onCheckChange() {
  updateSelCount();
  const selected = getCheckedResults();
  updateCharts(selected);
}

function updateSelCount() {
  const all      = document.querySelectorAll('.row-check');
  const checked  = document.querySelectorAll('.row-check:checked');
  const total    = currentFiltered.length;
  const selEl    = document.getElementById('sel-count');
  const checkAll = document.getElementById('check-all');
  if (selEl) selEl.textContent = `${checked.length} de ${total} selecionados`;
  if (checkAll) {
    checkAll.checked       = all.length > 0 && checked.length === all.length;
    checkAll.indeterminate = checked.length > 0 && checked.length < all.length;
  }
}

function getCheckedResults() {
  const checked = document.querySelectorAll('.row-check:checked');
  const ids     = Array.from(checked).map(cb => cb.closest('tr').dataset.id);
  return currentFiltered.filter(r => ids.includes(r.id));
}

/* ════════════════════════════════════════════════════
   GRÁFICOS CHART.JS — pizza e barras
   Instâncias mantidas em variáveis globais para destroy()
════════════════════════════════════════════════════ */
function updateCharts(results) {
  const counts = { D:0, I:0, S:0, C:0 };
  results.forEach(r => counts[r.primaryKey]++);
  const labels = ['D','I','S','C'];
  const data   = labels.map(k => counts[k]);
  const colors = labels.map(k => DISC_COLORS[k]);
  const bgs    = labels.map(k => DISC_COLORS[k] + '33'); // 20% opacidade

  /* Gráfico de pizza */
  const pieCtx = document.getElementById('chart-pie')?.getContext('2d');
  if (pieCtx) {
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: labels.map(k => DISC_NAMES[k]),
        datasets: [{ data, backgroundColor: colors, borderColor: '#13131E', borderWidth: 2 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position:'bottom', labels:{ color:'#9896A0', font:{size:11}, boxWidth:12 } }
        }
      }
    });
  }

  /* Gráfico de barras */
  const barCtx = document.getElementById('chart-bar')?.getContext('2d');
  if (barCtx) {
    if (barChart) barChart.destroy();
    barChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: labels.map(k => DISC_NAMES[k]),
        datasets: [{
          label: 'Quantidade',
          data,
          backgroundColor: bgs,
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend:{ display:false } },
        scales: {
          x: { ticks:{ color:'#9896A0', font:{size:11} }, grid:{ color:'rgba(255,255,255,.04)' } },
          y: { ticks:{ color:'#9896A0', font:{size:11}, stepSize:1 }, grid:{ color:'rgba(255,255,255,.04)' }, beginAtZero:true }
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
  const r = MockDB.getByShareId(shareId);
  if (!r) return;
  lastResult = r;
  showResults(r, 'screen-result');
  document.getElementById('btn-back-admin').style.display = 'inline-flex';
}

/* ════════════════════════════════════════════════════
   LINK DE AVALIAÇÃO REMOTA
   buildEvalLink: preenche a âncora clicável no painel.
   copyEvalLink:  copia URL + <a href> HTML rico para
                  ser clicável em e-mail e redes sociais.
════════════════════════════════════════════════════ */
function getBaseURL() {
  if (window.location.protocol === 'file:') {
    return window.location.href.split('?')[0];
  }
  return window.location.origin + window.location.pathname;
}

function buildEvalLink() {
  if (!currentSession) return;
  const isSA = currentSession.role === 'superadmin';
  const base  = getBaseURL();

  if (isSA) {
    const saLink = `${base}?modo=avaliacao&acc=SUPERADMIN`;
    window._evalLink = saLink;
    const saAnchor = document.getElementById('sa-eval-link-anchor');
    if (saAnchor) { saAnchor.href = saLink; saAnchor.textContent = saLink; }
    return;
  }

  const link   = `${base}?modo=avaliacao&acc=${currentSession.id}`;
  window._evalLink = link;
  const anchor = document.getElementById('eval-link-anchor');
  if (anchor) { anchor.href = link; anchor.textContent = link; }

  /* Aviso de protocolo local */
  const warning = document.getElementById('eval-link-warning');
  if (warning) warning.style.display = window.location.protocol === 'file:' ? 'block' : 'none';
}

function copyEvalLink() {
  const url = window._evalLink;
  if (!url) return;
  const htmlLink =
    `<a href="${url}" target="_blank" ` +
    `style="color:#3498DB;text-decoration:underline;font-family:Arial,sans-serif;font-size:14px;">` +
    `Clique aqui para Iniciar sua Avaliação DISC</a>`;

  if (navigator.clipboard && window.ClipboardItem) {
    const item = new ClipboardItem({
      'text/plain': new Blob([url],      { type:'text/plain' }),
      'text/html':  new Blob([htmlLink], { type:'text/html'  })
    });
    navigator.clipboard.write([item])
      .then(()  => showToast('🔗 Link copiado! Cole num e-mail para ter o hiperlink clicável.'))
      .catch(()  => _copyFallback(url));
  } else {
    _copyFallback(url);
  }
}

function _copyFallback(url) {
  navigator.clipboard.writeText(url)
    .then(()  => showToast('🔗 Link copiado!'))
    .catch(()  => prompt('Copie o link abaixo:', url));
}

/* ════════════════════════════════════════════════════
   IR PARA TELA DE IDENTIFICAÇÃO (nova avaliação presencial)
════════════════════════════════════════════════════ */
function goToIdent() {
  if (!currentSession || currentSession.role === 'superadmin') return;
  document.getElementById('ident-account-name').textContent = currentSession.name;
  const badge  = document.getElementById('ident-account-badge');
  const banner = document.getElementById('ext-banner');
  if (badge)  badge.style.display = '';
  if (banner) banner.classList.add('hidden');
  ['ident-name','ident-phone','ident-email'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const btn = document.getElementById('btn-start-quiz');
  if (btn) btn.disabled = true;
  showScreen('screen-ident');
}
