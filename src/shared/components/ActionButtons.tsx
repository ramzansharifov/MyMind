import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Archive, ArrowLeft, Pencil, Pin, PinOff, Plus, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { Tooltip } from './Tooltip';
import { useI18n } from '../i18n';
import { cn } from '../utils/classNames';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'archive';

export interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  iconOnly?: boolean;
  showLabel?: boolean;
  tooltip?: string | false;
  children?: ReactNode;
}

export function actionButtonClass(variant: ButtonVariant, iconOnly: boolean, className = '') {
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

export function AppButton({
  label,
  variant = 'default',
  icon,
  iconOnly = false,
  showLabel,
  tooltip,
  children,
  className,
  type = 'button',
  ...props
}: AppButtonProps) {
  const { t } = useI18n();
  const translated = t(label);
  const visibleLabel = showLabel ?? !iconOnly;
  const button = (
    <button className={actionButtonClass(variant, iconOnly, className)} type={type} aria-label={translated} {...props}>
      {icon}
      {visibleLabel ? <span>{children ?? translated}</span> : null}
    </button>
  );

  if (tooltip === false) {
    return button;
  }

  return (
    <Tooltip content={t(tooltip ?? label)}>
      {button}
    </Tooltip>
  );
}

export function AddButton(props: Omit<AppButtonProps, 'icon' | 'variant'>) {
  return <AppButton variant="primary" icon={<Plus size={17} aria-hidden="true" />} {...props} />;
}

export function SaveButton({ label = 'Save', type = 'submit', ...props }: Omit<AppButtonProps, 'icon' | 'variant' | 'label'> & { label?: string }) {
  return <AppButton label={label} variant="primary" icon={<Save size={17} aria-hidden="true" />} type={type} {...props} />;
}

export function BackButton({ label = 'Back', ...props }: Omit<AppButtonProps, 'icon' | 'variant' | 'label'> & { label?: string }) {
  return <AppButton label={label} variant="ghost" icon={<ArrowLeft size={18} aria-hidden="true" />} {...props} />;
}

export function EditButton({ label = 'Edit', iconOnly = true, ...props }: Omit<AppButtonProps, 'icon' | 'variant' | 'label'> & { label?: string }) {
  return <AppButton label={label} variant="ghost" icon={<Pencil size={17} aria-hidden="true" />} iconOnly={iconOnly} {...props} />;
}

export function CloseButton({ label = 'Close', iconOnly = true, ...props }: Omit<AppButtonProps, 'icon' | 'variant' | 'label'> & { label?: string }) {
  return <AppButton label={label} variant="ghost" icon={<X size={18} aria-hidden="true" />} iconOnly={iconOnly} {...props} />;
}

export function CancelButton({ label = 'Cancel', ...props }: Omit<AppButtonProps, 'icon' | 'variant' | 'label'> & { label?: string }) {
  return <AppButton label={label} variant="ghost" icon={<X size={18} aria-hidden="true" />} {...props} />;
}

export function PinButton({
  isPinned,
  label,
  iconOnly = true,
  ...props
}: Omit<AppButtonProps, 'icon' | 'variant' | 'label'> & { isPinned: boolean; label?: string }) {
  const Icon = isPinned ? PinOff : Pin;
  return <AppButton label={label ?? (isPinned ? 'Unpin' : 'Pin')} variant="ghost" icon={<Icon size={17} aria-hidden="true" />} iconOnly={iconOnly} {...props} />;
}

interface ConfirmActionButtonProps extends Omit<AppButtonProps, 'onClick' | 'label'> {
  label?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  confirmVariant?: 'primary' | 'danger';
  action?: 'archive' | 'delete' | 'confirm';
  onConfirm: () => void;
}

export function ConfirmActionButton({
  label = 'Confirm',
  variant = 'primary',
  icon,
  confirmTitle = 'Confirm action?',
  confirmMessage = 'Please confirm this action.',
  confirmVariant = 'primary',
  action = 'confirm',
  onConfirm,
  ...props
}: ConfirmActionButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <AppButton label={label} variant={variant} icon={icon} onClick={() => setIsConfirming(true)} {...props} />
      {isConfirming ? (
        <ConfirmDialog
          title={confirmTitle}
          message={confirmMessage}
          confirmLabel={label}
          confirmVariant={confirmVariant}
          action={action}
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

export function ArchiveButton({
  label = 'Archive',
  confirmTitle = 'Archive item?',
  confirmMessage = 'The item will be hidden from regular lists but kept in local SQLite storage.',
  iconOnly = true,
  ...props
}: Omit<ConfirmActionButtonProps, 'icon' | 'variant' | 'confirmVariant' | 'action' | 'label'> & { label?: string }) {
  return (
    <ConfirmActionButton
      label={label}
      variant="archive"
      icon={<Archive size={17} aria-hidden="true" />}
      iconOnly={iconOnly}
      confirmTitle={confirmTitle}
      confirmMessage={confirmMessage}
      confirmVariant="primary"
      action="archive"
      {...props}
    />
  );
}

export function DeleteButton({
  label = 'Delete',
  confirmTitle = 'Delete item?',
  confirmMessage = 'This action cannot be undone.',
  iconOnly = true,
  ...props
}: Omit<ConfirmActionButtonProps, 'icon' | 'variant' | 'confirmVariant' | 'action' | 'label'> & { label?: string }) {
  return (
    <ConfirmActionButton
      label={label}
      variant="danger"
      icon={<Trash2 size={17} aria-hidden="true" />}
      iconOnly={iconOnly}
      confirmTitle={confirmTitle}
      confirmMessage={confirmMessage}
      confirmVariant="danger"
      action="delete"
      {...props}
    />
  );
}
