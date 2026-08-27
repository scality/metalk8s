/**
 * Background tasks — host-side aggregator.
 *
 * Follows the MCP ext-tasks shape. A tool opts in by returning a task handle
 * ({ taskId }) from its execute() AND exposing an arg-less getTaskStatus() on its
 * descriptor. Every app's tasks land in this ONE module-level list, and the single
 * host `getTaskStatus` tool (registered once, see useHostGetTaskStatusTool) routes a
 * polled taskId to the owning tool and stamps the id back on. Module-level so it is
 * shared across every app's registrar instance.
 */
import type { ModelContextWithExtensions } from '@mcp-b/webmcp-types';
import { useEffect } from 'react';

export type TaskStatus =
  | 'working'
  | 'input_required'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type Task = {
  taskId: string;
  status: TaskStatus;
  statusMessage?: string;
  createdAt: string;
  lastUpdatedAt: string;
  ttlMs: number | null;
  pollIntervalMs?: number;
};

/** What a tool's arg-less getTaskStatus() reports (shell-ui stamps the taskId). */
export type TaskStatusReport = Omit<Task, 'taskId'> & {
  result?: unknown;
  error?: unknown;
};

/** What the host `getTaskStatus` tool replies: a report with its taskId stamped back on. */
export type HostTaskStatus = TaskStatusReport & { taskId: string };

/**
 * What a tool's execute() hands back to enrol a background op in the aggregator.
 * createdAt is optional: it is part of the ext-tasks shape but tools that only
 * echo a taskId still get tracked (the host stamps its own creation time).
 */
export type TaskHandle = { taskId: string; createdAt?: string };

/**
 * Structural guard rather than `instanceof SomeTaskHandle` class: tool modules are
 * loaded over module federation from other apps' bundles, and shell-ui exposes no
 * runtime module to them (see the `exposes` map in rspack.config.ts), so they cannot
 * share a class identity with us — each bundle would carry its own copy and
 * `instanceof` would always be false. The shape is also what actually crosses the
 * WebMCP/relay wire, where any class instance is flattened to plain JSON anyway.
 */
export const isTaskHandle = (value: unknown): value is TaskHandle =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TaskHandle).taskId === 'string';

type HostTask = {
  taskId: string;
  createdAt: string;
  getStatus: () => Promise<TaskStatusReport>;
  // Set once the eviction timer is armed, so repeated polls of a settled task
  // don't queue one redundant timer per poll.
  evicting?: boolean;
};

const hostTasks: HostTask[] = []; // ordered — task 1 stays before task 2

// Do not use directly - exported for testing purposes (the list is module-level,
// so tests must drop leftovers between cases).
export const _resetHostTasks = () => {
  hostTasks.length = 0;
};

/**
 * Track a background op so the host `getTaskStatus` tool can route polls to the
 * tool that owns it. Deduped by taskId — the first owner keeps the task.
 */
export const registerHostTask = (
  handle: TaskHandle,
  getStatus: () => Promise<TaskStatusReport>,
) => {
  if (hostTasks.some((h) => h.taskId === handle.taskId)) return;
  hostTasks.push({
    taskId: handle.taskId,
    createdAt: handle.createdAt ?? new Date().toISOString(),
    getStatus,
  });
};

// Annotated rather than cast: the annotation is what checks 'cancelled' against
// TaskStatus, so no `as TaskStatus` is needed on the literal.
const unknownTask = (taskId: string): HostTaskStatus => {
  const now = new Date().toISOString();
  return {
    taskId,
    status: 'cancelled',
    statusMessage: 'No such task (it may have finished and been evicted).',
    createdAt: now,
    lastUpdatedAt: now,
    ttlMs: 0,
  };
};

const isSettled = (status: TaskStatus) =>
  status !== 'working' && status !== 'input_required';

/**
 * The ONE host tool Guardian polls. Registered ONCE (globally, on the shell's lifetime
 * — not per micro-app) so it never gets unregistered while an app is still mounted.
 * It routes the polled taskId to whichever tool owns it (via the shared hostTasks
 * list), stamps the id back onto the result, and evicts a settled task after its ttlMs.
 */
export function useHostGetTaskStatusTool() {
  useEffect(() => {
    const modelContext = document.modelContext || navigator.modelContext;
    if (!modelContext) return;

    // Idempotent across StrictMode/HMR remounts — reuse the duplicate-name skip.
    const existingNames = new Set(
      (modelContext as ModelContextWithExtensions).listTools?.().map((t) => t.name) ??
        [],
    );
    if (existingNames.has('getTaskStatus')) return;

    const controller = new AbortController();
    modelContext.registerTool(
      {
        name: 'getTaskStatus',
        description:
          'Read-only. Poll a background task by its taskId to see whether it is still working, or has ' +
          'completed/failed. Works across every app. Returns an MCP task: status is "working" until it ' +
          'settles, then "completed" (with result) or "failed" (with error). An unknown taskId → "cancelled".',
        inputSchema: {
          type: 'object',
          properties: { taskId: { type: 'string' } },
          required: ['taskId'],
        },
        annotations: { readOnlyHint: true }, // silent, safe to poll
        execute: async (params: unknown): Promise<HostTaskStatus> => {
          const { taskId } = (params as { taskId: string }) ?? { taskId: '' };
          const entry = hostTasks.find((h) => h.taskId === taskId);
          if (!entry) return unknownTask(taskId);

          const task: HostTaskStatus = { taskId, ...(await entry.getStatus()) };
          if (isSettled(task.status) && !entry.evicting) {
            // settled → evict after its ttl so a late poll returns cancelled, not stale data
            entry.evicting = true;
            setTimeout(() => {
              const i = hostTasks.findIndex((h) => h.taskId === taskId);
              if (i >= 0) hostTasks.splice(i, 1);
            }, task.ttlMs ?? 60_000);
          }
          return task;
        },
      },
      { signal: controller.signal },
    );

    return () => controller.abort();
  }, []);
}
