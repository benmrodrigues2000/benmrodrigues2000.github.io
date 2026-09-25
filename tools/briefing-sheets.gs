/* =============================================================================
   BRIEFING DE MISSÃO  →  GOOGLE SHEETS  +  AVISO POR EMAIL
   -----------------------------------------------------------------------------
   Recebe cada envio do briefing.html, escreve uma linha no separador
   "Briefings concluídos" (com a coluna Estado para ires atualizando) e
   manda-te um email com o relatório completo e um link direto para a linha.

   Grátis, sem servidor, sem limite prático (o email tem quota de ~100/dia).

   COMO PÔR A FUNCIONAR (uma vez, ~5 minutos)
   1. Cria uma folha nova em sheets.google.com (ex.: "Briefings").
   2. Na folha: Extensões › Apps Script. Apaga o que lá estiver e cola este
      ficheiro inteiro. Guarda (Ctrl+S).
   3. Confirma o OWNER_EMAIL em CONFIG, mais abaixo.
   4. Na barra de cima escolhe a função "testar" e carrega em ▶ Executar.
      A Google pede permissões: Rever permissões › a tua conta › Avançadas ›
      "Aceder a ... (não seguro)" › Permitir. (É o teu próprio script; o aviso
      aparece porque não foi publicado na loja.)
      Resultado: o separador é criado, aparece uma linha de teste e recebes um
      email. Podes apagar a linha de teste.
   5. Implementar › Nova implementação › ⚙ tipo "Aplicação Web":
        Descrição:        briefing
        Executar como:    Eu
        Quem tem acesso:  Qualquer pessoa          ← obrigatório
      › Implementar. Copia o "URL da aplicação Web" (termina em /exec).
   6. Em briefing.html, cola esse URL na constante SHEETS_URL (perto do topo
      do <script>, ao lado de MAIL). Publica o site. Pronto.

   SEMPRE QUE ALTERARES ESTE CÓDIGO:
   Implementar › Gerir implementações › ✎ › Versão: "Nova versão" › Implementar.
   Sem nova versão, o URL continua a correr o código antigo.

   NOTAS
   - Não mudes a ordem das colunas do separador (podes esconder as que não usas).
     Se quiseres reorganizar, apaga o separador e ele volta a ser criado
     com a nova ordem no próximo envio.
   - Cada rascunho do briefing tem um ID. Se o cliente alterar respostas e
     enviar de novo, a linha é ATUALIZADA (Estado e Data originais mantêm-se)
     e recebes um email "(atualizado)" - nada de duplicados.
   - Fuso horário da folha: Ficheiro › Definições › Fuso horário › Lisboa.
   ============================================================================= */

const CONFIG = {
  SHEET_NAME: 'Briefings concluídos',
  OWNER_EMAIL: 'benmrodrigues2000@gmail.com', // '' = email do dono do script
  SPREADSHEET_ID: '',                          // '' = a folha onde este script está colado
  ESTADOS: ['Novo', 'Em análise', 'Proposta enviada', 'Em curso', 'Concluído', 'Arquivado'],
  SEND_CLIENT_COPY: false,                     // true = o cliente também recebe uma cópia
  SENDER_NAME: 'Briefing de Missão',
  MAX_LEN: 6000                                // corte de segurança por campo
};

/* Cabeçalho da folha → chave enviada pelo briefing.
   Chaves com "_" são preenchidas aqui, não pelo formulário. */
const COLUMNS = [
  ['Data', '_ts'],
  ['Estado', '_estado'],
  ['Marca', 'marca'],
  ['Nome', 'nome'],
  ['Email', 'email'],
  ['Telefone', 'telefone'],
  ['Área de atividade', 'area'],
  ['Website atual', 'site_atual'],
  ['O que faz', 'o_que_fazes'],
  ['Objetivos do site', 'objetivos'],
  ['Ação principal', 'acao_principal'],
  ['Medidas de sucesso', 'sucesso'],
  ['Concorrentes', 'concorrentes'],
  ['Cliente ideal', 'cliente_ideal'],
  ['O que procuram', 'o_que_procuram'],
  ['Zona geográfica', 'zona'],
  ['Paleta', 'paleta'],
  ['Cor de fundo', 'cor_fundo'],
  ['Cor de destaque', 'cor_destaque'],
  ['Cor de texto', 'cor_texto'],
  ['Personalidade', 'personalidade'],
  ['Tipografia', 'tipografia'],
  ['Referências', 'referencias'],
  ['Logótipo', 'logo'],
  ['Cores da marca', 'cores_marca'],
  ['Páginas', 'paginas'],
  ['Textos', 'textos'],
  ['Imagens', 'imagens'],
  ['Redes sociais', 'redes'],
  ['Links das redes', 'links_redes'],
  ['Funcionalidades', 'funcionalidades'],
  ['Domínio', 'dominio'],
  ['Alojamento', 'alojamento'],
  ['Orçamento (€)', 'orcamento'],
  ['Prazo desejado', 'prazo'],
  ['Manutenção', 'manutencao'],
  ['Notas finais', 'notas'],
  ['Idioma', '_lang'],
  ['Origem', '_page'],
  ['Relatório completo', '_report'],
  ['ID', '_id']
];

const COL = {};                                  // chave → número da coluna (1-based)
COLUMNS.forEach((c, i) => { COL[c[1]] = i + 1; });

/* ---------------------------------------------------------------------------
   Pontos de entrada da Aplicação Web
   --------------------------------------------------------------------------- */
function doPost(e) {
  let out;
  try {
    const body = (e && e.postData && e.postData.contents) || '';
    const data = body ? JSON.parse(body) : {};
    out = handle_(data);
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return json_(out);
}

function doGet() {
  /* Abre o URL /exec no browser para confirmar que a implementação está viva. */
  return json_({ ok: true, service: 'briefing-sheets', sheet: CONFIG.SHEET_NAME });
}

/* Corre isto uma vez no editor (▶) para autorizar e ver uma linha de teste. */
function testar() {
  const res = handle_({
    id: 'teste-' + Date.now(),
    lang: 'pt',
    page: 'teste manual (editor do Apps Script)',
    report: 'RELATÓRIO DE BRIEFING DE MISSÃO\nMarca: Padaria Central (teste)\n\n- 01 · IDENTIDADE -\nNome: Teste\n\nLinha de teste - podes apagar.',
    answers: {
      nome: 'Teste', email: ownerEmail_(), telefone: '+351 900 000 000', marca: 'Padaria Central (teste)',
      objetivos: 'Vender produtos (loja online), Gerar contactos e orçamentos',
      paleta: 'Órbita', cor_fundo: '#05060F', cor_destaque: '#A78BFA', cor_texto: '#E9EDF8',
      orcamento: 750, prazo: '2026-12-01', notas: 'Linha de teste - podes apagar.'
    }
  });
  Logger.log(JSON.stringify(res));
  return res;
}

/* ---------------------------------------------------------------------------
   Lógica
   --------------------------------------------------------------------------- */
function handle_(data) {
  data = data || {};
  const answers = data.answers || {};

  /* Campo-armadilha: humanos não o veem, robôs preenchem-no. Fingimos sucesso. */
  if (data._hp) return { ok: true, skipped: true };

  const missing = ['nome', 'email', 'marca'].filter(k => !clean_(answers[k]));
  if (missing.length) return { ok: false, error: 'missing:' + missing.join(',') };

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'busy' };

  try {
    const ss = spreadsheet_();
    const sheet = ensureSheet_(ss);
    const id = clean_(data.id) || Utilities.getUuid();
    const existing = findRow_(sheet, id);
    const now = new Date();

    const values = COLUMNS.map(([, key]) => {
      switch (key) {
        case '_ts':     return now;
        case '_estado': return CONFIG.ESTADOS[0];
        case '_lang':   return String(data.lang || 'pt').toUpperCase();
        case '_page':   return clean_(data.page);
        case '_report': return clean_(data.report);
        case '_id':     return id;
        case 'orcamento': {
          const n = Number(answers[key]);
          return isFinite(n) && answers[key] !== '' && answers[key] != null ? n : clean_(answers[key]);
        }
        case 'prazo':   return isoDate_(answers[key]) || clean_(answers[key]);
        default:        return text_(answers[key]);
      }
    });

    let row;
    if (existing) {
      /* Reenvio do mesmo rascunho: atualiza tudo menos Data e Estado. */
      row = existing;
      const old = sheet.getRange(row, 1, 1, COLUMNS.length).getValues()[0];
      values[COL._ts - 1] = old[COL._ts - 1] || now;
      values[COL._estado - 1] = old[COL._estado - 1] || CONFIG.ESTADOS[0];
      sheet.getRange(row, 1, 1, values.length).setValues([values]);
    } else {
      sheet.appendRow(values);              // expande a grelha se for preciso
      row = sheet.getLastRow();             // seguro: estamos dentro do lock
    }
    formatRow_(sheet, row);

    let mail = true;
    try { notifyOwner_(data, answers, ss, sheet, row, !!existing); }
    catch (err) { mail = false; console.error('email: ' + err); }
    if (CONFIG.SEND_CLIENT_COPY) {
      try { notifyClient_(data, answers); } catch (err) { console.error('cópia cliente: ' + err); }
    }

    return { ok: true, row: row, updated: !!existing, mail: mail };
  } finally {
    lock.releaseLock();
  }
}

function spreadsheet_() {
  return CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

/* Cria o separador com cabeçalho, filtros, painel congelado e o menu de Estado. */
function ensureSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEET_NAME, 0);
  if (sheet.getLastRow() > 0) return sheet;

  const headers = COLUMNS.map(c => c[0]);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#121731').setFontColor('#E9EDF8');
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);                                  // Data · Estado · Marca ficam à vista
  sheet.setRowHeight(1, 32);

  const widths = { _ts: 140, _estado: 140, marca: 170, nome: 150, email: 210, telefone: 130,
                   _lang: 70, _page: 120, _report: 110, _id: 90 };
  COLUMNS.forEach(([, key], i) => sheet.setColumnWidth(i + 1, widths[key] || 200));

  const estado = sheet.getRange(2, COL._estado, sheet.getMaxRows() - 1);
  estado.setDataValidation(estadoRule_());
  const letter = columnLetter_(COL._estado);
  const open = sheet.getRange(letter + '2:' + letter);         // aberto: apanha linhas futuras
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(CONFIG.ESTADOS[0])
      .setBackground('#EDE7FF').setFontColor('#3F2A9E').setBold(true).setRanges([open]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Concluído')
      .setBackground('#E0F5FF').setFontColor('#0B77A8').setRanges([open]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Arquivado')
      .setFontColor('#9AA3BF').setRanges([open]).build()
  ]);
  sheet.getRange(1, 1, 1, headers.length).createFilter();
  return sheet;
}

function formatRow_(sheet, row) {
  sheet.getRange(row, COL._ts).setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange(row, COL.prazo).setNumberFormat('dd/mm/yyyy');
  sheet.getRange(row, COL.orcamento).setNumberFormat('#,##0 "€"');
  sheet.getRange(row, COL._estado).setDataValidation(estadoRule_());
  sheet.getRange(row, 1, 1, COLUMNS.length).setVerticalAlignment('top')
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);      // linhas compactas; o texto está lá todo
}

function estadoRule_() {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(CONFIG.ESTADOS, true)
    .setAllowInvalid(true)                                    // podes escrever estados teus
    .build();
}

function findRow_(sheet, id) {
  const last = sheet.getLastRow();
  if (!id || last < 2) return 0;
  const hit = sheet.getRange(2, COL._id, last - 1, 1)
    .createTextFinder(id).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

/* ---------------------------------------------------------------------------
   Emails
   --------------------------------------------------------------------------- */
function notifyOwner_(data, answers, ss, sheet, row, updated) {
  const marca = clean_(answers.marca) || 'Novo projeto';
  const link = ss.getUrl() + '#gid=' + sheet.getSheetId() + '&range=A' + row;
  const lines = [
    (updated ? 'BRIEFING ATUALIZADO' : 'NOVO BRIEFING') + ' - ' + marca,
    'De: ' + clean_(answers.nome) + ' <' + clean_(answers.email) + '>' +
      (clean_(answers.telefone) ? ' · ' + clean_(answers.telefone) : ''),
    'Linha ' + row + ' em "' + sheet.getName() + '":',
    link,
    '',
    '────────────────────────────────────────',
    '',
    clean_(data.report) || fallbackReport_(answers)
  ];
  const msg = {
    to: ownerEmail_(),
    name: CONFIG.SENDER_NAME,
    subject: (updated ? '[atualizado] ' : '') + 'Briefing de missão - ' + marca,
    body: lines.join('\n')
  };
  if (isEmail_(answers.email)) msg.replyTo = clean_(answers.email);   // "Responder" vai direto ao cliente
  MailApp.sendEmail(msg);
}

function notifyClient_(data, answers) {
  if (!isEmail_(answers.email)) return;
  const en = String(data.lang || 'pt') === 'en';
  const nome = clean_(answers.nome);
  const body = en
    ? `Hi ${nome},\n\nYour mission briefing landed safely. I'll read it carefully and get back to you at this address within a few days with a flight plan.\n\nBelow is a copy of what you sent.\n\nRuben Rodrigues\n\n────────────────────────────────────────\n\n${clean_(data.report)}`
    : `Olá ${nome},\n\nO teu briefing de missão chegou bem. Vou lê-lo com atenção e respondo para este email nos próximos dias com o plano de voo.\n\nEm baixo fica uma cópia do que enviaste.\n\nRuben Rodrigues\n\n────────────────────────────────────────\n\n${clean_(data.report)}`;
  MailApp.sendEmail({
    to: clean_(answers.email),
    replyTo: ownerEmail_(),
    name: 'Ruben Rodrigues',
    subject: en ? 'Your briefing has landed - ' + clean_(answers.marca) : 'O teu briefing chegou - ' + clean_(answers.marca),
    body: body
  });
}

function fallbackReport_(answers) {
  return COLUMNS.filter(([, k]) => k[0] !== '_' && clean_(answers[k]))
    .map(([label, k]) => label + ': ' + clean_(answers[k])).join('\n');
}

/* ---------------------------------------------------------------------------
   Utilitários
   --------------------------------------------------------------------------- */
function ownerEmail_() {
  return CONFIG.OWNER_EMAIL || Session.getEffectiveUser().getEmail();
}

function clean_(v) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/\r\n?/g, '\n').trim().slice(0, CONFIG.MAX_LEN);
}

/* Texto para a célula: um apóstrofo inicial impede que "=…", "+351…" ou "-…"
   sejam lidos como fórmula ou número (o apóstrofo não aparece na folha). */
function text_(v) {
  const s = clean_(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function isoDate_(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean_(v));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function isEmail_(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean_(v));
}

function columnLetter_(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
