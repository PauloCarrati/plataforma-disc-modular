/* ══════════════════════════════════════════════════════
   reports.js — DISC Platform
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: exibição de resultados e exportação.
     • showResults()      — renderiza resultado na tela
     • shareResult()      — copia link público como hiperlink
     • checkPublicShare() — detecta ?share= na URL
     • buildPdfHTML()     — monta HTML estático do relatório
     • downloadPDF()      — captura canvas e salva o PDF

   DEPENDE DE (carregado antes):
     disc-engine.js → profileData, combos, DISC_COLORS,
                       DISC_DARK, DISC_NAMES
     globals.js     → MockDB, lastResult, showScreen,
                       showToast, getBaseURL

   EXPÕE (chamadas do HTML via onclick):
     showResults(r, targetScreen)
     shareResult()
     checkPublicShare()
     downloadPDF()

   ⚠  SEM 'use strict' — necessário para acessar globais.
══════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   EXIBIR RESULTADO — tela privada e pública
   targetScreen: 'screen-result' | 'screen-public'
   Prefixo de IDs:
     tela privada → 'res-'
     tela pública → 'pub-'
════════════════════════════════════════════════════ */
function showResults(r, targetScreen) {
  showScreen(targetScreen);
  window.scrollTo(0, 0);

  var isPublic = targetScreen === 'screen-public';
  var prefix   = isPublic ? 'pub' : 'res';

  /* ── Leitura do resultado — suporta multi-perfil v9 ── */
  var pk           = r.primaryKey;
  var profileCodes = r.profileCodes || [pk];   /* ['S','C'] ou ['D'] etc. */
  var profileCode  = r.profileCode  || pk;     /* 'SC', 'DIS', 'D' etc.  */
  var hasSecondary = r.hasSecondary || false;
  var pcts         = r.pcts   || {};
  var scores       = r.scores || {};

  var data  = profileData[pk];
  /* Busca combo pelo código completo (ex: 'SC', 'DIS') */
  var combo = combos[profileCode] || null;

  /* Sigla entre parênteses: (S), (SC), (DIS) */
  var siglaSpan = function(color) {
    return '<span style="font-size:.5em;font-weight:700;color:' + color + ';opacity:.7;' +
           'letter-spacing:.04em;vertical-align:middle;margin-left:7px;">(' + profileCode + ')</span>';
  };

  /* ── Nome principal com todos os fatores coloridos ── */
  var nameEl = document.getElementById(prefix + '-name');
  if (combo) {
    /* Nome colorido do fator principal + sigla + nome do combo abaixo */
    nameEl.innerHTML =
      '<span style="color:' + DISC_COLORS[pk] + '">' +
        data.name + siglaSpan(DISC_COLORS[pk]) +
      '</span>' +
      '<span style="font-size:.44em;font-weight:500;color:var(--text2);' +
        'display:block;margin-top:5px;letter-spacing:.02em;">' +
        combo.name +
      '</span>';
  } else {
    /* Perfil simples */
    nameEl.innerHTML =
      '<span style="color:' + DISC_COLORS[pk] + '">Perfil ' + data.name +
        siglaSpan(DISC_COLORS[pk]) +
      '</span>';
  }

  document.getElementById(prefix + '-tagline').textContent =
    combo ? combo.tagline : data.tagline;

  /* ── Badge de perfis adicionais (2º, 3º fatores) ── */
  var secBadge = document.getElementById(prefix + '-sec-badge');
  if (profileCodes.length >= 2) {
    secBadge.classList.remove('hidden');
    var sn = document.getElementById(prefix + '-sec-name');
    /* Exibe todos os fatores >= threshold com suas cores */
    var extraNames = profileCodes.slice(1).map(function(code) {
      return '<span style="color:' + DISC_COLORS[code] + ';font-weight:700;margin:0 3px;">' +
        profileData[code].name + ' (' + code + ')' +
      '</span>';
    });
    sn.innerHTML  = extraNames.join('<span style="color:var(--text3);margin:0 4px;">+</span>');
    sn.style.color = '';
  } else {
    secBadge.classList.add('hidden');
  }

  /* ── Descrição do perfil principal ── */
  var descTitle = document.getElementById(prefix + '-desc-title');
  var descBody  = document.getElementById(prefix + '-desc-body');
  if (descTitle) {
    descTitle.textContent = profileCodes.length >= 2
      ? profileCodes.map(function(c) { return profileData[c].name; }).join(' + ')
      : 'Sobre o perfil ' + data.name;
  }
  if (descBody) {
    /* Exibe descrição do fator principal + dos demais se multiperfil */
    var descParts = profileCodes.map(function(code) {
      return profileData[code].description.map(function(p) {
        return '<p>' + p + '</p>';
      }).join('');
    });
    descBody.innerHTML = descParts.join(
      '<hr style="border:none;border-top:1px solid var(--border);margin:14px 0;">'
    );
  }

  /* Cards de características */
  var lists = [
    [prefix + '-strengths',     data.strengths],
    [prefix + '-develop',       data.develop],
    [prefix + '-communication', data.communication],
    [prefix + '-environment',   data.environment]
  ];
  lists.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) el.innerHTML = pair[1].map(function(t) { return '<li>' + t + '</li>'; }).join('');
  });

  /* ── BUG 4,5 CORRIGIDO: barras mostram pontos reais (escala 80 pts = 100%)
     A barra é proporcional ao máximo de um perfil (80 pts).
     O label exibe "X pts" em vez de "X%" — padrão oficial 200 pts. ── */
  var barPre = prefix === 'pub' ? 'pub-bar-' : 'bar-';
  var pctPre = prefix === 'pub' ? 'pub-pct-' : 'pct-';
  var MAX_SCORE_PER = 80; /* máximo por perfil na escala 200 pts */

  ['d','i','s','c'].forEach(function(k) {
    var b = document.getElementById(barPre + k);
    var p = document.getElementById(pctPre + k);
    if (b) b.style.width  = '0%';
    if (p) p.textContent  = '0 pts';
  });

  var reflow = document.getElementById(barPre + 'd');
  if (reflow) void reflow.offsetWidth;

  setTimeout(function() {
    ['D','I','S','C'].forEach(function(k) {
      var key   = k.toLowerCase();
      var barEl = document.getElementById(barPre + key);
      var pctEl = document.getElementById(pctPre + key);
      /* Usa scores (pts reais) para o valor; pcts para a largura visual */
      var pts   = (scores && scores[k] !== undefined) ? scores[k] : (pcts[k] || 0);
      var width = Math.round((pts / MAX_SCORE_PER) * 100);
      if (barEl) barEl.style.width  = width + '%';
      if (pctEl) pctEl.textContent  = pts + ' pts';
    });
  }, 80);
}

/* ════════════════════════════════════════════════════
   COMPARTILHAR RESULTADO — link público como hiperlink
════════════════════════════════════════════════════ */
function shareResult() {
  if (!lastResult) return;
  var url              = getBaseURL() + '?share=' + lastResult.shareId;
  var participantName  = lastResult.name || 'Participante';
  var htmlLink =
    '<a href="' + url + '" target="_blank" ' +
    'style="color:#2ECC71;text-decoration:underline;font-family:Arial,sans-serif;font-size:14px;">' +
    'Visualizar Relatório DISC — ' + participantName + '</a>';

  if (navigator.clipboard && window.ClipboardItem) {
    var item = new ClipboardItem({
      'text/plain': new Blob([url],      { type: 'text/plain' }),
      'text/html':  new Blob([htmlLink], { type: 'text/html'  })
    });
    navigator.clipboard.write([item])
      .then(function()  { showToast('✓ Link do relatório copiado! Cole num e-mail para ter o hiperlink clicável.'); })
      .catch(function() { _shareResultFallback(url); });
  } else {
    _shareResultFallback(url);
  }
}

function _shareResultFallback(url) {
  navigator.clipboard.writeText(url)
    .then(function()  { showToast('✓ Link copiado!'); })
    .catch(function() { prompt('Copie o link abaixo:', url); });
}

/* Detecta ?share=ID e exibe o resultado público */
function checkPublicShare() {
  var params = new URLSearchParams(window.location.search);
  var sid    = params.get('share');
  if (!sid) return false;
  var r = MockDB.getByShareId(sid);
  if (!r) { alert('Resultado não encontrado ou link inválido.'); return false; }
  showResults(r, 'screen-public');
  return true;
}

/* ════════════════════════════════════════════════════
   EXPORTAR PDF — html2canvas + jsPDF
   buildPdfHTML: monta o HTML estático do relatório
   downloadPDF:  renderiza, pagina e salva o arquivo
════════════════════════════════════════════════════ */
function buildPdfHTML(r) {
  var pk           = r.primaryKey;
  var sk           = r.secondaryKey;
  var hasSecondary = r.hasSecondary;
  var scores       = r.scores;
  var name         = r.name;
  var date         = r.date;

  /* ── Dados do perfil — multi-perfil v9 ── */
  var profileCodes = r.profileCodes || [pk];
  var profileCode  = r.profileCode  || pk;
  var data         = profileData[pk];
  var combo        = combos[profileCode] || null;

  /* Rótulo principal: nome do fator + sigla completa + nome do combo */
  var label =
    '<span style="font-family:Arial,sans-serif;font-size:28px;font-weight:700;' +
    'color:' + DISC_COLORS[pk] + ';line-height:1.15;">' +
      data.name +
      '<span style="font-size:17px;font-weight:700;color:' + DISC_COLORS[pk] + ';' +
        'opacity:.6;margin-left:9px;">(' + profileCode + ')</span>' +
    '</span>' +
    (combo
      ? '<div style="font-family:Arial,sans-serif;font-size:13px;font-weight:600;' +
          'color:#888;margin-top:5px;">' + combo.name + '</div>'
      : '');

  var tag = combo ? combo.tagline : data.tagline;

  /* Bloco dos fatores adicionais (2º, 3º, 4º) */
  var secBlock = profileCodes.length >= 2
    ? profileCodes.slice(1).map(function(code) {
        return '<span style="font-family:Arial,sans-serif;font-size:18px;' +
          'color:#bbb;font-weight:300;margin:0 8px;">+</span>' +
          '<span style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;' +
            'color:' + DISC_COLORS[code] + ';">' +
            profileData[code].name +
            '<span style="font-size:13px;opacity:.6;margin-left:6px;">(' + code + ')</span>' +
          '</span>';
      }).join('')
    : '';

  /* ════════════════════════════════════════════════
     GRÁFICO PDF — v7 CORRIGIDO
     Baseado no modelo visual de referência:
       - Barras nascem SOBRE o eixo horizontal (base)
       - Crescem PARA CIMA proporcionalmente
       - Eixo Y com linhas de grade à esquerda
       - Labels ABAIXO do eixo: Letra → Nome → Pts
       - Pontuação NÃO duplicada (sem valor no topo da barra)
       - Fundo cinza claro, barras coloridas DISC
     Escala: 0 a 80 pts (máximo por perfil na escala 200 pts)
  ════════════════════════════════════════════════ */

  /* ── Dimensões do gráfico (sem números mágicos) ── */
  var PDF_MAX_SCORE  = 80;   /* pts máximos por perfil                 */
  var CHART_H        = 180;  /* altura da área de barras em px         */
  var CHART_BAR_W    = 110;  /* largura de cada barra                  */
  var CHART_BAR_GAP  = 10;   /* espaço entre barras                    */
  var CHART_LEFT_PAD = 44;   /* espaço para eixo Y (números + linha)   */
  var CHART_RIGHT_PAD= 8;    /* margem direita                         */
  var CHART_LABEL_H  = 56;   /* altura da área de labels abaixo do eixo*/
  var CHART_TOTAL_W  = CHART_LEFT_PAD + 4 * CHART_BAR_W + 3 * CHART_BAR_GAP + CHART_RIGHT_PAD;
  var CHART_TOTAL_H  = CHART_H + CHART_LABEL_H + 4; /* +4 = espessura do eixo */

  /* ── Linhas de grade horizontais (eixo Y) ── */
  var yTicks = [0, 20, 40, 60, 80];
  var gridHTML = yTicks.map(function(val) {
    /* bottom relativo à área de barras */
    var bottomPx = Math.round((val / PDF_MAX_SCORE) * CHART_H);
    var isBase   = val === 0;
    return (
      /* Número do eixo Y */
      '<div style="position:absolute;' +
        'left:0;width:' + (CHART_LEFT_PAD - 4) + 'px;' +
        'bottom:' + bottomPx + 'px;' +
        'text-align:right;' +
        'font-family:Arial,sans-serif;font-size:8px;font-weight:700;color:#777;' +
        'line-height:1;transform:translateY(50%);">' + val + '</div>' +
      /* Linha horizontal */
      '<div style="position:absolute;' +
        'left:' + CHART_LEFT_PAD + 'px;right:' + CHART_RIGHT_PAD + 'px;' +
        'bottom:' + bottomPx + 'px;height:' + (isBase ? '2' : '1') + 'px;' +
        'background:' + (isBase ? '#222' : '#dde2e8') + ';"></div>'
    );
  }).join('');

  /* ── Barras coloridas ── */
  var barsHTML = ['D','I','S','C'].map(function(k, ki) {
    var pts   = scores[k] || 0;
    /* Altura proporcional: height = (pts / 80) * CHART_H */
    var barH  = Math.round((pts / PDF_MAX_SCORE) * CHART_H);
    /* Posição horizontal da barra */
    var leftPx = CHART_LEFT_PAD + ki * (CHART_BAR_W + CHART_BAR_GAP);

    return (
      /* Fundo cinza (coluna vazia) — nasce da base (bottom:0) até o topo */
      '<div style="position:absolute;' +
        'left:' + leftPx + 'px;width:' + CHART_BAR_W + 'px;' +
        'bottom:0;height:' + CHART_H + 'px;' +
        'background:#f0f0f0;border-radius:3px 3px 0 0;"></div>' +

      /* Barra colorida — começa na base (bottom:0) e sobe barH px */
      '<div style="position:absolute;' +
        'left:' + leftPx + 'px;width:' + CHART_BAR_W + 'px;' +
        'bottom:0;height:' + barH + 'px;' +
        'background:' + DISC_COLORS[k] + ';' +
        'border-radius:' + (barH > 6 ? '3px 3px 0 0' : '1px 1px 0 0') + ';"></div>'
    );
  }).join('');

  /* ── Labels abaixo do eixo (letra, nome, pts) ── */
  var labelsHTML = ['D','I','S','C'].map(function(k, ki) {
    var pts    = scores[k] || 0;
    var leftPx = CHART_LEFT_PAD + ki * (CHART_BAR_W + CHART_BAR_GAP);
    return (
      '<div style="position:absolute;' +
        'left:' + leftPx + 'px;width:' + CHART_BAR_W + 'px;' +
        'top:' + (CHART_H + 6) + 'px;' +
        'text-align:center;">' +
        /* Letra DISC em cor */
        '<div style="font-family:Arial,sans-serif;font-size:15px;font-weight:800;' +
          'color:' + DISC_COLORS[k] + ';line-height:1.2;">' + k + '</div>' +
        /* Nome por extenso */
        '<div style="font-family:Arial,sans-serif;font-size:8px;' +
          'color:#666;margin-top:1px;line-height:1.3;">' + DISC_NAMES[k] + '</div>' +
        /* Pontuação — única aparição, clara e destacada */
        '<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;' +
          'color:' + DISC_DARK[k] + ';margin-top:3px;">' + pts + ' pts</div>' +
      '</div>'
    );
  }).join('');

  /* ── Container principal (position:relative) ── */
  var chartHTML =
    '<div style="position:relative;' +
      'width:' + CHART_TOTAL_W + 'px;' +
      'height:' + CHART_TOTAL_H + 'px;' +
      'margin:0 auto;">' +
      /* Área das barras (position:relative para os filhos absolute) */
      '<div style="position:absolute;' +
        'left:0;right:0;top:0;height:' + CHART_H + 'px;">' +
        gridHTML + barsHTML +
      '</div>' +
      /* Área dos labels (abaixo do eixo) */
      '<div style="position:absolute;' +
        'left:0;right:0;top:0;height:' + CHART_TOTAL_H + 'px;pointer-events:none;">' +
        labelsHTML +
      '</div>' +
    '</div>';

  var li = function(items) {
    return items.map(function(t) {
      return '<tr>' +
        '<td style="font-family:Arial,sans-serif;font-size:11px;color:#333;padding:4px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;width:14px;">' +
          '<span style="font-weight:700;font-size:13px;color:#aaa;">›</span>' +
        '</td>' +
        '<td style="font-family:Arial,sans-serif;font-size:11px;color:#333;padding:4px 0 4px 4px;border-bottom:1px solid #f0f0f0;line-height:1.5;">' + t + '</td>' +
      '</tr>';
    }).join('');
  };

  var card = function(title, items) {
    return '<div style="border:1.5px solid #e0e0e0;border-radius:6px;padding:14px 16px;background:#fff;">' +
      '<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#444;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #eee;">' + title + '</div>' +
      '<table style="width:100%;border-collapse:collapse;">' + li(items) + '</table>' +
    '</div>';
  };

  var descHTML = data.description.map(function(p) {
    return '<p style="font-family:Arial,sans-serif;font-size:12px;color:#333;line-height:1.8;margin:0 0 8px 0;">' + p + '</p>';
  }).join('');

  var secTitle = function(t) {
    return '<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#444;margin-bottom:12px;padding-bottom:5px;border-bottom:1.5px solid #e0e0e0;">' + t + '</div>';
  };

  var legendHTML = ['D','I','S','C'].map(function(k) {
    return '<span style="display:inline-block;margin-right:10px;font-family:Arial,sans-serif;font-size:9px;color:#555;font-weight:700;">' +
      '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + DISC_COLORS[k] + ';vertical-align:middle;margin-right:3px;"></span>' + k +
    '</span>';
  }).join('');

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
    '<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#fff;}table{border-collapse:collapse;}</style>' +
    '</head><body>' +
    '<div id="pdf-root" style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#1a1a1a;padding:32px 32px 44px;width:794px;">' +
      '<table style="width:100%;border-bottom:3px solid #1a1a1a;margin-bottom:22px;"><tr>' +
        '<td style="vertical-align:bottom;padding-bottom:12px;">' +
          '<span style="font-size:22px;font-weight:700;color:#1a1a1a;">DISC</span>' +
          '<span style="font-size:22px;font-weight:400;color:#555;">Platform</span>' +
          '<div style="font-size:11px;color:#888;margin-top:4px;">Avaliação de Perfil Comportamental — ' + name + '</div>' +
        '</td>' +
        '<td style="vertical-align:bottom;text-align:right;padding-bottom:12px;">' +
          '<span style="font-size:11px;color:#777;line-height:1.7;">' + date + '<br>Relatório Individual DISC</span>' +
        '</td>' +
      '</tr></table>' +
      '<div style="margin-bottom:20px;padding:18px 22px;border:2px solid #e8e8e8;border-radius:8px;background:#fafafa;">' +
        '<div style="font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#888;margin-bottom:8px;">Resultado</div>' +
        '<div style="margin-bottom:6px;">' + label + secBlock + '</div>' +
        '<div style="font-size:13px;color:#555;font-style:italic;">' + tag + '</div>' +
      '</div>' +
      '<div style="margin-bottom:22px;">' +
        secTitle('Distribuição de Pontuação — Eixos DISC') +
        chartHTML +
      '</div>' +
      '<div style="margin-bottom:18px;">' +
        secTitle('Análise do Perfil') +
        '<div style="padding:16px 20px;background:#f7f7f7;border-radius:6px;border-left:4px solid ' + DISC_COLORS[pk] + ';">' + descHTML + '</div>' +
      '</div>' +
      '<div style="margin-bottom:22px;">' +
        secTitle('Mapeamento Comportamental') +
        '<table style="width:100%;"><tr>' +
          '<td style="width:50%;vertical-align:top;padding-right:7px;">'  + card('✦ Pontos Fortes',    data.strengths)    + '</td>' +
          '<td style="width:50%;vertical-align:top;padding-left:7px;">'   + card('◎ A Desenvolver',    data.develop)      + '</td>' +
        '</tr><tr>' +
          '<td style="width:50%;vertical-align:top;padding-right:7px;padding-top:10px;">' + card('◈ Comunicação',   data.communication) + '</td>' +
          '<td style="width:50%;vertical-align:top;padding-left:7px;padding-top:10px;">'  + card('◉ Ambiente Ideal', data.environment)   + '</td>' +
        '</tr></table>' +
      '</div>' +
      '<table style="width:100%;border-top:1.5px solid #ddd;margin-top:18px;"><tr>' +
        '<td style="vertical-align:middle;padding-top:10px;">' +
          '<span style="font-size:9px;color:#aaa;line-height:1.6;">' +
            'Relatório gerado pela DISC Platform. Os resultados refletem tendências comportamentais.<br>' +
            'Recomenda-se interpretação por profissional habilitado.' +
          '</span>' +
        '</td>' +
        '<td style="vertical-align:middle;text-align:right;padding-top:10px;">' + legendHTML + '</td>' +
      '</tr></table>' +
    '</div></body></html>';
}

function downloadPDF() {
  var r   = lastResult;
  if (!r) return;
  var btn  = document.querySelector('[onclick="downloadPDF()"]');
  var orig = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '⏳ Gerando…'; btn.disabled = true; }

  var PDF_PX  = 794;
  var wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:absolute;top:0;left:0;width:' + PDF_PX + 'px;' +
    'visibility:hidden;pointer-events:none;z-index:-1;background:#fff;overflow:visible;';
  document.body.appendChild(wrapper);
  wrapper.innerHTML = buildPdfHTML(r);
  var root = wrapper.querySelector('#pdf-root');

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      setTimeout(function() {
        html2canvas(root, {
          scale: 3, useCORS: true, backgroundColor: '#ffffff', logging: false,
          width: PDF_PX, windowWidth: PDF_PX, scrollX: 0, scrollY: 0,
          onclone: function(doc, el) {
            el.style.visibility = 'visible';
            el.style.position   = 'static';
            var pr = doc.getElementById('pdf-root');
            if (pr) { pr.style.visibility = 'visible'; pr.style.display = 'block'; }
          }
        }).then(function(canvas) {
          var jsPDF  = window.jspdf.jsPDF;
          var pdf    = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' });
          var A4_W=210, A4_H=297, M=8, usableW=A4_W-M*2;
          var imgW   = canvas.width, imgH = canvas.height;
          var pdfImgW = usableW, pdfImgH = pdfImgW * (imgH / imgW);
          var pageH  = A4_H - M*2;
          var off    = 0, first = true;
          while (off < pdfImgH) {
            if (!first) pdf.addPage(); first = false;
            var sTopPx = (off / pdfImgH) * imgH;
            var sH     = Math.min((pageH / pdfImgH) * imgH, imgH - sTopPx);
            var sc     = document.createElement('canvas');
            sc.width   = imgW; sc.height = Math.ceil(sH);
            var ctx    = sc.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sc.width, sc.height);
            ctx.drawImage(canvas, 0, -sTopPx);
            pdf.addImage(sc.toDataURL('image/jpeg', .97), 'JPEG', M, M, pdfImgW, (sc.height / imgH) * pdfImgH);
            off += pageH;
          }
          pdf.save('disc-' + r.name.replace(/\s+/g, '-').toLowerCase() + '.pdf');
          document.body.removeChild(wrapper);
          if (btn) { btn.innerHTML = orig; btn.disabled = false; }
        }).catch(function(e) {
          console.error(e);
          document.body.removeChild(wrapper);
          if (btn) { btn.innerHTML = orig; btn.disabled = false; }
        });
      }, 700);
    });
  });
}
