const IMAGE_MAP = {
  'galeria_0': 'ZPE DO COMPLEXO PORTU\u00c1RIO 1.png',
  'galeria_1': 'ARMAZENAGEM ALFANDEGADA 2.png',
  'galeria_2': 'BASE INTERMODAL 3.png',
  'galeria_3': 'DESEMBARA\u00c7O E ENTREPOSTO ADUANEIRO 4.png',
  'galeria_4': 'CONSOLIDA\u00c7\u00c3O E DESCONSOLIDA\u00c7\u00c3O DE CONTEINERS 5.png',
  'galeria_5': 'FUMIGA\u00c7\u00c3O, EMBALAGEM, ETIQUETAGEM, MONTAGEM 6.png',
  'galeria_6': 'LIMPEZA,MANUTEN\u00c7\u00c3O E INSPE\u00c7\u00c3O DE CONTEINERS 7.png'
};

const LAYER_GROUPS = [
  {
    id: 'integracao',
    label: 'Integra\u00e7\u00e3o',
    icon: '\u{1F30D}',
    expanded: true,
    layers: [
      {
        id: 'int_brasil', label: 'Mapa do Brasil',
        file: 'data/INTEGRA\u00c7\u00c3O BA BR.geojson',
        type: 'bts', nameFilter: 'Brasil', color: '#2c3e50'
      },
      {
        id: 'int_bahia', label: 'Mapa da Bahia',
        file: 'data/INTEGRA\u00c7\u00c3O BA BR.geojson',
        type: 'bts', nameFilter: 'Bahia', color: '#2980b9'
      },
      {
        id: 'int_ferrovias', label: 'Ferrovias',
        file: 'data/INTEGRA\u00c7\u00c3O BA BR.geojson',
        type: 'bts', subtype: 'line', color: '#c0392b', submenu: true
      },
      {
        id: 'int_cidades', label: 'Cidades',
        file: 'data/INTEGRA\u00c7\u00c3O BA BR.geojson',
        type: 'bts', subtype: 'point', color: '#e84393', submenu: true
      }
    ]
  },
  {
    id: 'macrorregiao',
    label: 'Macrorregi\u00e3o',
    icon: '\u{1F4CD}',
    expanded: true,
    layers: [
      {
        id: 'mac_bahia', label: 'Mapa da Bahia',
        file: 'data/MACRORREGI\u00c3O.geojson',
        type: 'bts', nameFilter: 'Bahia', color: '#2980b9'
      },
      {
        id: 'mac_cidades', label: 'Cidades',
        file: 'data/MACRORREGI\u00c3O.geojson',
        type: 'bts', subtype: 'point', color: '#27ae60', submenu: true
      },
      {
        id: 'mac_vias', label: 'Ferrovias e Rodovias',
        file: 'data/MACRORREGI\u00c3O.geojson',
        type: 'bts', subtype: 'line', color: '#8e44ad', submenu: true
      }
    ]
  },
  {
    id: 'bts',
    label: 'Parque BTS',
    icon: '\u{1F333}',
    expanded: true,
    layers: [
      {
        id: 'bts_ferrovias', label: 'Ferrovias',
        file: 'data/PARQUE LOGISTICO.geojson',
        type: 'bts', nameFilter: 'FERROVIA', color: '#c0392b', submenu: true
      },
      {
        id: 'bts_rodovias', label: 'Rodovias',
        file: 'data/PARQUE LOGISTICO.geojson',
        type: 'bts', nameFilter: 'RODOVIA', color: '#2c84e0', submenu: true
      },
      {
        id: 'bts_circulo', label: 'C\u00edrculo BTS',
        file: 'data/circulo_bts.geojson',
        type: 'bts', nameFilter: 'C\u00edrculo BTS', color: '#000000'
      }
    ]
  },
  {
    id: 'planejamento',
    label: 'Planejamento',
    icon: '\u{1F4D0}',
    expanded: false,
    layers: [
      {
        id: 'alt_i', label: 'Alternativa I',
        file: 'data/Alternativa I.json',
        type: 'esri', color: '#d35400'
      },
      {
        id: 'alt_ii', label: 'Alternativa II',
        file: 'data/Alternativa II.json',
        type: 'esri', color: '#e67e22'
      },
      {
        id: 'entorno_baia', label: 'Entorno Ba\u00eda',
        file: 'data/EntornoBa\u00edaCIA.json',
        type: 'esri', color: '#1abc9c'
      }
    ]
  },
  {
    id: 'infra',
    label: 'Infraestrutura',
    icon: '\u{1F3D7}\uFE0F',
    expanded: false,
    layers: [
      {
        id: 'ferrovias', label: 'Ferrovias',
        file: 'data/ferrovias.geojson',
        type: 'geojson', geometry: 'line', color: '#cd4239'
      },
      {
        id: 'rodovias', label: 'Rodovias',
        file: 'data/rodovias.geojson',
        type: 'geojson', geometry: 'line', color: '#2c84e0', dashed: true
      },
      {
        id: 'setores', label: 'Setores',
        file: 'data/setores.geojson',
        type: 'geojson', geometry: 'polygon', color: '#7c44a6'
      },
      {
        id: 'polos', label: 'Polos Log\u00edsticos',
        file: 'data/polos.geojson',
        type: 'polos', color: '#2c8c66'
      }
    ]
  }
];
