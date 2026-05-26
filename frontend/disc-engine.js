/* ══════════════════════════════════════════════════════
   disc-engine.js — DISC Platform
   ─────────────────────────────────────────────────────
   RESPONSABILIDADE: dados puros da metodologia DISC.
   Não toca no DOM. Não depende de nenhum outro módulo.
   É a "verdade científica" do sistema — apenas lê e leva.

   EXPORTA (globais usadas pelos demais módulos):
   • questions   — banco de 20 questões situacionais
   • profileData — descrições completas de D, I, S, C
   • combos      — nomes dos 12 perfis combinados
   • DISC_COLORS — cores hexadecimais por letra
   • DISC_DARK   — versões escuras das cores DISC
   • DISC_NAMES  — nomes completos por letra
══════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════════
   BANCO DE QUESTÕES — 20 perguntas situacionais
   O campo `disc` em cada opção contém o perfil
   correspondente (D, I, S ou C), mas é invisível
   para o participante — aparece apenas o label A‑D.
════════════════════════════════════════════════════ */
const questions = [
  { text: "Você e amigos precisam decidir o destino de uma viagem com opiniões diferentes. Você tende a:", options: [
    { label:"A", text:"Propor o destino que considera melhor e convencer o grupo com entusiasmo.", disc:"I" },
    { label:"B", text:"Tomar a iniciativa, definir o destino e já começar a organizar tudo.",        disc:"D" },
    { label:"C", text:"Pesquisar, comparar opções e apresentar prós e contras de cada uma.",         disc:"C" },
    { label:"D", text:"Propor um destino que agrade a todos e buscar o consenso do grupo.",          disc:"S" }]},
  { text: "Ao receber uma crítica de alguém próximo sobre algo que fez, sua primeira reação é:", options: [
    { label:"A", text:"Absorver com calma, refletir antes de responder.",                 disc:"S" },
    { label:"B", text:"Responder diretamente se discordar e seguir em frente.",           disc:"D" },
    { label:"C", text:"Analisar se a crítica tem fundamento antes de aceitar ou rebater.", disc:"C" },
    { label:"D", text:"Ficar chateado, mas priorizar preservar o relacionamento.",        disc:"I" }]},
  { text: "Como você prefere organizar seu dia a dia?", options: [
    { label:"A", text:"Com metas claras e foco nas tarefas mais impactantes.",            disc:"D" },
    { label:"B", text:"Com flexibilidade para aproveitar oportunidades que surgem.",      disc:"I" },
    { label:"C", text:"Com uma rotina que me traz segurança e previsibilidade.",          disc:"S" },
    { label:"D", text:"Com plano detalhado, lista de tarefas e prazos estruturados.",     disc:"C" }]},
  { text: "Um problema inesperado aparece. O que você faz?", options: [
    { label:"A", text:"Ajo imediatamente para resolver o mais rápido possível.",          disc:"D" },
    { label:"B", text:"Investigo as causas com calma antes de agir.",                    disc:"C" },
    { label:"C", text:"Peço ajuda a alguém de confiança e resolvemos juntos.",           disc:"S" },
    { label:"D", text:"Converso com alguém próximo para ganhar perspectiva.",            disc:"I" }]},
  { text: "Em reuniões ou encontros em grupo, você normalmente:", options: [
    { label:"A", text:"Tomo a palavra quando necessário e conduzo para um objetivo.",     disc:"D" },
    { label:"B", text:"Participo animadamente, faço conexões e energizo o grupo.",       disc:"I" },
    { label:"C", text:"Ouço todos antes de falar e busco manter o ambiente harmonioso.", disc:"S" },
    { label:"D", text:"Falo quando tenho algo relevante e bem fundamentado.",            disc:"C" }]},
  { text: "Quando você tem um objetivo importante, sua abordagem é:", options: [
    { label:"A", text:"Ir direto à execução com intensidade até atingir o resultado.",   disc:"D" },
    { label:"B", text:"Traçar um plano detalhado com etapas e métricas.",               disc:"C" },
    { label:"C", text:"Avançar com consistência, passo a passo, sem atropelos.",        disc:"S" },
    { label:"D", text:"Compartilhar com pessoas próximas para ganhar motivação.",        disc:"I" }]},
  { text: "Como você reage quando alguém cancela um plano na última hora?", options: [
    { label:"A", text:"Me adapto rápido e improviso outra atividade com leveza.",        disc:"I" },
    { label:"B", text:"Fico irritado, pois havia outras coisas que poderia ter feito.",  disc:"D" },
    { label:"C", text:"Fico desconfortável, pois gosto de saber como meu dia vai se desenrolar.", disc:"S" },
    { label:"D", text:"Revejo minha agenda e reorganizo tudo de forma lógica.",          disc:"C" }]},
  { text: "Ao aprender algo novo, você prefere:", options: [
    { label:"A", text:"Tentar na prática e ajustar conforme os erros aparecem.",         disc:"D" },
    { label:"B", text:"Aprender com alguém experiente em ambiente acolhedor.",           disc:"S" },
    { label:"C", text:"Explorar de forma dinâmica, com troca de ideias.",                disc:"I" },
    { label:"D", text:"Receber explicação detalhada com exemplos e fundamentação.",      disc:"C" }]},
  { text: "Como você toma decisões importantes?", options: [
    { label:"A", text:"Converso com pessoas próximas e levo em conta as opiniões delas.", disc:"I" },
    { label:"B", text:"Confio na minha intuição e capacidade de resolver o que vier.",   disc:"D" },
    { label:"C", text:"Reúno dados, comparo alternativas e tomo a decisão mais racional.", disc:"C" },
    { label:"D", text:"Analiso todos os ângulos e só decido quando me sinto seguro.",    disc:"S" }]},
  { text: "Quando algo dá errado em um plano seu, você:", options: [
    { label:"A", text:"Reajusta rapidamente e parte para a próxima ação.",              disc:"D" },
    { label:"B", text:"Busca apoio emocional antes de tentar de novo.",                 disc:"I" },
    { label:"C", text:"Mantém a calma e retoma o ritmo de forma estável.",              disc:"S" },
    { label:"D", text:"Analisa o que saiu errado para não repetir o erro.",             disc:"C" }]},
  { text: "Em um conflito com alguém próximo, você tende a:", options: [
    { label:"A", text:"Ser direto sobre o que pensa e esperar resolução rápida.",       disc:"D" },
    { label:"B", text:"Ceder um pouco para manter o clima agradável.",                  disc:"I" },
    { label:"C", text:"Buscar resolução pacífica preservando a relação.",               disc:"S" },
    { label:"D", text:"Usar argumentos lógicos para chegar à melhor conclusão.",        disc:"C" }]},
  { text: "O que mais te motiva a se dedicar a algo?", options: [
    { label:"A", text:"Fazer parte de algo que impacta positivamente as pessoas.",      disc:"I" },
    { label:"B", text:"Atingir um resultado concreto e ser reconhecido.",               disc:"D" },
    { label:"C", text:"Ter estabilidade e contribuir de forma consistente.",            disc:"S" },
    { label:"D", text:"Fazer um trabalho de alta qualidade que me orgulhe.",            disc:"C" }]},
  { text: "Como você se sente em ambientes com muita incerteza?", options: [
    { label:"A", text:"Sinto-me energizado. Adoro desafios e me adapto bem.",          disc:"D" },
    { label:"B", text:"Confortável se tiver pessoas parceiras ao meu redor.",           disc:"I" },
    { label:"C", text:"Preciso entender as regras e variáveis antes de me sentir confortável.", disc:"C" },
    { label:"D", text:"Prefiro ambientes mais estáveis. Incerteza me desconforta.",     disc:"S" }]},
  { text: "Em uma situação de lazer com pessoas que não conhece bem:", options: [
    { label:"A", text:"Apresento-me espontaneamente e crio conversas animadas.",        disc:"I" },
    { label:"B", text:"Assumo posição de liderança nas atividades do grupo.",           disc:"D" },
    { label:"C", text:"Prefiro me aproximar de poucas pessoas e criar conexões profundas.", disc:"S" },
    { label:"D", text:"Observo primeiro, entro na conversa quando tenho algo interessante.", disc:"C" }]},
  { text: "Como você reage ao perceber que cometeu um erro?", options: [
    { label:"A", text:"Reconheço, corrijo rapidamente e sigo em frente.",               disc:"D" },
    { label:"B", text:"Converso com alguém de confiança para obter perspectiva.",      disc:"I" },
    { label:"C", text:"Me sinto mal e preciso de um tempo para processar.",             disc:"S" },
    { label:"D", text:"Analiso detalhadamente para garantir que não se repita.",        disc:"C" }]},
  { text: "Como prefere receber reconhecimento pelo seu esforço?", options: [
    { label:"A", text:"Com resultados concretos e posição de destaque.",                disc:"D" },
    { label:"B", text:"Com elogios públicos e reconhecimento do grupo.",                disc:"I" },
    { label:"C", text:"Com um reconhecimento genuíno e privado de quem me conhece.",   disc:"S" },
    { label:"D", text:"Com feedback específico sobre a qualidade do que foi entregue.", disc:"C" }]},
  { text: "Ao planejar algo importante (viagem, projeto, festa), você:", options: [
    { label:"A", text:"Define os objetivos e age logo, ajustando detalhes no caminho.", disc:"D" },
    { label:"B", text:"Chama pessoas para planejar junto e torna o processo divertido.", disc:"I" },
    { label:"C", text:"Planeja com antecedência e calma, garantindo que tudo esteja no lugar.", disc:"S" },
    { label:"D", text:"Pesquisa exaustivamente, cria roteiro detalhado e considera riscos.", disc:"C" }]},
  { text: "Quando discorda de uma regra, você:", options: [
    { label:"A", text:"Questiona abertamente e propõe uma alternativa melhor.",         disc:"D" },
    { label:"B", text:"Tenta convencer as pessoas ao redor a verem seu ponto de vista.", disc:"I" },
    { label:"C", text:"Segue a regra mesmo sem gostar, para não criar conflitos.",      disc:"S" },
    { label:"D", text:"Verifica se a regra tem embasamento lógico antes de acatá-la.", disc:"C" }]},
  { text: "Em momentos de estresse intenso, você:", options: [
    { label:"A", text:"Foca mais ainda no que precisa ser resolvido e acelera o ritmo.", disc:"D" },
    { label:"B", text:"Busca conversa e suporte emocional de quem está ao redor.",      disc:"I" },
    { label:"C", text:"Mantém a rotina e hábitos para preservar o equilíbrio interno.", disc:"S" },
    { label:"D", text:"Se isola para analisar o problema com profundidade.",             disc:"C" }]},
  { text: "O que as pessoas ao seu redor mais valorizam em você?", options: [
    { label:"A", text:"Minha capacidade de tirar ideias do papel e entregar resultados.", disc:"D" },
    { label:"B", text:"Minha energia positiva, carisma e capacidade de animar qualquer ambiente.", disc:"I" },
    { label:"C", text:"Minha confiabilidade, paciência e lealdade em qualquer situação.", disc:"S" },
    { label:"D", text:"Minha precisão, profundidade analítica e comprometimento com qualidade.", disc:"C" }]}
];

/* ════════════════════════════════════════════════════
   DADOS COMPLETOS DOS PERFIS DISC
   Usado por showResults() e buildPdfHTML()
════════════════════════════════════════════════════ */
const profileData = {
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
   PERFIS COMBINADOS (quando diferença de pontos ≤ 3)
   Chave: pk+sk  (ex: "SD", "DI", "CS"…)
   Nome reflete SEMPRE o perfil primário (pk).
════════════════════════════════════════════════════ */
const combos = {
  "DI": { name:"Empreendedor",       tagline:"Dinâmico, persuasivo e movido a resultados com as pessoas" },
  "ID": { name:"Promotor",           tagline:"Inspira e conduz com energia e visão de futuro" },
  "DS": { name:"Realizador",         tagline:"Une foco em resultados com estabilidade nas relações" },
  "SD": { name:"Estável Decisivo",   tagline:"Ação calculada com profunda sensibilidade humana" },
  "DC": { name:"Perfeccionista",     tagline:"Busca resultados com alto padrão de qualidade" },
  "CD": { name:"Investigador",       tagline:"Analítico e determinado na busca por soluções" },
  "IS": { name:"Conselheiro",        tagline:"Empático, comunicativo e genuinamente colaborativo" },
  "SI": { name:"Apoiador Influente", tagline:"Cria harmonia e engajamento em qualquer grupo" },
  "IC": { name:"Motivador",          tagline:"Entusiasmo aliado à busca por qualidade" },
  "CI": { name:"Especialista Social",tagline:"Precisão técnica com forte habilidade relacional" },
  "SC": { name:"Especialista Estável",tagline:"Consistência e rigor como pilares do trabalho" },
  "CS": { name:"Metódico",           tagline:"Processos, qualidade e harmonia em equilíbrio" }
};

/* ════════════════════════════════════════════════════
   CONSTANTES DE COR E NOME
   Usadas em toda a interface e nos PDFs.
════════════════════════════════════════════════════ */
const DISC_COLORS = { D:'#FF4D4D', I:'#FFCC00', S:'#2ECC71', C:'#3498DB' };
const DISC_DARK   = { D:'#cc1100', I:'#997700', S:'#1a7a40', C:'#1a5fa0' };
const DISC_NAMES  = { D:'Dominância', I:'Influência', S:'Estabilidade', C:'Conformidade' };
