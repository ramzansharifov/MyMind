import { useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { filterTemplates, templateCategories } from './templateUtils';
import { TemplateBuilder } from './TemplateBuilder';
import { TemplateCard } from './TemplateCard';
import { TemplateForm } from './TemplateForm';
import type { TextTemplate } from './types';

interface TemplatesPageProps {
  templates: TextTemplate[];
  onChange: (templates: TextTemplate[]) => void;
}

export function TemplatesPage({ templates, onChange }: TemplatesPageProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [variablesOnly, setVariablesOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<TextTemplate | null | undefined>(undefined);
  const [building, setBuilding] = useState<TextTemplate | null>(null);
  const { t } = useI18n();
  const activeTemplates = templates.filter((template) => !isHiddenFromRegularLists(template));
  const categories = templateCategories(activeTemplates);
  const filtered = filterTemplates(activeTemplates, query, category, variablesOnly).sort(
    (a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt),
  );
  const activeFilterCount = (category ? 1 : 0) + (variablesOnly ? 1 : 0);

  function saveTemplate(template: TextTemplate) {
    const exists = templates.some((item) => item.id === template.id);
    onChange(exists ? templates.map((item) => (item.id === template.id ? template : item)) : [template, ...templates]);
    setEditing(undefined);
  }

  return (
    <section>
      <PageHeader
        title="Templates"
        subtitle="Reusable text blocks that can be copied or assembled from variables."
        actions={<AddButton label="Add template" onClick={() => setEditing(null)} />}
      />
      <CollapsibleFilters
        query={query}
        placeholder="Search templates"
        isOpen={filtersOpen}
        activeCount={activeFilterCount}
        onQueryChange={setQuery}
        onToggle={() => setFiltersOpen((current) => !current)}
      >
        <div className="filter-choice-group">
          <div className="filter-choice-heading">
            <strong>{t('Category')}</strong>
            {category ? <button type="button" onClick={() => setCategory('')}>{t('Clear')}</button> : null}
          </div>
          <div className="filter-chip-row">
            {categories.length > 0 ? categories.map((item) => (
              <button className={`filter-chip${category === item ? ' active' : ''}`} type="button" key={item} onClick={() => setCategory(item)}>
                {item}
              </button>
            )) : <span className="muted-text">{t('No categories yet.')}</span>}
          </div>
        </div>
        <div className="filter-choice-group">
          <div className="filter-choice-heading">
            <strong>{t('Variables')}</strong>
          </div>
          <div className="filter-chip-row">
            <button className={`filter-chip${variablesOnly ? ' active' : ''}`} type="button" onClick={() => setVariablesOnly((current) => !current)}>
              {t('With variables')}
            </button>
          </div>
        </div>
      </CollapsibleFilters>
      {filtered.length === 0 ? (
        <EmptyState title="No templates found" message="Add a template or relax the filters." />
      ) : (
        <div className="card-grid template-grid">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onBuild={() => setBuilding(template)}
              onEdit={() => setEditing(template)}
              onPin={() => {
                const timestamp = new Date().toISOString();
                onChange(templates.map((item) => (item.id === template.id ? { ...item, pinnedAt: item.pinnedAt ? null : timestamp, updatedAt: timestamp } : item)));
              }}
              onArchive={() => onChange(templates.map((item) => (item.id === template.id ? archiveEntity(item) : item)))}
              onTrash={() => onChange(templates.map((item) => (item.id === template.id ? trashEntity(item) : item)))}
            />
          ))}
        </div>
      )}
      {editing !== undefined ? <TemplateForm template={editing} onCancel={() => setEditing(undefined)} onSave={saveTemplate} /> : null}
      {building ? <TemplateBuilder template={building} onClose={() => setBuilding(null)} /> : null}
    </section>
  );
}
