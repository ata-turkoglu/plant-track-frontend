import { Message } from 'primereact/message';
import AppDialog from '../components/common/AppDialog';

type TFn = (key: string, fallback: string) => string;

type Props = {
  t: TFn;
  visible: boolean;
  name: string;
  imageUrl: string | null;
  onHide: () => void;
};

export default function AssetImagePreviewDialog({ t, visible, name, imageUrl, onHide }: Props) {
  return (
    <AppDialog
      id="asset-image-preview"
      header={name || t('asset.image', 'Resim')}
      visible={visible}
      onHide={onHide}
      className="w-full max-w-5xl"
    >
      {imageUrl ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <img src={imageUrl} alt={name} className="max-h-[80vh] w-full object-contain" />
        </div>
      ) : (
        <Message severity="info" text={t('asset.image_missing', 'Gosterilecek resim yok.')} className="w-full" />
      )}
    </AppDialog>
  );
}
