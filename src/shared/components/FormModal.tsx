import { useId, type FormEvent, type ReactNode } from 'react';
import { CancelButton, SaveButton } from './ActionButtons';
import { Modal } from './Modal';

interface FormModalProps {
  title: string;
  saveLabel: string;
  children: ReactNode;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  wide?: boolean;
  className?: string;
  footer?: ReactNode;
}

export function FormModal({ title, saveLabel, children, onCancel, onSubmit, wide = false, className = '', footer }: FormModalProps) {
  const formId = useId();

  return (
    <Modal
      title={title}
      size={wide ? 'lg' : 'md'}
      className="form-modal-backdrop"
      panelClassName={['form-panel app-form-modal', wide ? 'wide-form-panel' : '', className].filter(Boolean).join(' ')}
      onClose={onCancel}
      footer={
        footer ?? (
          <>
            <CancelButton onClick={onCancel} />
            <SaveButton label={saveLabel} form={formId} />
          </>
        )
      }
    >
      <form className="entity-form app-form-modal-form" id={formId} onSubmit={onSubmit}>
        {children}
      </form>
    </Modal>
  );
}
