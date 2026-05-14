import { SimpleEntityPage } from '../../shared/components/SimpleEntityPage';
import { formatCurrency } from '../../shared/utils/formatters';
import type { InventoryItem } from './types';

export function InventoryPage({
  items,
  currency,
  onChange,
}: {
  items: InventoryItem[];
  currency: string;
  onChange: (items: InventoryItem[]) => void;
}) {
  return (
    <SimpleEntityPage
      title="Inventory"
      subtitle="Things, warranties, documents, locations, and serial numbers."
      addLabel="Add item"
      emptyTitle="No inventory items"
      emptyMessage="Add valuable things, documents, and warranties."
      items={items}
      onChange={onChange}
      searchKeys={['title', 'category', 'location', 'serialNumber', 'notes']}
      summary={(item) => `${item.category || 'Item'} / ${item.location || 'No location'} / ${formatCurrency(item.value, currency)}`}
      fields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'category', label: 'Category' },
        { key: 'location', label: 'Location' },
        { key: 'serialNumber', label: 'Serial number' },
        { key: 'purchaseDate', label: 'Purchase date', type: 'date' },
        { key: 'warrantyUntil', label: 'Warranty until', type: 'date' },
        { key: 'value', label: 'Value', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
        { key: 'tags', label: 'Tags', type: 'tags' },
      ]}
    />
  );
}
