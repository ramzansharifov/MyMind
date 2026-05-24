import type { BaseEntity, GroupedContentData } from '../../shared/types/common';

export interface Contact extends BaseEntity {
  name: string;
  relationship: string;
  groupId?: string | null;
  phone: string;
  email: string;
  facebook?: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  birthday: string | null;
  lastContactedAt: string | null;
  notes: string;
  tags: string[];
}

export type ContactsData = GroupedContentData<Contact>;
