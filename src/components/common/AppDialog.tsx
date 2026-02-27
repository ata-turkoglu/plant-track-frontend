import { type ReactNode, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import type { DialogProps } from 'primereact/dialog';

type Props = DialogProps & {
  children?: ReactNode;
};

export default function AppDialog({ className, children, ...props }: Props) {
  const htmlId = typeof props.id === 'string' && props.id.trim() ? props.id.trim() : null;
  const showDevIdBadge = Boolean(import.meta.env.DEV && htmlId);
  const mergedClassName = ['relative overflow-visible', className].filter(Boolean).join(' ');

  const copyDialogId = useCallback(async () => {
    if (!htmlId) return;

    try {
      await navigator.clipboard.writeText(htmlId);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = htmlId;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, [htmlId]);

  return (
    <Dialog {...props} className={mergedClassName} id={htmlId ?? undefined}>
      {showDevIdBadge ? (
        <div
          className="absolute right-0 top-0 z-50 flex -translate-y-1/2 translate-x-1/2 items-center gap-1 rounded-md bg-slate-900 px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-white shadow"
        >
          <span className="select-text">{htmlId}</span>
          <button
            type="button"
            className="pointer-events-auto grid h-4 w-4 appearance-none place-items-center rounded border-0 bg-transparent p-0 leading-none text-white/80 hover:bg-white/10 hover:text-white focus:outline-none"
            onClick={() => void copyDialogId()}
            title="Copy dialog id"
            aria-label="Copy dialog id"
          >
            <i className="pi pi-copy text-[10px]" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {children}
    </Dialog>
  );
}
