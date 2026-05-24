import { useState, type FormEvent } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { ContentGroupWorkspaceHeader, GroupFormDialog } from '../../shared/components/ContentGroupsPanel';
import { EmptyState } from '../../shared/components/EmptyState';
import { PageHeader } from '../../shared/components/PageHeader';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
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
      <div className="todo-workspace">
        <div className="todo-filters-row">
          <CollapsibleFilters
            query={query}
            placeholder="Search tasks"
            isOpen={filtersOpen}
            activeCount={activeFilterCount}
            onQueryChange={setQuery}
            onToggle={() => setFiltersOpen((current) => !current)}
          >
              <div className="filter-choice-group">
                <div className="filter-choice-heading">
                  <strong>{t('Priority')}</strong>
                  {priorities.length > 0 ? <button type="button" onClick={() => setPriorities([])}>{t('Clear')}</button> : null}
                </div>
                <div className="filter-chip-row">
                  {priorityFilterOptions.map((option) => (
                    <button
                      className={`filter-chip${priorities.includes(option.value) ? ' active' : ''}`}
                      type="button"
                      key={option.value}
                      aria-pressed={priorities.includes(option.value)}
                      onClick={() => togglePriorityFilter(option.value)}
                    >
                      <span className={`filter-chip-dot ${option.value}`} aria-hidden="true" />
                      {t(option.label)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filter-choice-group">
                <div className="filter-choice-heading">
                  <strong>{t('Tag')}</strong>
                  {tags.length > 0 ? <button type="button" onClick={() => setTags([])}>{t('Clear')}</button> : null}
                </div>
                <div className="filter-chip-row">
                  {availableTags.length > 0 ? (
                    availableTags.map((item) => (
                      <button
                        className={`filter-chip${tags.includes(item) ? ' active' : ''}`}
                        type="button"
                        key={item}
                        aria-pressed={tags.includes(item)}
                        onClick={() => toggleTagFilter(item)}
                      >
                        {item}
                      </button>
                    ))
                  ) : (
                    <span className="muted-text">{t('No tags yet.')}</span>
                  )}
                </div>
              </div>
              {activeFilterCount > 0 ? (
                <button className="button ghost filter-clear-button" type="button" onClick={clearFilters}>
                  {t('Clear filters')}
                </button>
              ) : null}
          </CollapsibleFilters>
        </div>

        <aside className="panel todo-groups-panel">
          <div className="section-heading content-groups-heading">
            <div className="content-groups-heading-main">
              <h2>{t('Groups')}</h2>
              <span className="rating-pill">{activeTodos.length}</span>
            </div>
            <AddButton className="content-group-add-button" iconOnly label="Add group" onClick={() => setIsCreatingGroup(true)} />
          </div>

          <div className="todo-group-tabs" role="tablist" aria-label={t('Task groups')}>
            {groups.map((group) => {
              const count = activeTodos.filter((todo) => matchesGroup(todo, group.id)).length;

              return (
                <button
                  className={`todo-group-tab ${activeGroupId === group.id ? 'active' : ''}`}
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                >
                  <span>{t(group.title)}</span>
                  <small>{count}</small>
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

        <section className="todo-list-panel">
          {query.trim() ? (
            <div className="content-group-workspace-header">
              <div className="content-group-workspace-copy">
                <span className="eyebrow">{t('Search results')}</span>
                <h2>{t('Search results')}</h2>
                <small>
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

          <div className="stack">
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
