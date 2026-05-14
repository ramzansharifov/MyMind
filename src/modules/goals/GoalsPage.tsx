import { SimpleEntityPage } from '../../shared/components/SimpleEntityPage';
import type { Goal } from './types';

export function GoalsPage({ goals, onChange }: { goals: Goal[]; onChange: (goals: Goal[]) => void }) {
  return (
    <SimpleEntityPage
      title="Goals"
      subtitle="Month, quarter, year, and long-term outcomes."
      addLabel="Add goal"
      emptyTitle="No goals"
      emptyMessage="Create a goal to give projects and routines a direction."
      items={goals}
      onChange={onChange}
      searchKeys={['title', 'description', 'metric']}
      summary={(goal) => `${goal.status} / ${goal.horizon} / ${goal.progress}% ${goal.metric || ''}`}
      fields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'status', label: 'Status', type: 'select', options: ['active', 'completed', 'paused', 'archived'] },
        { key: 'horizon', label: 'Horizon', type: 'select', options: ['month', 'quarter', 'year', 'long-term'] },
        { key: 'targetDate', label: 'Target date', type: 'date' },
        { key: 'progress', label: 'Progress %', type: 'number' },
        { key: 'metric', label: 'Metric' },
        { key: 'tags', label: 'Tags', type: 'tags' },
      ]}
    />
  );
}
