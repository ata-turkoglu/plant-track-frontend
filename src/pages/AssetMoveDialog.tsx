import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import AppDialog from '../components/common/AppDialog';

type TFn = (key: string, fallback: string) => string;

type LocationOption = { label: string; value: number };

type Props = {
  t: TFn;
  visible: boolean;
  mutating: boolean;
  locationOptions: LocationOption[];
  moveToLocationId: number | null;
  setMoveToLocationId: (value: number | null) => void;
  onHide: () => void;
  onMove: () => void;
};

export default function AssetMoveDialog({
  t,
  visible,
  mutating,
  locationOptions,
  moveToLocationId,
  setMoveToLocationId,
  onHide,
  onMove
}: Props) {
  return (
    <AppDialog id="asset-move" header={t('asset.move', 'Tasi')} visible={visible} onHide={onHide} className="w-full max-w-md">
      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('asset.location', 'Lokasyon')}</span>
          <Dropdown
            value={moveToLocationId}
            onChange={(e) => setMoveToLocationId(e.value ?? null)}
            options={locationOptions}
            className="w-full p-inputtext-sm"
            placeholder={t('common.select', 'Sec')}
          />
        </label>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label={t('common.cancel', 'Vazgec')} size="small" text onClick={onHide} />
          <Button label={t('asset.move', 'Tasi')} size="small" onClick={onMove} disabled={!moveToLocationId} loading={mutating} />
        </div>
      </div>
    </AppDialog>
  );
}
