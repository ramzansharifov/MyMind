import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Archive, ArrowLeft, Pencil, Pin, PinOff, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { useI18n } from '../i18n/I18nProvider';

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  iconOnly?: boolean;
  children?: ReactNode;
}

function buttonClass(variant: ButtonVariant, iconOnly: boolean, className = '') {
  const base = iconOnly ? 'icon-button' : 'button';
  const variantClass = variant === 'default' ? '' : variant;
  return [base, variantClass, className].filter(Boolean).join(' ');
}

function mergeClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export function AddButton({ label, iconOnly = false, children, className, ...props }: IconButtonProps) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <button className={buttonClass('primary', iconOnly, className)} type="button" title={translated} aria-label={translated} {...props}>
      <Plus size={17} aria-hidden="true" />
      {!iconOnly ? <span>{children ?? translated}</span> : null}
    </button>
  );
}

export function SaveButton({ label = 'Save', iconOnly = false, children, className, ...props }: Omit<IconButtonProps, 'label'> & { label?: string }) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <button className={buttonClass('primary', iconOnly, className)} type="submit" title={translated} aria-label={translated} {...props}>
      <Save size={17} aria-hidden="true" />
      {!iconOnly ? <span>{children ?? translated}</span> : null}
    </button>
  );
}

export function BackButton({ label = 'Back', iconOnly = false, children, className, ...props }: Omit<IconButtonProps, 'label'> & { label?: string }) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <button className={buttonClass('ghost', iconOnly, className)} type="button" title={translated} aria-label={translated} {...props}>
      <ArrowLeft size={18} aria-hidden="true" />
      {!iconOnly ? <span>{children ?? translated}</span> : null}
    </button>
  );
}

export function EditButton({ label = 'Edit', iconOnly = true, children, className, ...props }: Omit<IconButtonProps, 'label'> & { label?: string }) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <button className={buttonClass('ghost', iconOnly, className)} type="button" title={translated} aria-label={translated} {...props}>
      <Pencil size={17} aria-hidden="true" />
      {!iconOnly ? <span>{children ?? translated}</span> : null}
    </button>
  );
}

export function CloseButton({ label = 'Close', className, ...props }: Omit<IconButtonProps, 'label'> & { label?: string }) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <button className={buttonClass('ghost', true, className)} type="button" title={translated} aria-label={translated} {...props}>
      <X size={18} aria-hidden="true" />
    </button>
  );
}

export function CancelButton({ label = 'Cancel', iconOnly = false, children, className, ...props }: Omit<IconButtonProps, 'label'> & { label?: string }) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <button className={buttonClass('ghost', iconOnly, className)} type="button" title={translated} aria-label={translated} {...props}>
      <X size={18} aria-hidden="true" />
      {!iconOnly ? <span>{children ?? translated}</span> : null}
    </button>
  );
}

export function PinButton({
  isPinned,
  label,
  className,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { isPinned: boolean; label?: string }) {
  const { t } = useI18n();
  const translated = t(label ?? (isPinned ? 'Unpin' : 'Pin'));
  const Icon = isPinned ? PinOff : Pin;
  return (
    <button className={buttonClass('ghost', true, className)} type="button" title={translated} aria-label={translated} {...props}>
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}

interface DeleteButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  label?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  iconOnly?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
}

interface ArchiveButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  label?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  iconOnly?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
}

export function ArchiveButton({
  label = 'Archive',
  confirmTitle = 'Archive item?',
  confirmMessage = 'The item will be hidden from regular lists but kept in local JSON storage.',
  iconOnly = true,
  children,
  className,
  onConfirm,
  ...props
}: ArchiveButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { t } = useI18n();
  const translatedLabel = t(label);

  return (
    <>
      <button
        className={buttonClass('ghost', iconOnly, mergeClassNames('archive', className))}
        type="button"
        title={translatedLabel}
        aria-label={translatedLabel}
        onClick={() => setIsConfirming(true)}
        {...props}
      >
        <Archive size={17} aria-hidden="true" />
        {!iconOnly ? <span>{children ?? translatedLabel}</span> : null}
      </button>
      {isConfirming ? (
        <ConfirmDialog
          title={confirmTitle}
          message={confirmMessage}
          confirmLabel={label}
          confirmVariant="primary"
          action="archive"
          onCancel={() => setIsConfirming(false)}
          onConfirm={() => {
            setIsConfirming(false);
            onConfirm();
          }}
        />
      ) : null}
    </>
  );
}

export function DeleteButton({
  label = 'Delete',
  confirmTitle = 'Delete item?',
  confirmMessage = 'This action cannot be undone.',
  iconOnly = true,
  children,
  className,
  onConfirm,
  ...props
}: DeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { t } = useI18n();
  const translatedLabel = t(label);

  return (
    <>
      <button
        className={buttonClass('danger', iconOnly, className)}
        type="button"
        title={translatedLabel}
        aria-label={translatedLabel}
        onClick={() => setIsConfirming(true)}
        {...props}
      >
        <Trash2 size={17} aria-hidden="true" />
        {!iconOnly ? <span>{children ?? translatedLabel}</span> : null}
      </button>
      {isConfirming ? (
        <ConfirmDialog
          title={confirmTitle}
          message={confirmMessage}
          confirmLabel={label}
          confirmVariant="danger"
          action="delete"
          onCancel={() => setIsConfirming(false)}
          onConfirm={() => {
            setIsConfirming(false);
            onConfirm();
          }}
        />
      ) : null}
    </>
  );
}
