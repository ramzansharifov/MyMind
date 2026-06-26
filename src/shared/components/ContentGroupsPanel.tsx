import { useState, type FormEvent, type ReactNode } from 'react';
import { Edit3, UserPlus } from 'lucide-react';
import { DeleteButton } from './ActionButtons';
import { FormModal, TextField } from '../forms';
import { GroupsSidebar } from './GroupsSidebar';
import { ItemSelectionModal } from './ItemSelectionModal';
import { useI18n } from '../i18n';
import { createId } from '../utils/idGenerator';
import type { ContentGroup } from '../types/common';

interface ContentGroupsPanelProps<TGroup extends ContentGroup = ContentGroup> {
  groups: TGroup[];
  sidebarGroups?: TGroup[];
  totalCount: number;
  activeGroupId: string;
  counts?: Record<string, number>;
  getGroupCount?: (groupId: string) => number;
  onActiveGroupChange: (groupId: string) => void;
  onGroupsChange: (groups: TGroup[]) => void;
  onCreateGroup?: () => void;
  createGroupDialog?: ReactNode;
  createLabel?: string;
  includeAllGroup?: boolean;
}

export function ContentGroupsPanel<TGroup extends ContentGroup = ContentGroup>({
  groups,
  sidebarGroups,
  totalCount,
  activeGroupId,
  counts = {},
  getGroupCount,
  onActiveGroupChange,
  onGroupsChange,
  onCreateGroup,
  createGroupDialog,
  createLabel = 'Add group',
  includeAllGroup = true,
}: ContentGroupsPanelProps<TGroup>) {
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const allGroup = { id: 'all', title: 'All', createdAt: 'system', updatedAt: 'system' } as TGroup;
  const defaultGroups = includeAllGroup ? [allGroup, ...groups] : groups;
  const visibleGroups = sidebarGroups ?? defaultGroups;
  const resolveGroupCount = getGroupCount ?? ((groupId: string) => (groupId === 'all' ? totalCount : counts[groupId] ?? 0));

  function addGroup(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const title = newGroupTitle.trim();
    if (!title) {
      return;
    }

    const timestamp = new Date().toISOString();
    const group = {
      id: createId('content-group'),
      title,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as TGroup;

    onGroupsChange([...groups, group]);
    onActiveGroupChange(group.id);
    setNewGroupTitle('');
    setIsCreatingGroup(false);
  }

  return (
    <GroupsSidebar
      title="Groups"
      totalCount={totalCount}
      groups={visibleGroups}
      activeGroupId={activeGroupId}
      getGroupCount={resolveGroupCount}
      onActiveGroupChange={onActiveGroupChange}
      onCreateGroup={onCreateGroup ?? (() => setIsCreatingGroup(true))}
      createLabel={createLabel}
    >
      {createGroupDialog}
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
    </GroupsSidebar>
  );
}

interface ContentGroupWorkspaceHeaderProps<T, TGroup extends ContentGroup & { kind?: string } = ContentGroup & { kind?: string }> {
  groups: TGroup[];
  activeGroupId: string;
  itemCount: number;
  onRenameGroup: (groupId: string, title: string) => void;
  onDeleteGroup: (groupId: string) => void;
  canManageGroup?: (group: TGroup) => boolean;
  actions?: ReactNode;
  availableItems?: T[];
  getItemLabel?: (item: T) => string;
  getItemDescription?: (item: T) => string;
  onAddItemsToGroup?: (items: T[]) => void;
}

export function ContentGroupWorkspaceHeader<
  T extends { id: string },
  TGroup extends ContentGroup & { kind?: string } = ContentGroup & { kind?: string },
>({
  groups,
  activeGroupId,
  itemCount,
  onRenameGroup,
  onDeleteGroup,
  canManageGroup = () => true,
  actions,
  availableItems,
  getItemLabel,
  getItemDescription,
  onAddItemsToGroup,
}: ContentGroupWorkspaceHeaderProps<T, TGroup>) {
  const { t } = useI18n();
  const group = groups.find((item) => item.id === activeGroupId);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingItems, setIsAddingItems] = useState(false);
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
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line-soft)] pb-3">
      <div className="min-w-0">
        <h2 className="truncate text-xl font-extrabold text-app-text">{selectedGroup.title}</h2>
        <small className="text-app-muted">
          {itemCount} {t('items')}
        </small>
      </div>
      {canManageSelectedGroup || actions || (onAddItemsToGroup && activeGroupId !== 'all') ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
          {onAddItemsToGroup && activeGroupId !== 'all' ? (
            <button
              className={ghostButtonClass}
              type="button"
              onClick={() => setIsAddingItems(true)}
            >
              <UserPlus size={16} aria-hidden="true" />
              <span>{t('Add items')}</span>
            </button>
          ) : null}
          {canManageSelectedGroup ? (
            <>
              <button
                className={ghostButtonClass}
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

      {isAddingItems && availableItems && getItemLabel && onAddItemsToGroup ? (
        <ItemSelectionModal
          title="Add items to group"
          items={availableItems}
          getItemLabel={getItemLabel}
          getItemDescription={getItemDescription}
          onCancel={() => setIsAddingItems(false)}
          onConfirm={(selected) => {
            onAddItemsToGroup(selected);
            setIsAddingItems(false);
          }}
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
  return (
    <FormModal title={title} saveLabel={saveLabel} onCancel={onCancel} onSubmit={onSubmit}>
      <TextField label="Group name" autoFocus required value={value} placeholder="New group" onChange={(event) => onChange(event.target.value)} />
    </FormModal>
  );
}

const ghostButtonClass =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-control border border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] px-3.5 py-2.5 text-sm font-bold text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] transition-[border-color,background,color,transform,box-shadow] hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)] hover:text-[color-mix(in_srgb,var(--accent-strong)_92%,white)] hover:shadow-[0_8px_22px_var(--shadow)]';
