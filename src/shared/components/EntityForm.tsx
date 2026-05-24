import type { FormEvent, ReactNode } from 'react';
import { CancelButton, CloseButton, SaveButton } from './ActionButtons';
import { ModalPortal } from './ModalPortal';
import { useI18n } from '../i18n/I18nProvider';

interface EntityFormProps {
  title: string;
  saveLabel: string;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  wide?: boolean;
}

export function EntityForm({ title, saveLabel, onCancel, onSubmit, children, wide = false }: EntityFormProps) {
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
      <form className={`panel form-panel entity-form ${wide ? 'wide-form-panel' : ''}`} onSubmit={onSubmit}>
        <div className="form-heading">
          <h2>{t(title)}</h2>
          <CloseButton onClick={onCancel} />
        </div>
        {children}
        <div className="form-actions">
          <CancelButton onClick={onCancel} />
          <SaveButton label={saveLabel} />
        </div>
      </form>
    </div>
    </ModalPortal>
  );
}
