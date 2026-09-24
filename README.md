# Ruben Rodrigues - Portfolio

Programador & Especialista em IA - Esmoriz, Portugal.


## Estrutura

- `index.html` - inicio
- `sobre.html` - sobre + metodo
- `ferramentas.html` - ferramentas de uso diario
- `percurso.html` - percurso e registo de servico
- `trabalhos.html` - notas de campo (O Provador)
- `contacto.html` - contacto e servicos
- `404.html` - pagina de erro
- `cv.pdf` - curriculum atualizado (descarregavel no site)
- `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest` - identidade e icones
- `og.jpg`, `og-trabalhos.jpg` - imagens de partilha (geral e Trabalhos)
- `briefing.html` - briefing interativo para clientes (autónomo, sem dependências do site)
- `sw.js` - service worker: o site funciona offline (páginas e estilos em cache)
- `fonts/` + `fonts.css` - tipografia self-hosted (sem pedidos ao Google)
- `sitemap.xml`, `robots.txt`, `.nojekyll` - SEO e configuracao
- `assets/` - imagens reais do Provador (com variantes `-720.jpg` para ecrãs pequenos)
- `assets/ruben-portrait*.jpg` - retrato na página Sobre
- `css/style.css`, `css/ajuda.css` - estilos do site e do guia de ajuda
- `js/main.js`, `js/controls.js` - comportamento e controlos (tema/idioma)
- `js/ajuda.js` - guia de navegacao "Ajuda" (canto inferior direito): pergunta porque o visitante esta ali e de onde vem, e encaminha-o para a pagina certa. Bilingue, funciona offline e nao faz pedidos a terceiros. Publica `window.RR_AJUDA` e pode ser desligada com `?noajuda=1`.
