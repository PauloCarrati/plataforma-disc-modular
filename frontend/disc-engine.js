/* ══════════════════════════════════════════════════════
   disc-engine.js — DISC Platform
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: dados puros da metodologia DISC.
   Não toca no DOM. Não depende de nenhum outro arquivo.

   ⚠  SEM 'use strict' de arquivo — para que as constantes
      fiquem no escopo global (window) e sejam acessíveis
      por todos os módulos carregados depois.

   GLOBAIS EXPORTADAS (lidas por app.js, dashboard.js e reports.js):
     questions   — 20 questões situacionais
     profileData — dados completos de D, I, S, C
     combos      — 12 nomes de perfis combinados
     DISC_COLORS — cores hex por letra
     DISC_DARK   — versões escuras das cores
     DISC_NAMES  — nomes completos por letra
══════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   BANCO DE QUESTÕES — 20 perguntas situacionais
════════════════════════════════════════════════════ */
var questions = [
  { text: "Você e amigos precisam decidir o destino de uma viagem com opiniões diferentes. Você tende a:", options: [
    { label:"A", text:"Propor o destino que considera melhor e convencer o grupo com entusiasmo.", disc:"I" },
    { label:"B", text:"Tomar a iniciativa, definir o destino e já começar a organizar tudo.",        disc:"D" },
    { label:"C", text:"Pesquisar, comparar opções e apresentar prós e contras de cada uma.",         disc:"C" },
    { label:"D", text:"Propor um destino que agrade a todos e buscar o consenso do grupo.",          disc:"S" }]},
  { text: "Ao receber uma crítica de alguém próximo sobre algo que fez, sua primeira reação é:", options: [
    { label:"A", text:"Absorver com calma, refletir antes de responder.",                  disc:"S" },
    { label:"B", text:"Responder diretamente se discordar e seguir em frente.",            disc:"D" },
    { label:"C", text:"Analisar se a crítica tem fundamento antes de aceitar ou rebater.", disc:"C" },
    { label:"D", text:"Ficar chateado, mas priorizar preservar o relacionamento.",         disc:"I" }]},
  { text: "Como você prefere organizar seu dia a dia?", options: [
    { label:"A", text:"Com metas claras e foco nas tarefas mais impactantes.",             disc:"D" },
    { label:"B", text:"Com flexibilidade para aproveitar oportunidades que surgem.",       disc:"I" },
    { label:"C", text:"Com uma rotina que me traz segurança e previsibilidade.",           disc:"S" },
    { label:"D", text:"Com plano detalhado, lista de tarefas e prazos estruturados.",      disc:"C" }]},
  { text: "Um problema inesperado aparece. O que você faz?", options: [
    { label:"A", text:"Ajo imediatamente para resolver o mais rápido possível.",           disc:"D" },
    { label:"B", text:"Investigo as causas com calma antes de agir.",                     disc:"C" },
    { label:"C", text:"Peço ajuda a alguém de confiança e resolvemos juntos.",            disc:"S" },
    { label:"D", text:"Converso com alguém próximo para ganhar perspectiva.",             disc:"I" }]},
  { text: "Em reuniões ou encontros em grupo, você normalmente:", options: [
    { label:"A", text:"Tomo a palavra quando necessário e conduzo para um objetivo.",      disc:"D" },
    { label:"B", text:"Participo animadamente, faço conexões e energizo o grupo.",        disc:"I" },
    { label:"C", text:"Ouço todos antes de falar e busco manter o ambiente harmonioso.",  disc:"S" },
    { label:"D", text:"Falo quando tenho algo relevante e bem fundamentado.",             disc:"C" }]},
  { text: "Quando você tem um objetivo importante, sua abordagem é:", options: [
    { label:"A", text:"Ir direto à execução com intensidade até atingir o resultado.",    disc:"D" },
    { label:"B", text:"Traçar um plano detalhado com etapas e métricas.",                disc:"C" },
    { label:"C", text:"Avançar com consistência, passo a passo, sem atropelos.",         disc:"S" },
    { label:"D", text:"Compartilhar com pessoas próximas para ganhar motivação.",         disc:"I" }]},
  { text: "Como você reage quando alguém cancela um plano na última hora?", options: [
    { label:"A", text:"Me adapto rápido e improviso outra atividade com leveza.",         disc:"I" },
    { label:"B", text:"Fico irritado, pois havia outras coisas que poderia ter feito.",   disc:"D" },
    { label:"C", text:"Fico desconfortável, pois gosto de saber como meu dia vai se desenrolar.", disc:"S" },
    { label:"D", text:"Revejo minha agenda e reorganizo tudo de forma lógica.",           disc:"C" }]},
  { text: "Ao aprender algo novo, você prefere:", options: [
    { label:"A", text:"Tentar na prática e ajustar conforme os erros aparecem.",          disc:"D" },
    { label:"B", text:"Aprender com alguém experiente em ambiente acolhedor.",            disc:"S" },
    { label:"C", text:"Explorar de forma dinâmica, com troca de ideias.",                 disc:"I" },
    { label:"D", text:"Receber explicação detalhada com exemplos e fundamentação.",       disc:"C" }]},
  { text: "Como você toma decisões importantes?", options: [
    { label:"A", text:"Converso com pessoas próximas e levo em conta as opiniões delas.", disc:"I" },
    { label:"B", text:"Confio na minha intuição e capacidade de resolver o que vier.",    disc:"D" },
    { label:"C", text:"Reúno dados, comparo alternativas e tomo a decisão mais racional.",disc:"C" },
    { label:"D", text:"Analiso todos os ângulos e só decido quando me sinto seguro.",     disc:"S" }]},
  { text: "Quando algo dá errado em um plano seu, você:", options: [
    { label:"A", text:"Reajusta rapidamente e parte para a próxima ação.",               disc:"D" },
    { label:"B", text:"Busca apoio emocional antes de tentar de novo.",                  disc:"I" },
    { label:"C", text:"Mantém a calma e retoma o ritmo de forma estável.",               disc:"S" },
    { label:"D", text:"Analisa o que saiu errado para não repetir o erro.",              disc:"C" }]},
  { text: "Em um conflito com alguém próximo, você tende a:", options: [
    { label:"A", text:"Ser direto sobre o que pensa e esperar resolução rápida.",        disc:"D" },
    { label:"B", text:"Ceder um pouco para manter o clima agradável.",                   disc:"I" },
    { label:"C", text:"Buscar resolução pacífica preservando a relação.",                disc:"S" },
    { label:"D", text:"Usar argumentos lógicos para chegar à melhor conclusão.",         disc:"C" }]},
  { text: "O que mais te motiva a se dedicar a algo?", options: [
    { label:"A", text:"Fazer parte de algo que impacta positivamente as pessoas.",       disc:"I" },
    { label:"B", text:"Atingir um resultado concreto e ser reconhecido.",                disc:"D" },
    { label:"C", text:"Ter estabilidade e contribuir de forma consistente.",             disc:"S" },
    { label:"D", text:"Fazer um trabalho de alta qualidade que me orgulhe.",             disc:"C" }]},
  { text: "Como você se sente em ambientes com muita incerteza?", options: [
    { label:"A", text:"Sinto-me energizado. Adoro desafios e me adapto bem.",           disc:"D" },
    { label:"B", text:"Confortável se tiver pessoas parceiras ao meu redor.",            disc:"I" },
    { label:"C", text:"Preciso entender as regras e variáveis antes de me sentir confortável.", disc:"C" },
    { label:"D", text:"Prefiro ambientes mais estáveis. Incerteza me desconforta.",      disc:"S" }]},
  { text: "Em uma situação de lazer com pessoas que não conhece bem:", options: [
    { label:"A", text:"Apresento-me espontaneamente e crio conversas animadas.",         disc:"I" },
    { label:"B", text:"Assumo posição de liderança nas atividades do grupo.",            disc:"D" },
    { label:"C", text:"Prefiro me aproximar de poucas pessoas e criar conexões profundas.", disc:"S" },
    { label:"D", text:"Observo primeiro, entro na conversa quando tenho algo interessante.", disc:"C" }]},
  { text: "Como você reage ao perceber que cometeu um erro?", options: [
    { label:"A", text:"Reconheço, corrijo rapidamente e sigo em frente.",                disc:"D" },
    { label:"B", text:"Converso com alguém de confiança para obter perspectiva.",       disc:"I" },
    { label:"C", text:"Me sinto mal e preciso de um tempo para processar.",              disc:"S" },
    { label:"D", text:"Analiso detalhadamente para garantir que não se repita.",         disc:"C" }]},
  { text: "Como prefere receber reconhecimento pelo seu esforço?", options: [
    { label:"A", text:"Com resultados concretos e posição de destaque.",                 disc:"D" },
    { label:"B", text:"Com elogios públicos e reconhecimento do grupo.",                 disc:"I" },
    { label:"C", text:"Com um reconhecimento genuíno e privado de quem me conhece.",    disc:"S" },
    { label:"D", text:"Com feedback específico sobre a qualidade do que foi entregue.",  disc:"C" }]},
  { text: "Ao planejar algo importante (viagem, projeto, festa), você:", options: [
    { label:"A", text:"Define os objetivos e age logo, ajustando detalhes no caminho.",  disc:"D" },
    { label:"B", text:"Chama pessoas para planejar junto e torna o processo divertido.", disc:"I" },
    { label:"C", text:"Planeja com antecedência e calma, garantindo que tudo esteja no lugar.", disc:"S" },
    { label:"D", text:"Pesquisa exaustivamente, cria roteiro detalhado e considera riscos.", disc:"C" }]},
  { text: "Quando discorda de uma regra, você:", options: [
    { label:"A", text:"Questiona abertamente e propõe uma alternativa melhor.",          disc:"D" },
    { label:"B", text:"Tenta convencer as pessoas ao redor a verem seu ponto de vista.", disc:"I" },
    { label:"C", text:"Segue a regra mesmo sem gostar, para não criar conflitos.",       disc:"S" },
    { label:"D", text:"Verifica se a regra tem embasamento lógico antes de acatá-la.",  disc:"C" }]},
  { text: "Em momentos de estresse intenso, você:", options: [
    { label:"A", text:"Foca mais ainda no que precisa ser resolvido e acelera o ritmo.", disc:"D" },
    { label:"B", text:"Busca conversa e suporte emocional de quem está ao redor.",       disc:"I" },
    { label:"C", text:"Mantém a rotina e hábitos para preservar o equilíbrio interno.", disc:"S" },
    { label:"D", text:"Se isola para analisar o problema com profundidade.",              disc:"C" }]},
  { text: "O que as pessoas ao seu redor mais valorizam em você?", options: [
    { label:"A", text:"Minha capacidade de tirar ideias do papel e entregar resultados.", disc:"D" },
    { label:"B", text:"Minha energia positiva, carisma e capacidade de animar qualquer ambiente.", disc:"I" },
    { label:"C", text:"Minha confiabilidade, paciência e lealdade em qualquer situação.", disc:"S" },
    { label:"D", text:"Minha precisão, profundidade analítica e comprometimento com qualidade.", disc:"C" }]}
];

/* ════════════════════════════════════════════════════
   DADOS COMPLETOS DOS PERFIS DISC
════════════════════════════════════════════════════ */
var profileData = {
  D: {
    name: "Dominante",
    tagline: "Orientado a resultados, decisivo e assertivo",
    description: [
      "O perfil Dominante se destaca pela capacidade de agir com rapidez e determinação. Naturalmente orientados a resultados, não hesitam em liderar quando necessário.",
      "Sua força está na resiliência, no foco e na habilidade de transformar ideias em ação concreta. São vistos como diretos, confiantes e motivadores."
    ],
    strengths:     ["Tomada de decisão rápida e assertiva","Alta orientação a resultados","Liderança natural e confiante","Resiliência diante de adversidades","Transforma ideias em ação"],
    develop:       ["Cultivar paciência e escuta ativa","Considerar o impacto emocional nas pessoas","Delegar com mais detalhamento","Equilibrar velocidade com qualidade"],
    communication: ["Prefere comunicação direta e objetiva","Vai ao ponto, sem rodeios","Responde melhor a dados e fatos","Valoriza clareza e eficiência"],
    environment:   ["Autonomia para decidir","Desafios constantes e metas ambiciosas","Reconhecimento por conquistas","Pouca burocracia e muita ação"]
  },
  I: {
    name: "Influente",
    tagline: "Comunicativo, entusiasta e orientado às pessoas",
    description: [
      "O perfil Influente é marcado por uma energia contagiante e habilidade natural para criar conexões genuínas. Prosperam em ambientes colaborativos onde podem inspirar os outros.",
      "Em situações cotidianas, são os que animam os grupos, criam pontes e tornam qualquer ambiente mais positivo."
    ],
    strengths:     ["Comunicação expressiva e persuasiva","Habilidade para criar relacionamentos","Entusiasmo e otimismo contagiantes","Criatividade e pensamento inovador","Capacidade de engajar e motivar"],
    develop:       ["Desenvolver organização e gestão do tempo","Focar em detalhes quando necessário","Praticar objetividade nas entregas","Controlar o impulso de começar muitas coisas"],
    communication: ["Prefere conversas empáticas e abertas","Responde bem ao reconhecimento verbal","Engaja com histórias mais que dados frios","Valoriza conexão emocional"],
    environment:   ["Interação social constante","Projetos criativos e variados","Reconhecimento público","Liberdade para inovar"]
  },
  S: {
    name: "Estável",
    tagline: "Leal, paciente e orientado à harmonia",
    description: [
      "O perfil Estável é reconhecido pela paciência, lealdade e consistência. São os pilares silenciosos de qualquer grupo, garantindo um ambiente saudável.",
      "São ouvintes excepcionais, conselheiros confiáveis e presentes nas horas difíceis."
    ],
    strengths:     ["Confiabilidade e consistência","Escuta ativa e genuína","Lealdade profunda","Paciência e equilíbrio emocional","Constrói vínculos duradouros"],
    develop:       ["Lidar melhor com mudanças inesperadas","Ser mais assertivo ao se expressar","Aprender a estabelecer limites","Desenvolver maior agilidade nas decisões"],
    communication: ["Prefere ambientes acolhedores sem conflitos","Precisa de confiança antes de se abrir","Comunica-se melhor em conversas individuais","Responde à paciência e escuta genuína"],
    environment:   ["Rotina previsível e estruturada","Relações de confiança sólidas","Mudanças comunicadas com antecedência","Reconhecimento por lealdade e dedicação"]
  },
  C: {
    name: "Conforme",
    tagline: "Analítico, preciso e orientado à qualidade",
    description: [
      "O perfil Conforme é definido por rigor analítico e alto padrão de qualidade. Garantem que as coisas sejam feitas corretamente, baseadas em dados.",
      "São pesquisadores natos, questionadores cuidadosos e defensores da excelência em qualquer contexto."
    ],
    strengths:     ["Atenção excepcional aos detalhes","Capacidade analítica e pensamento crítico","Alto padrão de qualidade","Disciplina para seguir processos","Identifica riscos e soluções precisas"],
    develop:       ["Ser mais flexível diante de imprevistos","Maior agilidade nas decisões","Equilibrar perfeição com pragmatismo","Desenvolver habilidades interpessoais"],
    communication: ["Prefere comunicação documentada e precisa","Valoriza dados, fatos e evidências","Precisa de tempo para analisar","Aprecia perguntas diretas e objetivas"],
    environment:   ["Processos claros e documentados","Tempo para análises profundas","Expectativas e critérios bem definidos","Reconhecimento pelo rigor do trabalho"]
  }
};

/* ════════════════════════════════════════════════════
   PERFIS COMBINADOS (diferença de pontuação ≤ 3)
════════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════════
   MAPA DE PERFIS COMBINADOS
   Suporta perfis simples (1 fator), duplos (2),
   triplos (3) e quádruplo (4).
   A chave é a concatenação dos códigos em ordem
   decrescente de pontuação (ex: "SC", "DIS", "DISC").
════════════════════════════════════════════════════ */
var combos = {
  /* ── Perfis duplos ── */
  "DI": { name:"Empreendedor",         tagline:"Dinâmico, persuasivo e movido a resultados com as pessoas" },
  "ID": { name:"Promotor",             tagline:"Inspira e conduz com energia e visão de futuro" },
  "DS": { name:"Realizador",           tagline:"Une foco em resultados com estabilidade nas relações" },
  "SD": { name:"Estável Decisivo",     tagline:"Ação calculada com profunda sensibilidade humana" },
  "DC": { name:"Perfeccionista",       tagline:"Busca resultados com alto padrão de qualidade" },
  "CD": { name:"Investigador",         tagline:"Analítico e determinado na busca por soluções" },
  "IS": { name:"Conselheiro",          tagline:"Empático, comunicativo e genuinamente colaborativo" },
  "SI": { name:"Apoiador Influente",   tagline:"Cria harmonia e engajamento em qualquer grupo" },
  "IC": { name:"Motivador",            tagline:"Entusiasmo aliado à busca por qualidade" },
  "CI": { name:"Especialista Social",  tagline:"Precisão técnica com forte habilidade relacional" },
  "SC": { name:"Especialista Estável", tagline:"Consistência e rigor como pilares do trabalho" },
  "CS": { name:"Metódico",             tagline:"Processos, qualidade e harmonia em equilíbrio" },

  /* ── Perfis triplos ── */
  "DIS": { name:"Líder Catalisador",    tagline:"Resultados, pessoas e consistência em equilíbrio" },
  "DIC": { name:"Estrategista Humano",  tagline:"Visão, influência e rigor analítico combinados" },
  "DSC": { name:"Gestor Completo",      tagline:"Determinação, estabilidade e precisão em harmonia" },
  "IDS": { name:"Facilitador Ativo",    tagline:"Engaja, age e sustenta com leveza" },
  "IDC": { name:"Comunicador Técnico",  tagline:"Persuasão com profundidade analítica" },
  "ISC": { name:"Harmonizador",         tagline:"Conexões genuínas com consistência e qualidade" },
  "SDI": { name:"Âncora Inspiradora",   tagline:"Estabilidade que motiva e entrega resultados" },
  "SDC": { name:"Executor Metódico",    tagline:"Constância, determinação e padrão elevado" },
  "SIC": { name:"Guardião Empático",    tagline:"Cuida, conecta e garante qualidade" },
  "SCD": { name:"Especialista Decisivo",tagline:"Qualidade, consistência e foco em resultados" },
  "CDS": { name:"Analista Realizador",  tagline:"Precisão que gera resultados sustentáveis" },
  "CDI": { name:"Consultor Estratégico",tagline:"Dados, visão e influência a serviço do resultado" },
  "CIS": { name:"Especialista Relacional",tagline:"Qualidade técnica com escuta e conexão genuínas" },
  "CSI": { name:"Conselheiro Criterioso",tagline:"Rigor, harmonia e influência positiva" },
  "CSD": { name:"Arquiteto de Soluções",tagline:"Processos sólidos com foco e estabilidade" },
  "ICS": { name:"Inovador Cuidadoso",   tagline:"Criatividade com precisão e sensibilidade" },

  /* ── Perfil quádruplo ── */
  "DISC": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "DISC": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "DSIC": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "DCIS": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "IDSC": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "ISDC": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "ICDS": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "SDCI": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "SIDC": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "SCDI": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "CDIS": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" },
  "CSDI": { name:"Perfil Multidimensional", tagline:"Equilíbrio excepcional entre os quatro fatores comportamentais" }
};

/* ════════════════════════════════════════════════════
   LIMIAR OFICIAL DE PERFIL PRINCIPAL
   Todo fator com score >= PROFILE_THRESHOLD é
   considerado perfil principal.
   Baseado na regra oficial: 51–100 = principal,
   1–50 = secundário.
════════════════════════════════════════════════════ */
var PROFILE_THRESHOLD = 51;

/* ════════════════════════════════════════════════════
   buildProfileResult — motor de identificação de perfil
   ─────────────────────────────────────────────────
   Parâmetro: scores = { D: n, I: n, S: n, C: n }

   Retorna:
   {
     profileCodes: ['S','C'],      // fatores principais ordenados
     profileCode:  'SC',           // sigla concatenada
     primaryKey:   'S',            // fator de maior pontuação
     aboveThreshold: [{code,score}],// todos >= 51 pts
     belowThreshold: [{code,score}],// todos < 51 pts
     combo: { name, tagline }      // objeto do mapa combos
   }

   REGRA:
   1. Ordena D/I/S/C do maior ao menor.
   2. Seleciona todos com score >= PROFILE_THRESHOLD (51).
   3. Se nenhum >= 51 → usa apenas o maior (perfil simples forçado).
   4. Concatena os códigos na ordem → profileCode.
   5. Busca em combos pelo profileCode exato.
════════════════════════════════════════════════════ */
function buildProfileResult(scores) {
  /* 1. Ordena do maior ao menor */
  var sorted = [
    { code: 'D', score: scores.D || 0 },
    { code: 'I', score: scores.I || 0 },
    { code: 'S', score: scores.S || 0 },
    { code: 'C', score: scores.C || 0 }
  ].sort(function(a, b) { return b.score - a.score; });

  /* 2. Filtra os que atingem o limiar */
  var above = sorted.filter(function(f) { return f.score >= PROFILE_THRESHOLD; });
  var below = sorted.filter(function(f) { return f.score < PROFILE_THRESHOLD; });

  /* 3. Garante ao menos o fator de maior pontuação */
  if (above.length === 0) above = [sorted[0]];

  /* 4. Monta o código de perfil */
  var profileCodes = above.map(function(f) { return f.code; });
  var profileCode  = profileCodes.join('');
  var primaryKey   = profileCodes[0];

  /* 5. Busca o combo correspondente */
  var combo = combos[profileCode] || null;

  /* Logs temporários para validação durante testes */
  console.log('[DISC] Scores:', scores);
  console.log('[DISC] Perfil Detectado:', profileCode,
    '| Fatores >= ' + PROFILE_THRESHOLD + ':', profileCodes,
    '| Combo:', combo ? combo.name : '(simples)');

  return {
    profileCodes:     profileCodes,   /* ex: ['S','C'] */
    profileCode:      profileCode,    /* ex: 'SC'      */
    primaryKey:       primaryKey,     /* ex: 'S'       */
    secondaryKey:     profileCodes[1] || null,
    hasSecondary:     profileCodes.length >= 2,
    aboveThreshold:   above,
    belowThreshold:   below,
    combo:            combo
  };
}

/* ════════════════════════════════════════════════════
   CONSTANTES DE COR E NOME
════════════════════════════════════════════════════ */
var DISC_COLORS = { D:'#FF4D4D', I:'#FFCC00', S:'#2ECC71', C:'#3498DB' };
var DISC_DARK   = { D:'#cc1100', I:'#997700', S:'#1a7a40', C:'#1a5fa0' };
var DISC_NAMES  = { D:'Dominância', I:'Influência', S:'Estabilidade', C:'Conformidade' };
