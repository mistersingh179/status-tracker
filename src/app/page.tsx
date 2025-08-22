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
      <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Workflow Dashboard</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Track Charlie development progress and manage workflows requiring your attention
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base lg:text-lg font-semibold">Time Range</h2>
            <p className="text-xs lg:text-sm text-muted-foreground">Filter workflows by creation date</p>
          </div>
          <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Needs Your Input
              </CardDescription>
            </CardHeader>
            <div className="px-4 lg:px-6 pb-4 lg:pb-6">
              <div className="text-3xl lg:text-4xl font-bold text-red-600 dark:text-red-400">
                {stateCounts.needs_user_input}
              </div>
              <p className="text-xs lg:text-sm text-muted-foreground mt-1">
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
            <div className="px-4 lg:px-6 pb-4 lg:pb-6">
              <div className="text-3xl lg:text-4xl font-bold text-slate-700 dark:text-slate-300">
                {stateCounts.charlie_working}
              </div>
              <p className="text-xs lg:text-sm text-muted-foreground mt-1">
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
            <div className="px-4 lg:px-6 pb-4 lg:pb-6">
              <div className="text-3xl lg:text-4xl font-bold text-slate-600 dark:text-slate-400">
                {stateCounts.completed}
              </div>
              <p className="text-xs lg:text-sm text-muted-foreground mt-1">
                Finished and merged workflows
              </p>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-slate-100 dark:bg-slate-800/40 rounded-full opacity-20"></div>
          </Card>
        </div>

        {/* Workflow Details */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg lg:text-xl">
                  {filterState === 'needs_user_input' && 'Workflows Requiring Your Attention'}
                  {filterState === 'charlie_working' && 'Active Development Work'}
                  {filterState === 'completed' && 'Completed Workflows'}
                  {filterState === 'all' && 'All Workflows'}
                </CardTitle>
                <CardDescription className="text-xs lg:text-sm">
                  {filterState === 'needs_user_input' && 'These workflows need your review, approval, or have been stalled for 48+ hours and may need assistance'}
                  {filterState === 'charlie_working' && 'Charlie is actively developing these features - no action needed from you right now'}
                  {filterState === 'completed' && 'Successfully finished workflows that have been merged and closed'}
                  {filterState === 'all' && 'Complete list of all workflows across all states within the selected time range'}
                </CardDescription>
              </div>
              <Tabs value={filterState} onValueChange={(value) => setFilterState(value as WorkflowState | 'all')}>
                <TabsList className="flex flex-col lg:flex-row h-auto lg:h-11 w-full lg:w-auto">
                  <TabsTrigger value="needs_user_input" className="w-full lg:w-auto px-4 py-3 lg:px-6 lg:py-2.5 text-sm font-medium justify-start lg:justify-center">
                    Needs Input
                  </TabsTrigger>
                  <TabsTrigger value="charlie_working" className="w-full lg:w-auto px-4 py-3 lg:px-6 lg:py-2.5 text-sm font-medium justify-start lg:justify-center">
                    Charlie Working
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="w-full lg:w-auto px-4 py-3 lg:px-6 lg:py-2.5 text-sm font-medium justify-start lg:justify-center">
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="all" className="w-full lg:w-auto px-4 py-3 lg:px-6 lg:py-2.5 text-sm font-medium justify-start lg:justify-center">
                    All
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Status</TableHead>
                <TableHead>Workflow Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkflows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-12">
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
                  <TableRow key={workflow.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => window.location.href = `/workflow/${workflow.id}`}>
                    <TableCell className="w-20">
                      <Badge variant={getStateBadgeVariant(workflow.state)} className="flex items-center gap-1 w-fit">
                        <span className="text-sm">
                          {workflow.state === 'needs_user_input' ? '⚠️' : workflow.state === 'charlie_working' ? '🤖' : '✅'}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-3">
                        {/* Header: Name and ID */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-sm text-foreground">{workflow.name}</div>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">{workflow.id}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {workflow.priority && (
                              <Badge variant={getPriorityBadgeVariant(workflow.priority)} className="text-xs font-medium">
                                {workflow.priority.toUpperCase()}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {getStateLabel(workflow.state)}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* State reason */}
                        {workflow.stateReason && (
                          <div className="text-xs text-muted-foreground italic bg-muted/30 px-2 py-1 rounded">
                            {workflow.stateReason}
                          </div>
                        )}
                        
                        {/* External links */}
                        {(workflow.linearUrl || workflow.githubUrl) && (
                          <div className="flex items-center gap-2 pt-1">
                            {workflow.linearUrl && (
                              <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                                <a href={workflow.linearUrl} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1.5">
                                  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                                  </svg>
                                  {workflow.linearIssueKey}
                                </a>
                              </Button>
                            )}
                            {workflow.githubUrl && (
                              <Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                                <a href={workflow.githubUrl} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1.5">
                                  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                                  </svg>
                                  PR #{workflow.github?.prNumber}
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
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