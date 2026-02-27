import type { FormEvent } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';

type TFn = (key: string, fallback: string) => string;

type Props = {
  t: TFn;
  visible: boolean;
  editing: boolean;
  derivedCode: string;
  isPieceUnit: boolean;
  canSubmit: boolean;
  mutating: boolean;
  trName: string;
  setTrName: (value: string) => void;
  enName: string;
  setEnName: (value: string) => void;
  trSymbol: string;
  setTrSymbol: (value: string) => void;
  enSymbol: string;
  setEnSymbol: (value: string) => void;
  active: boolean;
  setActive: (value: boolean) => void;
  onHide: () => void;
  onSubmit: (e: FormEvent) => void;
};

export default function UnitAddEditDialog({
  t,
  visible,
  editing,
  derivedCode,
  isPieceUnit,
  canSubmit,
  mutating,
  trName,
  setTrName,
  enName,
  setEnName,
  trSymbol,
  setTrSymbol,
  enSymbol,
  setEnSymbol,
  active,
  setActive,
  onHide,
  onSubmit
}: Props) {
  return (
    <Dialog header={editing ? t('setup.units.edit', 'Birim Duzenle') : t('setup.units.new', 'Yeni Birim')} visible={visible} onHide={onHide} className="w-full max-w-lg">
      <form className="grid gap-3" onSubmit={onSubmit} autoComplete="off">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {t('setup.units.code_auto', 'Kod, EN ad alanindan otomatik uretilir.')}: <span className="font-semibold">{derivedCode || '-'}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.units.col.tr_name', 'Ad (TR)')}</span>
            <InputText value={trName} onChange={(e) => setTrName(e.target.value)} className="w-full" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.units.col.en_name', 'Ad (EN)')}</span>
            <InputText value={enName} onChange={(e) => setEnName(e.target.value)} className="w-full" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.units.col.tr_symbol', 'Sembol (TR)')}</span>
            <InputText value={trSymbol} onChange={(e) => setTrSymbol(e.target.value)} className="w-full" disabled={isPieceUnit} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">{t('setup.units.col.en_symbol', 'Sembol (EN)')}</span>
            <InputText value={enSymbol} onChange={(e) => setEnSymbol(e.target.value)} className="w-full" disabled={isPieceUnit} />
          </label>
        </div>

        {isPieceUnit ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {t('setup.units.piece_symbol_note', '`piece` kodu icin symbol bos birakilmalidir.')}
          </div>
        ) : null}

        {editing ? (
          <label className="flex items-center gap-2 pt-1">
            <Checkbox inputId="unit-active" checked={active} onChange={(e) => setActive(Boolean(e.checked))} />
            <span className="text-sm text-slate-700">{t('common.active', 'Aktif')}</span>
          </label>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label={t('common.cancel', 'Vazgec')} size="small" text type="button" onClick={onHide} />
          <Button label={t('common.save', 'Kaydet')} size="small" type="submit" loading={mutating} disabled={!canSubmit} />
        </div>
      </form>
    </Dialog>
  );
}
