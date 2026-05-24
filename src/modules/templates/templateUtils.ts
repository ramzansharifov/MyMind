import type { TextTemplate } from './types';

const variablePattern = /\{\{\s*([a-zA-Zа-яА-ЯёЁ0-9_. -]+?)\s*\}\}/g;

export function extractTemplateVariables(body: string) {
  const variables = new Set<string>();
  for (const match of body.matchAll(variablePattern)) {
    const variable = match[1]?.trim();
    if (variable) {
      variables.add(variable);
    }
  }
  return Array.from(variables);
}

export function renderTemplate(body: string, values: Record<string, string>) {
  return body.replace(variablePattern, (_, rawName: string) => values[rawName.trim()] ?? '');
}

export function filterTemplates(templates: TextTemplate[], query: string, category: string, variablesOnly: boolean) {
  const normalized = query.trim().toLowerCase();
  return templates.filter((template) => {
    const haystack = `${template.title} ${template.body} ${template.category} ${template.tags.join(' ')} ${template.variables.join(' ')}`.toLowerCase();
    const matchesQuery = !normalized || haystack.includes(normalized);
    const matchesCategory = !category || template.category === category;
    const matchesVariables = !variablesOnly || template.variables.length > 0;
    return matchesQuery && matchesCategory && matchesVariables;
  });
}

export function templateCategories(templates: TextTemplate[]) {
  return Array.from(new Set(templates.map((template) => template.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function templatePreview(body: string) {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return 'No text yet.';
  }
  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}

export async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
