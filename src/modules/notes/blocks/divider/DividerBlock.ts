import { createBlockConfig, createBlockSpec } from '@blocknote/core';
import { resolveCssColor } from '../../utils/noteEditorFormatting';

const dividerBlockConfig = createBlockConfig(
  () =>
    ({
      type: 'divider' as const,
      propSchema: {
        dividerColor: {
          default: 'default',
        },
      },
      content: 'none',
    }) as const,
);

export const dividerBlockSpec = createBlockSpec(dividerBlockConfig, () => ({
  meta: {
    selectable: true,
  },
  render(block) {
    const divider = document.createElement('hr');
    divider.className = 'block-divider';
    divider.style.setProperty('--note-divider-color', resolveCssColor(String(block.props.dividerColor ?? 'default'), 'background'));
    return { dom: divider };
  },
  toExternalHTML(block) {
    const divider = document.createElement('hr');
    divider.className = 'block-divider';
    divider.style.setProperty('--note-divider-color', resolveCssColor(String(block.props.dividerColor ?? 'default'), 'background'));
    return { dom: divider };
  },
}));
