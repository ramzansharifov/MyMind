import { useState, type FormEvent } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { ContentGroupWorkspaceHeader, GroupFormDialog } from '../../shared/components/ContentGroupsPanel';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { cn } from '../../shared/utils/classNames';
import { createId } from '../../shared/utils/idGenerator';
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
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editing, setEditing] = useState<TodoItem | null | undefined>(undefined);
  const [draftGroupId, setDraftGroupId] = useState('pending');
  const items = todoItems(data);
  const groups = todoGroups(data);
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

  function addGroup(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const title = newGroupTitle.trim();
    if (!title) {
      return;
    }
    const timestamp = new Date().toISOString();
    const group: TodoGroup = {
      id: createId('todo-group'),
      title,
      kind: 'custom',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    onChange({ ...data, groups: [...data.groups, group] });
    setActiveGroupId(group.id);
    setNewGroupTitle('');
    setIsCreatingGroup(false);
  }

  function renameGroup(groupId: string, title: string) {
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      groups: data.groups.map((group) => (group.id === groupId ? { ...group, title, updatedAt: timestamp } : group)),
    });
  }

  function deleteGroup(groupId: string) {
    const timestamp = new Date().toISOString();
    onChange({
      ...data,
      groups: data.groups.filter((group) => group.id !== groupId),
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
    <section>
      <PageHeader
        title="Todo"
        subtitle="Grouped tasks with global search, tags, priority, and due dates."
        actions={
          <AddButton label="Add task" onClick={() => openNewTask()} />
        }
      />
      <div className="grid grid-cols-[260px_minmax(0,1fr)] items-start gap-[18px] max-[980px]:grid-cols-1">
        <div className="col-span-full">
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
        </div>

        <aside className="grid content-start gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <h2 className="truncate text-lg font-extrabold">{t('Groups')}</h2>
              <span className={countPillClass}>{activeTodos.length}</span>
            </div>
            <AddButton iconOnly label="Add group" onClick={() => setIsCreatingGroup(true)} />
          </div>

          <div className="grid gap-2" role="tablist" aria-label={t('Task groups')}>
            {groups.map((group) => {
              const count = activeTodos.filter((todo) => matchesGroup(todo, group.id)).length;

              return (
                <button
                  className={cn(groupTabClass, activeGroupId === group.id && groupTabActiveClass)}
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                >
                  <span className="min-w-0 truncate">{t(group.title)}</span>
                  <small className="shrink-0 text-xs font-extrabold text-app-muted">{count}</small>
                </button>
              );
            })}
          </div>

          {isCreatingGroup ? (
            <GroupFormDialog
              title="Create group"
              saveLabel="Add group"
              value={newGroupTitle}
              onChange={setNewGroupTitle}
              onCancel={() => {
                setIsCreatingGroup(false);
                setNewGroupTitle('');
              }}
              onSubmit={addGroup}
            />
          ) : null}
        </aside>

        <section className="min-w-0 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel">
          {query.trim() ? (
            <div className="mb-4 border-b border-[var(--line-soft)] pb-3">
              <div className="min-w-0">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-app-accent-strong">{t('Search results')}</span>
                <h2 className="text-xl font-extrabold text-app-text">{t('Search results')}</h2>
                <small className="text-app-muted">
                  {filtered.length} {t('tasks')}
                </small>
              </div>
            </div>
          ) : (
            <ContentGroupWorkspaceHeader
              groups={groups}
              activeGroupId={activeGroupId}
              itemCount={filtered.length}
              onRenameGroup={renameGroup}
              onDeleteGroup={deleteGroup}
              canManageGroup={(group) => group.kind === 'custom'}
            />
          )}

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
        </section>
      </div>
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
    </section>
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

const countPillClass =
  'inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-app-border bg-app-chip px-2 text-xs font-extrabold text-app-chip-text';

const groupTabClass =
  'grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-panel border border-app-border bg-app-surface-soft px-3 py-2.5 text-left text-sm font-bold text-app-text transition-colors hover:border-[color-mix(in_srgb,var(--accent)_38%,var(--border))] hover:bg-app-surface-strong';

const groupTabActiveClass =
  'border-[color-mix(in_srgb,var(--accent)_62%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--surface-strong))] text-app-accent-strong shadow-[inset_3px_0_0_var(--accent)]';
