import data from '../../data.json';
import { ActivityDataset } from '../../schema';
import Link from 'next/link';
import { 
  getWorkflowState, 
  getStateLabel, 
  getStateColor,
  getPriorityFromEvents,
  getPriorityColor,
  getLinearIssueUrl,
  getGitHubPRUrl
} from '../../utils/workflow-state';

const activityData = data as ActivityDataset;

export default function WorkflowDetail({ params }: { params: { id: string } }) {
  const workflow = activityData.workflows.find(w => w.id === params.id);
  const events = activityData.events.filter(e => e.workflowId === params.id);
  const workflowState = getWorkflowState(events);
  const priority = getPriorityFromEvents(events);
  const linearUrl = getLinearIssueUrl(workflow?.linearIssueKey);
  const githubUrl = getGitHubPRUrl(events);

  if (!workflow) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Workflow not found
          </h1>
          <Link 
            href="/"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to dashboard
          </Link>
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

  const getEventColor = (type: string) => {
    if (type.startsWith('issue')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    if (type.startsWith('pr')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (type.startsWith('ci')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <Link 
          href="/"
          className="inline-block mb-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Back to dashboard
        </Link>
        
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {workflow.name}
            </h1>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStateColor(workflowState)}`}>
              {getStateLabel(workflowState)}
            </span>
            {priority && (
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(priority)}`}>
                {priority.toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">ID:</span> {workflow.id}
          </div>
          
          <div className="flex gap-4">
            {linearUrl && (
              <a 
                href={linearUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                View Linear Issue ({workflow.linearIssueKey})
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {githubUrl && (
              <a 
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-md transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View GitHub PR (#{workflow.github?.prNumber})
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Events ({events.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {events.map((event) => (
              <div key={event.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventColor(event.type)}`}>
                        {formatEventType(event.type)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTimestamp(event.ts)}
                      </span>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        <span className="font-medium">{event.actor.displayName}</span>
                        {event.actor.type !== 'human' && (
                          <span className="ml-1 text-xs text-gray-500">({event.actor.type})</span>
                        )}
                      </p>
                      
                      {event.entity.title && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {event.entity.title}
                        </p>
                      )}
                      
                      {event.payload && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {event.payload.text && <p>{event.payload.text}</p>}
                          {event.payload.description && <p>{event.payload.description}</p>}
                          {event.payload.status && (
                            <p>Status: {event.payload.status.from || 'New'} → {event.payload.status.to}</p>
                          )}
                          {event.payload.labelsAdded && (
                            <p>Labels added: {event.payload.labelsAdded.join(', ')}</p>
                          )}
                          {event.payload.assigneesAdded && (
                            <p>Assigned to: {event.payload.assigneesAdded.join(', ')}</p>
                          )}
                          {event.payload.reviewersAdded && (
                            <p>Review requested: {event.payload.reviewersAdded.join(', ')}</p>
                          )}
                          {event.payload.review && (
                            <p>Review: {event.payload.review.state.replace(/_/g, ' ')} {event.payload.review.body && `- ${event.payload.review.body}`}</p>
                          )}
                          {event.payload.commit && (
                            <div>
                              <p className="font-mono text-xs">{event.payload.commit.sha.substring(0, 7)}: {event.payload.commit.message}</p>
                              {event.payload.commit.filesChanged && (
                                <p className="text-xs mt-1">
                                  {event.payload.commit.filesChanged} files changed, 
                                  +{event.payload.commit.additions} -{event.payload.commit.deletions}
                                </p>
                              )}
                            </div>
                          )}
                          {event.payload.check && (
                            <p>
                              CI Check: {event.payload.check.name} - {event.payload.check.status}
                              {event.payload.check.conclusion && ` (${event.payload.check.conclusion})`}
                            </p>
                          )}
                          {event.payload.closeReason && (
                            <p>Close reason: {event.payload.closeReason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 text-xs text-gray-500 dark:text-gray-400">
                    #{event.sequence}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}