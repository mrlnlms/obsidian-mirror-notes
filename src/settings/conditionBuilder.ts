import { App, Setting } from "obsidian";
import { Condition, ConditionType, CustomMirror } from "./types";
import { FileSuggest, FolderSuggest, YamlPropertySuggest } from "../suggesters/file-suggest";
import { addPathValidation } from "./pathValidator";
import { addSearchClass } from "../utils/obsidianInternals";
import { arraymove } from "../utils/array";

interface ConditionBuilderOptions {
    app: App;
    card: HTMLElement;
    customMirror: CustomMirror;
    onSave: () => void;
    onRedisplay: () => void;
}

const CONDITION_TYPE_LABELS: Record<ConditionType, string> = {
    file: 'File',
    folder: 'Folder',
    property: 'Property',
};

export function buildConditionsSection(options: ConditionBuilderOptions): void {
    const { app, card, customMirror, onSave, onRedisplay } = options;
    const conditions = customMirror.conditions;

    // Header with logic dropdown + add button
    new Setting(card)
        .setName("Conditions")
        .setDesc("Define when this mirror applies to a note.")
        .addDropdown(cb => {
            cb.addOptions({ any: 'Match any', all: 'Match all' })
              .setValue(customMirror.conditionLogic)
              .onChange(value => {
                  customMirror.conditionLogic = value as 'any' | 'all';
                  onSave();
              });
        })
        .addExtraButton(cb => {
            cb.setIcon("plus-circle")
              .setTooltip("Add condition")
              .onClick(() => {
                  conditions.push({ type: 'file', negated: false });
                  onSave();
                  onRedisplay();
              });
        });

    // Render each condition row
    conditions.forEach((condition, index) => {
        const row = card.createEl("div", { cls: "condition-row" });
        buildConditionRow(app, row, customMirror, index, onSave, onRedisplay);
    });
}

function buildConditionRow(
    app: App,
    container: HTMLElement,
    customMirror: CustomMirror,
    index: number,
    onSave: () => void,
    onRedisplay: () => void
): void {
    const conditions = customMirror.conditions;
    const condition = conditions[index];

    const s = new Setting(container)
        // is/not dropdown
        .addDropdown(cb => {
            cb.addOptions({ is: 'is', not: 'is not' })
              .setValue(condition.negated ? 'not' : 'is')
              .onChange(value => {
                  condition.negated = value === 'not';
                  onSave();
              });
        })
        // type dropdown
        .addDropdown(cb => {
            cb.addOptions(CONDITION_TYPE_LABELS)
              .setValue(condition.type)
              .onChange(value => {
                  const newType = value as ConditionType;
                  // Clear fields from previous type
                  delete condition.fileName;
                  delete condition.folderPath;
                  delete condition.propertyName;
                  delete condition.propertyValue;
                  condition.type = newType;
                  onSave();
                  onRedisplay();
              });
        });

    // Type-specific inputs
    switch (condition.type) {
        case 'file':
            s.addSearch(cb => {
                new FileSuggest(app, cb.inputEl);
                cb.setPlaceholder("Select a file")
                  .setValue(condition.fileName || '')
                  .onChange(value => {
                      condition.fileName = value;
                      onSave();
                  });
                addSearchClass(cb, "mirror-search-input");
            });
            break;

        case 'folder':
            s.addSearch(cb => {
                new FolderSuggest(app, cb.inputEl);
                cb.setPlaceholder("Select a folder")
                  .setValue(condition.folderPath || '')
                  .onChange(value => {
                      condition.folderPath = value;
                      onSave();
                  });
                addSearchClass(cb, "mirror-search-input");
            });
            break;

        case 'property':
            s.addSearch(cb => {
                new YamlPropertySuggest(app, cb.inputEl);
                cb.setPlaceholder("Property name")
                  .setValue(condition.propertyName || '')
                  .onChange(value => {
                      condition.propertyName = value;
                      onSave();
                  });
                addSearchClass(cb, "mirror-search-input");
            });
            s.addSearch(cb => {
                new YamlPropertySuggest(app, cb.inputEl);
                cb.setPlaceholder("Value (empty = any)")
                  .setValue(condition.propertyValue || '')
                  .onChange(value => {
                      condition.propertyValue = value;
                      onSave();
                  });
                addSearchClass(cb, "mirror-search-input");
            });
            break;
    }

    // Move up/down + delete buttons
    addMoveDeleteButtons(s, conditions, index, onSave, onRedisplay);

    s.infoEl.remove();

    // Path validation for file/folder conditions
    if (condition.type === 'file' && condition.fileName) {
        addPathValidation(app, container, condition.fileName, 'file');
    } else if (condition.type === 'folder' && condition.folderPath) {
        addPathValidation(app, container, condition.folderPath, 'folder');
    }
}

function addMoveDeleteButtons(
    s: Setting,
    conditions: Condition[],
    index: number,
    onSave: () => void,
    onRedisplay: () => void
): void {
    s.addExtraButton(cb => {
        cb.setIcon("up-chevron-glyph")
          .setTooltip("Move up")
          .onClick(() => {
              if (index > 0) {
                  arraymove(conditions, index, index - 1);
              }
              onSave();
              onRedisplay();
          });
    })
    .addExtraButton(cb => {
        cb.setIcon("down-chevron-glyph")
          .setTooltip("Move down")
          .onClick(() => {
              arraymove(conditions, index, index + 1);
              onSave();
              onRedisplay();
          });
    })
    .addExtraButton(cb => {
        cb.setIcon("cross")
          .setTooltip("Delete")
          .onClick(() => {
              conditions.splice(index, 1);
              onSave();
              onRedisplay();
          });
    });
}
