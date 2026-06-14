import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Archive, ArrowLeft, Pencil, Pin, PinOff, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { Tooltip } from './Tooltip';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils/classNames';

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'archive';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  iconOnly?: boolean;
  children?: ReactNode;
}

function buttonClass(variant: ButtonVariant, iconOnly: boolean, className = '') {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control border border-[var(--control-border)]',
    'bg-[var(--button-bg)] text-app-text [backdrop-filter:var(--glass-blur)]',
    'transition-[border-color,box-shadow,transform,background,color] duration-150 ease-out',
    'hover:-translate-y-px hover:border-[color-mix(in_srgb,var(--accent)_44%,var(--border))] hover:shadow-[0_8px_22px_var(--shadow)]',
    'disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-none',
    iconOnly ? 'h-icon min-h-icon w-icon p-0' : 'min-h-control px-3.5 py-2.5',
    variant === 'primary' &&
      'border-[color-mix(in_srgb,var(--accent)_72%,var(--border))] bg-[var(--button-bg-primary)] text-app-accent-strong shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_8%,transparent)] hover:border-[color-mix(in_srgb,var(--accent)_86%,var(--border))] hover:bg-[var(--button-bg-primary-hover)]',
    variant === 'ghost' &&
      'border-[color-mix(in_srgb,var(--accent)_36%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-strong))] text-[color-mix(in_srgb,var(--accent-strong)_86%,var(--text))] hover:border-[color-mix(in_srgb,var(--accent-strong)_82%,var(--border))] hover:bg-[var(--control-bg-hover)] hover:text-[color-mix(in_srgb,var(--accent-strong)_92%,white)]',
    variant === 'danger' &&
      'border-[color-mix(in_srgb,var(--danger)_72%,var(--border))] bg-[var(--button-bg-danger)] text-app-danger hover:border-[color-mix(in_srgb,var(--danger)_88%,var(--border))] hover:bg-[var(--button-bg-danger-hover)] hover:text-[color-mix(in_srgb,var(--danger)_92%,white)]',
    variant === 'archive' &&
      'border-[color-mix(in_srgb,var(--warning)_72%,var(--border))] bg-[var(--button-bg-warning)] text-app-warning hover:border-[color-mix(in_srgb,var(--warning)_86%,var(--border))] hover:bg-[var(--button-bg-warning-hover)] hover:text-[var(--warning-strong)]',
    className,
  );
}

export function AddButton({ label, iconOnly = false, children, className, ...props }: IconButtonProps) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <Tooltip content={translated}>
      <button className={buttonClass('primary', iconOnly, className)} type="button" aria-label={translated} {...props}>
        <Plus size={17} aria-hidden="true" />
        {!iconOnly ? <span>{children ?? translated}</span> : null}
      </button>
    </Tooltip>
  );
}

export function SaveButton({ label = 'Save', iconOnly = false, children, className, ...props }: Omit<IconButtonProps, 'label'> & { label?: string }) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <Tooltip content={translated}>
      <button className={buttonClass('primary', iconOnly, className)} type="submit" aria-label={translated} {...props}>
        <Save size={17} aria-hidden="true" />
        {!iconOnly ? <span>{children ?? translated}</span> : null}
      </button>
    </Tooltip>
  );
}

export function BackButton({ label = 'Back', iconOnly = false, children, className, ...props }: Omit<IconButtonProps, 'label'> & { label?: string }) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <Tooltip content={translated}>
      <button className={buttonClass('ghost', iconOnly, className)} type="button" aria-label={translated} {...props}>
        <ArrowLeft size={18} aria-hidden="true" />
        {!iconOnly ? <span>{children ?? translated}</span> : null}
      </button>
    </Tooltip>
  );
}

export function EditButton({ label = 'Edit', iconOnly = true, children, className, ...props }: Omit<IconButtonProps, 'label'> & { label?: string }) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <Tooltip content={translated}>
      <button className={buttonClass('ghost', iconOnly, className)} type="button" aria-label={translated} {...props}>
        <Pencil size={17} aria-hidden="true" />
        {!iconOnly ? <span>{children ?? translated}</span> : null}
      </button>
    </Tooltip>
  );
}

export function CloseButton({ label = 'Close', className, ...props }: Omit<IconButtonProps, 'label'> & { label?: string }) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <Tooltip content={translated}>
      <button className={buttonClass('ghost', true, className)} type="button" aria-label={translated} {...props}>
        <X size={18} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

export function CancelButton({ label = 'Cancel', iconOnly = false, children, className, ...props }: Omit<IconButtonProps, 'label'> & { label?: string }) {
  const { t } = useI18n();
  const translated = t(label);
  return (
    <Tooltip content={translated}>
      <button className={buttonClass('ghost', iconOnly, className)} type="button" aria-label={translated} {...props}>
        <X size={18} aria-hidden="true" />
        {!iconOnly ? <span>{children ?? translated}</span> : null}
      </button>
    </Tooltip>
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
    <Tooltip content={translated}>
      <button className={buttonClass('ghost', true, className)} type="button" aria-label={translated} {...props}>
        <Icon size={17} aria-hidden="true" />
      </button>
    </Tooltip>
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
  confirmMessage = 'The item will be hidden from regular lists but kept in local SQLite storage.',
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
      <Tooltip content={translatedLabel}>
        <button
          className={buttonClass('archive', iconOnly, className)}
          type="button"
          aria-label={translatedLabel}
          onClick={() => setIsConfirming(true)}
          {...props}
        >
          <Archive size={17} aria-hidden="true" />
          {!iconOnly ? <span>{children ?? translatedLabel}</span> : null}
        </button>
      </Tooltip>
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
      <Tooltip content={translatedLabel}>
        <button
          className={buttonClass('danger', iconOnly, className)}
          type="button"
          aria-label={translatedLabel}
          onClick={() => setIsConfirming(true)}
          {...props}
        >
          <Trash2 size={17} aria-hidden="true" />
          {!iconOnly ? <span>{children ?? translatedLabel}</span> : null}
        </button>
      </Tooltip>
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
