'use client';

import { useState, useMemo } from 'react';
import data from './data.json';
import { ActivityDataset } from './schema';
import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  getWorkflowStateWithReason,
  getStateLabel, 
  WorkflowState, 
  WorkflowWithState,
  getPriorityFromEvents,
  getTimeSinceLastActivity,
  getLinearIssueUrl,
  getGitHubPRUrl,
  DateRange,
  isWorkflowInDateRange
} from './utils/workflow-state';

const activityData = data as ActivityDataset;

export default function WorkflowsDashboard() {
  const [filterState, setFilterState] = useState<WorkflowState | 'all'>('needs_user_input');
  const [dateRange, setDateRange] = useState<DateRange>('1month');

  const workflowsWithState = useMemo(() => {
    return activityData.workflows
      .map(workflow => {
        const workflowEvents = activityData.events.filter(e => e.workflowId === workflow.id);
        const { state, reason } = getWorkflowStateWithReason(workflowEvents);
        const lastEvent = workflowEvents.sort((a, b) => b.sequence - a.sequence)[0];
        const priority = getPriorityFromEvents(workflowEvents);
        const linearUrl = getLinearIssueUrl(workflow.linearIssueKey);
        const githubUrl = getGitHubPRUrl(workflowEvents);
        
        return {
          ...workflow,
          state,
          stateReason: reason,
          lastEvent,
          priority,
          linearUrl,
          githubUrl,
          events: workflowEvents
        } as WorkflowWithState & { 
          priority: string | null;
          linearUrl: string | null;
          githubUrl: string | null;
          events: typeof workflowEvents;
        };
      })
      .filter(workflow => isWorkflowInDateRange(workflow.events, dateRange));
  }, [dateRange]);

  const filteredWorkflows = useMemo(() => {
    if (filterState === 'all') {
      return workflowsWithState;
    }
    return workflowsWithState.filter(w => w.state === filterState);
  }, [workflowsWithState, filterState]);

  const stateCounts = useMemo(() => {
    return {
      all: workflowsWithState.length,
      needs_user_input: workflowsWithState.filter(w => w.state === 'needs_user_input').length,
      charlie_working: workflowsWithState.filter(w => w.state === 'charlie_working').length,
      completed: workflowsWithState.filter(w => w.state === 'completed').length,
    };
  }, [workflowsWithState]);

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
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Workflow Dashboard</h1>
          <p className="text-muted-foreground">
            Track Charlie development progress and manage workflows requiring your attention
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Time Range</h2>
            <p className="text-sm text-muted-foreground">Filter workflows by creation date</p>
          </div>
          <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1day">Last 24 hours</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="1month">Last month</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hero Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Needs Your Input
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="text-4xl font-bold text-red-600 dark:text-red-400">
                {stateCounts.needs_user_input}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Workflows requiring attention or review
              </p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-red-100 dark:bg-red-900/20 rounded-full opacity-20"></div>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                Charlie Working
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="text-4xl font-bold text-slate-700 dark:text-slate-300">
                {stateCounts.charlie_working}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Active development in progress
              </p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-slate-100 dark:bg-slate-800/40 rounded-full opacity-20"></div>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                Completed
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="text-4xl font-bold text-slate-600 dark:text-slate-400">
                {stateCounts.completed}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Finished and merged workflows
              </p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-slate-100 dark:bg-slate-800/40 rounded-full opacity-20"></div>
          </Card>
        </div>

        {/* Workflow Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {filterState === 'needs_user_input' && 'Workflows Requiring Your Attention'}
                  {filterState === 'charlie_working' && 'Active Development Work'}
                  {filterState === 'completed' && 'Completed Workflows'}
                  {filterState === 'all' && 'All Workflows'}
                </CardTitle>
                <CardDescription>
                  {filterState === 'needs_user_input' && 'These workflows need your review, approval, or have been stalled for 48+ hours and may need assistance'}
                  {filterState === 'charlie_working' && 'Charlie is actively developing these features - no action needed from you right now'}
                  {filterState === 'completed' && 'Successfully finished workflows that have been merged and closed'}
                  {filterState === 'all' && 'Complete list of all workflows across all states within the selected time range'}
                </CardDescription>
              </div>
              <Tabs value={filterState} onValueChange={(value) => setFilterState(value as WorkflowState | 'all')}>
                <TabsList className="h-11">
                  <TabsTrigger value="needs_user_input" className="px-6 py-2.5 text-sm font-medium">
                    Needs Input
                  </TabsTrigger>
                  <TabsTrigger value="charlie_working" className="px-6 py-2.5 text-sm font-medium">
                    Charlie Working
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="px-6 py-2.5 text-sm font-medium">
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="all" className="px-6 py-2.5 text-sm font-medium">
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Links</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="text-muted-foreground">
                      <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p>No workflows in this state</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredWorkflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell>
                      <Badge variant={getStateBadgeVariant(workflow.state)} className="flex items-center gap-1 w-fit">
                        <span>
                          {workflow.state === 'needs_user_input' ? '🔍' : workflow.state === 'charlie_working' ? '🤖' : '✅'}
                        </span>
                        {getStateLabel(workflow.state)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {workflow.priority ? (
                        <Badge variant={getPriorityBadgeVariant(workflow.priority)}>
                          {workflow.priority.toUpperCase()}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{workflow.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">{workflow.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {workflow.linearUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={workflow.linearUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                              {workflow.linearIssueKey}
                            </a>
                          </Button>
                        )}
                        {workflow.githubUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={workflow.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                              </svg>
                              PR #{workflow.github?.prNumber}
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {workflow.stateReason && (
                        <div className="space-y-1">
                          <div className="text-sm">{workflow.stateReason}</div>
                          <div className="text-xs text-muted-foreground">
                            {getTimeSinceLastActivity(workflow.lastEvent)}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/workflow/${workflow.id}`} className="flex items-center gap-2">
                          View Details
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
