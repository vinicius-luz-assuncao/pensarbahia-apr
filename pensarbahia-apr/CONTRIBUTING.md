# Fluxo de Contribuição

## 1. Configurar o repositório remoto original

```bash
# Após clonar seu fork, adicione o repositório original como "upstream"
git remote add upstream https://github.com/vinicius-luz-assuncao/pensarbahia-apr.git
```

Verifique se os remotos estão corretos:

```bash
git remote -v
# origin    → seu fork (seu-usuario/pensarbahia-apr)
# upstream  → original (vinicius-luz-assuncao/pensarbahia-apr)
```

## 2. Sempre antes de começar a trabalhar, atualize

```bash
# Baixa as novidades do original sem mesclar ainda
git fetch upstream

# Vai para sua branch principal
git checkout master

# Mescla as novidades do original no seu master local
git merge upstream/master

# Sobe a atualização para seu fork no GitHub
git push origin master
```

## 3. Criar uma branch para sua contribuição

```bash
git checkout -b meu-feature
```

Use um nome descritivo: `fix/nome-do-bug`, `feat/nova-funcionalidade`, `docs/melhoria-readme`.

## 4. Fazer as alterações e commitar

```bash
git add arquivos-alterados
git commit -m "tipo: descrição clara do que foi feito"
```

Tipos comuns: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`.

## 5. Enviar a branch para seu fork

```bash
git push origin meu-feature
```

## 6. Abrir Pull Request

Vá até o repositório original no GitHub e abra um Pull Request da sua branch (`seu-usuario:meu-feature` → `vinicius-luz-assuncao/pensarbahia-apr:master`).

---

## Estrutura do Projeto (visão geral rápida)

```
/
├── index.html                 ← Página única com mapa fullscreen
├── css/style.css              ← Design system + sidebar + image viewer
├── js/
│   ├── layers-config.js       ← Config: grupos, camadas, IMAGE_MAP
│   ├── map-controller.js      ← Motor: sidebar, submenus, loaders, viewer
│   └── map-data.js            ← Dados auxiliares (fallback)
├── data/
│   ├── img/                   ← Imagens referenciadas pelo IMAGE_MAP
│   ├── *.geojson              ← Arquivos GeoJSON das camadas
│   └── *.json                 ← Arquivos ESRI JSON (Alternativa I, II, Entorno)
└── assets/img/                ← Imagens estáticas (brand-mark)
```

### Nomenclatura das camadas

| Grupo | Layer ID | O que contém |
|-------|----------|-------------|
| título a confirmar | `bts_cidades` | Cidades (pontos) — 27 features |
| título a confirmar | `bts_rotas` | Rotas (linhas) — 65 features |
| título a confirmar | `bts_areas` | Áreas (polígonos) — 5 features |
| Planejamento | `alt_i` | Alternativa I (ESRI polygon) |
| Planejamento | `alt_ii` | Alternativa II (ESRI polygon) |
| Planejamento | `entorno_baia` | Entorno Baía (ESRI polygon) |
| Infraestrutura | `ferrovias` | Ferrovias (GeoJSON line) |
| Infraestrutura | `rodovias` | Rodovias (GeoJSON line) |
| Infraestrutura | `setores` | Setores (GeoJSON polygon) |
| Infraestrutura | `polos` | Polos Logísticos (GeoJSON point) |

Sub-items (features individuais): `{layerId}_{indice}`, ex: `bts_rotas_12`.

Imagens: mapeadas em `IMAGE_MAP` no `layers-config.js`, chave = `itemId`, valor = nome do arquivo em `data/img/`.
