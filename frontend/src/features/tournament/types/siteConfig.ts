// ── Layout Types ──

export type LayoutMode = 'stack' | 'canvas';

export type SectionType = 'hero' | 'announcements' | 'players' | 'bracket' | 'mappool' | 'richtext' | 'image';

export interface CanvasItemLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked?: boolean;
}

export interface SiteSection {
  id: string;
  type: SectionType;
  props: Record<string, unknown>;
  canvas?: CanvasItemLayout;
}

// ── Builder Element Types (premium no-code builder) ──

export type BuilderElementType = 'container' | 'text' | 'image' | 'button' | 'divider' | 'spacer';

export interface ElementStyles {
  // Layout
  display?: 'flex' | 'block' | 'grid' | 'none';
  flexDirection?: 'row' | 'column';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  flexWrap?: 'wrap' | 'nowrap';
  gap?: number;

  // Size
  width?: string;
  height?: string;
  minHeight?: string;
  maxWidth?: string;

  // Spacing (px)
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;

  // Background
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;

  // Border
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';

  // Typography
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  letterSpacing?: number;

  // Effects
  opacity?: number;
  boxShadow?: string;
  overflow?: 'visible' | 'hidden' | 'auto';
}

export interface BuilderElement {
  id: string;
  type: BuilderElementType;
  name?: string; // user-friendly label in tree
  children: string[]; // child element IDs (for containers)
  styles: ElementStyles;
  content?: string; // text content, image URL, button label
  dataBinding?: string; // e.g. "{{tournament.name}}"
  href?: string; // link URL for buttons
}

// ── Page & Config ──

export interface SitePage {
  id: string;
  name: string;
  path: string;
  layout?: LayoutMode;
  canvasSize?: { width: number; height: number };
  // Stack mode (lite)
  sections: SiteSection[];
  // Canvas/builder mode (premium)
  elements?: Record<string, BuilderElement>;
  rootElementIds?: string[];
}

export interface SiteConfig {
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
  };
  pages: SitePage[];
}

// ── Default canvas layout for new sections ──

export const DEFAULT_CANVAS_LAYOUT: CanvasItemLayout = {
  x: 50,
  y: 50,
  width: 400,
  height: 300,
  zIndex: 0,
};

export const DEFAULT_CANVAS_SIZE = { width: 1440, height: 900 };

// ── Builder Element Registry ──

export interface ElementRegistryEntry {
  label: string;
  icon: string; // MUI icon name
  defaultStyles: ElementStyles;
  defaultContent?: string;
  canHaveChildren: boolean;
}

export const ELEMENT_REGISTRY: Record<BuilderElementType, ElementRegistryEntry> = {
  container: {
    label: 'Container',
    icon: 'ViewColumn',
    canHaveChildren: true,
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 16,
      paddingTop: 24,
      paddingRight: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      minHeight: '100px',
      width: '100%',
    },
  },
  text: {
    label: 'Text',
    icon: 'TextFields',
    canHaveChildren: false,
    defaultContent: 'Add your text here',
    defaultStyles: {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.6,
      color: 'inherit',
    },
  },
  image: {
    label: 'Image',
    icon: 'Image',
    canHaveChildren: false,
    defaultStyles: {
      width: '100%',
      borderRadius: 8,
      overflow: 'hidden',
    },
  },
  button: {
    label: 'Button',
    icon: 'SmartButton',
    canHaveChildren: false,
    defaultContent: 'Click me',
    defaultStyles: {
      fontSize: 14,
      fontWeight: 600,
      paddingTop: 10,
      paddingRight: 24,
      paddingBottom: 10,
      paddingLeft: 24,
      borderRadius: 6,
      backgroundColor: '#52796f',
      color: '#ffffff',
      textAlign: 'center',
    },
  },
  divider: {
    label: 'Divider',
    icon: 'HorizontalRule',
    canHaveChildren: false,
    defaultStyles: {
      width: '100%',
      height: '1px',
      backgroundColor: 'rgba(255,255,255,0.12)',
      marginTop: 16,
      marginBottom: 16,
    },
  },
  spacer: {
    label: 'Spacer',
    icon: 'UnfoldMore',
    canHaveChildren: false,
    defaultStyles: {
      height: '40px',
      width: '100%',
    },
  },
};

export function createBuilderElement(type: BuilderElementType, overrides?: Partial<BuilderElement>): BuilderElement {
  const reg = ELEMENT_REGISTRY[type];
  return {
    id: `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    name: reg.label,
    children: [],
    styles: { ...reg.defaultStyles },
    content: reg.defaultContent,
    ...overrides,
  };
}

// ── Section Registry (lite/stack mode) ──

export interface SectionRegistryEntry {
  label: string;
  defaultProps: Record<string, unknown>;
}

export const SECTION_REGISTRY: Record<SectionType, SectionRegistryEntry> = {
  hero: {
    label: 'Hero Banner',
    defaultProps: { showLogo: true, showName: true, showStatus: true },
  },
  announcements: {
    label: 'Announcements',
    defaultProps: { limit: 5 },
  },
  players: {
    label: 'Player Roster',
    defaultProps: { showSeeds: true, showAvatars: true },
  },
  bracket: {
    label: 'Bracket',
    defaultProps: {},
  },
  mappool: {
    label: 'Mappool',
    defaultProps: { stage: '' },
  },
  richtext: {
    label: 'Text Block',
    defaultProps: { content: '' },
  },
  image: {
    label: 'Image',
    defaultProps: { url: '', alt: '', fullWidth: true },
  },
};
