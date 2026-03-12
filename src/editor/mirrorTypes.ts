// Tipos e interfaces usados no Mirror Notes

export type MirrorPosition =
  | 'top'             // CM6 Decoration.widget side:0 (inside editor)
  | 'bottom'          // CM6 Decoration.widget side:1 (inside editor)
  | 'above-title'     // DOM insertBefore(.inline-title)
  | 'above-properties'// DOM insertBefore(.metadata-container)
  | 'below-properties'// DOM insertAfter(.metadata-container)
  | 'above-backlinks' // DOM insertBefore(.embedded-backlinks)
  | 'below-backlinks' // DOM appendChild on .cm-sizer / .mod-footer
  | 'left'            // CM6 ViewPlugin (margin panel)
  | 'right';          // CM6 ViewPlugin (margin panel)

/** Positions that use DOM injection (outside CM6 editor) */
export const DOM_POSITIONS: MirrorPosition[] = [
  'above-title', 'above-properties', 'below-properties',
  'above-backlinks', 'below-backlinks'
];

/** Positions that use CM6 Decoration.widget */
export const CM6_POSITIONS: MirrorPosition[] = ['top', 'bottom'];

/** Positions that use CM6 ViewPlugin (margin panels) */
export const MARGIN_POSITIONS: MirrorPosition[] = ['left', 'right'];

export interface ApplicableMirrorConfig {
  templatePath: string;
  position: MirrorPosition;
  hideProps: boolean;
  showContainer: boolean;
}

export interface MirrorState {
  enabled: boolean;
  config: ApplicableMirrorConfig | null;
  frontmatter: any;
  widgetId: string;
  filePath: string; // Path do arquivo que contém este editor (não depende de getActiveFile)
  lastDocText?: string;
  frontmatterHash?: string; // Hash do frontmatter para detectar mudanças reais
  lastContentHash?: string; // Hash do conteúdo do template para evitar re-renderização
}

export interface MirrorFieldState {
  mirrorState: MirrorState;
  decorations: import("@codemirror/view").DecorationSet;
} 