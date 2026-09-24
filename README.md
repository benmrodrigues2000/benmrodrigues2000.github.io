# Ruben Rodrigues - Portfolio

Programador & Especialista em IA - Esmoriz, Portugal.


## Sistema visual - "Gestalt em órbita" (2026)

O site inteiro (e cada trabalho) segue as leis de perceção da Gestalt, dentro do tema de espaço:

- **Proximidade** - tokens `--gap-in / --gap-mid / --gap-out`: pouco espaço dentro de um grupo, muito entre grupos.
- **Semelhança** - uma cor, um significado: violeta = estado / estás aqui, ciano = ligação, coral = ação.
- **Região comum** - `.region`: o que partilha moldura lê-se como um conjunto.
- **Conexão** - navegação-constelação, linha entre rotas, fio entre ferramenta e painel.
- **Continuidade** - um eixo vertical atravessa todas as secções e liga os anéis numerados.
- **Fecho** - anéis tracejados abertos, logótipo e órbitas incompletas.
- **Figura / fundo** - céu estrelado como fundo; uma ação coral por ecrã como figura.
- **Destino comum** - camadas de estrelas em paralaxe no `canvas#sky`.

O briefing (índice de 8 estrelas) e o postal (frente com duas figuras e órbita aberta) seguem as mesmas regras.

### Manutenção dos PDFs

- `cv.pdf` é construído por `tools/build-cv-pdf.py` a partir do conteúdo de `cv.html`; sempre que o texto do CV mudar, correr
  `python3 tools/build-cv-pdf.py` (precisa de `reportlab fonttools brotli`) e confirmar que continua com uma página.
- Os quatro PDFs do postal (`postal/*.pdf`) saem de `postal/index.html`: correr `node tools/build-postal-pdfs.mjs`
  (precisa de `npm i -D puppeteer-core @sparticuz/chromium`) - escreve A6 para gráfica e A4 para casa, em PT e EN,
  duas páginas por ficheiro, pelo mesmo caminho de impressão do Chrome. Alternativa manual: abrir a página, escolher
  idioma e formato, "Imprimir / guardar PDF". Depois de alterar qualquer texto do postal, reconstruir os quatro -
  a página e os PDFs têm de dizer o mesmo.

## Desempenho

O céu (`canvas#sky`) pinta no primeiro frame e só volta a pintar no scroll, no resize e na mudança de tema. Um loop contínuo por baixo de `backdrop-filter` obrigava o browser a reborrar o cabeçalho em cada frame. Em ecrã pequeno ou ponteiro grosso o vidro do cabeçalho fica opaco, e o rasto do herói só corre enquanto há traço no ecrã.

## Estrutura

- `index.html` - inicio
- `sobre.html` - sobre + metodo
- `ferramentas.html` - ferramentas de uso diario
- `percurso.html` - percurso e registo de servico
- `trabalhos.html` - trabalhos (O Provador, ferramentas de entrada, o agente Ajuda, o criterio e o sistema visual Gestalt)
- `contacto.html` - contacto e servicos
- `cv.html` - CV em pagina (o mesmo conteudo do PDF, no sistema visual do site: identidade, registo de servico, competencias, projeto em destaque e metodo). Imprimivel em A4 a partir do proprio browser
- `404.html` - pagina de erro
- `cv.pdf` - curriculum atualizado (descarregavel no site); gerado por `tools/build-cv-pdf.py`, uma pagina A4 no mesmo sistema visual (fundo estelar, violeta = agora, ciano = ligacao, coral = acao, anel tracejado = fecho), com as fontes do site embutidas
- `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest` - identidade e icones
- `og.jpg`, `og-trabalhos.jpg` - imagens de partilha (geral e Trabalhos)
- `briefing.html` - briefing interativo para clientes (autónomo, sem dependências do site)
- `sw.js` - service worker: páginas em stale-while-revalidate (a visita seguinte pinta da cache e a rede refresca) e shell em cache para offline
- `fonts/` + `fonts.css` - tipografia self-hosted (sem pedidos ao Google)
- `sitemap.xml`, `robots.txt`, `.nojekyll` - SEO e configuracao
- `assets/` - imagens reais do Provador, com variantes 720 / 960 / 1280 para o browser não descarregar o original de 2160px
- `assets/ruben-portrait*.jpg` - retrato na página Sobre
- `css/style.css`, `css/cv.css`, `css/ajuda.css` - estilos do site, do CV (layout da pagina + folha de impressao A4) e do guia de ajuda
- `js/main.js`, `js/controls.js` - comportamento e controlos (tema/idioma)
- `tools/build-cv-pdf.py` - constroi o `cv.pdf` no sistema Gestalt do site: usa as fontes de `fonts/` (woff2 -> ttf em memoria) e falha se o conteudo passar de uma pagina (`pip install reportlab fonttools brotli`)
- `js/ajuda.js` - guia de navegacao "Ajuda" (canto inferior direito): pergunta porque o visitante esta ali e de onde vem, e encaminha-o para a pagina certa. Bilingue, funciona offline e nao faz pedidos a terceiros. Publica `window.RR_AJUDA` e pode ser desligada com `?noajuda=1`. Apresentado como trabalho na pagina Trabalhos (`#ajuda`).
