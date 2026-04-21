import { differenceInHours, isPast, parseISO, startOfDay } from 'date-fns';

export type DeadlineStatus = 'overdue' | 'due-soon' | 'normal';

export function getDeadlineStatus(dateNeeded: string, status: string): DeadlineStatus {
  if (status === 'Completed' || status === 'Cancelled') {
    return 'normal';
  }

  const deadline = startOfDay(parseISO(dateNeeded));
  const now = new Date();

  if (isPast(deadline) && startOfDay(now).getTime() > deadline.getTime()) {
    return 'overdue';
  }

  const hoursUntilDeadline = differenceInHours(deadline, now);
  if (hoursUntilDeadline >= 0 && hoursUntilDeadline <= 24) {
    return 'due-soon';
  }

  return 'normal';
}

export function getDeadlineColorClass(status: DeadlineStatus): string {
  switch (status) {
    case 'overdue':
      return 'text-red-500 dark:text-red-400 font-bold';
    case 'due-soon':
      return 'text-amber-500 dark:text-amber-400 font-bold';
    default:
      return 'text-black dark:text-white';
  }
}

export function getDeadlineBadgeClass(status: DeadlineStatus): string {
  switch (status) {
    case 'overdue':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50';
    case 'due-soon':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50';
    default:
      return 'bg-black/5 text-black/70 dark:bg-white/5 dark:text-white/70 border border-black/10 dark:border-white/10';
  }
}
