# Pensar Bahia — Apresentação Interativa

Apresentação dinâmica do **Sistema de Estrutura Logística** da Bahia, desenvolvida para o projeto Pensar Bahia da Superintendência de Estudos Econômicos e Sociais da Bahia (SEI).

## Stack

- **Apresentação**: HTML/CSS/JS puro com sistema de slides customizado
- **Editor de dados**: uMap (https://umap.openstreetmap.fr) — desenho visual
- **Formato de dados**: GeoJSON (padrão ISO, editável em QGIS/geojson.io)
- **Mapa base**: Leaflet.js + OpenStreetMap / ESRI Satélite (toggle)
- **Overlays**: GeoJSON → Leaflet (ferrovias, rodovias, setores, polos logísticos)
- **Tipografia**: IBM Plex Sans (Google Fonts)
- **Design system**: Adaptado do PostHog (cream canvas `#eeefe9`, olive ink `#23251d`, yellow primary `#f7a501`)

## Estrutura

```
pensarbahia-apr/
├── index.html               ← slides em HTML
├── css/
│   └── style.css            ← design system e estilos
├── js/
│   ├── map-data.js          ← dados inline (fallback quando GeoJSON ausente)
│   ├── slides.js            ← navegação entre slides
│   └── map-controller.js    ← Leaflet + carregamento GeoJSON + toggle
├── data/                    ← GeoJSON exportado do uMap
│   ├── bahia-outline.geojson
│   ├── ferrovias.geojson
│   ├── rodovias.geojson
│   ├── setores.geojson
│   └── polos.geojson
├── assets/
│   └── img/
│       └── brand-mark.svg   ← logotipo da capa
├── docs/
│   └── MAPEAMENTO.md        ← guia completo uMap + GeoJSON
└── README.md
```

## Slides

| Slide | Conteúdo |
|---|---|
| 1 — Capa | Título "Pensar Bahia", marca visual, selo "Plano Estratégico Ferroviário" |
| 2 — Apresentação | Texto lorem ipsum com destaques numéricos (18 municípios, 4 corredores, 6 portos) |
| 3 — Mapa Interativo | Leaflet com 4 camadas toggle + toggle Mapa/Satélite + painéis informativos |

## Como usar

1. Abra `index.html` no navegador (ou sirva via HTTP)
2. Navegue entre slides com as setas do teclado (← →) ou botões na barra inferior
3. No slide 3, clique nos botões de camada para ativar/desativar overlays no mapa
4. Clique em **Satélite** para alternar para imagens de satélite (ESRI, gratuito)
5. Passe o mouse sobre os elementos do mapa para ver detalhes (popups)

## Como editar os dados do mapa

1. Acesse https://umap.openstreetmap.fr
2. Importe o GeoJSON existente de `data/` ou desenhe novos shapes
3. Exporte como GeoJSON e sobrescreva o arquivo em `data/`
4. Recarregue `index.html` — as alterações aparecem automaticamente

Consulte [`docs/MAPEAMENTO.md`](docs/MAPEAMENTO.md) para o guia completo.

## Licença

Projeto vinculado à SEI — Superintendência de Estudos Econômicos e Sociais da Bahia.
