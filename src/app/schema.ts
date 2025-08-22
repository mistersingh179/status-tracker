/**
 * Charlie Interview Sample – Simplified Activity Event Schema
 *
 * This schema unifies core webhook events from Linear and GitHub that a
 * “command center” UI would care about (issues, pull requests, comments,
 * reviews, CI checks, labels, status changes, merges). It is intentionally
 * compact and consistent across providers so candidates can focus on UI and
 * flow logic rather than vendor specifics.
 */

// Core identifiers
export type Provider = 'github' | 'linear';
export type ActorType = 'human' | 'charlie' | 'bot';

// High-level event categories kept small and readable
export type EventType =
// Linear issues
  | 'issue.created'
  | 'issue.updated'
  | 'issue.commented'
  | 'issue.labeled'
  | 'issue.assigned'
  | 'issue.status_changed'
  | 'issue.linked' // e.g., link to a GitHub PR
  | 'issue.closed'
  // GitHub pull requests
  | 'pr.opened'
  | 'pr.draft'
  | 'pr.ready_for_review'
  | 'pr.updated'
  | 'pr.labeled'
  | 'pr.review_requested'
  | 'pr.review_submitted'
  | 'pr.commented'
  | 'pr.commit_pushed'
  | 'ci.check_run'
  | 'pr.merged'
  | 'pr.closed';

export interface Actor {
  id: string; // platform user id or stable pseudo id
  displayName: string; // human-friendly name
  handle?: string; // e.g., GitHub login, Linear handle
  type: ActorType;
}

export interface WorkflowRef {
  /** Stable identifier to group events across Linear and GitHub */
  id: string; // e.g., "WF-BOT-5001"
  /** Optional friendly name for UI display */
  name?: string; // e.g., "Feature: PR evaluations API"
  /** Useful cross-refs the UI may want to pin */
  linearIssueKey?: string; // e.g., BOT-5001
  github?: { owner: string; repo: string; prNumber?: number };
}

export type EntityKind =
  | 'issue'
  | 'pull_request'
  | 'review'
  | 'check_run'
  | 'commit';

export interface EntityRef {
  kind: EntityKind;
  provider: Provider;
  id?: string; // provider id when known
  key?: string; // e.g., BOT-5001 for Linear; owner/repo#123 is expressed via fields below
  owner?: string; // github owner/org
  repo?: string; // github repo name
  number?: number; // github issue/PR number
  title?: string;
  url?: string;
}

/**
 * A single lightweight event payload. Only the relevant fields are set per
 * event – the rest remain undefined. Keep this bag minimal and UI-oriented.
 */
export interface EventPayload {
  // Generic text content (comments, descriptions, commit messages)
  text?: string;
  description?: string;

  // Status/labels/assignment deltas
  status?: { from?: string | null; to: string };
  labelsAdded?: string[];
  labelsRemoved?: string[];
  assigneesAdded?: string[];
  assigneesRemoved?: string[];
  reviewersAdded?: string[];
  reviewersRemoved?: string[];

  // Git-related details
  branch?: string;
  commit?: {
    sha: string;
    message: string;
    filesChanged?: number;
    additions?: number;
    deletions?: number;
  };

  // CI checks
  check?: {
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out';
    url?: string;
  };

  // Review metadata
  review?: {
    state: 'approved' | 'changes_requested' | 'commented';
    body?: string;
  };

  // Links between systems (e.g., Linear issue ↔ GitHub PR)
  link?: {
    type: 'github.pr' | 'github.issue' | 'linear.issue';
    url: string;
    title?: string;
    key?: string; // e.g., BOT-5001
    number?: number; // e.g., GitHub PR/Issue number
  };

  // Closing rationale
  closeReason?: string; // e.g., "merged via PR #4321"
}

/**
 * The unified event format consumed by the interview UI.
 *
 * Notes:
 * - Events are designed to be rendered as a time-ordered feed per workflow.
 * - `sequence` is monotonic within a workflow to simplify ordering and diffing.
 * - Timestamps are ISO strings (UTC) for simplicity.
 */
export interface ActivityEvent {
  id: string; // globally unique in the file
  ts: string; // ISO timestamp (UTC)
  provider: Provider;
  type: EventType;
  workflowId: string; // groups events across systems
  sequence: number; // 1..N within a workflow
  actor: Actor;
  entity: EntityRef; // the primary subject (issue/PR/review/check/commit)
  payload?: EventPayload; // only the relevant bits for this event
}

// Convenience aggregate shape for the JSON file (optional for UIs)
export interface ActivityDataset {
  schemaVersion: 1;
  workflows: WorkflowRef[];
  events: ActivityEvent[];
}

// This file intentionally contains only types (no runtime code) so it can be
// imported directly by the candidate UI without additional build steps.