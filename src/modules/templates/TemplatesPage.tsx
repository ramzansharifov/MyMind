import { useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { EmptyState } from '../../shared/components/EmptyState';
import { GroupedCollectionLayout } from '../../shared/components/GroupedCollectionLayout';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { cn } from '../../shared/utils/classNames';
import { countItemsByContentGroup, matchesContentGroup } from '../../shared/utils/contentGroupUtils';
import { filterTemplates, templateCategories } from './templateUtils';
import { TemplateBuilder } from './TemplateBuilder';
import { TemplateCard } from './TemplateCard';
import { TemplateForm } from './TemplateForm';
import type { TemplatesData, TextTemplate } from './types';

interface TemplatesPageProps {
  data: TemplatesData;
  onChange: (data: TemplatesData) => void;
}

export function TemplatesPage({ data, onChange }: TemplatesPageProps) {
  const templates = data.items;
  const groups = data.groups;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [variablesOnly, setVariablesOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState('all');
  const [editing, setEditing] = useState<TextTemplate | null | undefined>(undefined);
  const [building, setBuilding] = useState<TextTemplate | null>(null);
  const { t } = useI18n();
  const activeTemplates = templates.filter((template) => !isHiddenFromRegularLists(template));
  const categories = templateCategories(activeTemplates);
  const filteredByFilters = filterTemplates(activeTemplates, query, category, variablesOnly);
  const filtered = filteredByFilters.filter((template) => matchesContentGroup(template.groupId, activeGroupId)).sort(
    (a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt),
  );
  const activeFilterCount = (category ? 1 : 0) + (variablesOnly ? 1 : 0);
  const groupCounts = countItemsByContentGroup(activeTemplates);

  function saveTemplate(template: TextTemplate) {
    const exists = templates.some((item) => item.id === template.id);
    onChange({ ...data, items: exists ? templates.map((item) => (item.id === template.id ? template : item)) : [template, ...templates] });
    setEditing(undefined);
  }

  function renameGroup(groupId: string, title: string) {
    const timestamp = new Date().toISOString();
    onChange({ ...data, groups: groups.map((group) => (group.id === groupId ? { ...group, title, updatedAt: timestamp } : group)) });
  }

  function deleteGroup(groupId: string) {
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      groups: groups.filter((group) => group.id !== groupId),
      items: templates.map((template) => (template.groupId === groupId ? { ...template, groupId: null, updatedAt: timestamp } : template)),
    });
    setActiveGroupId('all');
  }

  function addTemplatesToGroup(itemsToAdd: TextTemplate[]) {
    const timestamp = new Date().toISOString();
    const idsToAdd = new Set(itemsToAdd.map((item) => item.id));
    onChange({
      ...data,
      items: templates.map((template) =>
        idsToAdd.has(template.id) ? { ...template, groupId: activeGroupId, updatedAt: timestamp } : template,
      ),
    });
  }

  return (
    <section>
      <PageHeader
        title="Templates"
        subtitle="Reusable text blocks that can be copied or assembled from variables."
        actions={<AddButton label="Add template" onClick={() => setEditing(null)} />}
      />
      <GroupedCollectionLayout
        filters={
          <CollapsibleFilters
            query={query}
            placeholder="Search templates"
            isOpen={filtersOpen}
            activeCount={activeFilterCount}
            onQueryChange={setQuery}
            onToggle={() => setFiltersOpen((current) => !current)}
          >
            <div className={filterChoiceGroupClass}>
              <div className={filterChoiceHeadingClass}>
                <strong className="text-app-text">{t('Category')}</strong>
                {category ? <button className={filterClearInlineClass} type="button" onClick={() => setCategory('')}>{t('Clear')}</button> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.length > 0 ? categories.map((item) => (
                  <button className={cn(filterChipClass, category === item && filterChipActiveClass)} type="button" key={item} onClick={() => setCategory(item)}>
                    {item}
                  </button>
                )) : <span className="text-sm text-app-muted">{t('No categories yet.')}</span>}
              </div>
            </div>
            <div className={filterChoiceGroupClass}>
              <div className={filterChoiceHeadingClass}>
                <strong className="text-app-text">{t('Variables')}</strong>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={cn(filterChipClass, variablesOnly && filterChipActiveClass)} type="button" onClick={() => setVariablesOnly((current) => !current)}>
                  {t('With variables')}
                </button>
              </div>
            </div>
          </CollapsibleFilters>
        }
        groups={groups}
        totalCount={activeTemplates.length}
        activeGroupId={activeGroupId}
        groupCounts={groupCounts}
        itemCount={filtered.length}
        onActiveGroupChange={setActiveGroupId}
        onGroupsChange={(groups) => onChange({ ...data, groups })}
        onRenameGroup={renameGroup}
        onDeleteGroup={deleteGroup}
        availableItems={activeTemplates.filter((template) => template.groupId !== activeGroupId)}
        getItemLabel={(template) => template.title}
        getItemDescription={(template) => template.category || ''}
        onAddItemsToGroup={addTemplatesToGroup}
      >
          {filtered.length === 0 ? (
            <EmptyState title="No templates found" message="Add a template or relax the filters." />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
              {filtered.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onBuild={() => setBuilding(template)}
                  onEdit={() => setEditing(template)}
                  onPin={() => {
                    const timestamp = new Date().toISOString();
                    onChange({ ...data, items: templates.map((item) => (item.id === template.id ? { ...item, pinnedAt: item.pinnedAt ? null : timestamp, updatedAt: timestamp } : item)) });
                  }}
                  onArchive={() => onChange({ ...data, items: templates.map((item) => (item.id === template.id ? archiveEntity(item) : item)) })}
                  onTrash={() => onChange({ ...data, items: templates.map((item) => (item.id === template.id ? trashEntity(item) : item)) })}
                />
              ))}
            </div>
          )}
      </GroupedCollectionLayout>
      {editing !== undefined ? (
        <TemplateForm
          template={editing}
          groups={groups}
          defaultGroupId={activeGroupId === 'all' ? null : activeGroupId}
          onCancel={() => setEditing(undefined)}
          onSave={saveTemplate}
        />
      ) : null}
      {building ? <TemplateBuilder template={building} onClose={() => setBuilding(null)} /> : null}
    </section>
  );
}

const filterChoiceGroupClass = 'grid gap-2';

const filterChoiceHeadingClass = 'flex items-center justify-between gap-3 text-sm';

const filterClearInlineClass = 'text-xs font-bold text-app-accent-strong transition-colors hover:text-app-text';

const filterChipClass =
  'inline-flex min-h-9 items-center gap-2 rounded-full border border-app-border bg-app-chip px-3 py-1.5 text-sm font-bold text-app-chip-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_46%,var(--border))] hover:bg-app-surface-strong';

const filterChipActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_70%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-strong))] text-app-accent-strong';
