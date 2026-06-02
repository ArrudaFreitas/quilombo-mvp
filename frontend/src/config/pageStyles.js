/**
 * Configuração de estilos e paletas disponíveis para páginas institucionais.
 * Esta é a fonte de verdade no frontend — deve estar em sincronia com o backend.
 */

export const STYLES = {
  uniao: {
    id: 'uniao',
    label: 'União & Comunidade',
    description: 'Quente, arredondado e comunal. Arcos, sombras suaves, grão de papel e cor de verdade.',
    // cor representativa para o swatch no seletor
    previewColor: '#A1572F',
    previewBg: '#F3EBD6',
    palettes: ['verde', 'terracota', 'ocre', 'indigo'],
  },
  raizes: {
    id: 'raizes',
    label: 'Raízes',
    description: 'Geométrico e estruturado. Inspirado em Rubem Valentim — sombra dura, grade rígida, caixa-alta.',
    previewColor: '#2E6B4B',
    previewBg: '#F4EEE0',
    palettes: ['verde', 'terracota', 'ocre', 'indigo'],
  },
}

export const PALETTES = {
  verde: {
    id: 'verde',
    label: 'Verde território',
    color: '#2E6B4B',
    colorDark: '#6FBE93',
  },
  terracota: {
    id: 'terracota',
    label: 'Terracota fogo',
    color: '#A1572F',
    colorDark: '#E29A6A',
  },
  ocre: {
    id: 'ocre',
    label: 'Ocre sol',
    color: '#8A6A18',
    colorDark: '#E6BE5E',
  },
  indigo: {
    id: 'indigo',
    label: 'Índigo noite',
    color: '#2C4A7C',
    colorDark: '#88B2E4',
  },
}

/** Retorna as paletas disponíveis para um dado estilo */
export function getPalettesForStyle(styleId) {
  const style = STYLES[styleId]
  if (!style) return []
  return style.palettes.map(id => PALETTES[id]).filter(Boolean)
}

/** Valida se combinação estilo + paleta é válida */
export function isValidCombination(styleId, paletteId) {
  const style = STYLES[styleId]
  return !!(style && style.palettes.includes(paletteId))
}

/** Default para comunidades sem configuração */
export const DEFAULT_STYLE   = 'uniao'
export const DEFAULT_PALETTE = 'verde'
