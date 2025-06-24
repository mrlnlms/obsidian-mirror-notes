import { StateField, StateEffect, EditorState } from "@codemirror/state";

// Definir a interface do state
export interface MirrorState {
  enabled: boolean;
  templatePath: string | null;
  frontmatter: any;
}

// Effects para comunicação
export const updateTemplateEffect = StateEffect.define<{templatePath: string}>();
export const toggleWidgetEffect = StateEffect.define<boolean>();

// State field para gerenciar templates
export const mirrorStateField = StateField.define<MirrorState>({
  create(state: EditorState): MirrorState {
    return {
      enabled: false,
      templatePath: 'templates/test-template.md', // Hardcodado por agora
      frontmatter: parseFrontmatter(state.doc.toString())
    };
  },

  update(value: MirrorState, tr): MirrorState {
    // Detectar mudanças no YAML
    if (tr.docChanged) {
      const newFrontmatter = parseFrontmatter(tr.state.doc.toString());
      if (JSON.stringify(newFrontmatter) !== JSON.stringify(value.frontmatter)) {
        return { ...value, frontmatter: newFrontmatter };
      }
    }

    // Processar effects
    for (const effect of tr.effects) {
      if (effect.is(updateTemplateEffect)) {
        return { ...value, templatePath: effect.value.templatePath };
      }
      if (effect.is(toggleWidgetEffect)) {
        return { ...value, enabled: effect.value };
      }
    }

    return value;
  }
});

// Função helper para parsear frontmatter
function parseFrontmatter(content: string): any {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  try {
    // Parse YAML básico (você pode usar uma lib depois)
    const yaml = match[1];
    const result: any = {};
    
    yaml.split('\n').forEach(line => {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        result[key] = value.replace(/^["']|["']$/g, '');
      }
    });
    
    return result;
  } catch (e) {
    return {};
  }
}