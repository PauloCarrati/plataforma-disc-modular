/* ══════════════════════════════════════════════════════
   profile-service.js — DISC Platform — FASE 0
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE:
     Camada de serviço entre a plataforma e os dados
     de perfis DISC armazenados em disc-profiles.json.

   A plataforma NUNCA deve acessar o JSON diretamente.
   Todo acesso deve passar por este serviço.

   ARQUITETURA:
     Resultado DISC
           ↓
     profile-service.js      ← ESTE ARQUIVO
           ↓
     data/disc-profiles.json

   STATUS: FASE 0 — infraestrutura criada.
     Nenhuma tela consome este serviço ainda.
     Integração com relatórios e PDF ocorrerá
     nas fases seguintes.

   API PÚBLICA:
     getProfile(code)     → Promise<Object|null>
     listProfiles()       → Promise<string[]>
     profileExists(code)  → Promise<boolean>

   COMO TESTAR (console do navegador):
     await getProfile("D")
     await getProfile("SC")
     await getProfile("DIS")
     await getProfile("XYZ")   // retorna null — perfil inexistente
     await listProfiles()      // retorna ["D","SC","DIS"]
     await profileExists("D")  // retorna true
══════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────────
   CONFIGURAÇÃO — sem números mágicos, sem caminhos
   hardcoded espalhados pelo código.
──────────────────────────────────────────────────── */
var ProfileService = (function() {

  /* Caminho relativo ao index.html (raiz do frontend) */
  var JSON_PATH = './data/disc-profiles.json';

  /* Cache em memória — o JSON é carregado uma única vez.
     Evita múltiplos fetches desnecessários durante a sessão. */
  var _cache = null;

  /* ════════════════════════════════════════════════
     PRIVADO: _load
     Carrega e valida o JSON. Usa o cache se já
     estiver disponível.
  ════════════════════════════════════════════════ */
  function _load() {
    /* Retorna cache se já carregado */
    if (_cache !== null) {
      return Promise.resolve(_cache);
    }

    return fetch(JSON_PATH)
      .then(function(response) {
        if (!response.ok) {
          throw new Error(
            '[ProfileService] Falha ao carregar disc-profiles.json: ' +
            response.status + ' ' + response.statusText
          );
        }
        return response.json();
      })
      .then(function(data) {
        /* Remove a chave _meta antes de armazenar no cache.
           _meta é documentação interna, não é um perfil. */
        var profiles = {};
        Object.keys(data).forEach(function(key) {
          if (key !== '_meta') profiles[key] = data[key];
        });
        _cache = profiles;
        console.log(
          '[ProfileService] disc-profiles.json carregado. ' +
          'Perfis disponíveis: ' + Object.keys(_cache).join(', ')
        );
        return _cache;
      })
      .catch(function(err) {
        console.error('[ProfileService]', err.message);

        /* ── PONTO DE INTEGRAÇÃO FUTURA ─────────────────
           Quando existir backend real, substituir o fetch
           acima por uma chamada à API:

           return fetch('/api/disc/profiles')
             .then(function(r) { return r.json(); })
             .then(function(data) { _cache = data; return _cache; });
        ─────────────────────────────────────────────────── */

        throw err;
      });
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: getProfile(code)
     Retorna o objeto completo do perfil solicitado,
     ou null se o código não existir no JSON.

     Parâmetro:
       code — string (ex: "D", "SC", "DIS")
              A busca é case-sensitive e segue o
              padrão de chaves do JSON.

     Retorna: Promise<Object|null>

     Exemplo:
       var perfil = await getProfile("SC");
       // → { code:"SC", title:"Estável Conforme", … }

       var nulo = await getProfile("XYZ");
       // → null
  ════════════════════════════════════════════════ */
  function getProfile(code) {
    if (!code || typeof code !== 'string') {
      console.warn('[ProfileService] getProfile: código inválido →', code);
      return Promise.resolve(null);
    }

    return _load().then(function(profiles) {
      var profile = profiles[code] || null;

      if (profile) {
        console.log('[ProfileService] getProfile("' + code + '") → encontrado:', profile.title);
      } else {
        console.warn('[ProfileService] getProfile("' + code + '") → perfil não encontrado no JSON.');
      }

      return profile;
    });
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: listProfiles()
     Retorna um array com todos os códigos de perfil
     disponíveis no JSON, em ordem alfabética.

     Retorna: Promise<string[]>

     Exemplo:
       var lista = await listProfiles();
       // → ["D", "DIS", "SC"]
  ════════════════════════════════════════════════ */
  function listProfiles() {
    return _load().then(function(profiles) {
      return Object.keys(profiles).sort();
    });
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: profileExists(code)
     Verifica se um código de perfil existe no JSON
     sem retornar o objeto completo.
     Útil para validação rápida antes de renderizar.

     Retorna: Promise<boolean>

     Exemplo:
       var existe = await profileExists("DIS");
       // → true
  ════════════════════════════════════════════════ */
  function profileExists(code) {
    return _load().then(function(profiles) {
      return Object.prototype.hasOwnProperty.call(profiles, code);
    });
  }

  /* ════════════════════════════════════════════════
     PÚBLICO: clearCache()
     Força recarregamento do JSON na próxima chamada.
     Útil para desenvolvimento e testes.
  ════════════════════════════════════════════════ */
  function clearCache() {
    _cache = null;
    console.log('[ProfileService] Cache limpo. Próxima chamada recarregará o JSON.');
  }

  /* ── Expõe a API pública ── */
  return {
    getProfile:     getProfile,
    listProfiles:   listProfiles,
    profileExists:  profileExists,
    clearCache:     clearCache
  };

})();

/* ════════════════════════════════════════════════════
   ATALHOS GLOBAIS
   Expostos no window para acesso direto no console
   do navegador durante testes (FASE 0).
   Em produção podem ser removidos ou mantidos
   como parte da API pública do serviço.
════════════════════════════════════════════════════ */
window.getProfile     = function(code) { return ProfileService.getProfile(code); };
window.listProfiles   = function()     { return ProfileService.listProfiles();   };
window.profileExists  = function(code) { return ProfileService.profileExists(code); };
window.ProfileService = ProfileService;

/* ════════════════════════════════════════════════════
   TESTE DE VALIDAÇÃO — FASE 0
   ─────────────────────────────────────────────────
   Descomente o bloco abaixo para executar os testes
   automaticamente quando a página carrega.
   Mantenha comentado em produção.
════════════════════════════════════════════════════ */
/*
(function runPhase0Tests() {
  console.group('[ProfileService] FASE 0 — Testes de validação');

  var tests = [
    { code: 'D',   shouldExist: true  },
    { code: 'SC',  shouldExist: true  },
    { code: 'DIS', shouldExist: true  },
    { code: 'XYZ', shouldExist: false }
  ];

  var passed = 0;
  var failed = 0;

  tests.forEach(function(t) {
    getProfile(t.code).then(function(result) {
      var ok = t.shouldExist ? result !== null : result === null;
      if (ok) {
        passed++;
        console.log(
          '  ✓ getProfile("' + t.code + '") →',
          result ? result.title : 'null (esperado)'
        );
      } else {
        failed++;
        console.error(
          '  ✗ getProfile("' + t.code + '") → resultado inesperado:', result
        );
      }
      if (passed + failed === tests.length) {
        console.log('─────────────────────────────────');
        console.log('  Resultado: ' + passed + '/' + tests.length + ' testes passaram.');
        if (failed > 0) console.error('  FALHAS: ' + failed);
        console.groupEnd();
      }
    });
  });
})();
*/

console.log('[ProfileService] profile-service.js carregado. ' +
  'Use: await getProfile("D") | await listProfiles() | await profileExists("SC")');
