import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';

type Props = {
  header: string;
  visible: boolean;
  loading: boolean;
  name: string;
  setName: (value: string) => void;
  onHide: () => void;
  onSave: () => void;
};

export default function OrganizationLocationAddEditDialog({ header, visible, loading, name, setName, onHide, onSave }: Props) {
  return (
    <Dialog header={header} visible={visible} onHide={onHide} className="w-full max-w-lg">
      <div className="grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <InputText value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button label="Cancel" size="small" text onClick={onHide} />
          <Button label="Save" size="small" onClick={onSave} loading={loading} />
        </div>
      </div>
    </Dialog>
  );
}
