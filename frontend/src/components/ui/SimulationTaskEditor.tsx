import { Trash2, Plus } from 'lucide-react';
import type { SimulationTaskInput, OnboardingStage } from '../../types';

const STAGES: OnboardingStage[] = ['kickoff', 'setup', 'integration', 'training', 'go_live'];
const STAGE_LABELS: Record<OnboardingStage, string> = {
  kickoff: 'Kickoff',
  setup: 'Setup',
  integration: 'Integration',
  training: 'Training',
  go_live: 'Go-Live',
};

interface Props {
  tasks: SimulationTaskInput[];
  onChange: (tasks: SimulationTaskInput[]) => void;
}

function emptyTask(): SimulationTaskInput {
  return {
    title: '',
    stage: 'kickoff',
    due_offset_days: 7,
    required_for_stage_completion: true,
    is_customer_required: false,
    requires_setup_data: false,
    criticality: 2,
    estimated_duration_days: 1,
    dependency_count: 0,
    integration_required: false,
    approval_layers: 0,
    delay_days: 0,
  };
}

export function SimulationTaskEditor({ tasks, onChange }: Props) {
  function update(index: number, patch: Partial<SimulationTaskInput>) {
    onChange(tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function remove(index: number) {
    onChange(tasks.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...tasks, emptyTask()]);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-48">Title</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Stage</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Days from project start until this task is due">Due (days)</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Estimated working days to complete">Duration</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Business impact if missed: 1=nice-to-have, 4=mission-critical">Criticality</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Number of predecessor tasks">Deps</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Approval layers required (0–3)">Approvals</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Customer must act on this task">Customer?</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Third-party integration needed">Integration?</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Needs setup data before it can complete">Setup Data?</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide" title="Days this task is already behind">Existing delay</th>
              <th className="px-3 py-2.5 w-8" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-sm text-slate-400">
                  No tasks yet. Add one below.
                </td>
              </tr>
            )}
            {tasks.map((task, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-2 py-2">
                  <input
                    className="input-legacy text-xs py-1 min-w-[10rem] h-7"
                    type="text"
                    placeholder="Task title"
                    value={task.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    aria-label={`Task ${i + 1} title`}
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    className="input-legacy text-xs py-1 h-7 pr-8 bg-no-repeat bg-[length:1rem] bg-[right_0.25rem_center]"
                    value={task.stage}
                    onChange={(e) => update(i, { stage: e.target.value as OnboardingStage })}
                    aria-label={`Task ${i + 1} stage`}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    className="input-legacy text-xs py-1 w-16 text-center h-7"
                    type="number"
                    min={0}
                    value={task.due_offset_days}
                    onChange={(e) => update(i, { due_offset_days: Number(e.target.value) })}
                    aria-label={`Task ${i + 1} due offset days`}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    className="input-legacy text-xs py-1 w-16 text-center h-7"
                    type="number"
                    min={1}
                    value={task.estimated_duration_days ?? 1}
                    onChange={(e) => update(i, { estimated_duration_days: Number(e.target.value) })}
                    aria-label={`Task ${i + 1} estimated duration`}
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    className="input-legacy text-xs py-1 w-24 h-7 pr-8"
                    value={task.criticality ?? 2}
                    onChange={(e) => update(i, { criticality: Number(e.target.value) })}
                    aria-label={`Task ${i + 1} criticality`}
                  >
                    <option value={1}>1 — Nice to have</option>
                    <option value={2}>2 — Important</option>
                    <option value={3}>3 — High impact</option>
                    <option value={4}>4 — Mission critical</option>
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    className="input-legacy text-xs py-1 w-12 text-center h-7"
                    type="number"
                    min={0}
                    value={task.dependency_count ?? 0}
                    onChange={(e) => update(i, { dependency_count: Number(e.target.value) })}
                    aria-label={`Task ${i + 1} dependency count`}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    className="input-legacy text-xs py-1 w-12 text-center h-7"
                    type="number"
                    min={0}
                    max={3}
                    value={task.approval_layers ?? 0}
                    onChange={(e) => update(i, { approval_layers: Number(e.target.value) })}
                    aria-label={`Task ${i + 1} approval layers`}
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={task.is_customer_required ?? false}
                    onChange={(e) => update(i, { is_customer_required: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    aria-label={`Task ${i + 1} customer required`}
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={task.integration_required ?? false}
                    onChange={(e) => update(i, { integration_required: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    aria-label={`Task ${i + 1} integration required`}
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={task.requires_setup_data ?? false}
                    onChange={(e) => update(i, { requires_setup_data: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    aria-label={`Task ${i + 1} requires setup data`}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    className="input-legacy text-xs py-1 w-12 text-center h-7"
                    type="number"
                    min={0}
                    value={task.delay_days ?? 0}
                    onChange={(e) => update(i, { delay_days: Number(e.target.value) })}
                    aria-label={`Task ${i + 1} existing delay`}
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                    aria-label={`Remove task ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={add}
        className="btn-secondary text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Task
      </button>
    </div>
  );
}
