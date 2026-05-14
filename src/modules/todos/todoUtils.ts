import { isFuture, isToday } from '../../shared/utils/dateUtils';
import type { TodoData, TodoGroup, TodoItem, TodoPriority, TodoStatus } from './types';

export const DEFAULT_TODO_GROUPS: TodoGroup[] = [
  {
    id: 'all',
    title: 'All',
    kind: 'all',
    createdAt: 'system',
    updatedAt: 'system',
  },
  {
    id: 'pending',
    title: 'Pending',
    kind: 'pending',
    createdAt: 'system',
    updatedAt: 'system',
  },
  {
    id: 'completed',
    title: 'Completed',
    kind: 'completed',
    createdAt: 'system',
    updatedAt: 'system',
  },
];

export function todoItems(data: TodoData | TodoItem[]) {
  return Array.isArray(data) ? data : data.items;
}

export function todoGroups(data: TodoData | TodoItem[]) {
  const customGroups = Array.isArray(data) ? [] : data.groups.filter((group) => !DEFAULT_TODO_GROUPS.some((item) => item.id === group.id));
  return [...DEFAULT_TODO_GROUPS, ...customGroups];
}

export function todoTags(todos: TodoItem[]) {
  return Array.from(new Set(todos.flatMap((todo) => todo.tags))).sort();
}

export function filterTodos(
  todos: TodoItem[],
  query: string,
  status: TodoStatus | 'all',
  priority: TodoPriority | 'all',
  tag: string,
) {
  const normalized = query.trim().toLowerCase();
  return todos.filter((todo) => {
    const matchesQuery =
      !normalized ||
      todo.title.toLowerCase().includes(normalized) ||
      todo.description.toLowerCase().includes(normalized) ||
      todo.tags.some((item) => item.toLowerCase().includes(normalized));
    const matchesStatus = status === 'all' || todo.status === status;
    const matchesPriority = priority === 'all' || todo.priority === priority;
    const matchesTag = !tag || todo.tags.includes(tag);
    return matchesQuery && matchesStatus && matchesPriority && matchesTag;
  });
}

export function todayTodos(todos: TodoItem[]) {
  return todos.filter((todo) => todo.status !== 'completed' && isToday(todo.dueDate));
}

export function upcomingTodos(todos: TodoItem[]) {
  return todos.filter((todo) => todo.status !== 'completed' && isFuture(todo.dueDate) && !isToday(todo.dueDate));
}
