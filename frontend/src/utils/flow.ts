import type { Context, FlowConfig, PaywallTemplate } from '../types';

export function assignmentMatches(assignment, context) {
  const builds = assignment.builds.length === 0 || assignment.builds.includes(context.build);
  const brands = assignment.brands.length === 0 || assignment.brands.includes(context.brand);
  const locations = assignment.locations.length === 0 || assignment.locations.includes(context.location);
  const schedule = !assignment.schedule || (context.now >= new Date(assignment.schedule.startsAt) && context.now <= new Date(assignment.schedule.endsAt));
  return builds && brands && locations && schedule;
}

export function resolveActiveFlow(flows, context) {
  return flows.find((flow) => flow.status === 'published' && !flow.lockedDefault && assignmentMatches(flow.assignments, context))
    ?? flows.find((flow) => flow.lockedDefault)
    ?? flows[0];
}

export function resolveActivePaywall(paywalls, context, preferredId) {
  const preferred = paywalls.find((paywall) => paywall.id === preferredId && paywall.status === 'published');
  if (preferred) return preferred;
  return paywalls.find((paywall) => paywall.status === 'published' && assignmentMatches(paywall.assignments, context)) ?? paywalls[0];
}

export function rollbackPaywallVersion(paywall, version) {
  const selected = paywall.versions.find((entry) => entry.version === version);
  if (!selected) throw new Error(`Version ${version} not found`);
  const now = new Date().toISOString();
  return {
    ...paywall,
    layout: selected.layout,
    status: 'draft',
    currentVersion: paywall.currentVersion + 1,
    updatedAt: now,
    versions: [
      ...paywall.versions,
      { version: paywall.currentVersion + 1, createdAt: now, note: `Rollback to v${version}`, layout: selected.layout, status: 'draft' }
    ]
  };
}

export function syncGlobalCtaStyle(template) {
  return {
    ...template,
    layout: { ...template.layout, bottomCta: template.layout.cta, confirmationCta: template.layout.cta },
    confirmation: template.confirmation ? { ...template.confirmation, cta: template.layout.cta } : template.confirmation
  };
}
