import { Pipe, PipeTransform, inject } from '@angular/core';
import {
  RecurrenceFrequency,
  TaskCategory,
  TaskPriority,
  categoryLabel,
  priorityLabel,
  recurrenceLabel,
} from '../models';
import { GroupService } from '../services/group.service';
import { dueLabel, formatDate, timeAgo } from '../utils/date.util';

@Pipe({ name: 'dueLabel', pure: true })
export class DueLabelPipe implements PipeTransform {
  transform(iso: string): string {
    return dueLabel(iso);
  }
}

@Pipe({ name: 'shortDate', pure: true })
export class ShortDatePipe implements PipeTransform {
  transform(iso: string, withYear = false): string {
    return formatDate(iso, withYear);
  }
}

/** Relative time; impure so feeds tick along with change detection. */
@Pipe({ name: 'timeAgo', pure: false })
export class TimeAgoPipe implements PipeTransform {
  transform(iso: string): string {
    return timeAgo(iso);
  }
}

@Pipe({ name: 'categoryLabel', pure: true })
export class CategoryLabelPipe implements PipeTransform {
  transform(c: TaskCategory): string {
    return categoryLabel(c);
  }
}

@Pipe({ name: 'priorityLabel', pure: true })
export class PriorityLabelPipe implements PipeTransform {
  transform(p: TaskPriority): string {
    return priorityLabel(p);
  }
}

@Pipe({ name: 'recurrenceLabel', pure: true })
export class RecurrenceLabelPipe implements PipeTransform {
  transform(f: RecurrenceFrequency): string {
    return recurrenceLabel(f);
  }
}

/** Resolves a member id to a display name inside the active group. */
@Pipe({ name: 'memberName', pure: false })
export class MemberNamePipe implements PipeTransform {
  private readonly group = inject(GroupService);
  transform(id: string | null | undefined, fallback = 'No owner'): string {
    if (!id) return fallback;
    return this.group.memberName(id);
  }
}

@Pipe({ name: 'percent', pure: true })
export class PercentPipe implements PipeTransform {
  transform(value: number | null | undefined, fallback = '–'): string {
    if (value === null || value === undefined || Number.isNaN(value)) return fallback;
    return `${Math.round(value * 100)}%`;
  }
}
