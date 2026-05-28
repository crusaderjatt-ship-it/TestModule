import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

async function importTs(relativePath, exportsList) {
  let js = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
    .replace(/import type[^;]+;\n/g, '')
    .replace(/export /g, '')
    .replace(/function syncGlobalCtaStyle<[^]+?>\(template: T\): T/, 'function syncGlobalCtaStyle(template)')
    .replace(/: (PricingRule|Context|Date|number|string|unknown|boolean|PaywallTemplate|FlowConfig|AssignmentTarget|CTAStyle|LayoutConfig|PurchaseLock)(?=[,)=;])/g, '')
    .replace(/: Array<\{[^>]+\}>/g, '')
    .replace(/ as const/g, '')
    .replace(/const overlaps: Array<[^=]+=/g, 'const overlaps =');
  return import(`data:text/javascript,${encodeURIComponent(`${js}\nexport { ${exportsList.join(', ')} };`)}`);
}

const pricing = await importTs('../frontend/src/utils/pricing.ts', ['cents', 'minuteOfDay', 'matchesAssignment', 'isMinuteInRange', 'isRuleActiveAt', 'promotionalPrice', 'resolveActivePricingRule', 'rangesOverlap', 'detectPricingOverlaps', 'lockPriceAtCtaClick']);
const flow = await importTs('../frontend/src/utils/flow.ts', ['assignmentMatches', 'resolveActiveFlow', 'resolveActivePaywall', 'rollbackPaywallVersion', 'syncGlobalCtaStyle']);

const baseRule = {
  id: 'evening', name: 'Evening', active: true, priority: 10, priceCents: 700, currency: 'USD', daysOfWeek: [4], startMinute: 120, endMinute: 180,
  assignments: { builds: ['menu'], brands: ['Brand'], locations: ['Loc'] }, algorithmic: { demandWeight: 0, usageWeight: 0, conversionRateWeight: 0 }, posMode: 'direct price update'
};
const context = { build: 'menu', brand: 'Brand', location: 'Loc', now: new Date('2026-05-28T03:00:59') };

test('active pricing respects end-of-minute validity through 3:00:59', () => {
  const resolved = pricing.resolveActivePricingRule([baseRule], context, 999);
  assert.equal(resolved.rule.id, 'evening');
  assert.equal(resolved.priceCents, 700);
});

test('overlap detection catches matching assignment and schedule scopes', () => {
  const overlaps = pricing.detectPricingOverlaps([baseRule, { ...baseRule, id: 'other', priority: 2, startMinute: 170, endMinute: 200 }]);
  assert.deepEqual(overlaps[0], { a: 'evening', b: 'other', reason: 'Rules share schedule and assignment scope' });
});

test('CTA click locks price independently from later rule changes', () => {
  const lock = pricing.lockPriceAtCtaClick(baseRule, 700, 'USD', new Date('2026-05-28T03:00:30Z'));
  assert.equal(lock.priceCents, 700);
  assert.equal(lock.ruleId, 'evening');
  assert.ok(lock.expiresAt.includes('03:10:30'));
});

test('paywall rollback creates a new draft version from history', () => {
  const paywall = { id: 'p1', status: 'published', currentVersion: 2, updatedAt: '', layout: { headline: 'v2' }, versions: [{ version: 1, layout: { headline: 'v1' }, status: 'draft', createdAt: '', note: 'one' }] };
  const rolledBack = flow.rollbackPaywallVersion(paywall, 1);
  assert.equal(rolledBack.status, 'draft');
  assert.equal(rolledBack.layout.headline, 'v1');
  assert.equal(rolledBack.currentVersion, 3);
});

test('global CTA sync copies primary CTA to bottom and confirmation CTAs', () => {
  const template = { layout: { cta: { text: 'Buy' }, bottomCta: { text: 'Old' }, confirmationCta: { text: 'Old' } }, confirmation: { cta: { text: 'Old' } } };
  const synced = flow.syncGlobalCtaStyle(template);
  assert.equal(synced.layout.bottomCta.text, 'Buy');
  assert.equal(synced.confirmation.cta.text, 'Buy');
});
