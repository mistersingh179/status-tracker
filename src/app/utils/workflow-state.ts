import { ActivityEvent, WorkflowRef } from '../schema';

export type WorkflowState = 'charlie_working' | 'needs_user_input' | 'completed';

export interface WorkflowWithState extends WorkflowRef {
  state: WorkflowState;
  lastEvent?: ActivityEvent;
  stateReason?: string; // Why this workflow is in this state
}

export function getWorkflowState(events: ActivityEvent[]): WorkflowState {
  if (events.length === 0) {
    return 'charlie_working';
  }

  // Sort events by sequence number
  const sortedEvents = [...events].sort((a, b) => b.sequence - a.sequence);
  const lastEvent = sortedEvents[0];

  // Check for 48+ hour stalls first
  const now = new Date();
  const lastEventTime = new Date(lastEvent.ts);
  const hoursSinceLastActivity = (now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60);
  const isStalled = hoursSinceLastActivity > 48;

  // Rule 1: Check if workflow is completed
  // Linear: issue.closed OR issue.status_changed → Done
  const hasIssueClosed = events.some(e => e.type === 'issue.closed');
  const hasIssueDone = events.some(e => 
    e.type === 'issue.status_changed' && 
    e.payload?.status?.to?.toLowerCase() === 'done'
  );
  // GitHub: pr.merged
  const hasPRMerged = events.some(e => e.type === 'pr.merged');
  // pr.closed only counts as completed if Linear is also closed/done
  const hasPRClosed = events.some(e => e.type === 'pr.closed');
  
  if (hasPRMerged || hasIssueClosed || hasIssueDone || (hasPRClosed && (hasIssueClosed || hasIssueDone))) {
    return 'completed';
  }

  // Rule 2: Check if needs user input (human review/approval needed)
  // Latest effective state is pr.ready_for_review or pr.review_requested
  if (lastEvent.type === 'pr.ready_for_review' || lastEvent.type === 'pr.review_requested') {
    return 'needs_user_input';
  }

  // Issue moved to "In review" and no reviews yet
  if (lastEvent.type === 'issue.status_changed' && 
      lastEvent.payload?.status?.to?.toLowerCase().includes('review')) {
    // Check if there are any review events after this status change
    const statusChangeIndex = sortedEvents.indexOf(lastEvent);
    const hasReviewAfter = sortedEvents.slice(0, statusChangeIndex).some(e => 
      e.type === 'pr.review_submitted'
    );
    if (!hasReviewAfter) {
      return 'needs_user_input';
    }
  }

  // Rule 3: Check if Charlie is working (needs to respond to feedback)
  // pr.review_submitted with changes_requested
  if (lastEvent.type === 'pr.review_submitted' && 
      lastEvent.payload?.review?.state === 'changes_requested') {
    return 'charlie_working';
  }

  // Latest ci.check_run completed with failure
  if (lastEvent.type === 'ci.check_run' && 
      lastEvent.payload?.check?.status === 'completed' &&
      lastEvent.payload?.check?.conclusion === 'failure') {
    return 'charlie_working';
  }

  // Human comment (likely requesting changes/clarification)
  if (lastEvent.type === 'pr.commented' && lastEvent.actor.type === 'human') {
    return 'charlie_working';
  }

  // pr.review_submitted with approved (Charlie working on merge)
  if (lastEvent.type === 'pr.review_submitted' && 
      lastEvent.payload?.review?.state === 'approved') {
    return 'charlie_working';
  }

  // PR is still draft
  if (lastEvent.type === 'pr.draft') {
    return 'charlie_working';
  }

  // Check if Charlie is working but stalled for 48+ hours
  if (isStalled) {
    return 'needs_user_input';
  }

  // Default: Charlie is working on it
  return 'charlie_working';
}

export function getWorkflowStateWithReason(events: ActivityEvent[]): { state: WorkflowState; reason: string } {
  if (events.length === 0) {
    return { state: 'charlie_working', reason: 'Starting development' };
  }

  // Sort events by sequence number
  const sortedEvents = [...events].sort((a, b) => b.sequence - a.sequence);
  const lastEvent = sortedEvents[0];

  // Check for 48+ hour stalls first
  const now = new Date();
  const lastEventTime = new Date(lastEvent.ts);
  const hoursSinceLastActivity = (now.getTime() - lastEventTime.getTime()) / (1000 * 60 * 60);
  const daysSinceLastActivity = Math.floor(hoursSinceLastActivity / 24);

  // Rule 1: Check if workflow is completed
  const hasIssueClosed = events.some(e => e.type === 'issue.closed');
  const hasIssueDone = events.some(e => 
    e.type === 'issue.status_changed' && 
    e.payload?.status?.to?.toLowerCase() === 'done'
  );
  const hasPRMerged = events.some(e => e.type === 'pr.merged');
  const hasPRClosed = events.some(e => e.type === 'pr.closed');
  
  if (hasPRMerged || hasIssueClosed || hasIssueDone || (hasPRClosed && (hasIssueClosed || hasIssueDone))) {
    return { state: 'completed', reason: 'Workflow completed and merged' };
  }

  // Rule 2: Check if needs user input (human review/approval needed)
  if (lastEvent.type === 'pr.ready_for_review' || lastEvent.type === 'pr.review_requested') {
    return { state: 'needs_user_input', reason: 'Ready for review' };
  }

  // Issue moved to "In review" and no reviews yet
  if (lastEvent.type === 'issue.status_changed' && 
      lastEvent.payload?.status?.to?.toLowerCase().includes('review')) {
    const statusChangeIndex = sortedEvents.indexOf(lastEvent);
    const hasReviewAfter = sortedEvents.slice(0, statusChangeIndex).some(e => 
      e.type === 'pr.review_submitted'
    );
    if (!hasReviewAfter) {
      return { state: 'needs_user_input', reason: 'In review status, awaiting feedback' };
    }
  }

  // Rule 3: Check for Charlie working scenarios that need user input due to stalling
  const wouldBeCharlieWorking = (
    (lastEvent.type === 'pr.review_submitted' && lastEvent.payload?.review?.state === 'changes_requested') ||
    (lastEvent.type === 'ci.check_run' && lastEvent.payload?.check?.status === 'completed' && lastEvent.payload?.check?.conclusion === 'failure') ||
    (lastEvent.type === 'pr.commented' && lastEvent.actor.type === 'human') ||
    (lastEvent.type === 'pr.review_submitted' && lastEvent.payload?.review?.state === 'approved') ||
    (lastEvent.type === 'pr.draft')
  );

  if (wouldBeCharlieWorking && hoursSinceLastActivity > 48) {
    const dayText = daysSinceLastActivity === 1 ? 'day' : 'days';
    return { 
      state: 'needs_user_input', 
      reason: `No progress for ${daysSinceLastActivity} ${dayText} - may need help` 
    };
  }

  // Rule 4: Charlie is actively working
  if (lastEvent.type === 'pr.review_submitted' && lastEvent.payload?.review?.state === 'changes_requested') {
    return { state: 'charlie_working', reason: 'Addressing review feedback' };
  }

  if (lastEvent.type === 'ci.check_run' && 
      lastEvent.payload?.check?.status === 'completed' &&
      lastEvent.payload?.check?.conclusion === 'failure') {
    return { state: 'charlie_working', reason: 'Fixing test failures' };
  }

  if (lastEvent.type === 'pr.commented' && lastEvent.actor.type === 'human') {
    return { state: 'charlie_working', reason: 'Responding to feedback' };
  }

  if (lastEvent.type === 'pr.review_submitted' && lastEvent.payload?.review?.state === 'approved') {
    return { state: 'charlie_working', reason: 'Preparing for merge' };
  }

  if (lastEvent.type === 'pr.draft') {
    return { state: 'charlie_working', reason: 'Work in progress' };
  }

  // Default: Charlie is working on it
  return { state: 'charlie_working', reason: 'Active development' };
}

export function getStateLabel(state: WorkflowState): string {
  switch (state) {
    case 'charlie_working':
      return 'Charlie Working';
    case 'needs_user_input':
      return 'Needs Your Input';
    case 'completed':
      return 'Completed';
  }
}

export function getStateTooltip(state: WorkflowState): string {
  switch (state) {
    case 'charlie_working':
      return 'Charlie is actively developing these features';
    case 'needs_user_input':
      return 'Workflows requiring your attention - either ready for review or Charlie needs help';
    case 'completed':
      return 'Finished workflows - merged and closed';
  }
}

export function getStateColor(state: WorkflowState): string {
  switch (state) {
    case 'charlie_working':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'needs_user_input':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
}

export function getPriorityFromEvents(events: ActivityEvent[]): string | null {
  // Look for issue.labeled events with priority labels
  const labelEvents = events.filter(e => e.type === 'issue.labeled' && e.payload?.labelsAdded);
  
  for (const event of labelEvents) {
    const priorityLabel = event.payload?.labelsAdded?.find(label => 
      label.match(/^p[1-3]$/i)
    );
    if (priorityLabel) {
      return priorityLabel.toLowerCase();
    }
  }
  return null;
}

export function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case 'p1':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'p2':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    case 'p3':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}

export function getTimeSinceLastActivity(lastEvent?: ActivityEvent): string {
  if (!lastEvent) return '';
  
  const now = new Date();
  const eventTime = new Date(lastEvent.ts);
  const diffMs = now.getTime() - eventTime.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

export function getLinearIssueUrl(linearIssueKey?: string): string | null {
  if (!linearIssueKey) return null;
  // Extract the Linear issue URL from events or construct it
  return `https://linear.app/charlie-labs/issue/${linearIssueKey}`;
}

export function getGitHubPRUrl(events: ActivityEvent[]): string | null {
  // Find the PR opened event or any PR-related event with URL
  const prEvent = events.find(e => 
    (e.type === 'pr.opened' || e.type === 'pr.merged' || e.type.startsWith('pr.')) &&
    e.entity.url
  );
  return prEvent?.entity.url || null;
}

export type DateRange = '1day' | '7days' | '1month' | 'all';

export function getDateRangeLabel(range: DateRange): string {
  switch (range) {
    case '1day':
      return 'Last 24 hours';
    case '7days':
      return 'Last 7 days';
    case '1month':
      return 'Last month';
    case 'all':
      return 'All time';
  }
}

export function getWorkflowCreationDate(events: ActivityEvent[]): Date | null {
  // Find the first issue.created event which represents when the workflow started
  const creationEvent = events
    .filter(e => e.type === 'issue.created')
    .sort((a, b) => a.sequence - b.sequence)[0];
  
  return creationEvent ? new Date(creationEvent.ts) : null;
}

export function isWorkflowInDateRange(events: ActivityEvent[], dateRange: DateRange): boolean {
  if (dateRange === 'all') return true;
  
  const creationDate = getWorkflowCreationDate(events);
  if (!creationDate) return true; // Include workflows without clear creation date
  
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  
  switch (dateRange) {
    case '1day':
      return (now.getTime() - creationDate.getTime()) <= msPerDay;
    case '7days':
      return (now.getTime() - creationDate.getTime()) <= (7 * msPerDay);
    case '1month':
      return (now.getTime() - creationDate.getTime()) <= (30 * msPerDay);
    default:
      return true;
  }
}