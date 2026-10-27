import type { RequestStatus } from '@/types/database'

const labels: Record<RequestStatus, string> = {
  pending_manager: 'Awaiting manager',
  approved: 'Approved',
  rejected: 'Rejected',
  provisioned: 'Provisioned',
}

const styles: Record<RequestStatus, string> = {
  pending_manager: 'bg-amber-50 text-amber-800 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
  provisioned: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
}

export default function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${styles[status]}`}>
    <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
    {labels[status]}
  </span>
}
