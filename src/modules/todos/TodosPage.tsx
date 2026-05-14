import { useState } from 'react';
import { AddButton } from '../../shared/components/ActionButtons';
import { EmptyState } from '../../shared/components/EmptyState';
import { FilterBar } from '../../shared/components/FilterBar';
import { PageHeader } from '../../shared/components/PageHeader';
import { SearchInput } from '../../shared/components/SearchInput';
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
  const [priority, setPriority] = useState<TodoPriority | 'all'>('all');
  const [tag, setTag] = useState('');
  const [activeGroupId, setActiveGroupId] = useState('all');
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [editing, setEditing] = useState<TodoItem | null | undefined>(undefined);
  const [draftGroupId, setDraftGroupId] = useState('pending');
  const items = todoItems(data);
  const groups = todoGroups(data);
  const activeTodos = items.filter((todo) => !isHiddenFromRegularLists(todo));
  const searched = filterTodos(activeTodos, query, 'all', priority, tag);
  const filtered = (query.trim() ? searched : searched.filter((todo) => matchesGroup(todo, activeGroupId))).sort(
    (a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || b.updatedAt.localeCompare(a.updatedAt),
  );
  const { t } = useI18n();
  const selectedGroup = groups.find((group) => group.id === activeGroupId);

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

  function addGroup() {
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
          <FilterBar>
            <SearchInput value={query} placeholder="Search tasks" onChange={setQuery} />
            <label>
              {t('Priority')}
              <select value={priority} onChange={(event) => setPriority(event.target.value as TodoPriority | 'all')}>
                <option value="all">{t('All')}</option>
                <option value="low">{t('Low')}</option>
                <option value="medium">{t('Medium')}</option>
                <option value="high">{t('High')}</option>
              </select>
            </label>
            <label>
              {t('Tag')}
              <select value={tag} onChange={(event) => setTag(event.target.value)}>
                <option value="">{t('All')}</option>
                {todoTags(activeTodos).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </FilterBar>
        </div>

        <aside className="panel todo-groups-panel">
          <div className="section-heading">
            <h2>{t('Groups')}</h2>
            <span className="rating-pill">{activeTodos.length}</span>
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

          <div className="inline-form inline-form-stacked todo-group-create">
            <input
              value={newGroupTitle}
              placeholder={t('New group')}
              onChange={(event) => setNewGroupTitle(event.target.value)}
            />
            <AddButton label="Add group" onClick={addGroup} />
          </div>
        </aside>

        <section className="todo-list-panel">
          <section className="panel section-block">
            <div className="section-heading">
              <div>
                <h2>{query.trim() ? t('Search results') : t(selectedGroup?.title ?? 'All')}</h2>
                <p className="muted-text">
                  {filtered.length} {t('tasks')}
                </p>
              </div>

              <AddButton className="todo-group-add-button" iconOnly label="Add task" onClick={() => openNewTask()} />
            </div>

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
