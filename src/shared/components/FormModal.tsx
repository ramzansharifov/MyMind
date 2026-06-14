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
      panelClassName={className}
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
      <form className="grid min-w-0 gap-3.5" id={formId} data-entity-form="true" onSubmit={onSubmit}>
        {children}
      </form>
    </Modal>
  );
}
