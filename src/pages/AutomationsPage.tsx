import React, { useState, useEffect } from 'react';
import {
  Bot,
  Power,
  Pause,
  Play,
  Search,
  BrainCircuit,
  Bell,
  Globe,
  Zap,
  AlertTriangle,
  Info,
} from 'lucide-react';

/**
 * Automations page — honest version.
 *
 * These are automation *definitions* (planned background routines), not live
 * services. There is no scheduler connected, so nothing runs on its own and
 * there is no run history to show. Toggles persist to localStorage so the
 * owner's preferences survive reloads; when a real scheduler is connected,
 * these definitions become the configuration it reads.
 */

interface AutomationDefinition {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  frequency: string;
  enabled: boolean;
}

const AUTOMATION_DEFINITIONS: Omit<AutomationDefinition, 'enabled'>[] = [
  {
    id: 'auto_prospecting',
    title: 'Daily Prospecting',
    description: 'Find new prospects matching saved criteria.',
    icon: Search,
    frequency: 'Daily at 08:00',
  },
  {
    id: 'auto_scoring',
    title: 'Weekly Re-Scoring',
    description: 'Re-score existing prospects based on new data.',
    icon: BrainCircuit,
    frequency: 'Weekly on Sundays',
  },
  {
    id: 'auto_followup',
    title: 'Follow-up Alerts',
    description: 'Alert me when a follow-up is due.',
    icon: Bell,
    frequency: 'Hourly',
  },
  {
    id: 'auto_audit',
    title: 'Website Monitoring',
    description: 'Re-audit selected prospects periodically.',
    icon: Globe,
    frequency: 'Monthly per lead',
  },
  {
    id: 'auto_launch',
    title: 'Lead Changes',
    description: 'Notify me when a prospect launches a website.',
    icon: Zap,
    frequency: 'Daily at 09:00',
  },
];

const STORAGE_KEY = 'horuscope.automations.v1';

interface PersistedAutomationState {
  globalKill: boolean;
  enabledById: Record<string, boolean>;
}

function loadPersisted(): PersistedAutomationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedAutomationState>;
      return {
        globalKill: Boolean(parsed.globalKill),
        enabledById: parsed.enabledById && typeof parsed.enabledById === 'object' ? parsed.enabledById : {},
      };
    }
  } catch {
    // Corrupt storage — fall through to defaults.
  }
  return {
    globalKill: false,
    enabledById: Object.fromEntries(AUTOMATION_DEFINITIONS.map((d) => [d.id, true])),
  };
}

export const AutomationsPage: React.FC = () => {
  const [globalKill, setGlobalKill] = useState(false);
  const [enabledById, setEnabledById] = useState<Record<string, boolean>>({});

  // Load persisted preferences on mount.
  useEffect(() => {
    const persisted = loadPersisted();
    setGlobalKill(persisted.globalKill);
    const merged: Record<string, boolean> = {};
    for (const d of AUTOMATION_DEFINITIONS) {
      merged[d.id] = persisted.enabledById[d.id] ?? true;
    }
    setEnabledById(merged);
  }, []);

  // Persist every change.
  useEffect(() => {
    if (Object.keys(enabledById).length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ globalKill, enabledById } satisfies PersistedAutomationState));
    } catch {
      // Storage unavailable — preferences stay in memory only.
    }
  }, [globalKill, enabledById]);

  const toggleGlobalKill = () => {
    setGlobalKill((prev) => !prev);
  };

  const toggleTask = (id: string) => {
    if (globalKill) return;
    setEnabledById((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const tasks: AutomationDefinition[] = AUTOMATION_DEFINITIONS.map((d) => ({
    ...d,
    enabled: !globalKill && (enabledById[d.id] ?? true),
  }));

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
            Planned background routines and their preferences.
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

      {/* Honesty notice: no scheduler is connected */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 shrink-0">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-amber-900">Scheduler not connected</h3>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            These routines are defined but not scheduled — nothing runs automatically and there is no run history yet.
            Your enable/pause preferences are saved on this device and will apply once a scheduler is connected.
          </p>
        </div>
      </div>

      {globalKill && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Kill Switch Active</h3>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              All automation definitions are paused in your preferences. No scheduled tasks will execute once a scheduler is connected, until you restore the system.
            </p>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-8">
        {tasks.map((task) => (
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
                      {globalKill ? 'Halted' : task.enabled ? 'Planned' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">Intended cadence: {task.frequency}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 italic">No runs recorded — scheduler not connected</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 shrink-0 md:ml-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                <button
                  onClick={() => toggleTask(task.id)}
                  disabled={globalKill}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    enabledById[task.id] ?? true
                      ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {(enabledById[task.id] ?? true) ? (
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
          </div>
        ))}
      </div>
    </div>
  );
};
