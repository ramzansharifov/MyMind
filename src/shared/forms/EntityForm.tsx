import type { FormEvent, ReactNode } from 'react';
import { FormModal } from './FormModal';

interface EntityFormProps {
  title: string;
  saveLabel: string;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  wide?: boolean;
}

export function EntityForm({ title, saveLabel, onCancel, onSubmit, children, wide = false }: EntityFormProps) {
  return (
    <FormModal title={title} saveLabel={saveLabel} onCancel={onCancel} onSubmit={onSubmit} wide={wide}>
      {children}
    </FormModal>
  );
}
