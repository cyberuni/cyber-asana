/** The values Asana accepts for a task's `approval_status`. */
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'changes_requested'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]
