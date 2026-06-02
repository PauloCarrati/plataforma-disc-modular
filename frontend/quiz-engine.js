/* ══════════════════════════════════════════════════════
   quiz-engine.js — DISC Platform v8
   ─────────────────────────────────────────────────────
   ARQUITETURA v8 — SOLUÇÃO DEFINITIVA DE PERSISTÊNCIA E UX

   MUDANÇA FUNDAMENTAL DE ABORDAGEM:
   ─────────────────────────────────────────────────────
   Versões anteriores arrastavam o <li> inteiro (incluindo
   o rótulo de posição). Isso causava dois problemas:
     1. Rótulos "3º Mais Parecido" viajavam junto com o
        item, gerando sequências como "3 2 1 4".
     2. A leitura do DOM após replaceChild era instável
        em alguns browsers, causando perda de posição.

   NOVA ARQUITETURA:
   ─────────────────────────────────────────────────────
   • A LISTA tem 4 SLOTS FIXOS numerados (1º, 2º, 3º, 4º).
     Os slots NÃO se movem. Os rótulos são do slot, não do item.
   • Cada slot tem um CARD de conteúdo (texto + handle).
     Apenas o CARD é arrastável.
   • O drag troca o CONTEÚDO entre slots — nunca move o slot.
   • A persistência lê diretamente do array interno `_order`
     (fonte de verdade), não do DOM — elimina qualquer
     ambiguidade de leitura de DOM.

   FLUXO CORRETO:
     dragstart → usuário segura um card
     dragover  → identifica o slot alvo
     drop      → troca _order[slotA] com _order[slotB]
     commit    → _order é salvo em window.rankAnswers
     render    → slots re-renderizados com nova ordem

   BOTÕES ↑ ↓:
     Mesmo fluxo: troca no _order → commit → re-render.

   CONSTANTES: RANK_WEIGHTS, RANK_LABELS, TOTAL_QUESTIONS
   DEPENDE DE: globals.js (currentQ)
   EXPÕE: QuizEngine (API pública), window.rankAnswers
══════════════════════════════════════════════════════ */

/* ── Constantes (sem números mágicos) ── */
var TOTAL_QUESTIONS = 20;
var OPTIONS_PER_Q   = 4;
var RANK_WEIGHTS    = [4, 3, 2, 1];
var RANK_LABELS     = [
  '1º Mais Parecido',
  '2º Mais Parecido',
  '3º Mais Parecido',
  '4º Mais Parecido'
];

/* ── Array canônico — única fonte de verdade ── */
window.rankAnswers = new Array(TOTAL_QUESTIONS).fill(null);

/* ════════════════════════════════════════════════════
   MÓDULO QuizEngine
════════════════════════════════════════════════════ */
var QuizEngine = (function() {

  /* ── Estado interno ── */
  var _order     = [];    /* array de 4 opções na ordem atual   */
  var _qIndex    = -1;    /* índice da questão renderizada       */
  var _onChange  = null;  /* callback após reordenação           */
  var _dragIdx   = -1;    /* slot de origem do drag em curso     */
  var _container = null;  /* div#q-opts atual                    */

  /* ════════════════════════════════════════════════
     PÚBLICO: init
  ════════════════════════════════════════════════ */
  function init(containerEl, question, qIndex, savedRank, onChangeCb) {
    _container = containerEl;
    _qIndex    = qIndex;
    _onChange  = onChangeCb || function() {};
    _dragIdx   = -1;

    /* Restaura ou embaralha */
    if (savedRank && savedRank.length === OPTIONS_PER_Q) {
      _order = _deepCopy(savedRank);
    } else {
      _order = _shuffle(question.options.map(function(opt, i) {
        return { disc: opt.disc, text: opt.text, originalIndex: i };
      }));
    }

    _render();
    _commit();   /* persiste ordem inicial imediatamente */
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: getRank, isComplete, allComplete, reset
  ════════════════════════════════════════════════ */
  function getRank(qi) {
    var r = window.rankAnswers[qi];
    return r ? _deepCopy(r) : null;
  }

  function isComplete(qi) {
    return window.rankAnswers[qi] !== null;
  }

  function allComplete() {
    for (var i = 0; i < TOTAL_QUESTIONS; i++) {
      if (!isComplete(i)) return false;
    }
    return true;
  }

  function reset() {
    window.rankAnswers = new Array(TOTAL_QUESTIONS).fill(null);
    _order    = [];
    _qIndex   = -1;
    _dragIdx  = -1;
    _onChange = null;
  }

  /* ════════════════════════════════════════════════
     PRIVADO: _commit
     Grava _order em window.rankAnswers[_qIndex].
     Única função que toca o estado global.
     NÃO lê o DOM — usa _order como fonte de verdade.
  ════════════════════════════════════════════════ */
  function _commit() {
    window.rankAnswers[_qIndex] = _deepCopy(_order);
    if (_onChange) _onChange(_deepCopy(_order));

    /* ── BACKEND HOOK ──────────────────────────────
       fetch('/api/quiz/ranking', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ qi: _qIndex, ranking: _order })
       }).catch(function(e) { console.warn('[QuizEngine]', e); });
    ─────────────────────────────────────────────── */
  }

  /* ════════════════════════════════════════════════
     PRIVADO: _render
     Constrói os 4 slots com conteúdo de _order.
     Cada slot é FIXO — só o conteúdo interno muda.
  ════════════════════════════════════════════════ */
  function _render() {
    if (!_container) return;
    _container.innerHTML = '';

    /* Instrução */
    var instr = document.createElement('div');
    instr.className = 'rank-instructions';
    instr.id = 'rank-instructions';
    instr.innerHTML =
      '<span class="rank-instr-icon">↕</span>' +
      '<span>Arraste ou use ↑↓ para ordenar do <strong>mais</strong>' +
      ' ao <strong>menos</strong> parecido</span>';
    _container.appendChild(instr);

    /* Lista de slots */
    var ul = document.createElement('ul');
    ul.className = 'rank-list';
    ul.id = 'rank-list';
    ul.dataset.qindex = _qIndex;

    _order.forEach(function(opt, slotIdx) {
      ul.appendChild(_buildSlot(slotIdx, opt));
    });

    _container.appendChild(ul);
  }

  /* ════════════════════════════════════════════════
     PRIVADO: _buildSlot
     Cada slot tem:
       • .rank-pos  → número + label FIXOS (não se movem)
       • .rank-card → conteúdo arrastável (texto + botões + handle)
  ════════════════════════════════════════════════ */
  function _buildSlot(slotIdx, opt) {
    var li = document.createElement('li');
    li.className = 'rank-slot';
    li.dataset.slot = slotIdx;

    /* Coluna de posição — FIXA, não arrastável */
    var pos = document.createElement('div');
    pos.className = 'rank-pos';
    pos.innerHTML =
      '<span class="rank-pos-num">'   + (slotIdx + 1)       + '</span>' +
      '<span class="rank-pos-label">' + RANK_LABELS[slotIdx] + '</span>';

    /* Card de conteúdo — ARRASTÁVEL */
    var card = document.createElement('div');
    card.className = 'rank-card';
    card.setAttribute('draggable', 'true');
    card.dataset.slot = slotIdx;  /* slot de origem */

    card.innerHTML =
      /* Handle */
      '<div class="rank-handle" aria-hidden="true">' +
        '<svg width="14" height="18" viewBox="0 0 14 18" fill="none">' +
          '<circle cx="4"  cy="3"  r="1.4" fill="currentColor"/>' +
          '<circle cx="10" cy="3"  r="1.4" fill="currentColor"/>' +
          '<circle cx="4"  cy="9"  r="1.4" fill="currentColor"/>' +
          '<circle cx="10" cy="9"  r="1.4" fill="currentColor"/>' +
          '<circle cx="4"  cy="15" r="1.4" fill="currentColor"/>' +
          '<circle cx="10" cy="15" r="1.4" fill="currentColor"/>' +
        '</svg>' +
      '</div>' +
      /* Texto */
      '<div class="rank-item-body">' +
        '<span class="rank-item-text">' + opt.text + '</span>' +
      '</div>' +
      /* Botões ↑ ↓ */
      '<div class="rank-arrows">' +
        '<button class="rank-arrow-btn" data-dir="up"   aria-label="Subir">' +
          '<svg width="12" height="12" viewBox="0 0 12 12" fill="none">' +
            '<path d="M6 2L11 9H1L6 2Z" fill="currentColor"/>' +
          '</svg>' +
        '</button>' +
        '<button class="rank-arrow-btn" data-dir="down" aria-label="Descer">' +
          '<svg width="12" height="12" viewBox="0 0 12 12" fill="none">' +
            '<path d="M6 10L1 3H11L6 10Z" fill="currentColor"/>' +
          '</svg>' +
        '</button>' +
      '</div>';

    /* ── Eventos do card ── */
    card.addEventListener('dragstart',  _onDragStart);
    card.addEventListener('dragend',    _onDragEnd);

    /* Botões ↑ ↓ */
    card.querySelector('[data-dir="up"]').addEventListener('click', function(e) {
      e.stopPropagation();
      _moveSlot(slotIdx, -1);
    });
    card.querySelector('[data-dir="down"]').addEventListener('click', function(e) {
      e.stopPropagation();
      _moveSlot(slotIdx, +1);
    });

    /* ── Eventos do slot (drop target) ── */
    li.addEventListener('dragover',  _onDragOver);
    li.addEventListener('dragleave', _onDragLeave);
    li.addEventListener('drop',      _onDrop);

    /* Touch */
    card.addEventListener('touchstart', _onTouchStart, { passive: false });

    li.appendChild(pos);
    li.appendChild(card);
    return li;
  }

  /* ════════════════════════════════════════════════
     BOTÕES ↑ ↓ — move item no array _order
  ════════════════════════════════════════════════ */
  function _moveSlot(slotIdx, direction) {
    var targetIdx = slotIdx + direction;
    if (targetIdx < 0 || targetIdx >= OPTIONS_PER_Q) return;

    /* Troca no array interno — fonte de verdade */
    var tmp              = _order[slotIdx];
    _order[slotIdx]      = _order[targetIdx];
    _order[targetIdx]    = tmp;

    /* Re-renderiza e persiste */
    _render();
    _commit();

    /* Recoloca o foco no card que se moveu */
    setTimeout(function() {
      var list  = document.getElementById('rank-list');
      if (!list) return;
      var cards = list.querySelectorAll('.rank-card');
      if (cards[targetIdx]) cards[targetIdx].focus();
    }, 0);
  }

  /* ════════════════════════════════════════════════
     DRAG HTML5 — usando a API nativa do browser
     Mais confiável que mouse events para leitura
     de posição após drop.
  ════════════════════════════════════════════════ */
  function _onDragStart(e) {
    var card = e.currentTarget;
    _dragIdx = parseInt(card.dataset.slot, 10);
    card.classList.add('rank-card--dragging');

    /* Oculta instrução */
    var instr = document.getElementById('rank-instructions');
    if (instr) instr.classList.add('rank-instructions--hidden');

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(_dragIdx));
  }

  function _onDragEnd(e) {
    e.currentTarget.classList.remove('rank-card--dragging');
    /* Remove highlight de todos os slots */
    var list = document.getElementById('rank-list');
    if (list) {
      list.querySelectorAll('.rank-slot').forEach(function(s) {
        s.classList.remove('rank-slot--over');
      });
    }
    _dragIdx = -1;
  }

  function _onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var slot = e.currentTarget;
    /* Só destaca se não for o próprio slot de origem */
    if (parseInt(slot.dataset.slot, 10) !== _dragIdx) {
      slot.classList.add('rank-slot--over');
    }
  }

  function _onDragLeave(e) {
    e.currentTarget.classList.remove('rank-slot--over');
  }

  function _onDrop(e) {
    e.preventDefault();
    var targetSlot = parseInt(e.currentTarget.dataset.slot, 10);
    e.currentTarget.classList.remove('rank-slot--over');

    if (_dragIdx === -1 || _dragIdx === targetSlot) return;

    /* ── TROCA NO ARRAY INTERNO ──────────────────────
       Esta é a única operação que determina a nova ordem.
       Não lemos o DOM — operamos em _order diretamente.
       Após a troca, _render() reconstrói o DOM a partir
       de _order, garantindo consistência total.
    ─────────────────────────────────────────────────── */
    var tmp             = _order[_dragIdx];
    _order[_dragIdx]    = _order[targetSlot];
    _order[targetSlot]  = tmp;

    /* Re-renderiza com nova ordem e persiste */
    _render();
    _commit();
  }

  /* ════════════════════════════════════════════════
     TOUCH — drag manual para dispositivos móveis
     A API HTML5 drag não funciona bem em touch.
  ════════════════════════════════════════════════ */
  var _touch = {
    active:    false,
    fromSlot:  -1,
    clone:     null,
    offsetX:   0,
    offsetY:   0
  };

  function _onTouchStart(e) {
    if (e.touches.length !== 1) return;
    e.preventDefault();

    var card    = e.currentTarget;
    _touch.fromSlot = parseInt(card.dataset.slot, 10);
    _touch.active   = true;

    var rect         = card.getBoundingClientRect();
    var touch        = e.touches[0];
    _touch.offsetX   = touch.clientX - rect.left;
    _touch.offsetY   = touch.clientY - rect.top;

    /* Clone visual */
    var clone        = card.cloneNode(true);
    clone.style.cssText =
      'position:fixed;z-index:9999;pointer-events:none;' +
      'width:' + rect.width + 'px;opacity:.9;' +
      'top:'  + (touch.clientY - _touch.offsetY) + 'px;' +
      'left:' + (touch.clientX - _touch.offsetX) + 'px;' +
      'box-shadow:0 8px 32px rgba(0,0,0,.4);' +
      'border-radius:10px;background:var(--bg3,#1A1A28);';
    document.body.appendChild(clone);
    _touch.clone = clone;

    card.style.opacity = '0.3';

    /* Oculta instrução */
    var instr = document.getElementById('rank-instructions');
    if (instr) instr.classList.add('rank-instructions--hidden');

    document.addEventListener('touchmove',  _onTouchMove,  { passive: false });
    document.addEventListener('touchend',   _onTouchEnd);
    document.addEventListener('touchcancel',_onTouchCancel);
  }

  function _onTouchMove(e) {
    e.preventDefault();
    if (!_touch.active || !_touch.clone) return;
    var touch = e.touches[0];
    _touch.clone.style.top  = (touch.clientY - _touch.offsetY) + 'px';
    _touch.clone.style.left = (touch.clientX - _touch.offsetX) + 'px';

    /* Highlight do slot alvo */
    _touch.clone.style.display = 'none';
    var el = document.elementFromPoint(touch.clientX, touch.clientY);
    _touch.clone.style.display = '';

    var list = document.getElementById('rank-list');
    if (list) {
      list.querySelectorAll('.rank-slot').forEach(function(s) {
        s.classList.remove('rank-slot--over');
      });
    }
    if (el) {
      var targetSlot = el.closest('.rank-slot');
      if (targetSlot) {
        var tIdx = parseInt(targetSlot.dataset.slot, 10);
        if (tIdx !== _touch.fromSlot) targetSlot.classList.add('rank-slot--over');
      }
    }
  }

  function _onTouchEnd(e) {
    document.removeEventListener('touchmove',   _onTouchMove);
    document.removeEventListener('touchend',    _onTouchEnd);
    document.removeEventListener('touchcancel', _onTouchCancel);

    if (!_touch.active) return;

    var touch = e.changedTouches[0];
    if (_touch.clone) {
      _touch.clone.style.display = 'none';
      var el = document.elementFromPoint(touch.clientX, touch.clientY);
      _touch.clone.style.display = '';
      document.body.removeChild(_touch.clone);
      _touch.clone = null;

      /* Remove highlight */
      var list = document.getElementById('rank-list');
      if (list) {
        list.querySelectorAll('.rank-slot').forEach(function(s) {
          s.classList.remove('rank-slot--over');
        });
      }

      if (el) {
        var targetSlot = el.closest('.rank-slot');
        if (targetSlot) {
          var toIdx = parseInt(targetSlot.dataset.slot, 10);
          if (toIdx !== _touch.fromSlot && !isNaN(toIdx)) {
            var tmp              = _order[_touch.fromSlot];
            _order[_touch.fromSlot] = _order[toIdx];
            _order[toIdx]        = tmp;
            _render();
            _commit();
          }
        }
      }
    }

    /* Restaura opacidade do card original se ainda existir */
    var list2 = document.getElementById('rank-list');
    if (list2) {
      list2.querySelectorAll('.rank-card').forEach(function(c) {
        c.style.opacity = '';
      });
    }

    _touch.active   = false;
    _touch.fromSlot = -1;
  }

  function _onTouchCancel() {
    document.removeEventListener('touchmove',   _onTouchMove);
    document.removeEventListener('touchend',    _onTouchEnd);
    document.removeEventListener('touchcancel', _onTouchCancel);
    if (_touch.clone) { document.body.removeChild(_touch.clone); _touch.clone = null; }
    var list = document.getElementById('rank-list');
    if (list) {
      list.querySelectorAll('.rank-card').forEach(function(c) { c.style.opacity = ''; });
    }
    _touch.active = false;
  }

  /* ════════════════════════════════════════════════
     UTILITÁRIOS
  ════════════════════════════════════════════════ */
  function _deepCopy(arr) {
    return arr.map(function(o) {
      return { disc: o.disc, text: o.text, originalIndex: o.originalIndex };
    });
  }

  function _shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* API pública */
  return {
    init:        init,
    getRank:     getRank,
    isComplete:  isComplete,
    allComplete: allComplete,
    reset:       reset
  };

})();
