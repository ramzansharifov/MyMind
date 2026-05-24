import { useState, type FormEvent, type ReactNode } from 'react';
import { Edit3 } from 'lucide-react';
import { AddButton, CancelButton, DeleteButton, SaveButton } from './ActionButtons';
import { ModalPortal } from './ModalPortal';
import { useI18n } from '../i18n/I18nProvider';
import { createId } from '../utils/idGenerator';
import type { ContentGroup } from '../types/common';

interface ContentGroupsPanelProps {
  groups: ContentGroup[];
  totalCount: number;
  activeGroupId: string;
  counts: Record<string, number>;
  onActiveGroupChange: (groupId: string) => void;
  onGroupsChange: (groups: ContentGroup[]) => void;
}

export function ContentGroupsPanel({
  groups,
  totalCount,
  activeGroupId,
  counts,
  onActiveGroupChange,
  onGroupsChange,
}: ContentGroupsPanelProps) {
  const { t } = useI18n();
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const allGroups = [{ id: 'all', title: 'All', createdAt: 'system', updatedAt: 'system' }, ...groups];

  function addGroup(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const title = newGroupTitle.trim();
    if (!title) {
      return;
    }

    const timestamp = new Date().toISOString();
    const group: ContentGroup = {
      id: createId('content-group'),
      title,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    onGroupsChange([...groups, group]);
    onActiveGroupChange(group.id);
    setNewGroupTitle('');
    setIsCreatingGroup(false);
  }

  return (
    <aside className="panel todo-groups-panel content-groups-panel">
      <div className="section-heading content-groups-heading">
        <div className="content-groups-heading-main">
          <h2>{t('Groups')}</h2>
          <span className="rating-pill">{totalCount}</span>
        </div>
        <AddButton className="content-group-add-button" iconOnly label="Add group" onClick={() => setIsCreatingGroup(true)} />
      </div>

      <div className="todo-group-tabs" role="tablist" aria-label={t('Groups')}>
        {allGroups.map((group) => (
          <button
            className={`todo-group-tab ${activeGroupId === group.id ? 'active' : ''}`}
            key={group.id}
            type="button"
            onClick={() => onActiveGroupChange(group.id)}
          >
            <span>{t(group.title)}</span>
            <small>{group.id === 'all' ? totalCount : counts[group.id] ?? 0}</small>
          </button>
        ))}
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
  );
}

interface ContentGroupWorkspaceHeaderProps {
  groups: Array<ContentGroup & { kind?: string }>;
  activeGroupId: string;
  itemCount: number;
  onRenameGroup: (groupId: string, title: string) => void;
  onDeleteGroup: (groupId: string) => void;
  canManageGroup?: (group: ContentGroup & { kind?: string }) => boolean;
  actions?: ReactNode;
}

export function ContentGroupWorkspaceHeader({
  groups,
  activeGroupId,
  itemCount,
  onRenameGroup,
  onDeleteGroup,
  canManageGroup = () => true,
  actions,
}: ContentGroupWorkspaceHeaderProps) {
  const { t } = useI18n();
  const group = groups.find((item) => item.id === activeGroupId);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(group?.title ?? '');

  if (!group) {
    return null;
  }
  const selectedGroup = group;
  const canManageSelectedGroup = canManageGroup(selectedGroup);

  function renameGroup(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }
    onRenameGroup(selectedGroup.id, trimmedTitle);
    setIsEditing(false);
  }

  return (
    <div className="content-group-workspace-header">
      <div className="content-group-workspace-copy">
        <h2>{selectedGroup.title}</h2>
        <small>
          {itemCount} {t('items')}
        </small>
      </div>
      {canManageSelectedGroup || actions ? (
        <div className="content-group-actions">
          {actions}
          {canManageSelectedGroup ? (
            <>
              <button
                className="button ghost content-group-action-button"
                type="button"
                onClick={() => {
                  setTitle(selectedGroup.title);
                  setIsEditing(true);
                }}
              >
                <Edit3 size={16} aria-hidden="true" />
                <span>{t('Edit')}</span>
              </button>
              <DeleteButton
                className="content-group-action-button"
                iconOnly={false}
                label="Delete group"
                confirmTitle="Delete group?"
                confirmMessage="Items from this group will move to No group."
                onConfirm={() => onDeleteGroup(selectedGroup.id)}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {isEditing ? (
        <GroupFormDialog
          title="Rename group"
          saveLabel="Save"
          value={title}
          onChange={setTitle}
          onCancel={() => setIsEditing(false)}
          onSubmit={renameGroup}
        />
      ) : null}

    </div>
  );
}

interface GroupFormDialogProps {
  title: string;
  saveLabel: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function GroupFormDialog({ title, saveLabel, value, onChange, onCancel, onSubmit }: GroupFormDialogProps) {
  const { t } = useI18n();

  return (
    <ModalPortal>
    <div
      className="dialog-backdrop form-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <form className="panel form-panel entity-form content-group-dialog" onSubmit={onSubmit}>
        <div className="form-header">
          <div>
            <h2>{t(title)}</h2>
          </div>
        </div>
        <label>
          {t('Group name')}
          <input autoFocus required value={value} placeholder={t('New group')} onChange={(event) => onChange(event.target.value)} />
        </label>
        <div className="form-actions">
          <CancelButton onClick={onCancel} />
          <SaveButton label={saveLabel} />
        </div>
      </form>
    </div>
    </ModalPortal>
  );
}
