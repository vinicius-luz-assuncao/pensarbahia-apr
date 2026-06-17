const IMAGE_MAP = {
  'bts_areas_0': 'imagem_01.png'
};

const LAYER_GROUPS = [
  {
    id: 'bts',
    label: 'titulo a confirmar',
    icon: '\u{1F333}',
    expanded: true,
    layers: [
      {
        id: 'bts_cidades', label: 'Cidades',
        file: 'data/parque_bts_ atualizado_2.geojson',
        type: 'bts', subtype: 'point', color: '#e84393', submenu: true,
        marker: 'circle',
        desc: 'Munic\u00edpios e localidades de refer\u00eancia na regi\u00e3o do Parque da Ba\u00eda de Todos os Santos.'
      },
      {
        id: 'bts_rotas', label: 'Rotas',
        file: 'data/parque_bts_ atualizado_2.geojson',
        type: 'bts', subtype: 'line', color: '#fd79a8', submenu: true,
        desc: 'Eixos de deslocamento e conex\u00f5es no entorno do parque e da Ba\u00eda de Todos os Santos.'
      },
      {
        id: 'bts_areas', label: '\u00c1reas',
        file: 'data/parque_bts_ atualizado_2.geojson',
        type: 'bts', subtype: 'polygon', color: '#6c5ce7', submenu: true,
        desc: 'Pol\u00edgonos da unidade de conserva\u00e7\u00e3o e zonas de amortecimento do Parque da BTS.'
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
        type: 'esri', color: '#d35400',
        desc: 'Tra\u00e7ado alternativo com 186,11 ha para expans\u00e3o do sistema log\u00edstico no CIA.'
      },
      {
        id: 'alt_ii', label: 'Alternativa II',
        file: 'data/Alternativa II.json',
        type: 'esri', color: '#e67e22',
        desc: 'Tra\u00e7ado alternativo com 902,11 ha para expans\u00e3o log\u00edstica no entorno do CIA.'
      },
      {
        id: 'entorno_baia', label: 'Entorno Ba\u00eda',
        file: 'data/EntornoBa\u00edaCIA.json',
        type: 'esri', color: '#1abc9c',
        desc: 'Pol\u00edgono do Entorno da Ba\u00eda de Todos os Santos \u2014 19.409,24 ha.'
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
        type: 'geojson', geometry: 'line', color: '#cd4239',
        desc: 'Corredores do Plano Estrat\u00e9gico Ferrovi\u00e1rio da Bahia.'
      },
      {
        id: 'rodovias', label: 'Rodovias',
        file: 'data/rodovias.geojson',
        type: 'geojson', geometry: 'line', color: '#2c84e0', dashed: true,
        desc: 'Principais eixos rodovi\u00e1rios federais e estaduais.'
      },
      {
        id: 'setores', label: 'Setores',
        file: 'data/setores.geojson',
        type: 'geojson', geometry: 'polygon', color: '#7c44a6',
        desc: 'Zonas priorit\u00e1rias para expans\u00e3o da malha log\u00edstica.'
      },
      {
        id: 'polos', label: 'Polos Log\u00edsticos',
        file: 'data/polos.geojson',
        type: 'polos', color: '#2c8c66',
        desc: '18 munic\u00edpios com alto potencial log\u00edstico.'
      }
    ]
  }
];
