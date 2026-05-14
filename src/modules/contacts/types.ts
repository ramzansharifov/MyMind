import type { BaseEntity } from '../../shared/types/common';

export interface Contact extends BaseEntity {
  name: string;
  relationship: string;
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
