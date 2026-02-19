const styles = {
  PENDING: "bg-amber-500/20 text-amber-400",
  PROCESSING: "bg-blue-500/20 text-blue-400",
  COMPLETED: "bg-emerald-500/20 text-emerald-400",
  FAILED: "bg-red-500/20 text-red-400",
} as const;

const labels = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Processed",
  FAILED: "Failed",
} as const;

export function StatusBadge({
  status,
}: {
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase ${styles[status]}`}
    >
      {status === "PROCESSING" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status === "PENDING" && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      )}
      {labels[status]}
    </span>
  );
}
