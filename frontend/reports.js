/* ══════════════════════════════════════════════════════
   reports.js — DISC Platform
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: exibição de resultados e PDF.
   • showResults()         — renderiza resultado na tela
   • shareResult()         — copia link do resultado público
   • checkPublicShare()    — detecta ?share= na URL
   • buildPdfHTML()        — monta HTML do relatório PDF
   • downloadPDF()         — captura e salva o PDF

   DEPENDE DE (carregado depois):
   • app.js         → lastResult, showScreen(), showToast()
   • disc-engine.js → profileData, combos, DISC_COLORS,
                       DISC_DARK, DISC_NAMES
   • dashboard.js   → getBaseURL() (re-usada aqui)

   EXPÕE:
   • showResults(r, targetScreen)
   • shareResult()
   • checkPublicShare()
   • downloadPDF()
══════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════
   EXIBIR RESULTADO — tela privada e pública
   targetScreen: 'screen-result' | 'screen-public'
   O prefixo de IDs difere entre as duas telas:
     privada → 'res-'     pública → 'pub-'
════════════════════════════════════════════════════ */
function showResults(r, targetScreen) {
  showScreen(targetScreen);
  window.scrollTo(0, 0);

  const isPublic = targetScreen === 'screen-public';
  const prefix   = isPublic ? 'pub' : 'res';

  const { primaryKey:pk, secondaryKey:sk, hasSecondary, pcts } = r;
  const data  = profileData[pk];
  const combo = hasSecondary ? combos[pk + sk] : null;

  /* ── Sigla combinada ──
     Simples: "Estável (S)"  |  Combinado: "Estável (SD)"  */
  const sigla     = hasSecondary ? pk + sk : pk;
  const siglaSpan = (color) =>
    `<span style="font-size:.55em;font-weight:700;color:${color};opacity:.75;
             letter-spacing:.04em;vertical-align:middle;margin-left:6px;">(${sigla})</span>`;

  /* Nome principal */
  const nameEl = document.getElementById(prefix + '-name');
  if (combo) {
    nameEl.innerHTML =
      `<span style="color:${DISC_COLORS[pk]}">${data.name}${siglaSpan(DISC_COLORS[pk])}</span>` +
      `<span style="font-size:.45em;font-weight:500;color:var(--text2);
               display:block;margin-top:4px;letter-spacing:.02em;">${combo.name}</span>`;
  } else {
    nameEl.innerHTML =
      `<span style="color:${DISC_COLORS[pk]}">Perfil ${data.name}${siglaSpan(DISC_COLORS[pk])}</span>`;
  }
  document.getElementById(prefix + '-tagline').textContent =
    combo ? combo.tagline : data.tagline;

  /* Badge do perfil secundário */
  const secBadge = document.getElementById(prefix + '-sec-badge');
  if (hasSecondary) {
    secBadge.classList.remove('hidden');
    const sn     = document.getElementById(prefix + '-sec-name');
    const skSigla = `<span style="font-size:.9em;font-weight:700;color:${DISC_COLORS[sk]};opacity:.75;margin-left:5px;">(${sk})</span>`;
    sn.innerHTML  = 'Perfil ' + profileData[sk].name + skSigla;
    sn.style.color = DISC_COLORS[sk];
  } else {
    secBadge.classList.add('hidden');
  }

  /* Descrição */
  const descTitle = document.getElementById(prefix + '-desc-title');
  const descBody  = document.getElementById(prefix + '-desc-body');
  if (descTitle) descTitle.textContent = combo ? `${data.name} + ${profileData[sk].name}` : `Sobre o perfil ${data.name}`;
  if (descBody)  descBody.innerHTML    = data.description.map(p => `<p>${p}</p>`).join('');

  /* Cards de forças, desenvolvimento, comunicação e ambiente */
  const lists = [
    [prefix + '-strengths',    data.strengths],
    [prefix + '-develop',      data.develop],
    [prefix + '-communication',data.communication],
    [prefix + '-environment',  data.environment]
  ];
  lists.forEach(([id, items]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = items.map(t => `<li>${t}</li>`).join('');
  });

  /* Barras de percentual — animadas via transição CSS */
  const barPrefix = prefix === 'pub' ? 'pub-bar-' : 'bar-';
  const pctPrefix = prefix === 'pub' ? 'pub-pct-' : 'pct-';

  /* Zera primeiro para garantir que a animação re-dispare */
  ['d','i','s','c'].forEach(k => {
    const barEl = document.getElementById(barPrefix + k);
    const pctEl = document.getElementById(pctPrefix + k);
    if (barEl) barEl.style.width    = '0%';
    if (pctEl) pctEl.textContent    = '0%';
  });
  void document.getElementById(barPrefix + 'd')?.offsetWidth; // força reflow

  setTimeout(() => {
    ['D','I','S','C'].forEach(k => {
      const key   = k.toLowerCase();
      const barEl = document.getElementById(barPrefix + key);
      const pctEl = document.getElementById(pctPrefix + key);
      const value = pcts[k] ?? 0;
      if (barEl) barEl.style.width    = value + '%';
      if (pctEl) pctEl.textContent    = value + '%';
    });
  }, 80);
}

/* ════════════════════════════════════════════════════
   COMPARTILHAR RESULTADO — Link público
   Copia URL pura + <a href> HTML (para e-mail rico)
════════════════════════════════════════════════════ */
function shareResult() {
  if (!lastResult) return;
  const url           = getBaseURL() + '?share=' + lastResult.shareId;
  const participantName = lastResult.name || 'Participante';
  const htmlLink =
    `<a href="${url}" target="_blank" ` +
    `style="color:#2ECC71;text-decoration:underline;font-family:Arial,sans-serif;font-size:14px;">` +
    `Visualizar Relatório DISC — ${participantName}</a>`;

  if (navigator.clipboard && window.ClipboardItem) {
    const item = new ClipboardItem({
      'text/plain': new Blob([url],      { type:'text/plain' }),
      'text/html':  new Blob([htmlLink], { type:'text/html'  })
    });
    navigator.clipboard.write([item])
      .then(()  => showToast('✓ Link do relatório copiado! Cole num e-mail para ter o hiperlink clicável.'))
      .catch(()  => _shareResultFallback(url));
  } else {
    _shareResultFallback(url);
  }
}

function _shareResultFallback(url) {
  navigator.clipboard.writeText(url)
    .then(()  => showToast('✓ Link copiado!'))
    .catch(()  => prompt('Copie o link do resultado abaixo:', url));
}

/* Detecta ?share=SHARE_ID na URL e exibe o resultado público */
function checkPublicShare() {
  const params = new URLSearchParams(window.location.search);
  const sid    = params.get('share');
  if (!sid) return false;
  const r = MockDB.getByShareId(sid);
  if (!r) { alert('Resultado não encontrado ou link inválido.'); return false; }
  showResults(r, 'screen-public');
  return true;
}

/* ════════════════════════════════════════════════════
   EXPORTAR PDF — html2canvas + jsPDF
   1. buildPdfHTML(r) → monta o HTML estático A4
   2. downloadPDF()   → renderiza, captura, pagina e salva
════════════════════════════════════════════════════ */
function buildPdfHTML(r) {
  const { primaryKey:pk, secondaryKey:sk, hasSecondary, scores, name, date } = r;
  const data   = profileData[pk];
  const combo  = hasSecondary ? combos[pk + sk] : null;
  const pdfSigla = hasSecondary ? pk + sk : pk;

  /* Rótulo principal: "Perfil Estável (SD)" + subtítulo combo */
  const labelPrimary =
    `<span style="font-family:Arial,sans-serif;font-size:30px;font-weight:700;` +
    `color:${DISC_COLORS[pk]};line-height:1.1;">` +
      `Perfil ${data.name}` +
      `<span style="font-size:18px;font-weight:700;color:${DISC_COLORS[pk]};` +
      `opacity:.65;margin-left:8px;">(${pdfSigla})</span>` +
    `</span>`;
  const labelCombo = combo
    ? `<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:600;color:#888;margin-top:4px;">${combo.name}</div>`
    : '';
  const label = labelPrimary + labelCombo;
  const tag   = combo ? combo.tagline : data.tagline;

  /* Bloco do perfil secundário */
  const secBlock = hasSecondary
    ? `<span style="font-family:Arial,sans-serif;font-size:20px;color:#ccc;font-weight:300;margin:0 10px;">+</span>` +
      `<span style="font-family:Arial,sans-serif;font-size:26px;font-weight:700;color:${DISC_COLORS[sk]};">` +
        `Perfil ${profileData[sk].name}` +
        `<span style="font-size:16px;font-weight:700;opacity:.65;margin-left:7px;">(${sk})</span>` +
      `</span>`
    : '';

  /* ── Gráfico de barras em HTML/tabela (renderizado pelo html2canvas) ── */
  const MAX=20, ROW_H=9, Y_COL=36, BORDER=2, BAR_COL=173, BAR_W=110;
  let chartRows = '';
  for (let row = MAX; row >= 1; row--) {
    const showLbl   = (row % 5 === 0 || row === MAX);
    const rowBorder = (row % 5 === 0) ? 'border-top:1px solid #dde2e8;' : '';
    const yTd = `<td style="width:${Y_COL}px;text-align:right;padding-right:8px;vertical-align:middle;font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#666;height:${ROW_H}px;">${showLbl ? row : ''}</td>`;
    const bTd = `<td style="width:${BORDER}px;background:#333;padding:0;"></td>`;
    let bars = '';
    ['D','I','S','C'].forEach(k => {
      const filled = scores[k] >= row;
      const isTop  = scores[k] === row;
      bars += `<td style="width:${BAR_COL}px;height:${ROW_H}px;text-align:center;vertical-align:middle;padding:0;background:${filled ? DISC_COLORS[k] : '#f5f5f5'};">` +
              `<div style="width:${BAR_W}px;height:${ROW_H+1}px;margin:0 auto;background:${filled ? DISC_COLORS[k] : '#f5f5f5'};` +
              `${isTop ? 'border-radius:4px 4px 0 0;' : ''}display:block;line-height:0;font-size:0;"></div></td>`;
    });
    chartRows += `<tr style="${rowBorder}">${yTd}${bTd}${bars}</tr>`;
  }

  const zeroRow = `<tr>
    <td style="width:${Y_COL}px;text-align:right;padding-right:8px;font-family:Arial,sans-serif;font-size:9px;font-weight:700;color:#666;height:${ROW_H}px;">0</td>
    <td style="width:${BORDER}px;background:#333;padding:0;"></td>
    ${['D','I','S','C'].map(() => `<td style="width:${BAR_COL}px;height:${ROW_H}px;background:#f5f5f5;border-top:2px solid #333;"></td>`).join('')}
  </tr>`;

  const xRow = `<tr>
    <td style="width:${Y_COL}px;"></td>
    <td style="width:${BORDER}px;background:#333;padding:0;"></td>
    ${['D','I','S','C'].map(k =>
      `<td style="width:${BAR_COL}px;padding:8px 4px 2px;text-align:center;background:#fff;">
        <div style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:${DISC_COLORS[k]};">${k}</div>
        <div style="font-family:Arial,sans-serif;font-size:9px;color:#666;margin-top:2px;">${DISC_NAMES[k]}</div>
        <div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${DISC_DARK[k]};margin-top:2px;">${scores[k]} pts</div>
      </td>`).join('')}
  </tr>`;

  /* Helpers para cards de lista */
  const li   = items => items.map(t =>
    `<tr>
      <td style="font-family:Arial,sans-serif;font-size:11px;color:#333;padding:4px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:14px;">
        <span style="font-weight:700;font-size:13px;color:#aaa;">›</span>
      </td>
      <td style="font-family:Arial,sans-serif;font-size:11px;color:#333;padding:4px 0 4px 4px;border-bottom:1px solid #f0f0f0;line-height:1.5;">${t}</td>
    </tr>`).join('');

  const card = (title, items) =>
    `<div style="border:1.5px solid #e0e0e0;border-radius:6px;padding:14px 16px;background:#fff;">
      <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#444;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #eee;">${title}</div>
      <table style="width:100%;border-collapse:collapse;">${li(items)}</table>
    </div>`;

  const descHTML  = data.description.map(p =>
    `<p style="font-family:Arial,sans-serif;font-size:12px;color:#333;line-height:1.8;margin:0 0 8px 0;">${p}</p>`).join('');
  const secTitle  = t =>
    `<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#444;margin-bottom:12px;padding-bottom:5px;border-bottom:1.5px solid #e0e0e0;">${t}</div>`;
  const legendHTML = ['D','I','S','C'].map(k =>
    `<span style="display:inline-block;margin-right:10px;font-family:Arial,sans-serif;font-size:9px;color:#555;font-weight:700;">
      <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${DISC_COLORS[k]};vertical-align:middle;margin-right:3px;"></span>${k}
    </span>`).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#fff;}table{border-collapse:collapse;}</style>
  </head><body>
  <div id="pdf-root" style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#1a1a1a;padding:32px 32px 44px;width:794px;">
    <table style="width:100%;border-bottom:3px solid #1a1a1a;margin-bottom:22px;">
      <tr>
        <td style="vertical-align:bottom;padding-bottom:12px;">
          <span style="font-size:22px;font-weight:700;color:#1a1a1a;">DISC</span>
          <span style="font-size:22px;font-weight:400;color:#555;">Platform</span>
          <div style="font-size:11px;color:#888;margin-top:4px;">Avaliação de Perfil Comportamental — ${name}</div>
        </td>
        <td style="vertical-align:bottom;text-align:right;padding-bottom:12px;">
          <span style="font-size:11px;color:#777;line-height:1.7;">${date}<br>Relatório Individual DISC</span>
        </td>
      </tr>
    </table>
    <div style="margin-bottom:20px;padding:18px 22px;border:2px solid #e8e8e8;border-radius:8px;background:#fafafa;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#888;margin-bottom:8px;">Resultado</div>
      <div style="margin-bottom:6px;">${label}${secBlock}</div>
      <div style="font-size:13px;color:#555;font-style:italic;">${tag}</div>
    </div>
    <div style="margin-bottom:22px;">
      ${secTitle('Distribuição de Pontuação — Eixos DISC')}
      <table style="border-collapse:collapse;background:#fff;">${chartRows}${zeroRow}${xRow}</table>
    </div>
    <div style="margin-bottom:18px;">
      ${secTitle('Análise do Perfil')}
      <div style="padding:16px 20px;background:#f7f7f7;border-radius:6px;border-left:4px solid ${DISC_COLORS[pk]};">${descHTML}</div>
    </div>
    <div style="margin-bottom:22px;">
      ${secTitle('Mapeamento Comportamental')}
      <table style="width:100%;">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:7px;">${card('✦ Pontos Fortes',    data.strengths)}</td>
          <td style="width:50%;vertical-align:top;padding-left:7px;">${card('◎ A Desenvolver',    data.develop)}</td>
        </tr>
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:7px;padding-top:10px;">${card('◈ Comunicação',   data.communication)}</td>
          <td style="width:50%;vertical-align:top;padding-left:7px;padding-top:10px;">${card('◉ Ambiente Ideal', data.environment)}</td>
        </tr>
      </table>
    </div>
    <table style="width:100%;border-top:1.5px solid #ddd;margin-top:18px;">
      <tr>
        <td style="vertical-align:middle;padding-top:10px;">
          <span style="font-size:9px;color:#aaa;line-height:1.6;">
            Relatório gerado pela DISC Platform. Os resultados refletem tendências comportamentais.<br>
            Recomenda-se interpretação por profissional habilitado.
          </span>
        </td>
        <td style="vertical-align:middle;text-align:right;padding-top:10px;">${legendHTML}</td>
      </tr>
    </table>
  </div>
  </body></html>`;
}

function downloadPDF() {
  const r   = lastResult;
  if (!r) return;
  const btn  = document.querySelector('[onclick="downloadPDF()"]');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '⏳ Gerando…'; btn.disabled = true; }

  const PDF_PX  = 794;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position:absolute','top:0','left:0',
    `width:${PDF_PX}px`,'visibility:hidden','pointer-events:none',
    'z-index:-1','background:#fff','overflow:visible'
  ].join(';');
  document.body.appendChild(wrapper);
  wrapper.innerHTML = buildPdfHTML(r);
  const root = wrapper.querySelector('#pdf-root');

  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
    html2canvas(root, {
      scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false,
      width: PDF_PX, windowWidth: PDF_PX, scrollX: 0, scrollY: 0,
      onclone: (doc, el) => {
        el.style.visibility = 'visible';
        el.style.position   = 'static';
        const pr = doc.getElementById('pdf-root');
        if (pr) { pr.style.visibility = 'visible'; pr.style.display = 'block'; }
      }
    }).then(canvas => {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' });
      const A4_W = 210, A4_H = 297, M = 8, usableW = A4_W - M * 2;
      const imgW = canvas.width, imgH = canvas.height;
      const pdfImgW = usableW, pdfImgH = pdfImgW * (imgH / imgW);
      const pageH = A4_H - M * 2;
      let off = 0, first = true;
      while (off < pdfImgH) {
        if (!first) pdf.addPage(); first = false;
        const sTopPx = (off / pdfImgH) * imgH;
        const sH     = Math.min((pageH / pdfImgH) * imgH, imgH - sTopPx);
        const sc     = document.createElement('canvas');
        sc.width     = imgW; sc.height = Math.ceil(sH);
        const ctx    = sc.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sc.width, sc.height);
        ctx.drawImage(canvas, 0, -sTopPx);
        pdf.addImage(sc.toDataURL('image/jpeg', .97), 'JPEG', M, M, pdfImgW, (sc.height / imgH) * pdfImgH);
        off += pageH;
      }
      pdf.save(`disc-${r.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      document.body.removeChild(wrapper);
      if (btn) { btn.innerHTML = orig; btn.disabled = false; }
    }).catch(e => {
      console.error(e);
      document.body.removeChild(wrapper);
      if (btn) { btn.innerHTML = orig; btn.disabled = false; }
    });
  }, 700)));
}
