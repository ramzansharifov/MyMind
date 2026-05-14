import { SimpleEntityPage } from '../../shared/components/SimpleEntityPage';
import type { Project } from './types';

export function ProjectsPage({ projects, onChange }: { projects: Project[]; onChange: (projects: Project[]) => void }) {
  return (
    <SimpleEntityPage
      title="Projects"
      subtitle="Longer personal efforts with status, next action, and context."
      addLabel="Add project"
      emptyTitle="No projects"
      emptyMessage="Create a project for anything bigger than a task."
      items={projects}
      onChange={onChange}
      searchKeys={['title', 'description', 'area', 'nextAction']}
      summary={(project) => `${project.status} / ${project.area || 'No area'} / next: ${project.nextAction || 'None'}`}
      fields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        {
          key: 'status',
          label: 'Status',
          type: 'card-select',
          options: ['active', 'paused', 'completed', 'archived'],
          optionDescriptions: {
            active: 'In progress',
            paused: 'Temporarily stopped',
            completed: 'Finished project',
            archived: 'Hidden from regular lists',
          },
        },
        { key: 'area', label: 'Area' },
        { key: 'nextAction', label: 'Next action' },
        { key: 'deadline', label: 'Deadline', type: 'date' },
        { key: 'tags', label: 'Tags', type: 'tags' },
      ]}
    />
  );
}
