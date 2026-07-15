const IMAGE_MAP = {
  'galeria_0': 'ZPE DO COMPLEXO PORTUÁRIO.png',
  'galeria_1': 'ARMAZENAGEM ALFANDEGADA.png',
  'galeria_2': 'BASE INTERMODAL.png',
  'galeria_3': 'DESEMBARAÇO E ENTREPOSTO ADUANEIRO.png',
  'galeria_4': 'CONSOLIDAÇÃO E DESCONSOLIDAÇÃO DE CONTEINERS.png',
  'galeria_5': 'FUMIGAÇÃO, EMBALAGEM, ETIQUETAGEM, MONTAGEM.png',
  'galeria_6': 'LIMPEZA,MANUTENÇÃO E INSPEÇÃO DE CONTEINERS.png'
};

var ROUTE_SUB_ITEMS = {
  'route_vli':      { parentId: 'int_ferrovias', name: 'VLI' },
  'route_fiol':     { parentId: 'int_ferrovias', name: 'FIOL' },
  'route_transno':  { parentId: 'int_ferrovias', name: 'TRANSNORDESTINA' },
  'route_nortesul': { parentId: 'int_ferrovias', name: 'FERROVIA NORTE-SUL' },
  'route_fico':     { parentId: 'int_ferrovias', name: 'FICO' }
};

const LAYER_GROUPS = [
  {
    id: 'integracao',
    label: 'Integra\u00e7\u00e3o',
    icon: '\u{1F30D}',
    expanded: true,
    layers: [
      {
        id: 'int_brasil', label: 'Brasil',
        file: 'data/INTEGRA\u00c7\u00c3O BA BR.geojson',
        type: 'bts', nameFilter: 'Brasil', color: '#2c3e50'
      },
      {
        id: 'int_bahia', label: 'Bahia',
        file: 'data/INTEGRA\u00c7\u00c3O BA BR.geojson',
        type: 'bts', nameFilter: 'Bahia', color: '#2980b9'
      },
      {
        id: 'int_ferrovias', label: 'Ferrovias',
        file: 'data/INTEGRAÇÃO BA BR.geojson',
        type: 'bts', subtype: 'line', color: '#c0392b',
        submenu: true, noPageButton: true,
        featureNames: {
          'VLI': {
            ids: ['hSMsy', 'YOFDq', 'g9gwe', 'IhsxP'],
            label: 'VLI', color: '#8e44ad', weight: 5
          },
          'FIOL': {
            ids: ['1gxez', 'fT7fW'],
            label: 'FIOL', color: '#e84393', weight: 5
          },
          'TRANSNORDESTINA': {
            ids: ['jsujA', 'O5W6S', 'F5cma', 'Mr2xp', 'HydR0', 'ZLyyO'],
            label: 'TRANSNORDESTINA', color: '#27ae60', weight: 5,
            dashMap: { 'ZLyyO': '10' }
          },
          'NORTE-SUL': {
            ids: ['hgwLV', 'tHeB3', '7ICj7', 'SXN6a', 'I0sN2', 'EO2y4', 'm5rag', 'B6EMe', 'sIRKb', 'p2yDO'],
            label: 'FERROVIA NORTE-SUL', color: '#e74c3c', weight: 5, dashArray: '10'
          },
          'FICO': {
            ids: ['SIL6N', 'BEORz'],
            label: 'FICO', color: '#e84393', weight: 5, dashArray: '10'
          }
        }
      },
      {
        id: 'int_cidades', label: 'Pontos Log\u00edsticos',
        file: 'data/INTEGRA\u00c7\u00c3O BA BR.geojson',
        type: 'bts', subtype: 'point', color: '#722f37',
        labelDirections: { 'Suape': 'right', 'São Paulo': 'left', 'Ilhéus': 'right', 'Mara Rosa': 'bottom', 'Juazeiro': 'bottomleft', 'Belo Horizonte': 'right', 'Salvador': 'right' },
        hideLabels: ['Lucas do Rio Verde', 'Salgueiro', 'Eliseu Martins', 'Rio de Janeiro', 'Água Boa', 'Belo Horizonte'],
        labelOffsets: { 'Juazeiro': [0, 12] },
        extraPoints: [
          { name: 'Itaqui', lat: -2.567, lng: -44.367, labelDir: 'right' }
        ]
      },
      {
        id: 'route_vli', label: 'VLI',
        color: '#8e44ad', subRoute: true
      },
      {
        id: 'route_fiol', label: 'FIOL',
        color: '#e84393', subRoute: true
      },
      {
        id: 'route_transno', label: 'Transnordestina',
        color: '#27ae60', subRoute: true
      },
      {
        id: 'route_nortesul', label: 'Ferrovia Norte-Sul',
        color: '#e74c3c', subRoute: true
      },
      {
        id: 'route_fico', label: 'FICO',
        color: '#e84393', subRoute: true
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
        id: 'mac_mancha', label: 'Organiza\u00e7\u00e3o territorial SSA - FSA',
        type: 'mancha',
        color: '#2ecc71',
        fillOpacity: 0.12,
        weight: 0,
        coordinates: [[[-11.6,-39.0],[-11.625,-38.85],[-11.65,-38.7],[-11.675,-38.6],[-11.7,-38.5],[-11.75,-38.425],[-11.8,-38.35],[-11.85,-38.275],[-11.9,-38.2],[-11.975,-38.175],[-12.05,-38.15],[-12.125,-38.125],[-12.2,-38.1],[-12.275,-38.11],[-12.35,-38.12],[-12.425,-38.16],[-12.5,-38.2],[-12.575,-38.225],[-12.65,-38.25],[-12.725,-38.275],[-12.8,-38.3],[-12.84,-38.35],[-12.88,-38.4],[-12.925,-38.45],[-12.97,-38.5],[-12.985,-38.6],[-13.0,-38.7],[-13.025,-38.85],[-13.05,-39.0],[-13.075,-39.1],[-13.1,-39.2],[-13.075,-39.35],[-13.05,-39.5],[-13.025,-39.65],[-13.0,-39.8],[-12.9,-39.9],[-12.8,-40.0],[-12.7,-40.05],[-12.6,-40.1],[-12.45,-40.075],[-12.3,-40.05],[-12.15,-39.975],[-12.0,-39.9],[-11.95,-39.8],[-11.9,-39.7],[-11.85,-39.6],[-11.8,-39.5],[-11.75,-39.4],[-11.7,-39.3],[-11.65,-39.15]]]
      },
      {
        id: 'mac_cidades', label: 'Pontos Log\u00edsticos',
        file: 'data/MACRORREGI\u00c3O.geojson',
        type: 'bts', subtype: 'point', color: '#722f37',
        labelDirections: { 'Cama\u00e7ari': 'top', 'Salvador': 'bottom', 'Aratu': 'left', 'Sim\u00f5es Filho': 'right', 'Itatim': 'top', 'Castro Alves': 'bottom', 'Santo Ant\u00f4nio de Jesus': 'left' }
      },
      {
        id: 'mac_vias', label: 'Rodovias',
        file: 'data/MACRORREGI\u00c3O.geojson',
        type: 'bts', subtype: 'line', color: '#8e44ad', submenu: true, noPageButton: true,
        featureNames: {
          'Demais vias': {
            ids: ['pY7Nd', 'BlLcb', '5IA6c', 'whtgx', '7SNX0', '9EDIc', 'zs1PZ', 'P7JX1'],
            label: 'RODOVIAS', color: '#8e44ad', weight: 5
          },
          'Santo Ant\u00f4nio de Jesus \u2192 Salvador': {
            ids: ['V5L02', 'R2tzk', 'f9f2j', 'Ijxca', 'IWkVr', 'xQTJu', 'EkGci', 'AuzGI'],
            label: 'PONTE', color: '#2ecc71', weight: 5
          },
          'Nazar\u00e9 \u2192 Valen\u00e7a': {
            ids: ['nazare_valenca'],
            label: 'RODOVIA NAZAR\u00c9-VALEN\u00c7A',
            color: '#e74c3c', weight: 5, hideLabel: true
          }
        }
      },
      {
        id: 'mac_ferrovias', label: 'Plano ferrovi\u00e1rio',
        file: 'data/ferroviasmacrorregiao.geojson',
        type: 'bts', subtype: 'line',
        color: '#8b0000', weight: 5,
        submenu: true,
        legendLabel: 'Ferrovia',
        featureNames: {
          'Constru\u00e7\u00e3o de ferrovia': {
            ids: ['eymf1', 'P6xA1', 'ujoXL', 'V260z', 'iehS6'],
            label: 'CONSTRU\u00c7\u00c3O DE FERROVIA',
            color: '#e74c3c', weight: 5
          },
          'Requalifica\u00e7\u00e3o de ferrovia': {
            ids: ['bixrh', '2rFE7'],
            label: 'REQUALIFICA\u00c7\u00c3O DE FERROVIA',
            color: '#3498db', weight: 5
          }
        }
      },
      {
        id: 'mac_circulo', label: 'Complexos portu\u00e1rios',
        type: 'circle-editor', center: [-12.75421, -38.43224], radius: 14849,
        color: '#f39c12', weight: 2
      },
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
        type: 'bts', nameFilter: 'FERROVIA', color: '#8b0000', submenu: true, weight: 5,
        legendLabel: 'Ferrovia'
      },
      {
        id: 'bts_rodovias', label: 'Rodovias',
        file: 'data/PARQUE LOGISTICO.geojson',
        type: 'bts', nameFilter: 'RODOVIA', color: '#000000', submenu: true, weight: 5,
        legendLabel: 'Rodovia'
      },
      {
        id: 'bts_circulo_fixo', label: '\u00c1rea CIA NORTE E SUL',
        type: 'circle-editor', center: [-12.75421, -38.43224], radius: 14849,
        color: '#f39c12', weight: 2
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
