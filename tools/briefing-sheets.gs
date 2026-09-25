/* =============================================================================
   BRIEFING DE MISSÃO  →  GOOGLE SHEETS  +  AVISO POR EMAIL
   -----------------------------------------------------------------------------
   Recebe cada envio do briefing.html, escreve uma linha no separador
   "Briefings concluídos" (com a coluna Estado para ires atualizando),
   manda-te um email com o relatório completo e um link direto para a linha,
   e responde automaticamente ao cliente com uma mensagem, a cópia do que
   enviou e o teu cartão de negócios (Postal da Terra) no fundo do email.

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

   RESPOSTA AO CLIENTE
   - Liga/desliga em CONFIG.SEND_CLIENT_COPY. Só vai no primeiro envio de cada
     rascunho (CONFIG.CLIENT_COPY_ON_UPDATE = true para responder também a reenvios).
   - A mensagem está em notifyClient_ (PT/EN, conforme o idioma do briefing);
     o cartão está em CARD (textos, foto, links para o postal e o PDF A6).
   - Para ver como fica sem mexer na folha: função "verRespostaCliente" › ▶
     Executar — chegam-te as versões PT e EN.

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
  SEND_CLIENT_COPY: true,                      // resposta automática ao cliente (mensagem + cópia + cartão)
  CLIENT_COPY_ON_UPDATE: false,                // true = volta a responder quando o cliente reenvia alterações
  SENDER_NAME: 'Briefing de Missão',
  MAX_LEN: 6000                                // corte de segurança por campo
};

/* Cartão de negócios no fundo da resposta ao cliente (baseado no Postal da Terra, /postal/). */
const CARD = {
  NAME: 'Ruben Rodrigues',
  EMAIL: 'benmrodrigues2000@gmail.com',
  SITE: 'https://benmrodrigues2000.github.io',
  GITHUB: 'https://github.com/benmrodrigues2000',
  PHOTO: 'https://benmrodrigues2000.github.io/postal/retrato.jpg',
  POSTAL: 'https://benmrodrigues2000.github.io/postal/',
  PDF: 'https://benmrodrigues2000.github.io/postal/ruben-rodrigues-postal-a6-{lang}.pdf',
  T: {
    pt: { kicker: 'Postal da Terra · Nº 01', place: 'Esmoriz, PT', hi: 'Olá, sou o',
          role: 'Programador & Especialista em IA',
          pitch: 'Sites, landing pages, integrações de IA e reparação de código para pequenas empresas.',
          routes: ['Websites', 'Integrações de IA', 'Reparação de código'],
          cta: 'Fala comigo!', view: 'Ver o postal', pdf: 'Postal em PDF (A6)',
          foot: 'Correio intergaláctico · Feito em Esmoriz, Portugal' },
    en: { kicker: 'Postcard from Earth · Nº 01', place: 'Esmoriz, PT', hi: 'Hi, I’m',
          role: 'Developer & AI Specialist',
          pitch: 'Websites, landing pages, AI integrations and code repair for small businesses.',
          routes: ['Websites', 'AI integrations', 'Code repair'],
          cta: 'Let’s talk!', view: 'View the postcard', pdf: 'Postcard PDF (A6)',
          foot: 'Intergalactic mail · Made in Esmoriz, Portugal' }
  }
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

/* Pré-visualização: manda-te a resposta automática (PT e EN) sem escrever na folha. */
function verRespostaCliente() {
  ['pt', 'en'].forEach(lang => notifyClient_({
    lang: lang,
    report: (lang === 'en' ? 'MISSION BRIEFING REPORT\nBrand: Central Bakery (test)' : 'RELATÓRIO DE BRIEFING DE MISSÃO\nMarca: Padaria Central (teste)') +
            '\n\n- 01 · ' + (lang === 'en' ? 'IDENTITY' : 'IDENTIDADE') + ' -\n' + (lang === 'en' ? 'Name' : 'Nome') + ': Teste'
  }, { nome: 'Teste', email: ownerEmail_(), marca: lang === 'en' ? 'Central Bakery (test)' : 'Padaria Central (teste)' }));
  Logger.log('Enviado para ' + ownerEmail_());
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
    if (CONFIG.SEND_CLIENT_COPY && (!existing || CONFIG.CLIENT_COPY_ON_UPDATE)) {
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
  const lang = String(data.lang || 'pt') === 'en' ? 'en' : 'pt';
  const en = lang === 'en';
  const nome = clean_(answers.nome);
  const marca = clean_(answers.marca);
  const report = clean_(data.report) || fallbackReport_(answers);

  const intro = en
    ? [`Hi ${nome},`, 'Your mission briefing landed safely. I’ll read it carefully and get back to you at this address within a few days with a flight plan.', 'Below is a copy of what you sent.']
    : [`Olá ${nome},`, 'O teu briefing de missão chegou bem. Vou lê-lo com atenção e respondo para este email nos próximos dias com o plano de voo.', 'Em baixo fica uma cópia do que enviaste.'];

  const body = intro.join('\n\n') + '\n\n' + CARD.NAME +
    '\n\n────────────────────────────────────────\n\n' + report +
    '\n\n────────────────────────────────────────\n\n' + cardText_(lang);

  const p = 'margin:0 0 14px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#1d2233';
  const htmlBody =
    '<div style="max-width:560px">' +
    intro.map(t => `<p style="${p}">${esc_(t)}</p>`).join('') +
    `<p style="${p}">${esc_(CARD.NAME)}</p>` +
    '<div style="margin:22px 0;padding:14px 16px;background:#f4f5fa;border-left:3px solid #A78BFA;border-radius:6px;' +
      'font:13px/1.55 Consolas,Menlo,monospace;color:#333a52;white-space:pre-wrap">' + esc_(report) + '</div>' +
    cardHtml_(lang) +
    '</div>';

  MailApp.sendEmail({
    to: clean_(answers.email),
    replyTo: ownerEmail_(),
    name: CARD.NAME,
    subject: (en ? 'Your briefing has landed - ' : 'O teu briefing chegou - ') + marca,
    body: body,
    htmlBody: htmlBody
  });
}

/* Cartão de negócios em HTML de email: tabelas + estilos inline (Gmail, Outlook, Apple Mail). */
function cardHtml_(lang) {
  const t = CARD.T[lang] || CARD.T.pt;
  const f = 'font-family:Arial,Helvetica,sans-serif;';
  const host = u => u.replace(/^https?:\/\//, '');
  const postal = CARD.POSTAL + '?lang=' + lang;
  const pdf = CARD.PDF.replace('{lang}', lang);
  const row = (label, href, text) =>
    `<tr><td style="${f}padding:3px 12px 3px 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9AA3BF">${label}</td>` +
    `<td style="${f}padding:3px 0;font-size:14px"><a href="${href}" style="color:#E9EDF8;text-decoration:none">${esc_(text)}</a></td></tr>`;
  const btn = (href, text, solid) =>
    `<a href="${href}" style="${f}display:inline-block;margin:0 8px 8px 0;padding:9px 14px;border-radius:8px;font-size:13px;font-weight:bold;text-decoration:none;` +
    (solid ? 'background:#A78BFA;color:#070A18;border:1px solid #A78BFA' : 'color:#E9EDF8;border:1px solid #3a4270') + `">${esc_(text)}</a>`;

  return '' +
  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#05060F" ' +
    'style="max-width:520px;margin-top:28px;background:#05060F;border:1px solid #232A4D;border-radius:14px;border-collapse:separate">' +
  // cabeçalho
  '<tr><td style="padding:12px 20px;border-bottom:1px solid #232A4D">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>' +
    `<td style="${f}font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#A78BFA">${esc_(t.kicker)}</td>` +
    `<td align="right" style="${f}font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9AA3BF">${esc_(t.place)}</td>` +
    '</tr></table></td></tr>' +
  // identidade
  '<tr><td style="padding:20px 20px 8px">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    `<td width="84" valign="top"><img src="${CARD.PHOTO}" width="84" height="84" alt="${esc_(CARD.NAME)}" ` +
      'style="display:block;width:84px;height:84px;border-radius:42px;border:2px solid #A78BFA"></td>' +
    '<td valign="top" style="padding-left:16px">' +
      `<div style="${f}font-size:12px;color:#9AA3BF">${esc_(t.hi)}</div>` +
      `<div style="font-family:'Bebas Neue',Impact,'Arial Narrow',Arial,sans-serif;font-size:30px;line-height:1.05;letter-spacing:.02em;text-transform:uppercase;color:#E9EDF8">${esc_(CARD.NAME)}</div>` +
      `<div style="${f}font-size:13px;font-weight:bold;color:#7DD3FC;padding-top:4px">${esc_(t.role)}</div>` +
      `<div style="${f}font-size:13px;line-height:1.5;color:#B3BAD2;padding-top:6px">${esc_(t.pitch)}</div>` +
    '</td></tr></table></td></tr>' +
  // três rotas
  '<tr><td style="padding:6px 20px 4px">' +
    t.routes.map(r => `<span style="${f}display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border:1px solid #3a4270;border-radius:999px;font-size:12px;color:#E9EDF8">${esc_(r)}</span>`).join('') +
  '</td></tr>' +
  // contactos
  '<tr><td style="padding:10px 20px 6px"><table role="presentation" cellpadding="0" cellspacing="0" border="0">' +
    row('Email', 'mailto:' + CARD.EMAIL, CARD.EMAIL) +
    row('Site', CARD.SITE, host(CARD.SITE)) +
    row('GitHub', CARD.GITHUB, host(CARD.GITHUB)) +
  '</table></td></tr>' +
  // chamada + postal
  '<tr><td style="padding:14px 20px 12px">' +
    `<div style="${f}font-size:16px;font-weight:bold;color:#FF9E64;padding-bottom:10px">${esc_(t.cta)}</div>` +
    btn(postal, t.view, true) + btn(pdf, t.pdf, false) +
  '</td></tr>' +
  // rodapé
  `<tr><td style="${f}padding:10px 20px;border-top:1px solid #232A4D;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6f7899">` +
    `AYYLIENADO · ${esc_(t.foot)}</td></tr>` +
  '</table>';
}

/* Versão em texto simples do cartão (clientes de email sem HTML). */
function cardText_(lang) {
  const t = CARD.T[lang] || CARD.T.pt;
  return [
    t.kicker.toUpperCase() + ' · ' + t.place,
    CARD.NAME.toUpperCase() + ' - ' + t.role,
    t.pitch,
    t.routes.join(' · '),
    '',
    'Email:  ' + CARD.EMAIL,
    'Site:   ' + CARD.SITE,
    'GitHub: ' + CARD.GITHUB,
    '',
    t.cta + ' ' + t.view + ': ' + CARD.POSTAL + '?lang=' + lang,
    t.pdf + ': ' + CARD.PDF.replace('{lang}', lang)
  ].join('\n');
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

function esc_(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
