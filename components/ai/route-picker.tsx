'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CLAUDE_EFFORT_INFO,
  CLAUDE_EFFORTS,
  CLAUDE_MODELS,
  DEFAULT_CLAUDE_MODEL,
  PROVIDER_IDS,
  PROVIDER_INFO,
  type AiRoute,
  type ClaudeEffort,
  type ProviderId,
} from '@/lib/aiRoutes';

export type PickedRoute = { provider: ProviderId; claudeModel: string; claudeEffort: ClaudeEffort };

export const DEFAULT_PICK: PickedRoute = { provider: 'claude', claudeModel: DEFAULT_CLAUDE_MODEL, claudeEffort: 'low' };

export function toRoute(p: PickedRoute): AiRoute {
  return { providers: [p.provider], claudeModel: p.claudeModel, claudeEffort: p.claudeEffort };
}

export function routeLabel(p: PickedRoute): string {
  if (p.provider !== 'claude') return PROVIDER_INFO[p.provider].label;
  const model = CLAUDE_MODELS.find((m) => m.id === p.claudeModel)?.label ?? p.claudeModel;
  return `${model} · ${p.claudeEffort}`;
}

/** One provider (and for Claude a model + level) to run a Playground or Evaluation with. */
export function RoutePicker({ value, onChange }: { value: PickedRoute; onChange: (v: PickedRoute) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Provider</Label>
        <Select
          items={PROVIDER_IDS.map((p) => ({ value: p, label: PROVIDER_INFO[p].label }))}
          value={value.provider}
          onValueChange={(v) => onChange({ ...value, provider: v as ProviderId })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_IDS.map((p) => (
              <SelectItem key={p} value={p}>
                {PROVIDER_INFO[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {value.provider === 'claude' ? (
        <>
          <div className="space-y-1.5">
            <Label>Model</Label>
            <Select
              items={CLAUDE_MODELS.map((m) => ({ value: m.id, label: m.label }))}
              value={value.claudeModel}
              onValueChange={(v) => onChange({ ...value, claudeModel: String(v) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLAUDE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select
              items={CLAUDE_EFFORTS.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))}
              value={value.claudeEffort}
              onValueChange={(v) => onChange({ ...value, claudeEffort: v as ClaudeEffort })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLAUDE_EFFORTS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {CLAUDE_EFFORT_INFO[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}
    </div>
  );
}
