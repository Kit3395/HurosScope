import React, { useState } from 'react';
import { 
  Bot, 
  Power, 
  Play, 
  Pause, 
  AlertCircle, 
  Clock, 
  Activity, 
  RefreshCw,
  Search,
  BrainCircuit,
  Bell,
  Globe,
  Zap,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface AutomationTask {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  frequency: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  runCount: number;
  errorCount: number;
  lastError: string | null;
}

const INITIAL_AUTOMATIONS: AutomationTask[] = [
  {
    id: 'auto_prospecting',
    title: 'Daily Prospecting',
    description: 'Find new prospects matching saved criteria.',
    icon: Search,
    frequency: 'Daily at 08:00',
    enabled: true,
    lastRun: '2 hours ago',
    nextRun: 'Tomorrow at 08:00',
    runCount: 142,
    errorCount: 0,
    lastError: null,
  },
  {
    id: 'auto_scoring',
    title: 'Weekly Re-Scoring',
    description: 'Re-score existing prospects based on new data.',
    icon: BrainCircuit,
    frequency: 'Weekly on Sundays',
    enabled: true,
    lastRun: '4 days ago',
    nextRun: 'Sunday at 00:00',
    runCount: 24,
    errorCount: 0,
    lastError: null,
  },
  {
    id: 'auto_followup',
    title: 'Follow-up Alerts',
    description: 'Alert me when a follow-up is due.',
    icon: Bell,
    frequency: 'Hourly',
    enabled: true,
    lastRun: '15 mins ago',
    nextRun: 'In 45 mins',
    runCount: 1045,
    errorCount: 0,
    lastError: null,
  },
  {
    id: 'auto_audit',
    title: 'Website Monitoring',
    description: 'Re-audit selected prospects periodically.',
    icon: Globe,
    frequency: 'Monthly per lead',
    enabled: false,
    lastRun: '12 days ago',
    nextRun: 'Paused',
    runCount: 89,
    errorCount: 2,
    lastError: 'HTTP 429 Too Many Requests from prospect domain',
  },
  {
    id: 'auto_launch',
    title: 'Lead Changes',
    description: 'Notify me when a prospect launches a website.',
    icon: Zap,
    frequency: 'Daily at 09:00',
    enabled: true,
    lastRun: '1 hour ago',
    nextRun: 'Tomorrow at 09:00',
    runCount: 312,
    errorCount: 1,
    lastError: 'DNS resolution failure on tracking domain',
  }
];

export const AutomationsPage: React.FC = () => {
  const [globalKill, setGlobalKill] = useState(false);
  const [tasks, setTasks] = useState<AutomationTask[]>(INITIAL_AUTOMATIONS);

  const toggleGlobalKill = () => {
    const newKillState = !globalKill;
    setGlobalKill(newKillState);
    if (newKillState) {
      setTasks(tasks.map(t => ({ ...t, enabled: false, nextRun: 'Paused' })));
    }
  };

  const toggleTask = (id: string) => {
    if (globalKill) return; // Prevent enabling if global kill is active
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const isEnabled = !t.enabled;
        return { 
          ...t, 
          enabled: isEnabled,
          nextRun: isEnabled ? 'Scheduled' : 'Paused'
        };
      }
      return t;
    }));
  };

  const runTask = (id: string) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        return {
          ...t,
          lastRun: 'Just now',
          runCount: t.runCount + 1,
        }
      }
      return t;
    }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Bot className="w-6 h-6 text-violet-500" />
            <span>Automations</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Background tasks and monitoring routines.
          </p>
        </div>
        
        {/* GLOBAL KILL SWITCH */}
        <button
          onClick={toggleGlobalKill}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-bold text-sm tracking-wide transition-all shadow-sm ${
            globalKill 
              ? 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20' 
              : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 shadow-lg'
          }`}
        >
          <Power className={`w-5 h-5 ${globalKill ? 'animate-pulse' : ''}`} />
          <span>{globalKill ? 'SYSTEM HALTED' : 'PAUSE ALL AUTOMATIONS'}</span>
        </button>
      </div>

      {globalKill && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Kill Switch Active</h3>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              All automated systems have been paused. No scheduled tasks will execute and no external API requests will be made until the system is restored.
            </p>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-8">
        {tasks.map(task => (
          <div 
            key={task.id} 
            className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${
              task.enabled ? 'border-slate-200' : 'border-slate-200/50 opacity-75'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              
              {/* Task Info */}
              <div className="flex items-start space-x-4">
                <div className={`p-2.5 rounded-lg shrink-0 ${task.enabled ? 'bg-violet-50 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                  <task.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900">{task.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      task.enabled 
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {task.enabled ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 shrink-0 md:ml-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                <button
                  onClick={() => runTask(task.id)}
                  disabled={globalKill}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Now</span>
                </button>
                <button
                  onClick={() => toggleTask(task.id)}
                  disabled={globalKill}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    task.enabled 
                      ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {task.enabled ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Task Stats Grid */}
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-slate-500 uppercase flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Last Run</span>
                </div>
                <div className="text-xs font-mono text-slate-700">{task.lastRun || 'Never'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-slate-500 uppercase flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>Next Run</span>
                </div>
                <div className="text-xs font-mono text-slate-700">{task.nextRun}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-slate-500 uppercase flex items-center space-x-1">
                  <Activity className="w-3 h-3" />
                  <span>Run Count</span>
                </div>
                <div className="text-xs font-mono text-slate-700">{task.runCount.toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-slate-500 uppercase flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Error Count</span>
                </div>
                <div className="text-xs font-mono text-slate-700">
                  <span className={task.errorCount > 0 ? 'text-red-500 font-bold' : ''}>{task.errorCount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {task.errorCount > 0 && task.lastError && (
              <div className="mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-md flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Latest Error</span>
                  <div className="text-xs font-mono text-red-700">{task.lastError}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
