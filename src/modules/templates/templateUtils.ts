import type {
  StoredTemplateVariable,
  TemplateVariable,
  TemplateVariableType,
  TextTemplate,
} from './types';

const variablePattern =
  /\{\{\s*(?:(text|date|list|numberedList|numbered-list|numbered_list)\s*:\s*)?([\p{L}\p{N}_. -]+?)\s*\}\}/gu;

function normalizeVariableType(rawType?: string): TemplateVariableType {
  if (rawType === 'date') {
    return 'date';
  }

  if (
    rawType === 'list' ||
    rawType === 'numberedList' ||
    rawType === 'numbered-list' ||
    rawType === 'numbered_list'
  ) {
    return 'numberedList';
  }

  return 'text';
}

export function createVariableKey(variable: TemplateVariable) {
  return `${variable.type}:${variable.name}`;
}

export function createVariableToken(type: TemplateVariableType, name: string) {
  const cleanName = name.trim();

  if (type === 'date') {
    return `{{date:${cleanName || 'today'}}}`;
  }

  if (type === 'numberedList') {
    return `{{list:${cleanName || 'items'}}}`;
  }

  return `{{text:${cleanName || 'name'}}}`;
}

export function formatCurrentDate() {
  return new Intl.DateTimeFormat('ru-RU').format(new Date());
}

export function formatTemplateDate(value?: string) {
  if (!value) {
    return formatCurrentDate();
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return formatCurrentDate();
  }

  return new Intl.DateTimeFormat('ru-RU').format(date);
}

function renderNumberedList(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => `${index + 1}) ${line}`)
    .join('\n');
}

function normalizeStoredVariable(variable: StoredTemplateVariable): TemplateVariable | null {
  if (typeof variable === 'string') {
    const name = variable.trim();

    if (!name) {
      return null;
    }

    return {
      name,
      type: 'text',
      token: `{{${name}}}`,
    };
  }

  const name = variable.name?.trim();

  if (!name) {
    return null;
  }

  const type = normalizeVariableType(variable.type);

  return {
    name,
    type,
    token: variable.token || createVariableToken(type, name),
  };
}

export function extractTemplateVariables(body: string) {
  const variables = new Map<string, TemplateVariable>();

  for (const match of body.matchAll(variablePattern)) {
    const rawType = match[1];
    const rawName = match[2]?.trim();

    if (!rawName) {
      continue;
    }

    const variable: TemplateVariable = {
      name: rawName,
      type: normalizeVariableType(rawType),
      token: match[0],
    };

    variables.set(createVariableKey(variable), variable);
  }

  return Array.from(variables.values());
}

export function normalizeTemplateVariables(variables: StoredTemplateVariable[] = [], body = '') {
  const parsedVariables = extractTemplateVariables(body);

  if (parsedVariables.length > 0) {
    return parsedVariables;
  }

  const normalizedVariables = new Map<string, TemplateVariable>();

  for (const variable of variables) {
    const normalizedVariable = normalizeStoredVariable(variable);

    if (normalizedVariable) {
      normalizedVariables.set(createVariableKey(normalizedVariable), normalizedVariable);
    }
  }

  return Array.from(normalizedVariables.values());
}

export function renderTemplate(body: string, values: Record<string, string>) {
  return body.replace(variablePattern, (match, rawType: string | undefined, rawName: string) => {
    const variable: TemplateVariable = {
      name: rawName.trim(),
      type: normalizeVariableType(rawType),
      token: match,
    };

    const key = createVariableKey(variable);
    const value = values[key] ?? values[variable.name] ?? '';

    if (variable.type === 'date') {
      return formatTemplateDate(value);
    }

    if (variable.type === 'numberedList') {
      return renderNumberedList(value);
    }

    return value;
  });
}

export function filterTemplates(
  templates: TextTemplate[],
  query: string,
  category: string,
  variablesOnly: boolean,
) {
  const normalized = query.trim().toLowerCase();

  return templates.filter((template) => {
    const variables = normalizeTemplateVariables(template.variables, template.body);
    const variableText = variables.map((variable) => `${variable.name} ${variable.type}`).join(' ');
    const haystack =
      `${template.title} ${template.body} ${template.category} ${template.tags.join(' ')} ${variableText}`.toLowerCase();

    const matchesQuery = !normalized || haystack.includes(normalized);
    const matchesCategory = !category || template.category === category;
    const matchesVariables = !variablesOnly || variables.length > 0;

    return matchesQuery && matchesCategory && matchesVariables;
  });
}

export function templateCategories(templates: TextTemplate[]) {
  return Array.from(new Set(templates.map((template) => template.category).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function templatePreview(body: string) {
  const compact = body.replace(/\s+/g, ' ').trim();

  if (!compact) {
    return 'No text yet.';
  }

  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}

export function templateVariableLabel(variable: TemplateVariable) {
  if (variable.type === 'date') {
    return `{{date:${variable.name}}}`;
  }

  if (variable.type === 'numberedList') {
    return `{{list:${variable.name}}}`;
  }

  return `{{text:${variable.name}}}`;
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
