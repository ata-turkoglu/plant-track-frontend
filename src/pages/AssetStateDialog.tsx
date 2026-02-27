import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import AppDialog from '../components/common/AppDialog';

type TFn = (key: string, fallback: string) => string;

type AssetState = 'STOPPED' | 'RUNNING' | 'MAINTENANCE' | 'DOWN';

type Props = {
  t: TFn;
  visible: boolean;
  mutating: boolean;
  newState: AssetState;
  setNewState: (value: AssetState) => void;
  onHide: () => void;
  onSave: () => void;
};

export default function AssetStateDialog({ t, visible, mutating, newState, setNewState, onHide, onSave }: Props) {
  return (
    <AppDialog id="asset-state" header={t('asset.state', 'Durum')} visible={visible} onHide={onHide} className="w-full max-w-md">
      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">{t('asset.state', 'Durum')}</span>
          <Dropdown
            value={newState}
            onChange={(e) => setNewState(e.value)}
            options={[
              { label: 'STOPPED', value: 'STOPPED' },
              { label: 'RUNNING', value: 'RUNNING' },
              { label: 'MAINTENANCE', value: 'MAINTENANCE' },
              { label: 'DOWN', value: 'DOWN' }
            ]}
            className="w-full p-inputtext-sm"
          />
        </label>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label={t('common.cancel', 'Vazgec')} size="small" text onClick={onHide} />
          <Button label={t('common.save', 'Kaydet')} size="small" onClick={onSave} loading={mutating} />
        </div>
      </div>
    </AppDialog>
  );
}
