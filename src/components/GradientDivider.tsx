export function GradientDivider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-foreground/20 to-transparent" />
      {label && (
        <span className="text-[10px] font-mono tracking-[0.3em] text-muted-foreground uppercase">
          {label}
        </span>
      )}
      <div className="h-px flex-1 bg-gradient-to-l from-foreground/20 to-transparent" />
    </div>
  );
}
