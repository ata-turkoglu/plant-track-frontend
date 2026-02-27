import type { FormEvent } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import AppDialog from '../../components/common/AppDialog';

type TFn = (key: string, fallback: string) => string;

type Props = {
  t: TFn;
  visible: boolean;
  editing: boolean;
  loading: boolean;
  namespace: string;
  entryKey: string;
  setEntryKey: (value: string) => void;
  trValue: string;
  setTrValue: (value: string) => void;
  enValue: string;
  setEnValue: (value: string) => void;
  onHide: () => void;
  onSubmit: (e: FormEvent) => void;
};

export default function TranslationAddEditDialog({
  t,
  visible,
  editing,
  loading,
  namespace,
  entryKey,
  setEntryKey,
  trValue,
  setTrValue,
  enValue,
  setEnValue,
  onHide,
  onSubmit
}: Props) {
  const canSubmit = Boolean(namespace.trim() && entryKey.trim() && trValue.trim() && enValue.trim());

  return (
    <AppDialog
      id="setup-translation-add-edit"
      header={editing ? 'Ceviri Duzenle' : 'Yeni Ceviri'}
      visible={visible}
      onHide={onHide}
      className="w-full max-w-xl"
    >
      <form className="grid gap-3" onSubmit={onSubmit} autoComplete="off">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Key (kod tabanli)</span>
          <InputText value={entryKey} onChange={(ev) => setEntryKey(ev.target.value)} className="w-full" autoComplete="off" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('setup.translations.tr', 'Türkçe')}</span>
          <InputText value={trValue} onChange={(ev) => setTrValue(ev.target.value)} className="w-full" />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('setup.translations.en', 'English')}</span>
          <InputText value={enValue} onChange={(ev) => setEnValue(ev.target.value)} className="w-full" />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label="Vazgec" size="small" text type="button" onClick={onHide} />
          <Button label="Kaydet" size="small" type="submit" loading={loading} disabled={!canSubmit} />
        </div>
      </form>
    </AppDialog>
  );
}
