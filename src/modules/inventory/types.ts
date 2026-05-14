import type { BaseEntity } from '../../shared/types/common';

export interface InventoryItem extends BaseEntity {
  title: string;
  category: string;
  location: string;
  serialNumber: string;
  purchaseDate: string | null;
  warrantyUntil: string | null;
  value: number;
  notes: string;
  tags: string[];
}
