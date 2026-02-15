interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <div className="text-sm font-medium text-slate-800">{title}</div>
      <p className="mt-2 text-sm text-slate-600">This page is ready for implementation.</p>
    </div>
  );
}
