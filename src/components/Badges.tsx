export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge status-${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge prio-${priority.toLowerCase()}`}>{priority.toLowerCase()}</span>;
}
