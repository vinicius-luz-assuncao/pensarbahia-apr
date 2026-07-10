# Guia de Mapeamento — Pensar Bahia

Este documento orienta o fluxo completo de criação, edição e publicação de dados geográficos no mapa interativo usando **uMap** como ferramenta de desenho e **GeoJSON** como formato de dados.

---

## Índice

1. [Arquitetura do Sistema](#1-arquitetura-do-sistema)
2. [O que é uMap e por que usá-lo](#2-o-que-é-umap-e-por-que-usá-lo)
3. [Fluxo de Trabalho Completo](#3-fluxo-de-trabalho-completo)
4. [Primeiro Acesso ao uMap](#4-primeiro-acesso-ao-umap)
5. [Desenhar Elementos no uMap](#5-desenhar-elementos-no-umap)
6. [Exportar GeoJSON do uMap](#6-exportar-geojson-do-umap)
7. [Importar para o Projeto](#7-importar-para-o-projeto)
8. [Editar Dados Existentes](#8-editar-dados-existentes)
9. [Adicionar Nova Camada ao Mapa](#9-adicionar-nova-camada-ao-mapa)
10. [Ícones e Marcadores Customizados](#10-ícones-e-marcadores-customizados)
11. [Referência de Estilo](#11-referência-de-estilo)
12. [Checklist de Publicação](#12-checklist-de-publicação)
13. [Solução de Problemas](#13-solução-de-problemas)

---

## 1. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                      uMap (navegador)                    │
│  Desenho visual de pontos, linhas e polígonos sobre     │
│  mapa OSM com fundo satélite disponível                 │
└──────────────────────┬──────────────────────────────────┘
                       │ Exporta GeoJSON
                       ▼
┌─────────────────────────────────────────────────────────┐
│              data/ (arquivos .geojson)                   │
│  ferrovias.geojson │ rodovias.geojson │ setores.geojson │
│  polos.geojson     │ bahia-outline.geojson              │
└──────────────────────┬──────────────────────────────────┘
                       │ fetch() carrega via HTTP
                       ▼
┌─────────────────────────────────────────────────────────┐
│           js/map-controller.js (Leaflet)                 │
│  L.geoJSON() → estiliza → adiciona ao mapa             │
│  Toggle de camadas │ Mapa/Satélite │ Info-cards        │
└─────────────────────────────────────────────────────────┘
```

**Fluxo de dados**: uMap (editor visual) → GeoJSON (formato padrão) → Leaflet (visualização interativa nos slides).

---

## 2. O que é uMap e por que usá-lo

[uMap](https://umap.openstreetmap.fr/) é um editor de mapas online gratuito que:

| Recurso | uMap | Código manual |
|---|---|---|
| Base cartográfica | OSM + Satélite | Precisa configurar |
| Desenhar polígonos | Visual (clique no mapa) | Escrever coordenadas à mão |
| Importar linhas/rotas | Sim (GPX, GeoJSON) | Manual |
| Exportar GeoJSON | Nativo | Não |
| Camadas múltiplas | Sim (por mapa) | Sim |
| Popups customizados | Sim (na interface) | No código |
| Funciona offline | Não | Sim |

**Vantagem principal**: você vê o desenho sobre o mapa real enquanto cria, sem precisar adivinhar coordenadas.

---

## 3. Fluxo de Trabalho Completo

```
┌──────────────────────────────────────────────────┐
│ 1. Acessar umap.openstreetmap.fr                 │
│    Criar conta ou usar anonimamente              │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│ 2. Criar um novo mapa                            │
│    "Create a map" → Nome: "Pensar Bahia"        │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│ 3. Alternar fundo para Satélite (se desejado)    │
│    Painel direito → Background → ESRI Satellite  │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│ 4. Desenhar elementos no mapa:                   │
│    • Polígono → zonas, setores, áreas            │
│    • Linha   → ferrovias, rodovias               │
│    • Marcador → polos, cidades, pontos           │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│ 5. Exportar GeoJSON por camada:                  │
│    • Botão "Export" → formato GeoJSON            │
│    • Salvar como: ferrovias.geojson              │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│ 6. Substituir arquivo em data/                    │
│    data/ferrovias.geojson (sobrescrever)         │
└──────────────────┬───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│ 7. Recarregar index.html no navegador             │
│    Mapa usa automaticamente o novo GeoJSON        │
└──────────────────────────────────────────────────┘
```

---

## 4. Primeiro Acesso ao uMap

### 4.1. Abrir

https://umap.openstreetmap.fr/

### 4.2. Criar mapa

Clique em **"Create a map"**. Você pode usar sem login (mapa anônimo) ou criar uma conta gratuita para salvar.

### 4.3. Navegação básica

| Ação | Como fazer |
|---|---|
| Mover mapa | Arrastar com o mouse |
| Zoom | Scroll ou Ctrl++ / Ctrl+- |
| Centralizar na Bahia | Buscar "Bahia" no campo de busca |
| Alternar fundo | Painel direito (ícone de camadas) → **Background layer** |

### 4.4. Escolher fundo do mapa

Para alternar entre **OSM padrão** e **Satélite**, no painel direito:

- **Map tiles**: escolha `OpenStreetMap` (padrão) ou `ESRI Satellite` (gratuito, sem API key)
- Isso afeta apenas a visualização no uMap; o projeto final alterna via botão "Mapa"/"Satélite"

---

## 5. Desenhar Elementos no uMap

### 5.1. Criar uma camada

No painel **"Manage layers"** (ícone de folhas), cie uma camada para cada tipo de dado:

| Camada | Tipo de geometria | Exemplo |
|---|---|---|
| Ferrovias | Linha (Polyline) | Corredores ferroviários |
| Rodovias | Linha (Polyline) | BR-101, BR-116, BA-001 |
| Setores | Polígono | Zonas industrial, agrícola |
| Polos | Ponto (Marker) | Municípios logísticos |
| Contorno BA | Polígono | Limite do estado |

> **Dica**: nomeie cada camada com o mesmo nome do arquivo GeoJSON para facilitar (ex: camada "ferrovias" → `data/ferrovias.geojson`)

### 5.2. Desenhar um polígono (setores, zonas, áreas)

1. Selecione a camada desejada no painel
2. Clique no botão **"Draw a polygon"** (ícone de polígono na barra lateral)
3. Clique no mapa para adicionar vértices
4. Duplo-clique para finalizar
5. No popup, dê um **nome** e preencha propriedades (ex: `"name": "Zona Industrial Oeste"`, `"color": "#7c44a6"`)

Útil para: zones industriais, áreas de expansão, reservas, regiões planejadas.

### 5.3. Desenhar uma linha (ferrovias, rodovias)

1. Selecione a camada
2. Clique em **"Draw a polyline"**
3. Clique nos pontos do traçado
4. Duplo-clique para finalizar
5. Preencha propriedades: `name`, `color`, `weight`

Útil para: traçados ferroviários, rodovias, dutos, linhas de transmissão.

### 5.4. Adicionar um marcador (polos, cidades)

1. Selecione a camada
2. Clique em **"Draw a marker"**
3. Clique no local desejado
4. Preencha: `name`, `type` (ex: "Porto", "Industrial", "Agronegócio")

Útil para: municípios, portos, aeroportos, pontos de interesse.

### 5.5. Importar dados existentes

Se você já tem arquivos GeoJSON ou GPX, pode importá-los:

1. No painel de camadas, clique em **"Import"**
2. Selecione o arquivo
3. O uMap importa os shapes com suas propriedades

---

## 6. Exportar GeoJSON do uMap

### 6.1. Exportar camada específica

1. No painel **"Manage layers"**, clique no ícone de **engrenagem** ao lado da camada desejada
2. Escolha **"Export"**
3. Formato: **GeoJSON**
4. O navegador fará o download do arquivo

### 6.2. Nomear o arquivo

Renomeie seguindo a convenção do projeto:

| Camada uMap | Salvar como |
|---|---|
| Contorno BA | `bahia-outline.geojson` |
| Ferrovias | `ferrovias.geojson` |
| Rodovias | `rodovias.geojson` |
| Setores | `setores.geojson` |
| Polos | `polos.geojson` |

### 6.3. Estrutura do arquivo exportado

O uMap exporta no formato FeatureCollection padrão:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Corredor Faroeste",
        "color": "#cd4239",
        "weight": 3
      },
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-44.99, -12.15],
          [-45.80, -12.09]
        ]
      }
    }
  ]
}
```

**Atenção**: GeoJSON usa ordem `[longitude, latitude]` — o uMap exporta corretamente nesse padrão.

---

## 7. Importar para o Projeto

### 7.1. Substituir o arquivo

Copie o `.geojson` exportado para a pasta `data/`, sobrescrevendo o arquivo existente:

```
pensarbahia-apr/data/
├── bahia-outline.geojson
├── ferrovias.geojson    ← substitua por este
├── rodovias.geojson
├── setores.geojson
└── polos.geojson
```

### 7.2. Recarregar o projeto

Basta dar **F5** no navegador com `index.html` aberto. O `map-controller.js` carrega automaticamente o novo GeoJSON via `fetch()`.

### 7.3. Fallback automático

Se o arquivo GeoJSON não existir ou falhar ao carregar, o sistema usa automaticamente os dados inline do `js/map-data.js`. Isso garante que o mapa sempre funciona, mesmo offline.

---

## 8. Editar Dados Existentes

Para modificar shapes existentes:

### Opção A — uMap (recomendado)

1. **Importe** o GeoJSON atual para o uMap:
   - No painel de camadas → **Import** → selecione `data/ferrovias.geojson`
2. Edite os shapes visualmente no mapa
3. **Exporte** novamente e sobrescreva o arquivo

### Opção B — Editor de texto / geojson.io

Use https://geojson.io para abrir, editar coordenadas visualmente e salvar.

### Opção C — Código manual (js/map-data.js)

Para ajustes rápidos, edite os arrays em `js/map-data.js`. O sistema usa estes dados como **fallback** quando o GeoJSON não está disponível.

---

## 9. Adicionar Nova Camada ao Mapa

Exemplo: adicionar uma camada de **"Aeroportos"**.

### 9.1. Desenhe no uMap

1. Crie uma nova camada chamada "aeroportos"
2. Desenhe marcadores nos aeroportos da Bahia
3. Preencha propriedades: `name`, `type`
4. Exporte como `data/aeroportos.geojson`

### 9.2. Atualize `js/map-controller.js`

Adicione no final de `initMap()`:

```js
mapLayers.aeroportos = L.layerGroup();
loadAeroportosFromGeoJSON();
```

E crie a função de carga:

```js
function loadAeroportosFromGeoJSON() {
  const icon = L.divIcon({
    className: '',
    html: '<div style="width:12px;height:12px;background:#1078a3;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
  fetch('data/aeroportos.geojson')
    .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function(gj) {
      L.geoJSON(gj, {
        pointToLayer: function(f, latlng) { return L.marker(latlng, { icon: icon }); },
        onEachFeature: function(f, l) { l.bindPopup(f.properties.name); }
      }).addTo(mapLayers.aeroportos);
      if (activeLayers.aeroportos) mapInstance.addLayer(mapLayers.aeroportos);
    });
}
```

Registre o estado inicial em `activeLayers`:

```js
let activeLayers = { ferrovias: true, rodovias: false, setores: false, polos: true, aeroportos: false };
```

### 9.3. Botão e info-card em `index.html`

No `.layer-controls`, adicione:

```html
<button class="layer-btn" data-layer="aeroportos">
  <span class="dot" style="background:#1078a3"></span>
  Aeroportos
</button>
```

Em `.info-panels`:

```html
<div class="info-card" data-info="aeroportos">
  <div class="info-title">
    ✈ Aeroportos
    <span class="badge off">Inativo</span>
  </div>
  <div class="info-desc">Principais aeroportos da Bahia.</div>
</div>
```

---

## 10. Ícones e Marcadores Customizados

O uMap exporta marcadores com ícones padrão. Para customizar no Leaflet, use `pointToLayer` no `L.geoJSON`:

### Com SVG inline

```js
pointToLayer: function(f, latlng) {
  return L.marker(latlng, {
    icon: L.divIcon({
      className: '',
      html: '<svg width="24" height="24"><circle cx="12" cy="12" r="10" fill="#f7a501"/></svg>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  });
}
```

### Com arquivo SVG externo

Salve o SVG em `assets/img/`:

```js
pointToLayer: function(f, latlng) {
  return L.marker(latlng, {
    icon: L.icon({
      iconUrl: 'assets/img/icone-trem.svg',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
  });
}
```

---

## 11. Referência de Estilo

### Cores do Design System

| Variável | Cor | Uso |
|---|---|---|
| `--accent-red` | `#cd4239` | Ferrovias |
| `--accent-blue` | `#2c84e0` | Rodovias |
| `--accent-purple` | `#7c44a6` | Setores |
| `--accent-green` | `#2c8c66` | Polos |
| `--link-teal` | `#1078a3` | (livre) |
| `--primary` | `#f7a501` | Destaques |

### Convenções de Estilo

```js
// Linha cheia (ferrovia ativa)
{ color: '#cd4239', weight: 3, opacity: 0.85 }

// Linha tracejada (planejada / proposta)
{ color: '#cd4239', weight: 2, opacity: 0.6, dashArray: '8 6' }

// Polígono (zona)
{ color: '#7c44a6', weight: 1.5, fillColor: '#7c44a6', fillOpacity: 0.12 }

// Marcador circular
L.divIcon({
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#2c8c66;border:2px solid #fff"></div>',
  iconSize: [14, 14], iconAnchor: [7, 7]
})
```

### Propriedades no GeoJSON

Inclua estas propriedades nos features exportados do uMap:

| Propriedade | Onde usar | Exemplo |
|---|---|---|
| `name` | Todas as geometrias (popup) | `"Corredor Faroeste"` |
| `color` | Linhas e polígonos | `"#cd4239"` |
| `weight` | Linhas | `3` |
| `fillOpacity` | Polígonos | `0.12` |
| `type` | Marcadores | `"Porto"`, `"Industrial"` |

---

## 12. Checklist de Publicação

- [ ] Elementos desenhados no uMap sobre fundo OSM ou Satélite
- [ ] GeoJSON exportado e salvo em `data/` com nome correto
- [ ] `index.html` funcionando com F5 (fetch carrega os dados)
- [ ] Toggle liga/desliga cada camada
- [ ] Popups exibem nome e informações corretas
- [ ] Botão Satélite alterna para ESRI World Imagery
- [ ] Fallback funciona (testar removendo o .geojson temporariamente)
- [ ] Lorem ipsum do Slide 2 substituído (se aplicável)

---

## 13. Solução de Problemas

### "O mapa não carrega"

1. Abra o console do navegador (F12 → Console)
2. Verifique se há erro 404 nos arquivos `.geojson`
3. Confirme que os arquivos estão em `data/` com os nomes exatos
4. Verifique se o GeoJSON é válido (use https://geojsonlint.com)

### "Os shapes não aparecem"

1. Verifique se a camada está ativa (botão destacado)
2. Confirme a ordem das coordenadas: GeoJSON usa `[lng, lat]`
3. Verifique se a FeatureCollection tem o campo `"features"`

### "uMap não exporta como esperado"

1. Prefira exportar **camada por camada** (não o mapa inteiro)
2. Verifique se as propriedades (`name`, `color`) foram preenchidas no popup do uMap
3. No uMap, as propriedades personalizadas são configuradas na aba "Advanced" do popup

### "Fallback vs GeoJSON"

O sistema sempre tenta carregar o GeoJSON primeiro. Se falhar (arquivo ausente, erro de parsing), usa os dados inline de `js/map-data.js`. Para forçar o uso do fallback, renomeie ou remova o `.geojson` de `data/`.

---

> **geojson.io** — https://geojson.io — editor visual complementar para validar e ajustar arquivos GeoJSON sem instalar nada.
