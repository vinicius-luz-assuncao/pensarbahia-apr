# Pensar Bahia — Apresentação Interativa

Apresentação dinâmica do **Sistema de Estrutura Logística** da Bahia, desenvolvida para o projeto Pensar Bahia da Superintendência de Estudos Econômicos e Sociais da Bahia (SEI).

## Stack

- **Apresentação**: HTML/CSS/JS puro com sistema de slides customizado
- **Mapa base**: Leaflet.js + OpenStreetMap (gratuito, sem API key)
- **Overlays**: Vetores Leaflet (polylines, polygons, markers) representando ferrovias, rodovias, setores de construção e polos logísticos
- **Tipografia**: IBM Plex Sans (Google Fonts)
- **Design system**: Adaptado do PostHog (cream canvas `#eeefe9`, olive ink `#23251d`, yellow primary `#f7a501`)

## Estrutura

```
index.html   — arquivo único com HTML, CSS e JavaScript
```

> **Nota**: O projeto está em arquivo único para facilitar o desenvolvimento inicial. Para versionamento futuro, recomenda-se separar em `css/`, `js/` e `assets/`.

## Slides

| Slide | Conteúdo |
|---|---|
| 1 — Capa | Título "Pensar Bahia", marca visual, selo "Plano Estratégico Ferroviário" |
| 2 — Apresentação | Texto lorem ipsum com destaques numéricos (18 municípios, 4 corredores, 6 portos) |
| 3 — Mapa Interativo | Leaflet com 4 camadas toggle: Ferrovias, Rodovias, Setores de Construção, Polos Logísticos + painéis informativos |

## Como usar

1. Abra `index.html` no navegador (ou sirva via HTTP)
2. Navegue entre slides com as setas do teclado (← →) ou botões na barra inferior
3. No slide 3, clique nos botões de camada para ativar/desativar overlays no mapa
4. Passe o mouse sobre os elementos do mapa para ver detalhes (popups)

## Dados Geográficos

Os shapes atuais são **aproximações fictícias** do estado da Bahia para fins de demonstração. Para produção, substitua os vetores em `index.html` por dados GeoJSON reais:

- Contorno do estado da Bahia
- Corredores ferroviários (Plano Estratégico Ferroviário)
- Rodovias federais e estaduais
- Zonas prioritárias de construção
- 18 municípios com vocação logística

## Licença

Projeto vinculado à SEI — Superintendência de Estudos Econômicos e Sociais da Bahia.
