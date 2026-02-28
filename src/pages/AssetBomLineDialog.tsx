import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import AppDialog from '../components/common/AppDialog';

type TFn = (key: string, fallback: string) => string;

type ItemGroupRow = {
  id: number;
  code: string;
  name: string;
  type_spec?: string | null;
  size_spec: string | null;
};

type Props = {
  t: TFn;
  visible: boolean;
  mutating: boolean;
  itemGroups: ItemGroupRow[];
  bomItemGroupId: number | null;
  setBomItemGroupId: (value: number | null) => void;
  bomQuantity: number;
  setBomQuantity: (value: number) => void;
  bomNote: string;
  setBomNote: (value: string) => void;
  onHide: () => void;
  onSave: () => void;
};

export default function AssetBomLineDialog({
  t,
  visible,
  mutating,
  itemGroups,
  bomItemGroupId,
  setBomItemGroupId,
  bomQuantity,
  setBomQuantity,
  bomNote,
  setBomNote,
  onHide,
  onSave
}: Props) {
  return (
    <AppDialog id="asset-bom-line" header={t('asset.bom_add', 'BOM Satiri Ekle')} visible={visible} onHide={onHide} className="w-full max-w-lg">
      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('asset.bom_item_group', 'Malzeme Kartı')}</span>
          <Dropdown
            value={bomItemGroupId}
            onChange={(e) => setBomItemGroupId(e.value ?? null)}
            options={itemGroups.map((g) => ({
              label: `${g.name} (${g.code})${g.type_spec?.trim() ? ` · ${g.type_spec.trim()}` : ''}${g.size_spec?.trim() ? ` · ${g.size_spec.trim()}` : ''}`,
              value: g.id
            }))}
            filter
            className="w-full p-inputtext-sm"
            placeholder={t('common.select', 'Sec')}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('common.quantity', 'Miktar')}</span>
          <InputNumber
            value={bomQuantity}
            onValueChange={(e) => setBomQuantity(Number(e.value ?? 1))}
            className="w-full"
            inputClassName="p-inputtext-sm"
            min={0}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('common.note', 'Not')}</span>
          <InputTextarea value={bomNote} onChange={(e) => setBomNote(e.target.value)} className="w-full p-inputtext-sm" rows={3} />
        </label>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label={t('common.cancel', 'Vazgec')} size="small" text onClick={onHide} />
          <Button label={t('common.save', 'Kaydet')} size="small" onClick={onSave} loading={mutating} disabled={!bomItemGroupId || bomQuantity <= 0} />
        </div>
      </div>
    </AppDialog>
  );
}
