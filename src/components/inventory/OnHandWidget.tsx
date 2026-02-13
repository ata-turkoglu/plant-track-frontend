interface OnHandWidgetProps {
  quantityOnHand: number | null;
  resultingOnHand?: number | null;
}

export function OnHandWidget({ quantityOnHand, resultingOnHand }: OnHandWidgetProps): React.JSX.Element {
  return (
    <section className="rounded-xl border border-slate-200 bg-panel p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">On-hand Preview</h3>
      <div className="mt-3 space-y-1 text-sm">
        <p className="text-slate-600">
          Current on-hand:{' '}
          <span className="font-semibold text-slate-900">{quantityOnHand === null ? '-' : quantityOnHand}</span>
        </p>
        <p className="text-slate-600">
          Resulting on-hand:{' '}
          <span className="font-semibold text-slate-900">
            {resultingOnHand === null || resultingOnHand === undefined ? '-' : resultingOnHand}
          </span>
        </p>
      </div>
    </section>
  );
}
