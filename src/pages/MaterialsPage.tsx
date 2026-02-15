import { Message } from 'primereact/message';

export default function MaterialsPage() {
  return (
    <div className="grid gap-3">
      <Message
        severity="info"
        text="Malzemeler ekrani burada olacak. (Kritik stok, alarm, kategori vb. detaylari bu sayfada yonetecegiz.)"
        className="w-full"
      />
    </div>
  );
}

