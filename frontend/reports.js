/* ══════════════════════════════════════════════════════
   reports.js — DISC Platform — FASE 2 (pós-correção)
   ─────────────────────────────────────────────────────
   CORREÇÕES APLICADAS:
     1. Cores individuais por fator DISC no nome do perfil
        (cada letra usa sua própria cor: D=vermelho,
         I=amarelo, S=verde, C=azul)
     2. Remoção do badge "Perfil Secundário" (tela + PDF)
     3. Seção "Medos" adicionada na tela de resultado
     4. PDF: rótulo corrigido (sem referências a fatores
        isolados), texto limpo
     5. PDF: paginação automática corrigida — nenhuma
        seção é cortada, funciona para triplos longos

   NÃO ALTERADO:
     Algoritmo DISC, cálculos, ProfileService, JSON.
══════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   _coloredName
   Recebe sd.nome (ex: "Estável Dominante") e
   profileCodes (ex: ["S","D"]) e retorna HTML com
   cada palavra na cor do seu fator correspondente.

   Regra: a ordem dos nomes no sd.nome segue a ordem
   dos fatores em profileCodes (1º fator = 1ª palavra).
   Para perfis simples, a cor é simplesmente DISC_COLORS[pk].
════════════════════════════════════════════════════ */
function _coloredName(sd, profileCodes) {
  if (!profileCodes || profileCodes.length <= 1) {
    /* Perfil simples — cor única */
    var pk = profileCodes ? profileCodes[0] : 'D';
    return '<span style="color:' + DISC_COLORS[pk] + '">' + sd.nome + '</span>';
  }

  /* Perfis duplos e triplos — cada palavra na cor do seu fator */
  var words = sd.nome.split(/\s+/);
  return words.map(function (word, idx) {
    var code  = profileCodes[idx] || profileCodes[profileCodes.length - 1];
    var color = DISC_COLORS[code] || DISC_COLORS[profileCodes[0]];
    return '<span style="color:' + color + ';font-weight:700;">' + word + '</span>';
  }).join(' ');
}

/* Versão do _coloredName para HTML inline (PDF / texto plano) */
function _coloredNameInline(nome, profileCodes, fontSize, extraStyle) {
  fontSize   = fontSize   || '26px';
  extraStyle = extraStyle || '';
  if (!profileCodes || profileCodes.length <= 1) {
    var pk = profileCodes ? profileCodes[0] : 'D';
    return '<span style="font-family:Arial,sans-serif;font-size:' + fontSize + ';' +
      'font-weight:700;color:' + DISC_COLORS[pk] + ';' + extraStyle + '">' + nome + '</span>';
  }
  var words = nome.split(/\s+/);
  return words.map(function (word, idx) {
    var code  = profileCodes[idx] || profileCodes[profileCodes.length - 1];
    var color = DISC_COLORS[code] || DISC_COLORS[profileCodes[0]];
    return '<span style="font-family:Arial,sans-serif;font-size:' + fontSize + ';' +
      'font-weight:700;color:' + color + ';' + extraStyle + '">' + word + '</span>';
  }).join(' ');
}

/* ════════════════════════════════════════════════════
   EXIBIR RESULTADO — tela privada e pública
════════════════════════════════════════════════════ */
function showResults(r, targetScreen) {
  showScreen(targetScreen);
  window.scrollTo(0, 0);

  var isPublic     = targetScreen === 'screen-public';
  var prefix       = isPublic ? 'pub' : 'res';
  var profileCode  = r.profileCode  || r.primaryKey || '';
  var profileCodes = r.profileCodes || [r.primaryKey];
  var pk           = r.primaryKey   || profileCodes[0];
  var scores       = r.scores       || {};

  /* Barras são síncronas — não dependem do JSON */
  _renderBars(prefix, scores);

  ProfileService.getProfileForResult(r)
    .then(function (profile) {
      var sd = ProfileService.buildScreenData(profile);
      _renderHeader(prefix, sd, profileCode, profileCodes, pk);
      _renderDescription(prefix, sd, profileCodes);
      _renderCards(prefix, sd);
    })
    .catch(function (err) {
      console.error('[showResults]', err);
      var el = document.getElementById(prefix + '-name');
      if (el) el.textContent = 'Perfil ' + profileCode;
    });
}

/* ────────────────────────────────────────────────────
   _renderHeader
   CORREÇÃO: cores individuais por fator
   CORREÇÃO: badge de perfil secundário REMOVIDO
──────────────────────────────────────────────────── */
function _renderHeader(prefix, sd, profileCode, profileCodes, pk) {
  var nameEl = document.getElementById(prefix + '-name');
  if (nameEl) {
    /* Código entre parênteses na cor do fator principal */
    var sigla =
      ' <span style="font-size:.5em;font-weight:700;color:' + DISC_COLORS[pk] +
      ';opacity:.65;letter-spacing:.04em;vertical-align:middle;">' +
      '(' + profileCode + ')</span>';

    /* Nome com cores individuais por fator */
    nameEl.innerHTML = _coloredName(sd, profileCodes) + sigla;
  }

  var tagEl = document.getElementById(prefix + '-tagline');
  if (tagEl) tagEl.textContent = sd.descricaoCurta || '';

  /* Badge de perfil secundário: garantir oculto (foi removido do HTML,
     mas se ainda existir no DOM por qualquer motivo, esconde) */
  var secBadge = document.getElementById(prefix + '-sec-badge');
  if (secBadge) secBadge.classList.add('hidden');
}

/* ────────────────────────────────────────────────────
   _renderDescription
──────────────────────────────────────────────────── */
function _renderDescription(prefix, sd, profileCodes) {
  var titleEl = document.getElementById(prefix + '-desc-title');
  var bodyEl  = document.getElementById(prefix + '-desc-body');

  if (titleEl) {
    titleEl.textContent = profileCodes.length >= 2
      ? 'Sobre o Perfil ' + sd.codigo
      : 'Sobre o Perfil ' + sd.titulo;
  }

  if (bodyEl) {
    var paragrafos = [];
    if (sd.caracteristicas       && sd.caracteristicas.trim())
      paragrafos.push(sd.caracteristicas);
    if (sd.relacoesInterpessoais && sd.relacoesInterpessoais.trim())
      paragrafos.push('<strong>Relações Interpessoais:</strong> ' + sd.relacoesInterpessoais);
    if (sd.tomadaDecisao         && sd.tomadaDecisao.trim())
      paragrafos.push('<strong>Tomada de Decisão:</strong> ' + sd.tomadaDecisao);
    if (sd.sobPressao            && sd.sobPressao.trim())
      paragrafos.push('<strong>Sob Pressão:</strong> ' + sd.sobPressao);

    bodyEl.innerHTML = paragrafos
      .map(function (p) { return '<p>' + p + '</p>'; })
      .join('');
  }
}

/* ────────────────────────────────────────────────────
   _renderCards
   CORREÇÃO: adicionado card Medos (res-medos / pub-medos)
──────────────────────────────────────────────────── */
function _renderCards(prefix, sd) {
  var pairs = [
    [prefix + '-strengths',     sd.strengths],
    [prefix + '-develop',       sd.develop],
    [prefix + '-communication', sd.communication],
    [prefix + '-environment',   sd.environment],
    [prefix + '-medos',         sd.medos]        /* ← NOVO */
  ];
  pairs.forEach(function (pair) {
    var el = document.getElementById(pair[0]);
    if (el) {
      el.innerHTML = (pair[1] || []).map(function (t) {
        return '<li>' + t + '</li>';
      }).join('');
    }
  });
}

/* ────────────────────────────────────────────────────
   _renderBars — barras de pontuação (síncronas)
──────────────────────────────────────────────────── */
function _renderBars(prefix, scores) {
  var barPre = prefix === 'pub' ? 'pub-bar-' : 'bar-';
  var pctPre = prefix === 'pub' ? 'pub-pct-' : 'pct-';
  var MAX    = 80;

  ['d','i','s','c'].forEach(function (k) {
    var b = document.getElementById(barPre + k);
    var p = document.getElementById(pctPre + k);
    if (b) b.style.width = '0%';
    if (p) p.textContent = '0 pts';
  });

  var reflow = document.getElementById(barPre + 'd');
  if (reflow) void reflow.offsetWidth;

  setTimeout(function () {
    ['D','I','S','C'].forEach(function (k) {
      var barEl = document.getElementById(barPre + k.toLowerCase());
      var pctEl = document.getElementById(pctPre + k.toLowerCase());
      var pts   = (scores && scores[k] !== undefined) ? scores[k] : 0;
      if (barEl) barEl.style.width = Math.round((pts / MAX) * 100) + '%';
      if (pctEl) pctEl.textContent = pts + ' pts';
    });
  }, 80);
}

/* ════════════════════════════════════════════════════
   COMPARTILHAR RESULTADO
════════════════════════════════════════════════════ */
function shareResult() {
  if (!lastResult) return;
  var url  = getBaseURL() + '?share=' + lastResult.shareId;
  var name = lastResult.name || 'Participante';
  var html =
    '<a href="' + url + '" target="_blank" ' +
    'style="color:#2ECC71;text-decoration:underline;font-family:Arial,sans-serif;font-size:14px;">' +
    'Visualizar Relatório DISC — ' + name + '</a>';

  if (navigator.clipboard && window.ClipboardItem) {
    navigator.clipboard.write([new ClipboardItem({
      'text/plain': new Blob([url],  { type: 'text/plain' }),
      'text/html':  new Blob([html], { type: 'text/html'  })
    })])
    .then(function ()  { showToast('✓ Link do relatório copiado!'); })
    .catch(function () { _shareFallback(url); });
  } else {
    _shareFallback(url);
  }
}

function _shareFallback(url) {
  navigator.clipboard.writeText(url)
    .then(function ()  { showToast('✓ Link copiado!'); })
    .catch(function () { prompt('Copie o link:', url); });
}

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
   buildPdfHTML — monta o HTML estático do relatório
   CORREÇÕES APLICADAS:
     1. Rótulo do perfil: apenas nome colorido + código.
        SEM "secBlock" (fatores individuais extras).
        SEM sd.titulo como subtítulo extra.
        Estrutura final:
          PERFIL SD
          ESTÁVEL DOMINANTE   (palavras coloridas)
          (descrição curta)
     2. Cores individuais por fator no nome
     3. Seção Medos incluída nas seções do PDF
════════════════════════════════════════════════════ */
function buildPdfHTML(r, profile) {
  var pk           = r.primaryKey;
  var scores       = r.scores;
  var name         = r.name;
  var date         = r.date;
  var profileCode  = r.profileCode  || pk;
  var profileCodes = r.profileCodes || [pk];

  var sd = ProfileService.buildPdfData(profile, r);

  /* ── Kicker "PERFIL SD" ── */
  var kickerHTML =
    '<div style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;' +
    'letter-spacing:.2em;text-transform:uppercase;color:#888;margin-bottom:8px;">' +
    'PERFIL ' + profileCode + '</div>';

  /* ── Nome colorido por fator ── */
  var nomeColorido = _coloredNameInline(sd.nome, profileCodes, '28px', 'line-height:1.2;');

  /* ── Descrição curta ── */
  var tagHTML = sd.descricaoCurta
    ? '<div style="font-family:Arial,sans-serif;font-size:13px;color:#555;' +
      'font-style:italic;margin-top:8px;">' + sd.descricaoCurta + '</div>'
    : '';

  /* ── Gráfico de barras ── */
  var PDF_MAX = 80, CHART_H = 180, BAR_W = 110, BAR_GAP = 10;
  var PAD_L = 44, PAD_R = 8, LABEL_H = 58;
  var TOTAL_W = PAD_L + 4 * BAR_W + 3 * BAR_GAP + PAD_R;
  var TOTAL_H = CHART_H + LABEL_H;

  var gridHTML = [0,20,40,60,80].map(function (val) {
    var bot = Math.round((val / PDF_MAX) * CHART_H);
    return (
      '<div style="position:absolute;left:0;width:' + (PAD_L-4) + 'px;bottom:' + bot + 'px;' +
        'text-align:right;font-family:Arial,sans-serif;font-size:8px;font-weight:700;' +
        'color:#777;line-height:1;transform:translateY(50%);">' + val + '</div>' +
      '<div style="position:absolute;left:' + PAD_L + 'px;right:' + PAD_R + 'px;' +
        'bottom:' + bot + 'px;height:' + (val===0?2:1) + 'px;' +
        'background:' + (val===0?'#222':'#dde2e8') + ';"></div>'
    );
  }).join('');

  var barsHTML = ['D','I','S','C'].map(function (k, ki) {
    var pts  = scores[k] || 0;
    var barH = Math.round((pts / PDF_MAX) * CHART_H);
    var lx   = PAD_L + ki * (BAR_W + BAR_GAP);
    return (
      '<div style="position:absolute;left:' + lx + 'px;width:' + BAR_W + 'px;' +
        'bottom:0;height:' + CHART_H + 'px;background:#f0f0f0;border-radius:3px 3px 0 0;"></div>' +
      '<div style="position:absolute;left:' + lx + 'px;width:' + BAR_W + 'px;' +
        'bottom:0;height:' + Math.max(barH,2) + 'px;background:' + DISC_COLORS[k] + ';' +
        'border-radius:' + (barH>6?'3px 3px 0 0':'1px 1px 0 0') + ';"></div>'
    );
  }).join('');

  var labelsHTML = ['D','I','S','C'].map(function (k, ki) {
    var pts = scores[k] || 0;
    var lx  = PAD_L + ki * (BAR_W + BAR_GAP);
    return (
      '<div style="position:absolute;left:' + lx + 'px;width:' + BAR_W + 'px;' +
        'top:' + (CHART_H + 6) + 'px;text-align:center;">' +
        '<div style="font-family:Arial,sans-serif;font-size:15px;font-weight:800;' +
          'color:' + DISC_COLORS[k] + ';line-height:1.2;">' + k + '</div>' +
        '<div style="font-family:Arial,sans-serif;font-size:8px;color:#666;margin-top:1px;">' +
          DISC_NAMES[k] + '</div>' +
        '<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;' +
          'color:' + DISC_DARK[k] + ';margin-top:3px;">' + pts + ' pts</div>' +
      '</div>'
    );
  }).join('');

  var chartHTML =
    '<div style="position:relative;width:' + TOTAL_W + 'px;height:' + TOTAL_H + 'px;margin:0 auto;">' +
      '<div style="position:absolute;left:0;right:0;top:0;height:' + CHART_H + 'px;">' +
        gridHTML + barsHTML +
      '</div>' +
      '<div style="position:absolute;left:0;right:0;top:0;height:' + TOTAL_H + 'px;' +
        'pointer-events:none;">' + labelsHTML + '</div>' +
    '</div>';

  /* ── Helpers de renderização ── */
  var secTitleHTML = function (t) {
    return '<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;' +
      'letter-spacing:.15em;text-transform:uppercase;color:#444;' +
      'margin-bottom:10px;padding-bottom:5px;border-bottom:1.5px solid #e0e0e0;">' + t + '</div>';
  };

  var liHTML = function (items) {
    return (items || []).map(function (t) {
      return '<tr>' +
        '<td style="font-family:Arial,sans-serif;font-size:11px;padding:4px 0;' +
          'border-bottom:1px solid #f0f0f0;vertical-align:top;width:14px;">' +
          '<span style="font-weight:700;font-size:13px;color:#aaa;">›</span></td>' +
        '<td style="font-family:Arial,sans-serif;font-size:11px;color:#333;' +
          'padding:4px 0 4px 5px;border-bottom:1px solid #f0f0f0;line-height:1.55;">' +
          t + '</td></tr>';
    }).join('');
  };

  var cardHTML = function (title, items) {
    if (!items || items.length === 0) return '';
    return '<div style="border:1.5px solid #e0e0e0;border-radius:6px;' +
      'padding:13px 15px;background:#fff;margin-bottom:12px;">' +
      '<div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;' +
        'letter-spacing:.12em;text-transform:uppercase;color:#444;' +
        'margin-bottom:9px;padding-bottom:5px;border-bottom:1.5px solid #eee;">' +
        title + '</div>' +
      '<table style="width:100%;border-collapse:collapse;">' + liHTML(items) + '</table>' +
    '</div>';
  };

  var textoHTML = function (titulo, texto) {
    if (!texto || !texto.trim()) return '';
    return '<div style="margin-bottom:12px;">' +
      secTitleHTML(titulo) +
      '<div style="padding:13px 17px;background:#f7f7f7;border-radius:6px;' +
        'border-left:4px solid ' + DISC_COLORS[pk] + ';">' +
        '<p style="font-family:Arial,sans-serif;font-size:11.5px;color:#333;' +
          'line-height:1.75;margin:0;">' + texto + '</p>' +
      '</div></div>';
  };

  var legendHTML = ['D','I','S','C'].map(function (k) {
    return '<span style="display:inline-block;margin-right:10px;' +
      'font-family:Arial,sans-serif;font-size:9px;color:#555;font-weight:700;">' +
      '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;' +
        'background:' + DISC_COLORS[k] + ';vertical-align:middle;margin-right:3px;"></span>' +
      k + '</span>';
  }).join('');

  /* ── Seções completas em ordem ── */
  var secoesHTML =
    textoHTML('Características',          sd.caracteristicas)       +
    cardHTML ('Potencialidades',           sd.potencialidades)       +
    textoHTML('Relações Interpessoais',   sd.relacoesInterpessoais) +
    textoHTML('Tomada de Decisão',         sd.tomadaDecisao)         +
    cardHTML ('Motivadores',               sd.motivadores)           +
    cardHTML ('Medos',                     sd.medos)                 +  /* ← NOVO */
    cardHTML ('Pontos a Desenvolver',      sd.pontosDesenvolver)     +
    textoHTML('Como Você Age Sob Pressão', sd.sobPressao);

  /* ── HTML final ── */
  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">' +
    '<style>*{box-sizing:border-box;margin:0;padding:0;}' +
    'body{background:#fff;}table{border-collapse:collapse;}</style>' +
    '</head><body>' +
    '<div id="pdf-root" style="font-family:Arial,Helvetica,sans-serif;background:#fff;' +
      'color:#1a1a1a;padding:30px 32px 44px;width:794px;">' +

    /* Cabeçalho */
    '<table style="width:100%;border-bottom:3px solid #1a1a1a;margin-bottom:20px;"><tr>' +
      '<td style="vertical-align:bottom;padding-bottom:12px;">' +
        '<span style="font-size:22px;font-weight:700;color:#1a1a1a;">DISC</span>' +
        '<span style="font-size:22px;font-weight:400;color:#555;">Platform</span>' +
        '<div style="font-size:11px;color:#888;margin-top:3px;">' +
          'Avaliação de Perfil Comportamental — ' + name + '</div>' +
      '</td>' +
      '<td style="vertical-align:bottom;text-align:right;padding-bottom:12px;">' +
        '<span style="font-size:11px;color:#777;line-height:1.7;">' +
          date + '<br>Relatório Individual DISC</span>' +
      '</td>' +
    '</tr></table>' +

    /* Perfil identificado — CORREÇÃO: só kicker + nome colorido + descricaoCurta */
    '<div style="margin-bottom:20px;padding:16px 22px;border:2px solid #e8e8e8;' +
      'border-radius:8px;background:#fafafa;">' +
      kickerHTML +
      nomeColorido +
      tagHTML +
    '</div>' +

    /* Gráfico */
    '<div style="margin-bottom:22px;">' +
      secTitleHTML('Distribuição de Pontuação — Eixos DISC') +
      chartHTML +
    '</div>' +

    /* Todas as seções do perfil */
    '<div style="margin-bottom:8px;">' +
      secTitleHTML('Análise Completa do Perfil') +
      secoesHTML +
    '</div>' +

    /* Rodapé */
    '<table style="width:100%;border-top:1.5px solid #ddd;margin-top:16px;"><tr>' +
      '<td style="vertical-align:middle;padding-top:10px;">' +
        '<span style="font-size:9px;color:#aaa;line-height:1.6;">' +
          'Relatório gerado pela DISC Platform. Os resultados refletem tendências comportamentais.<br>' +
          'Recomenda-se interpretação por profissional habilitado.' +
        '</span>' +
      '</td>' +
      '<td style="vertical-align:middle;text-align:right;padding-top:10px;">' +
        legendHTML +
      '</td>' +
    '</tr></table>' +

    '</div></body></html>';
}

/* ════════════════════════════════════════════════════
   downloadPDF
   CORREÇÃO DE PAGINAÇÃO:
     Problema anterior: a divisão de páginas usava a
     altura do PDF (mm), causando imprecisão acumulada.
     Solução: trabalhar inteiramente em pixels do canvas
     e só converter para mm no addImage() final.
     Isso elimina erros de arredondamento que cortavam
     conteúdo em perfis triplos.
════════════════════════════════════════════════════ */
function downloadPDF() {
  var r = lastResult;
  if (!r) return;

  var btn  = document.querySelector('[onclick="downloadPDF()"]');
  var orig = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '⏳ Gerando PDF…'; btn.disabled = true; }

  /* ── Dimensões A4 ── */
  var PDF_PX   = 794;
  var A4_W_MM  = 210, A4_H_MM  = 297;
  var MARGIN   = 8;
  var USE_W_MM = A4_W_MM - MARGIN * 2;   /* 194 mm */
  var USE_H_MM = A4_H_MM - MARGIN * 2;   /* 281 mm */
  var GAP_PX   = 10;                      /* espaço vertical entre blocos (px do canvas) */

  ProfileService.getProfileForResult(r)
    .then(function (profile) {

      /* ── 1. Construir o HTML e inserir no DOM ── */
      var htmlStr = buildPdfHTML(r, profile);

      var wrapper = document.createElement('div');
      wrapper.style.cssText =
        'position:absolute;'  +
        'left:-10000px;'      +
        'top:0;'              +
        'width:' + PDF_PX + 'px;' +
        'background:#ffffff;' +
        'overflow:visible;';
      document.body.appendChild(wrapper);
      wrapper.innerHTML = htmlStr;

      var root = wrapper.querySelector('#pdf-root');

      /* ── 2. Identificar todos os blocos capturáveis ──────────────
         Estrutura do #pdf-root:
           [0] <table>  cabeçalho
           [1] <div>    box do perfil
           [2] <div>    gráfico
           [3] <div>    container "Análise Completa" (agrupa seções)
           [4] <table>  rodapé

         O container [3] é desmembrado: seus filhos são adicionados
         individualmente ao array de blocos para que cada seção
         seja capturada e paginada de forma independente.
      ────────────────────────────────────────────────────────────── */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          setTimeout(function () {

            var rootChildren = Array.prototype.slice.call(root.children);
            var blocos       = [];

            rootChildren.forEach(function (child, idx) {
              /* O 4º filho (índice 3) é o container de análise —
                 desmembrar seus filhos diretos em blocos individuais */
              if (idx === 3) {
                var secChildren = Array.prototype.slice.call(child.children);
                secChildren.forEach(function (sec) {
                  blocos.push(sec);
                });
              } else {
                blocos.push(child);
              }
            });

            /* ── 3. Capturar cada bloco como canvas individual ──
               html2canvas captura o elemento em seu contexto atual
               (dentro do wrapper já posicionado em left:-10000px).
               A captura é feita em série (Promise chain) para não
               sobrecarregar o engine de layout do browser. ── */
            var capturas = [];
            var chain    = Promise.resolve();

            blocos.forEach(function (bloco) {
              chain = chain.then(function () {
                return html2canvas(bloco, {
                  scale:           2,
                  useCORS:         true,
                  allowTaint:      true,
                  backgroundColor: '#ffffff',
                  logging:         false,
                  windowWidth:     PDF_PX,
                  scrollX:         0,
                  scrollY:         0,
                  onclone: function (clonedDoc, clonedEl) {
                    clonedEl.style.display    = 'block';
                    clonedEl.style.visibility = 'visible';
                    clonedEl.style.overflow   = 'visible';
                    clonedEl.style.background = clonedEl.style.background || '#ffffff';
                  }
                }).then(function (canvas) {
                  capturas.push(canvas);
                });
              });
            });

            /* ── 4. Montar as páginas do PDF ──────────────────────
               Algoritmo de empacotamento (bin packing 1-D):
                 • manter um cursor Y na página atual
                 • para cada bloco:
                     calcular sua altura em mm
                     se couber na página atual → desenhar e avançar cursor
                     se não couber → nova página, resetar cursor, desenhar
               Nenhum bloco é dividido.
            ────────────────────────────────────────────────────── */
            chain.then(function () {

              var jsPDF    = window.jspdf.jsPDF;
              var pdf      = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' });

              /* Escala: mm por pixel (baseada na largura do 1º canvas) */
              var refW     = capturas[0] ? capturas[0].width : PDF_PX * 2;
              var mmPerPx  = USE_W_MM / refW;
              var gapMM    = GAP_PX * mmPerPx;

              var cursorY  = MARGIN;
              var first    = true;

              capturas.forEach(function (canvas, ci) {
                var blocoH_mm = canvas.height * mmPerPx;

                /* Verificar se o bloco cabe na página atual
                   (ignora o gap para o 1º bloco de cada página) */
                var neededH = (cursorY > MARGIN ? gapMM : 0) + blocoH_mm;

                if (!first && cursorY + neededH > A4_H_MM - MARGIN) {
                  pdf.addPage();
                  cursorY = MARGIN;
                }

                /* Adicionar espaçamento entre blocos (exceto no topo) */
                if (!first && cursorY > MARGIN) {
                  cursorY += gapMM;
                }

                pdf.addImage(
                  canvas.toDataURL('image/jpeg', 0.95),
                  'JPEG',
                  MARGIN,
                  cursorY,
                  USE_W_MM,
                  blocoH_mm
                );

                cursorY += blocoH_mm;
                first    = false;
              });

              /* ── 5. Salvar e limpar ── */
              pdf.save('disc-' + r.name.replace(/\s+/g, '-').toLowerCase() + '.pdf');
              document.body.removeChild(wrapper);
              if (btn) { btn.innerHTML = orig; btn.disabled = false; }

            }).catch(function (e) {
              console.error('[downloadPDF] captura:', e);
              if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
              if (btn) { btn.innerHTML = orig; btn.disabled = false; }
            });

          }, 500);
        });
      });
    })
    .catch(function (err) {
      console.error('[downloadPDF] ProfileService:', err);
      if (btn) { btn.innerHTML = orig; btn.disabled = false; }
    });
}
