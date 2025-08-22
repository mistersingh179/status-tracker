import data from '../../data.json';
import { ActivityDataset } from '../../schema';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  getWorkflowState, 
  getStateLabel, 
  getPriorityFromEvents,
  getLinearIssueUrl,
  getGitHubPRUrl,
  WorkflowState
} from '../../utils/workflow-state';

const activityData = data as ActivityDataset;

export default async function WorkflowDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workflow = activityData.workflows.find(w => w.id === id);
  const events = activityData.events.filter(e => e.workflowId === id);
  const workflowState = getWorkflowState(events);
  const priority = getPriorityFromEvents(events);
  const linearUrl = getLinearIssueUrl(workflow?.linearIssueKey);
  const githubUrl = getGitHubPRUrl(events);

  if (!workflow) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow not found</CardTitle>
              <CardDescription>The workflow you&apos;re looking for doesn&apos;t exist.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/">← Back to dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatEventType = (type: string) => {
    return type.replace(/\./g, ' ').replace(/_/g, ' ').toUpperCase();
  };

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString();
  };

  const getEventBadgeVariant = (type: string) => {
    if (type.startsWith('issue')) return 'secondary';
    if (type.startsWith('pr')) return 'default';
    if (type.startsWith('ci')) return 'outline';
    return 'secondary';
  };

  const getStateBadgeVariant = (state: WorkflowState) => {
    switch (state) {
      case 'needs_user_input': return 'destructive';
      case 'charlie_working': return 'default';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string | null) => {
    switch (priority) {
      case 'p1': return 'destructive';
      case 'p2': return 'default';
      case 'p3': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/">← Back to dashboard</Link>
        </Button>
        
        {/* Workflow Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <CardTitle className="text-xl lg:text-2xl">{workflow.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={getStateBadgeVariant(workflowState)} className="w-fit">
                      {getStateLabel(workflowState)}
                    </Badge>
                    {priority && (
                      <Badge variant={getPriorityBadgeVariant(priority)} className="w-fit">
                        {priority.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription className="font-mono text-sm">{workflow.id}</CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                {linearUrl && (
                  <Button asChild>
                    <a href={linearUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      Linear ({workflow.linearIssueKey})
                    </a>
                  </Button>
                )}
                {githubUrl && (
                  <Button variant="outline" asChild>
                    <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub PR #{workflow.github?.prNumber}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Events Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline ({events.length} events)</CardTitle>
            <CardDescription>Chronological history of all workflow events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id}>
                <div className="flex items-start gap-2 lg:gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <Badge variant={getEventBadgeVariant(event.type)} className="text-xs">
                      <span className="hidden sm:inline">{formatEventType(event.type)}</span>
                      <span className="sm:hidden">•</span>
                    </Badge>
                    {index < events.length - 1 && (
                      <div className="w-px h-6 lg:h-8 bg-border mt-2"></div>
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
                          <p>Labels added: {event.payload.labelsAdded.map(label => 
                            <Badge key={label} variant="outline" className="ml-1 text-xs">{label}</Badge>
                          )}</p>
                        )}
                        {event.payload.assigneesAdded && (
                          <p>Assigned to: <span className="font-medium">{event.payload.assigneesAdded.join(', ')}</span></p>
                        )}
                        {event.payload.reviewersAdded && (
                          <p>Review requested: <span className="font-medium">{event.payload.reviewersAdded.join(', ')}</span></p>
                        )}
                        {event.payload.review && (
                          <p>Review: <Badge variant="outline" className="ml-1">{event.payload.review.state.replace(/_/g, ' ')}</Badge> 
                          {event.payload.review.body && <span className="ml-2 italic">&quot;{event.payload.review.body}&quot;</span>}</p>
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
                {index < events.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}