'use client';

import { useState, useMemo } from 'react';
import data from './data.json';
import { ActivityDataset } from './schema';
import Link from 'next/link';
import { 
  getWorkflowStateWithReason,
  getStateLabel, 
  getStateColor,
  getStateTooltip,
  WorkflowState, 
  WorkflowWithState,
  getPriorityFromEvents,
  getPriorityColor,
  getTimeSinceLastActivity,
  getLinearIssueUrl,
  getGitHubPRUrl
} from './utils/workflow-state';

const activityData = data as ActivityDataset;

export default function WorkflowsDashboard() {
  const [filterState, setFilterState] = useState<WorkflowState | 'all'>('needs_user_input');

  const workflowsWithState = useMemo(() => {
    return activityData.workflows.map(workflow => {
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
        githubUrl
      } as WorkflowWithState & { 
        priority: string | null;
        linearUrl: string | null;
        githubUrl: string | null;
      };
    });
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-display text-4xl text-slate-900 dark:text-slate-100 mb-2">
            Workflow Dashboard
          </h1>
          <p className="text-body text-slate-600 dark:text-slate-400">
            Track Charlie development progress and manage workflows requiring your attention
          </p>
        </div>
        
        {/* Filter tabs */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-1">
            <nav className="flex space-x-1" aria-label="Tabs">
              <button
                onClick={() => setFilterState('needs_user_input')}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  filterState === 'needs_user_input'
                    ? 'bg-amber-100 text-amber-900 shadow-sm dark:bg-amber-900/30 dark:text-amber-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-base">🔍</span>
                  <span>Needs Your Input</span>
                  <span className="ml-1 px-2 py-0.5 bg-white/60 dark:bg-slate-800/60 rounded-full text-xs font-semibold">
                    {stateCounts.needs_user_input}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setFilterState('charlie_working')}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  filterState === 'charlie_working'
                    ? 'bg-blue-100 text-blue-900 shadow-sm dark:bg-blue-900/30 dark:text-blue-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-base">🤖</span>
                  <span>Charlie Working</span>
                  <span className="ml-1 px-2 py-0.5 bg-white/60 dark:bg-slate-800/60 rounded-full text-xs font-semibold">
                    {stateCounts.charlie_working}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setFilterState('completed')}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  filterState === 'completed'
                    ? 'bg-green-100 text-green-900 shadow-sm dark:bg-green-900/30 dark:text-green-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-base">✅</span>
                  <span>Completed</span>
                  <span className="ml-1 px-2 py-0.5 bg-white/60 dark:bg-slate-800/60 rounded-full text-xs font-semibold">
                    {stateCounts.completed}
                  </span>
                </span>
              </button>
              <button
                onClick={() => setFilterState('all')}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  filterState === 'all'
                    ? 'bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-base">📋</span>
                  <span>All Workflows</span>
                  <span className="ml-1 px-2 py-0.5 bg-white/60 dark:bg-slate-800/60 rounded-full text-xs font-semibold">
                    {stateCounts.all}
                  </span>
                </span>
              </button>
            </nav>
          </div>
          
          {/* Active tab description */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  {filterState === 'needs_user_input' && 'Needs Your Input'}
                  {filterState === 'charlie_working' && 'Charlie Working'}
                  {filterState === 'completed' && 'Completed'}
                  {filterState === 'all' && 'All Workflows'}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  {filterState === 'needs_user_input' && getStateTooltip('needs_user_input')}
                  {filterState === 'charlie_working' && getStateTooltip('charlie_working')}
                  {filterState === 'completed' && getStateTooltip('completed')}
                  {filterState === 'all' && 'View all workflows regardless of status'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left text-caption text-slate-500 dark:text-slate-400 font-semibold">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-caption text-slate-500 dark:text-slate-400 font-semibold">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-caption text-slate-500 dark:text-slate-400 font-semibold">
                  Workflow
                </th>
                <th className="px-6 py-4 text-left text-caption text-slate-500 dark:text-slate-400 font-semibold">
                  Links
                </th>
                <th className="px-6 py-4 text-left text-caption text-slate-500 dark:text-slate-400 font-semibold">
                  Activity
                </th>
                <th className="px-6 py-4 text-left text-caption text-slate-500 dark:text-slate-400 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredWorkflows.map((workflow) => (
                <tr key={workflow.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-150">
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full ${getStateColor(workflow.state)}`}>
                      <span className="text-sm">
                        {workflow.state === 'needs_user_input' ? '🔍' : workflow.state === 'charlie_working' ? '🤖' : '✅'}
                      </span>
                      {getStateLabel(workflow.state)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {workflow.priority ? (
                      <span className={`inline-flex px-3 py-1.5 text-xs font-medium rounded-full ${getPriorityColor(workflow.priority)}`}>
                        {workflow.priority.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="max-w-sm">
                      <div className="text-heading text-sm text-slate-900 dark:text-slate-100 mb-1">
                        {workflow.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {workflow.id}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-2">
                      {workflow.linearUrl && (
                        <a 
                          href={workflow.linearUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          {workflow.linearIssueKey}
                        </a>
                      )}
                      {workflow.githubUrl && (
                        <a 
                          href={workflow.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                          </svg>
                          PR #{workflow.github?.prNumber}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {workflow.stateReason && (
                      <div className="max-w-xs">
                        <div className="text-body text-sm text-slate-700 dark:text-slate-300 mb-1">
                          {workflow.stateReason}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {getTimeSinceLastActivity(workflow.lastEvent)}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <Link 
                      href={`/workflow/${workflow.id}`}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors duration-150"
                    >
                      View Details
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredWorkflows.length === 0 && (
            <div className="text-center py-12">
              <div className="text-slate-400 dark:text-slate-500 mb-2">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No workflows in this state
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
