export function DataRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-600 uppercase">
        {label}
      </span>
      <span className="text-xs font-mono text-neutral-300">{value}</span>
    </div>
  );
}
