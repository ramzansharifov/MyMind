import { useState, type FormEvent } from 'react';
import { AddButton, ArchiveButton, DeleteButton, EditButton, PinButton } from '../../shared/components/ActionButtons';
import { CollapsibleFilters } from '../../shared/components/CollapsibleFilters';
import { EntityForm } from '../../shared/forms';
import { EmptyState } from '../../shared/components/EmptyState';
import { GroupedCollectionLayout } from '../../shared/components/GroupedCollectionLayout';
import { ModulePageShell } from '../../shared/components/ModulePageShell';
import { useI18n } from '../../shared/i18n';
import type { ContentGroup } from '../../shared/types/common';
import { archiveEntity, isHiddenFromRegularLists, trashEntity } from '../../shared/utils/archiveUtils';
import { cn } from '../../shared/utils/classNames';
import { countItemsByContentGroup, matchesContentGroup } from '../../shared/utils/contentGroupUtils';
import { joinCsv, splitCsv } from '../../shared/utils/formatters';
import { createId } from '../../shared/utils/idGenerator';
import type { Contact, ContactsData } from './types';

interface ContactsPageProps {
  data: ContactsData;
  onChange: (data: ContactsData) => void;
}

export function ContactsPage({ data, onChange }: ContactsPageProps) {
  const contacts = data.items;
  const groups = data.groups;
  const [query, setQuery] = useState('');
  const [activeGroupId, setActiveGroupId] = useState('all');
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined);
  const { t } = useI18n();
  const normalized = query.trim().toLowerCase();
  const activeContacts = contacts.filter((contact) => !isHiddenFromRegularLists(contact));
  const searchedContacts = activeContacts
    .filter((contact) =>
      [
        contact.name,
        contact.relationship,
        contact.phone,
        contact.email,
        contact.facebook,
        contact.whatsapp,
        contact.telegram,
        contact.instagram,
        contact.notes,
        (contact.tags ?? []).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  const visibleContacts = searchedContacts.filter((contact) => matchesContentGroup(contact.groupId, activeGroupId))
    .sort((a, b) => Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) || a.name.localeCompare(b.name));
  const groupCounts = countItemsByContentGroup(activeContacts);

  function saveContact(contact: Contact) {
    const exists = contacts.some((item) => item.id === contact.id);
    onChange({ ...data, items: exists ? contacts.map((item) => (item.id === contact.id ? contact : item)) : [contact, ...contacts] });
    setEditing(undefined);
  }

  function togglePin(contact: Contact) {
    const timestamp = new Date().toISOString();
    onChange({ ...data, items: contacts.map((item) => (item.id === contact.id ? { ...item, pinnedAt: item.pinnedAt ? null : timestamp, updatedAt: timestamp } : item)) });
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
      items: contacts.map((contact) => (contact.groupId === groupId ? { ...contact, groupId: null, updatedAt: timestamp } : contact)),
    });
    setActiveGroupId('all');
  }

  function addContactsToGroup(itemsToAdd: Contact[]) {
    const timestamp = new Date().toISOString();
    const idsToAdd = new Set(itemsToAdd.map((item) => item.id));
    onChange({
      ...data,
      items: contacts.map((contact) =>
        idsToAdd.has(contact.id) ? { ...contact, groupId: activeGroupId, updatedAt: timestamp } : contact,
      ),
    });
  }

  return (
    <ModulePageShell
      title="Contacts"
      subtitle="People, relationships, birthdays, memory notes, and social links."
      actions={<AddButton label="Add contact" onClick={() => setEditing(null)} />}
    >
      <GroupedCollectionLayout
        filters={<CollapsibleFilters query={query} placeholder="Search contacts" onQueryChange={setQuery} />}
          groups={groups}
          totalCount={activeContacts.length}
          activeGroupId={activeGroupId}
        groupCounts={groupCounts}
        itemCount={visibleContacts.length}
          onActiveGroupChange={setActiveGroupId}
          onGroupsChange={(groups) => onChange({ ...data, groups })}
        onRenameGroup={renameGroup}
        onDeleteGroup={deleteGroup}
        availableItems={activeContacts.filter((contact) => contact.groupId !== activeGroupId)}
        getItemLabel={(contact) => contact.name}
        getItemDescription={(contact) => contact.relationship || ''}
        onAddItemsToGroup={addContactsToGroup}
      >
          {visibleContacts.length === 0 ? (
            <EmptyState title="No contacts" message="Add people you want to remember and follow up with." />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
              {visibleContacts.map((contact) => (
                <article className={cn(cardClass, contact.pinnedAt && pinnedClass)} key={contact.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-extrabold text-app-text">{contact.name}</h3>
                      <small className="text-app-muted">{contact.relationship || t('Person')}</small>
                    </div>
                    {contact.pinnedAt ? <span className={chipClass}>{t('Pinned')}</span> : null}
                  </div>
                  <section className={contactBlockClass}>
                    <strong className="text-sm text-app-text">{t('Main contact')}</strong>
                    <p className="text-sm text-app-muted">{contact.phone || contact.email || t('No contact details')}</p>
                    {contact.phone ? <small className="text-xs text-app-muted">{contact.phone}</small> : null}
                    {contact.email ? <small className="text-xs text-app-muted">{contact.email}</small> : null}
                  </section>
                  <SocialLinks contact={contact} />
                  {contact.notes ? <p className="text-sm text-app-muted">{contact.notes}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {(contact.tags ?? []).map((tag) => (
                      <span className={chipClass} key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <PinButton isPinned={Boolean(contact.pinnedAt)} onClick={() => togglePin(contact)} />
                    <EditButton onClick={() => setEditing(contact)} />
                    <ArchiveButton label="Archive" onConfirm={() => onChange({ ...data, items: contacts.map((item) => (item.id === contact.id ? archiveEntity(item) : item)) })} />
                    <DeleteButton label="Move to trash" confirmTitle="Move to trash?" confirmMessage="The item will stay in trash for 30 days before permanent deletion." onConfirm={() => onChange({ ...data, items: contacts.map((item) => (item.id === contact.id ? trashEntity(item) : item)) })} />
                  </div>
                </article>
              ))}
            </div>
          )}
      </GroupedCollectionLayout>
      {editing !== undefined ? (
        <ContactForm
          contact={editing}
          groups={groups}
          defaultGroupId={activeGroupId === 'all' ? null : activeGroupId}
          onCancel={() => setEditing(undefined)}
          onSave={saveContact}
        />
      ) : null}
    </ModulePageShell>
  );
}

function SocialLinks({ contact }: { contact: Contact }) {
  const { t } = useI18n();
  const links = [
    ['Facebook', contact.facebook],
    ['WhatsApp', contact.whatsapp],
    ['Telegram', contact.telegram],
    ['Instagram', contact.instagram],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  if (links.length === 0) {
    return null;
  }

  return (
    <section className={contactBlockClass}>
      <strong className="text-sm text-app-text">{t('Social networks and messengers')}</strong>
      <div className="flex flex-wrap gap-2">
        {links.map(([label, value]) => (
          <span className={chipClass} key={label}>{label}: {value}</span>
        ))}
      </div>
    </section>
  );
}

function ContactForm({
  contact,
  groups = [],
  defaultGroupId = null,
  onCancel,
  onSave,
}: {
  contact?: Contact | null;
  groups?: ContentGroup[];
  defaultGroupId?: string | null;
  onCancel: () => void;
  onSave: (contact: Contact) => void;
}) {
  const [draft, setDraft] = useState({
    name: contact?.name ?? '',
    relationship: contact?.relationship ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    facebook: contact?.facebook ?? '',
    whatsapp: contact?.whatsapp ?? '',
    telegram: contact?.telegram ?? '',
    instagram: contact?.instagram ?? '',
    birthday: contact?.birthday?.slice(0, 10) ?? '',
    notes: contact?.notes ?? '',
    groupId: contact?.groupId ?? defaultGroupId ?? '',
    tags: joinCsv(contact?.tags ?? []),
  });
  const { t } = useI18n();

  function update(key: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timestamp = new Date().toISOString();
    onSave({
      ...contact,
      id: contact?.id ?? createId('contact'),
      name: draft.name.trim(),
      relationship: draft.relationship.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      facebook: draft.facebook.trim(),
      whatsapp: draft.whatsapp.trim(),
      telegram: draft.telegram.trim(),
      instagram: draft.instagram.trim(),
      birthday: draft.birthday || null,
      lastContactedAt: contact?.lastContactedAt ?? null,
      notes: draft.notes.trim(),
      groupId: draft.groupId || null,
      tags: splitCsv(draft.tags),
      createdAt: contact?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  }

  return (
    <EntityForm title={contact ? 'Edit contact' : 'Add contact'} saveLabel="Save" onCancel={onCancel} onSubmit={submit}>
      <label>{t('Name')}<input required value={draft.name} onChange={(event) => update('name', event.target.value)} /></label>
      <label>{t('Relationship')}<input value={draft.relationship} onChange={(event) => update('relationship', event.target.value)} /></label>
      {groups.length > 0 ? (
        <label>
          {t('Group')}
          <select value={draft.groupId} onChange={(event) => update('groupId', event.target.value)}>
            <option value="">{t('No group')}</option>
            {groups.map((group) => (
              <option value={group.id} key={group.id}>
                {group.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
        <label>{t('Phone')}<input value={draft.phone} onChange={(event) => update('phone', event.target.value)} /></label>
        <label>{t('Email')}<input value={draft.email} onChange={(event) => update('email', event.target.value)} /></label>
      </div>
      <div className="grid gap-3 rounded-panel border border-[var(--line-soft)] bg-app-surface-soft p-3">
        <strong className="text-sm font-extrabold text-app-text">{t('Social networks and messengers')}</strong>
        <div className="grid grid-cols-2 gap-3 max-[760px]:grid-cols-1">
          <label>Facebook<input value={draft.facebook} onChange={(event) => update('facebook', event.target.value)} /></label>
          <label>WhatsApp<input value={draft.whatsapp} onChange={(event) => update('whatsapp', event.target.value)} /></label>
          <label>Telegram<input value={draft.telegram} onChange={(event) => update('telegram', event.target.value)} /></label>
          <label>Instagram<input value={draft.instagram} onChange={(event) => update('instagram', event.target.value)} /></label>
        </div>
      </div>
      <label>{t('Birthday')}<input type="date" value={draft.birthday} onChange={(event) => update('birthday', event.target.value)} /></label>
      <label>{t('Notes')}<textarea rows={4} value={draft.notes} onChange={(event) => update('notes', event.target.value)} /></label>
      <label>{t('Tags')}<input value={draft.tags} onChange={(event) => update('tags', event.target.value)} /></label>
    </EntityForm>
  );
}

const cardClass =
  'grid gap-3 rounded-panel border border-[var(--glass-border)] bg-[var(--panel-bg)] p-4 text-app-text [backdrop-filter:var(--glass-blur)] shadow-panel transition-colors hover:border-[color-mix(in_srgb,var(--accent)_34%,var(--border))]';

const pinnedClass = 'border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_12%,transparent)]';

const contactBlockClass =
  'grid gap-1.5 rounded-panel border border-app-border bg-app-surface-soft p-3';

const chipClass =
  'inline-flex w-fit items-center rounded-full border border-app-border bg-app-chip px-2.5 py-1 text-xs font-bold text-app-chip-text';
