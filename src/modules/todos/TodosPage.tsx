import { useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { EmptyState } from '../../shared/components/EmptyState';
import { GroupedCollectionLayout } from '../../shared/components/GroupedCollectionLayout';
import { ModulePageShell } from '../../shared/components/ModulePageShell';
import { useI18n } from '../../shared/i18n';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { cn } from '../../shared/utils/classNames';
import { filterTodos, todoGroups, todoItems, todoTags } from './todoUtils';
import { TodoCard } from './TodoCard';
import { TodoForm } from './TodoForm';
import type { TodoData, TodoGroup, TodoItem, TodoPriority } from './types';

interface TodosPageProps {
  data: TodoData;
  onChange: (data: TodoData) => void;
}

export function TodosPage({ data, onChange }: TodosPageProps) {
  const [query, setQuery] = useState('');
  const [priorities, setPriorities] = useState<TodoPriority[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState('all');
  const [editing, setEditing] = useState<TodoItem | null | undefined>(undefined);
  const [draftGroupId, setDraftGroupId] = useState('pending');
  const items = todoItems(data);
  const groups = todoGroups(data);
  const customGroups = data.groups ?? [];
  const activeTodos = items.filter((todo) => !isHiddenFromRegularLists(todo));
  const searched = filterTodos(activeTodos, query, 'all', 'all', '');
  const filteredByButtons = searched.filter((todo) => {
    const matchesPriority = priorities.length === 0 || priorities.includes(todo.priority);
    const matchesTags = tags.length === 0 || tags.some((item) => todo.tags.includes(item));
    return matchesPriority && matchesTags;
  });
  const filtered = (query.trim() ? filteredByButtons : filteredByButtons.filter((todo) => matchesGroup(todo, activeGroupId))).sort(
    (a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt),
  );
  const { t } = useI18n();
  const availableTags = todoTags(activeTodos);
  const activeFilterCount = priorities.length + tags.length;

  function saveTodo(todo: TodoItem) {
    const exists = items.some((item) => item.id === todo.id);
    onChange({ ...data, items: exists ? items.map((item) => (item.id === todo.id ? todo : item)) : [todo, ...items] });
    setEditing(undefined);
    setDraftGroupId('pending');
  }

  function toggle(todo: TodoItem) {
    const timestamp = new Date().toISOString();
    const nextStatus = todo.status === 'completed' ? 'pending' : 'completed';
    saveTodo({ ...todo, status: nextStatus, completedAt: nextStatus === 'completed' ? timestamp : null, updatedAt: timestamp });
  }

  function archive(todo: TodoItem) {
    onChange({ ...data, items: items.map((item) => (item.id === todo.id ? archiveEntity(item, { setArchivedStatus: true }) : item)) });
  }

  function moveToTrash(todo: TodoItem) {
    onChange({ ...data, items: items.map((item) => (item.id === todo.id ? trashEntity(item) : item)) });
  }

  function togglePin(todo: TodoItem) {
    const timestamp = new Date().toISOString();
    onChange({ ...data, items: items.map((item) => (item.id === todo.id ? { ...item, pinnedAt: item.pinnedAt ? null : timestamp, updatedAt: timestamp } : item)) });
  }

  function saveGroups(nextGroups: TodoGroup[]) {
    const timestamp = new Date().toISOString();
    const systemIds = new Set(['all', 'pending', 'completed']);
    onChange({
      ...data,
      groups: nextGroups
        .filter((group) => !systemIds.has(group.id))
        .map((group) => ({
          ...group,
          kind: group.kind ?? 'custom',
          createdAt: group.createdAt ?? timestamp,
          updatedAt: group.updatedAt ?? timestamp,
        })),
    });
  }

  function renameGroup(groupId: string, title: string) {
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      groups: customGroups.map((group) => (group.id === groupId ? { ...group, title, updatedAt: timestamp } : group)),
    });
  }

  function deleteGroup(groupId: string) {
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      groups: customGroups.filter((group) => group.id !== groupId),
      items: items.map((todo) => (todo.groupId === groupId ? { ...todo, groupId: 'pending', updatedAt: timestamp } : todo)),
    });
    setActiveGroupId('all');
  }

  function defaultGroupForNewTask() {
    if (activeGroupId === 'all' || activeGroupId === 'completed') {
      return 'pending';
    }
    return activeGroupId;
  }

  function openNewTask(groupId = defaultGroupForNewTask()) {
    setDraftGroupId(groupId);
    setEditing(null);
  }

  function openEditTask(todo: TodoItem) {
    setDraftGroupId(todo.groupId);
    setEditing(todo);
  }

  function togglePriorityFilter(value: TodoPriority) {
    setPriorities((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function toggleTagFilter(value: string) {
    setTags((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  }

  function clearFilters() {
    setPriorities([]);
    setTags([]);
  }

  return (
    <ModulePageShell
      title="Todo"
      subtitle="Grouped tasks with global search, tags, priority, and due dates."
      actions={<AddButton label="Add task" onClick={() => openNewTask()} />}
    >
      <GroupedCollectionLayout<TodoItem, TodoGroup>
        filters={
          <CollapsibleFilters
            query={query}
            placeholder="Search tasks"
            isOpen={filtersOpen}
            activeCount={activeFilterCount}
            onQueryChange={setQuery}
            onToggle={() => setFiltersOpen((current) => !current)}
          >
            <div className={filterChoiceGroupClass}>
              <div className={filterChoiceHeadingClass}>
                <strong className="text-app-text">{t('Priority')}</strong>
                {priorities.length > 0 ? <button className={filterClearInlineClass} type="button" onClick={() => setPriorities([])}>{t('Clear')}</button> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {priorityFilterOptions.map((option) => (
                  <button
                    className={cn(filterChipClass, priorities.includes(option.value) && filterChipActiveClass)}
                    type="button"
                    key={option.value}
                    aria-pressed={priorities.includes(option.value)}
                    onClick={() => togglePriorityFilter(option.value)}
                  >
                    <span className={cn(priorityDotClass, priorityDotClasses[option.value])} aria-hidden="true" />
                    {t(option.label)}
                  </button>
                ))}
              </div>
            </div>
            <div className={filterChoiceGroupClass}>
              <div className={filterChoiceHeadingClass}>
                <strong className="text-app-text">{t('Tag')}</strong>
                {tags.length > 0 ? <button className={filterClearInlineClass} type="button" onClick={() => setTags([])}>{t('Clear')}</button> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.length > 0 ? (
                  availableTags.map((item) => (
                    <button
                      className={cn(filterChipClass, tags.includes(item) && filterChipActiveClass)}
                      type="button"
                      key={item}
                      aria-pressed={tags.includes(item)}
                      onClick={() => toggleTagFilter(item)}
                    >
                      {item}
                    </button>
                  ))
                ) : (
                  <span className="text-sm text-app-muted">{t('No tags yet.')}</span>
                )}
              </div>
            </div>
            {activeFilterCount > 0 ? (
              <button className={ghostButtonClass} type="button" onClick={clearFilters}>
                {t('Clear filters')}
              </button>
            ) : null}
          </CollapsibleFilters>
        }
        groups={customGroups}
        sidebarGroups={groups}
        headerGroups={groups}
        totalCount={activeTodos.length}
        activeGroupId={activeGroupId}
        getGroupCount={(groupId) => activeTodos.filter((todo) => matchesGroup(todo, groupId)).length}
        itemCount={filtered.length}
        canManageGroup={(group) => group.kind === 'custom'}
        onActiveGroupChange={setActiveGroupId}
        onGroupsChange={saveGroups}
        onRenameGroup={renameGroup}
        onDeleteGroup={deleteGroup}
        createLabel="Add task group"
        workspaceHeader={query.trim() ? <SearchResultsHeader count={filtered.length} /> : undefined}
      >
        {filtered.length === 0 ? (
          <EmptyState title="No tasks found" message="Add a task or change the filters." />
        ) : null}

        <div className="grid gap-3.5">
          {filtered.map((todo) => (
            <TodoCard
              todo={todo}
              key={todo.id}
              groupTitle={groups.find((group) => group.id === todo.groupId)?.title}
              onToggle={() => toggle(todo)}
              onEdit={() => openEditTask(todo)}
              onPin={() => togglePin(todo)}
              onArchive={() => archive(todo)}
              onTrash={() => moveToTrash(todo)}
            />
          ))}
        </div>
      </GroupedCollectionLayout>
      {editing !== undefined ? (
        <TodoForm
          todo={editing}
          groups={groups}
          defaultGroupId={draftGroupId}
          onCancel={() => {
            setDraftGroupId('pending');
            setEditing(undefined);
          }}
          onSave={saveTodo}
        />
      ) : null}
    </ModulePageShell>
  );
}

function SearchResultsHeader({ count }: { count: number }) {
  const { t } = useI18n();

  return (
    <div className="mb-4 border-b border-[var(--line-soft)] pb-3">
      <div className="min-w-0">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-app-accent-strong">{t('Search results')}</span>
        <h2 className="text-xl font-extrabold text-app-text">{t('Search results')}</h2>
        <small className="text-app-muted">
          {count} {t('tasks')}
        </small>
      </div>
    </div>
  );
}

function matchesGroup(todo: TodoItem, groupId: string) {
  if (groupId === 'all') {
    return true;
  }
  if (groupId === 'pending') {
    return todo.status !== 'completed';
  }
  if (groupId === 'completed') {
    return todo.status === 'completed';
  }
  return todo.groupId === groupId;
}

const priorityFilterOptions: Array<{ value: TodoPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const filterChoiceGroupClass = 'grid gap-2';

const filterChoiceHeadingClass = 'flex items-center justify-between gap-3 text-sm';

const filterClearInlineClass = 'text-xs font-bold text-app-accent-strong transition-colors hover:text-app-text';

const filterChipClass =
  'inline-flex min-h-9 items-center gap-2 rounded-full border border-app-border bg-app-chip px-3 py-1.5 text-sm font-bold text-app-chip-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_46%,var(--border))] hover:bg-app-surface-strong';

const filterChipActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_70%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-strong))] text-app-accent-strong';

const priorityDotClass = 'h-2.5 w-2.5 rounded-full';

const priorityDotClasses: Record<TodoPriority, string> = {
  low: 'bg-app-success',
  medium: 'bg-app-warning',
  high: 'bg-app-danger',
};

const ghostButtonClass =
  'inline-flex min-h-control w-fit items-center justify-center rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-colors hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)]';
