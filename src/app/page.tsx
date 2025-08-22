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
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
          Workflow Dashboard
        </h1>
        
        {/* Filter tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setFilterState('needs_user_input')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filterState === 'needs_user_input'
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                🔍 Needs Your Input ({stateCounts.needs_user_input})
              </button>
              <button
                onClick={() => setFilterState('charlie_working')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filterState === 'charlie_working'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                🤖 Charlie Working ({stateCounts.charlie_working})
              </button>
              <button
                onClick={() => setFilterState('completed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filterState === 'completed'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                ✅ Completed ({stateCounts.completed})
              </button>
              <button
                onClick={() => setFilterState('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filterState === 'all'
                    ? 'border-gray-500 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                📋 All Workflows ({stateCounts.all})
              </button>
            </nav>
          </div>
          
          {/* Active tab description */}
          <div className="mt-3 px-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 italic">
              {filterState === 'needs_user_input' && getStateTooltip('needs_user_input')}
              {filterState === 'charlie_working' && getStateTooltip('charlie_working')}
              {filterState === 'completed' && getStateTooltip('completed')}
              {filterState === 'all' && 'View all workflows regardless of status'}
            </p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Links
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredWorkflows.map((workflow) => (
                <tr key={workflow.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStateColor(workflow.state)}`}>
                      {workflow.state === 'needs_user_input' ? '🔍' : workflow.state === 'charlie_working' ? '🤖' : '✅'} {getStateLabel(workflow.state)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {workflow.priority && (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(workflow.priority)}`}>
                        {workflow.priority.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    <div className="font-medium">{workflow.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {workflow.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-1">
                      {workflow.linearUrl && (
                        <a 
                          href={workflow.linearUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                        >
                          {workflow.linearIssueKey} ↗
                        </a>
                      )}
                      {workflow.githubUrl && (
                        <a 
                          href={workflow.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium"
                        >
                          PR #{workflow.github?.prNumber} ↗
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {workflow.stateReason && (
                      <>
                        <div className="font-medium">
                          {workflow.stateReason}
                        </div>
                        <div className="text-xs mt-1">
                          {getTimeSinceLastActivity(workflow.lastEvent)}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link 
                      href={`/workflow/${workflow.id}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      View Events →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredWorkflows.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No workflows in this state
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
