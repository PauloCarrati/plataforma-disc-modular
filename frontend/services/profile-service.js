/* ══════════════════════════════════════════════════════
   profile-service.js — DISC Platform — FASE 2
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE:
     Camada de serviço entre a plataforma e os dados
     de perfis DISC armazenados em disc-profiles.json.

   A plataforma NUNCA acessa o JSON diretamente.
   Todo acesso passa por este serviço.

   ARQUITETURA:
     Resultado DISC
           ↓
     profile-service.js      ← ESTE ARQUIVO
           ↓
     data/disc-profiles.json

   MUDANÇAS DA FASE 2 em relação à Fase 0:
     Novos métodos públicos:
       • getProfileForResult(r)  → Promise<Object>
       • buildScreenData(profile)→ Object (síncrono)
       • buildPdfData(profile,r) → Object (síncrono)

   API PÚBLICA COMPLETA:
     getProfile(code)          → Promise<Object|null>
     getProfileForResult(r)    → Promise<Object>
     buildScreenData(profile)  → Object
     buildPdfData(profile, r)  → Object
     listProfiles()            → Promise<string[]>
     profileExists(code)       → Promise<boolean>
     clearCache()              → void
══════════════════════════════════════════════════════ */

var ProfileService = (function () {

  var JSON_PATH = './data/disc-profiles.json';
  var _cache    = null;

  /* ────────────────────────────────────────────────
     PRIVADO: _load — carrega JSON com cache
  ──────────────────────────────────────────────── */
  function _load() {
    if (_cache !== null) return Promise.resolve(_cache);

    return fetch(JSON_PATH)
      .then(function (res) {
        if (!res.ok) throw new Error(
          '[ProfileService] Falha ao carregar disc-profiles.json: ' +
          res.status + ' ' + res.statusText
        );
        return res.json();
      })
      .then(function (data) {
        var profiles = {};
        Object.keys(data).forEach(function (k) {
          if (k !== '_meta') profiles[k] = data[k];
        });
        _cache = profiles;
        console.log('[ProfileService] Carregado. Perfis: ' + Object.keys(_cache).length);
        return _cache;
      })
      .catch(function (err) {
        console.error('[ProfileService]', err.message);
        throw err;
      });
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: getProfile(code)
     Retorna objeto completo do perfil ou null.
  ════════════════════════════════════════════════ */
  function getProfile(code) {
    if (!code || typeof code !== 'string') {
      console.warn('[ProfileService] getProfile: código inválido →', code);
      return Promise.resolve(null);
    }
    return _load().then(function (profiles) {
      var p = profiles[code] || null;
      if (p) console.log('[ProfileService] getProfile("' + code + '") → ' + p.nome);
      else   console.warn('[ProfileService] getProfile("' + code + '") → não encontrado.');
      return p;
    });
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: getProfileForResult(r)
     Resolve o perfil correto a partir de um objeto
     de resultado DISC (r.profileCode / r.primaryKey).

     Prioridade de busca:
       1. r.profileCode  (ex: "DIS", "SC", "D")
       2. r.primaryKey   (fallback se combinado falhar)

     Retorna: Promise<Object> — nunca null.
  ════════════════════════════════════════════════ */
  function getProfileForResult(r) {
    if (!r) return Promise.reject(
      new Error('[ProfileService] getProfileForResult: resultado nulo.')
    );

    var code     = r.profileCode || r.primaryKey || '';
    var fallback = r.primaryKey  || '';

    return _load().then(function (profiles) {
      var profile = profiles[code] || null;

      if (!profile && fallback && fallback !== code) {
        console.warn('[ProfileService] "' + code + '" não encontrado. Fallback: "' + fallback + '"');
        profile = profiles[fallback] || null;
      }

      if (!profile) throw new Error(
        '[ProfileService] getProfileForResult: perfil "' + code + '" não encontrado.'
      );

      console.log('[ProfileService] getProfileForResult("' + code + '") → ' + profile.nome);
      return profile;
    });
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: buildScreenData(profile)
     Transforma o perfil JSON no formato exato
     esperado pelos IDs do HTML e por showResults().

     Mapeamento JSON → componentes da tela:
       nome              → título principal
       titulo            → kicker / subtítulo
       descricaoCurta    → tagline
       caracteristicas   → res-desc-body (parágrafo 1)
       relacoesInterpessoais → res-desc-body (parágrafo 2)
       tomadaDecisao     → res-desc-body (parágrafo 3)
       sobPressao        → res-desc-body (parágrafo 4)
       potencialidades   → res-strengths
       pontosDesenvolver → res-develop
       relacoesInterpessoais → res-communication
       motivadores       → res-environment

     Retorna: Object (síncrono)
  ════════════════════════════════════════════════ */
  function buildScreenData(profile) {
    return {
      /* Identificação */
      codigo: profile.codigo,
      nome:   profile.nome,
      titulo: profile.titulo,

      /* Campos textuais avulsos */
      descricaoCurta:        profile.descricaoCurta        || '',
      caracteristicas:       profile.caracteristicas       || '',
      relacoesInterpessoais: profile.relacoesInterpessoais || '',
      tomadaDecisao:         profile.tomadaDecisao         || '',
      sobPressao:            profile.sobPressao            || '',

      /* Listas */
      potencialidades:   _arr(profile.potencialidades),
      motivadores:       _arr(profile.motivadores),
      medos:             _arr(profile.medos),
      pontosDesenvolver: _arr(profile.pontosDesenvolver),

      /* ── Campos no formato legado de reports.js ──
         Mantidos para não alterar showResults() nem PDF */
      tagline:       profile.descricaoCurta || '',
      description:   _toDescArray(profile),
      strengths:     _arr(profile.potencialidades),
      develop:       _arr(profile.pontosDesenvolver),
      communication: _toSentenceList(profile.relacoesInterpessoais),
      environment:   _arr(profile.motivadores)
    };
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: buildPdfData(profile, r)
     Prepara dados para buildPdfHTML() em reports.js.
     Inclui todas as seções do relatório PDF completo.
  ════════════════════════════════════════════════ */
  function buildPdfData(profile, r) {
    var base = buildScreenData(profile);

    return Object.assign({}, base, {
      secoes: [
        { titulo: 'Características',           tipo: 'texto', conteudo: profile.caracteristicas       || '' },
        { titulo: 'Potencialidades',            tipo: 'lista', conteudo: _arr(profile.potencialidades)      },
        { titulo: 'Relações Interpessoais',     tipo: 'texto', conteudo: profile.relacoesInterpessoais || '' },
        { titulo: 'Tomada de Decisão',          tipo: 'texto', conteudo: profile.tomadaDecisao         || '' },
        { titulo: 'Motivadores',                tipo: 'lista', conteudo: _arr(profile.motivadores)          },
        { titulo: 'Medos',                      tipo: 'lista', conteudo: _arr(profile.medos)                },
        { titulo: 'Pontos a Desenvolver',       tipo: 'lista', conteudo: _arr(profile.pontosDesenvolver)    },
        { titulo: 'Como Você Age Sob Pressão',  tipo: 'texto', conteudo: profile.sobPressao            || '' }
      ]
    });
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: listProfiles() → Promise<string[]>
  ════════════════════════════════════════════════ */
  function listProfiles() {
    return _load().then(function (p) { return Object.keys(p).sort(); });
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: profileExists(code) → Promise<boolean>
  ════════════════════════════════════════════════ */
  function profileExists(code) {
    return _load().then(function (p) {
      return Object.prototype.hasOwnProperty.call(p, code);
    });
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: clearCache() — força reload do JSON
  ════════════════════════════════════════════════ */
  function clearCache() {
    _cache = null;
    console.log('[ProfileService] Cache limpo.');
  }

  /* ────────────────────────────────────────────────
     PRIVADOS — helpers de transformação
  ──────────────────────────────────────────────── */

  /* Garante array — aceita array ou string */
  function _arr(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim()) return [val];
    return [];
  }

  /*
   * _toDescArray
   * Converte os campos textuais do novo JSON para o
   * array de parágrafos que reports.js espera em
   * data.description (usado em res-desc-body e no PDF).
   */
  function _toDescArray(p) {
    var parts = [];
    if (p.descricaoCurta        && p.descricaoCurta.trim())        parts.push(p.descricaoCurta);
    if (p.caracteristicas       && p.caracteristicas.trim())       parts.push(p.caracteristicas);
    if (p.relacoesInterpessoais && p.relacoesInterpessoais.trim()) parts.push(p.relacoesInterpessoais);
    if (p.tomadaDecisao         && p.tomadaDecisao.trim())         parts.push(p.tomadaDecisao);
    if (p.sobPressao            && p.sobPressao.trim())            parts.push(p.sobPressao);
    return parts.length > 0 ? parts : ['Perfil ' + (p.nome || p.codigo) + '.'];
  }

  /*
   * _toSentenceList
   * Converte um parágrafo de relações interpessoais
   * em lista de frases para o card "Comunicação".
   */
  function _toSentenceList(text) {
    if (Array.isArray(text)) return text;
    if (!text || !text.trim()) return [];
    var sentences = text
      .split(/(?<=[.!?])\s+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 4; });
    return sentences.length > 0 ? sentences : [text];
  }

  /* ── API pública ── */
  return {
    getProfile:          getProfile,
    getProfileForResult: getProfileForResult,
    buildScreenData:     buildScreenData,
    buildPdfData:        buildPdfData,
    listProfiles:        listProfiles,
    profileExists:       profileExists,
    clearCache:          clearCache
  };

})();

/* ════════════════════════════════════════════════════
   ATALHOS GLOBAIS — compatibilidade com Fase 0 e console
════════════════════════════════════════════════════ */
window.getProfile     = function (c) { return ProfileService.getProfile(c);          };
window.listProfiles   = function ()  { return ProfileService.listProfiles();          };
window.profileExists  = function (c) { return ProfileService.profileExists(c);        };
window.ProfileService = ProfileService;

console.log('[ProfileService] Fase 2 carregado. ' +
  'Use: await getProfile("D") | await getProfile("DIS") | await listProfiles()');
