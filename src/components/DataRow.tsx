export function DataRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[10px] font-mono tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-xs font-mono text-foreground">{value}</span>
    </div>
  );
}
