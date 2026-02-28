import type { ReactNode } from 'react';
import { Tooltip } from 'primereact/tooltip';

export function NoteTooltipBinder({ targetClassName = 'pt-note-tooltip' }: { targetClassName?: string }) {
  return <Tooltip target={`.${targetClassName}`} />;
}

type NoteTooltipIconProps = {
  text?: string | null;
  ariaLabel: string;
  emptyFallback?: ReactNode;
  iconClassName?: string;
};

export default function NoteTooltipIcon({
  text,
  ariaLabel,
  emptyFallback = '-',
  iconClassName = 'pi pi-file-edit'
}: NoteTooltipIconProps) {
  const value = text?.trim() ?? '';
  if (!value) return <>{emptyFallback}</>;

  return (
    <span className="inline-flex items-center justify-center">
      <i
        className={`${iconClassName} cursor-pointer text-slate-500 pt-note-tooltip`}
        aria-label={ariaLabel}
        data-pr-tooltip={value}
        data-pr-position="top"
        tabIndex={0}
      />
    </span>
  );
}

