import { Injectable, signal } from '@angular/core';
import { Task, TaskDraft } from '../models';

export interface TaskEditorRequest {
  /** Present when editing; absent when creating. */
  task?: Task;
  defaults?: Partial<TaskDraft>;
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

/** App-wide modal state. The shell renders whichever dialog is open. */
@Injectable({ providedIn: 'root' })
export class OverlayService {
  readonly taskEditor = signal<TaskEditorRequest | null>(null);
  readonly assignTaskId = signal<string | null>(null);
  readonly confirmRequest = signal<ConfirmRequest | null>(null);
  readonly menuOpen = signal(false);

  readonly anyOpen = () =>
    this.taskEditor() !== null ||
    this.assignTaskId() !== null ||
    this.confirmRequest() !== null ||
    this.menuOpen();

  newTask(defaults: Partial<TaskDraft> = {}): void {
    this.taskEditor.set({ defaults });
  }

  editTask(task: Task): void {
    this.taskEditor.set({ task });
  }

  closeTaskEditor(): void {
    this.taskEditor.set(null);
  }

  assign(taskId: string): void {
    this.assignTaskId.set(taskId);
  }

  closeAssign(): void {
    this.assignTaskId.set(null);
  }

  confirm(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmRequest.set({
        ...opts,
        resolve: (ok) => {
          this.confirmRequest.set(null);
          resolve(ok);
        },
      });
    });
  }

  closeAll(): void {
    this.taskEditor.set(null);
    this.assignTaskId.set(null);
    this.confirmRequest()?.resolve(false);
    this.menuOpen.set(false);
  }
}
