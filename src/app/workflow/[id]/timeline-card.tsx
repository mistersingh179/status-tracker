"use client";

import { useMemo, useState } from 'react';
import { ActivityEvent } from '../../schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type TimelineMode = 'compact' | 'full';

interface TimelineCardProps {
  events: ActivityEvent[];
}

/**
* Compact-mode important states (documented for stakeholders):
* - Always: first and last event in the workflow (by sequence).
* - Linear
*   - issue.status_changed when the "to" value contains: "in progress", "in review", or "done" (case-insensitive)
*   - issue.linked (e.g., to a GitHub PR)
*   - issue.closed
* - GitHub PRs
*   - pr.opened
*   - pr.ready_for_review
*   - pr.review_requested
*   - pr.review_submitted only when state is "approved" or "changes_requested"
*   - pr.merged
*   - pr.closed (if closed without merge)
* - CI
*   - ci.check_run only when status is "completed" AND conclusion !== "success" (failures, cancellations, timeouts, etc.)
*
* Everything else (labels churn, assignments, generic comments, passing CI,
* commit noise, draft transitions) is hidden in Compact to reduce clutter.
* Full mode shows all events in the original order with identical content.
*/
function isImportantEvent(e: ActivityEvent, events: ActivityEvent[]): boolean {
  // First/last events are always included
  const minSeq = events.length ? Math.min(...events.map(ev => ev.sequence)) : 0;
  const maxSeq = events.length ? Math.max(...events.map(ev => ev.sequence)) : 0;
  if (e.sequence === minSeq || e.sequence === maxSeq) return true;

  // Linear-important
  if (e.type === 'issue.linked' || e.type === 'issue.closed') return true;
  if (e.type === 'issue.status_changed') {
    const to = e.payload?.status?.to?.toLowerCase() || '';
    if (to.includes('in progress') || to.includes('in review') || to.includes('done')) return true;
  }

  // PR gates and outcomes
  if (
    e.type === 'pr.opened' ||
    e.type === 'pr.ready_for_review' ||
    e.type === 'pr.review_requested' ||
    e.type === 'pr.merged' ||
    e.type === 'pr.closed'
  ) return true;

  if (e.type === 'pr.review_submitted') {
    const state = e.payload?.review?.state;
    if (state === 'approved' || state === 'changes_requested') return true;
    return false;
  }

  // CI failures or problematic completions only
  if (e.type === 'ci.check_run') {
    const s = e.payload?.check;
    if (s?.status === 'completed' && s?.conclusion && s.conclusion !== 'success') return true;
    return false;
  }

  return false;
}

// The helpers below mirror the original implementation from page.tsx to ensure
// Full mode renders identically (same content/order). Keep in sync if the base
// rendering changes.
const formatEventType = (type: string) => type.replace(/\./g, ' ').replace(/_/g, ' ').toUpperCase();
const formatTimestamp = (ts: string) => new Date(ts).toLocaleString();
const getEventBadgeVariant = (type: string) => {
  if (type.startsWith('issue')) return 'secondary' as const;
  if (type.startsWith('pr')) return 'default' as const;
  if (type.startsWith('ci')) return 'outline' as const;
  return 'secondary' as const;
};

export function TimelineCard({ events }: TimelineCardProps) {
  const [mode, setMode] = useState<TimelineMode>('compact'); // default: Compact

  const visible = useMemo(() => {
    if (mode === 'full') return events;
    return events.filter(e => isImportantEvent(e, events));
  }, [events, mode]);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <CardTitle>
              {mode === 'full'
                ? `Activity Timeline (${events.length} events)`
                : `Activity Timeline (${visible.length} of ${events.length} events)`}
            </CardTitle>
            <CardDescription>Chronological history of all workflow events</CardDescription>
          </div>
          <Tabs value={mode} onValueChange={(v) => setMode(v as TimelineMode)} className="w-fit">
            <TabsList aria-label="Timeline view">
              <TabsTrigger value="compact">Compact</TabsTrigger>
              <TabsTrigger value="full">Full</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visible.map((event, index) => (
          <div key={event.id} data-testid="timeline-item">
            <div className="flex items-start gap-2 lg:gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <Badge variant={getEventBadgeVariant(event.type)} className="text-xs">
                  <span className="hidden sm:inline">{formatEventType(event.type)}</span>
                  <span className="sm:hidden">•</span>
                </Badge>
                {index < visible.length - 1 && (
                  <div className="w-px h-6 lg:h-8 bg-border mt-2" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{event.actor.displayName}</span>
                    {event.actor.type !== 'human' && (
                      <Badge variant="outline" className="text-xs">
                        {event.actor.type}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs lg:text-sm text-muted-foreground">
                    <span className="sm:hidden">{formatEventType(event.type)}</span>
                    <span>{formatTimestamp(event.ts)}</span>
                    <Badge variant="outline" className="text-xs">
                      #{event.sequence}
                    </Badge>
                  </div>
                </div>

                {event.entity.title && (
                  <p className="text-sm text-muted-foreground">{event.entity.title}</p>
                )}

                {event.payload && (
                  <div className="text-sm space-y-1">
                    {event.payload.text && <p>{event.payload.text}</p>}
                    {event.payload.description && <p>{event.payload.description}</p>}
                    {event.payload.status && (
                      <p>Status: <span className="font-mono">{event.payload.status.from || 'New'} → {event.payload.status.to}</span></p>
                    )}
                    {event.payload.labelsAdded && (
                      <p>Labels added: {event.payload.labelsAdded.map(label => (
                        <Badge key={label} variant="outline" className="ml-1 text-xs">{label}</Badge>
                      ))}</p>
                    )}
                    {event.payload.assigneesAdded && (
                      <p>Assigned to: <span className="font-medium">{event.payload.assigneesAdded.join(', ')}</span></p>
                    )}
                    {event.payload.reviewersAdded && (
                      <p>Review requested: <span className="font-medium">{event.payload.reviewersAdded.join(', ')}</span></p>
                    )}
                    {event.payload.review && (
                      <p>
                        Review: <Badge variant="outline" className="ml-1">{event.payload.review.state.replace(/_/g, ' ')}</Badge>
                        {event.payload.review.body && <span className="ml-2 italic">&quot;{event.payload.review.body}&quot;</span>}
                      </p>
                    )}
                    {event.payload.commit && (
                      <div className="bg-muted p-3 rounded-md">
                        <p className="font-mono text-xs mb-1 break-words">
                          <Badge variant="outline" className="mr-2">{event.payload.commit.sha.substring(0, 7)}</Badge>
                          <span className="break-words">{event.payload.commit.message}</span>
                        </p>
                        {event.payload.commit.filesChanged && (
                          <p className="text-xs text-muted-foreground">
                            {event.payload.commit.filesChanged} files changed,
                            <span className="text-green-600 ml-1">+{event.payload.commit.additions}</span>
                            <span className="text-red-600 ml-1">-{event.payload.commit.deletions}</span>
                          </p>
                        )}
                      </div>
                    )}
                    {event.payload.check && (
                      <div className="flex items-center gap-2">
                        <span>CI Check:</span>
                        <Badge variant="outline">{event.payload.check.name}</Badge>
                        <Badge variant={event.payload.check.conclusion === 'success' ? 'default' : 'destructive'}>
                          {event.payload.check.status} {event.payload.check.conclusion && `(${event.payload.check.conclusion})`}
                        </Badge>
                      </div>
                    )}
                    {event.payload.closeReason && (
                      <p>Close reason: <span className="italic">{event.payload.closeReason}</span></p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {index < visible.length - 1 && <Separator className="my-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
