import type { Context, PricingRule } from '../types';

export function cents(priceCents, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(priceCents / 100);
}

export function minuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function matchesAssignment(rule, context) {
  const { assignments } = rule;
  const buildOk = assignments.builds.length === 0 || assignments.builds.includes(context.build);
  const brandOk = assignments.brands.length === 0 || assignments.brands.includes(context.brand);
  const locationOk = assignments.locations.length === 0 || assignments.locations.includes(context.location);
  return buildOk && brandOk && locationOk;
}

export function isMinuteInRange(minute, startMinute, endMinute) {
  if (startMinute <= endMinute) return minute >= startMinute && minute <= endMinute;
  return minute >= startMinute || minute <= endMinute;
}

export function isRuleActiveAt(rule, context) {
  if (!rule.active) return false;
  if (!rule.allowFreeOrNegative && rule.priceCents <= 0) return false;
  const day = context.now.getDay();
  if (!rule.daysOfWeek.includes(day)) return false;
  if (!isMinuteInRange(minuteOfDay(context.now), rule.startMinute, rule.endMinute)) return false;
  return matchesAssignment(rule, context);
}

export function promotionalPrice(rule, now) {
  const promo = rule.promoOverride;
  if (!promo?.active) return rule.priceCents;
  if (now >= new Date(promo.startsAt) && now <= new Date(promo.endsAt)) return promo.priceCents;
  return rule.priceCents;
}

export function resolveActivePricingRule(rules, context, fallbackPriceCents = 999) {
  const active = rules
    .filter((rule) => isRuleActiveAt(rule, context))
    .sort((a, b) => b.priority - a.priority || promotionalPrice(a, context.now) - promotionalPrice(b, context.now));
  const rule = active[0];
  if (!rule) {
    return { rule: undefined, priceCents: fallbackPriceCents, currency: 'USD', label: 'Fallback price' };
  }
  return {
    rule,
    priceCents: promotionalPrice(rule, context.now),
    currency: rule.currency,
    label: rule.promoOverride?.active ? rule.promoOverride.label : rule.name
  };
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const expand = (start, end) => (start <= end ? [[start, end]] : [[start, 1439], [0, end]]);
  return expand(aStart, aEnd).some(([as, ae]) => expand(bStart, bEnd).some(([bs, be]) => as <= be && bs <= ae));
}

export function detectPricingOverlaps(rules) {
  const overlaps: Array<{ a: string; b: string; reason: string }> = [];
  for (let i = 0; i < rules.length; i += 1) {
    for (let j = i + 1; j < rules.length; j += 1) {
      const a = rules[i];
      const b = rules[j];
      const sharedDay = a.daysOfWeek.some((day) => b.daysOfWeek.includes(day));
      const sharedBuild = a.assignments.builds.length === 0 || b.assignments.builds.length === 0 || a.assignments.builds.some((v) => b.assignments.builds.includes(v));
      const sharedBrand = a.assignments.brands.length === 0 || b.assignments.brands.length === 0 || a.assignments.brands.some((v) => b.assignments.brands.includes(v));
      const sharedLocation = a.assignments.locations.length === 0 || b.assignments.locations.length === 0 || a.assignments.locations.some((v) => b.assignments.locations.includes(v));
      if (a.active && b.active && sharedDay && sharedBuild && sharedBrand && sharedLocation && rangesOverlap(a.startMinute, a.endMinute, b.startMinute, b.endMinute)) {
        overlaps.push({ a: a.id, b: b.id, reason: 'Rules share schedule and assignment scope' });
      }
    }
  }
  return overlaps;
}

export function lockPriceAtCtaClick(rule, priceCents, currency, now = new Date()) {
  return {
    id: `lock-${now.getTime()}`,
    priceCents,
    currency,
    ruleId: rule?.id ?? 'fallback',
    lockedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString()
  };
}
