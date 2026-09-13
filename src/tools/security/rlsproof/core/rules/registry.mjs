import { functionViewRules } from './functions-views.mjs';
import { grantRules } from './grants.mjs';
import { policyRules } from './policies.mjs';
import { tableRules } from './tables.mjs';

export const RULES = Object.freeze([
  ...tableRules,
  ...policyRules,
  ...grantRules,
  ...functionViewRules,
]);

const duplicateIds = RULES
  .map((rule) => rule.id)
  .filter((id, index, all) => all.indexOf(id) !== index);
if (duplicateIds.length > 0) {
  throw new Error(`Duplicate RLSProof rule ids: ${[...new Set(duplicateIds)].join(', ')}`);
}

export function runRules(context) {
  if (!context || typeof context !== 'object' || !context.state) {
    throw new TypeError('rule context requires migration state');
  }

  const findings = [];
  for (const rule of RULES) {
    const produced = rule.evaluate(context);
    if (!Array.isArray(produced)) {
      throw new TypeError(`Rule ${rule.id} must return an array of findings`);
    }
    findings.push(...produced);
  }
  return findings.sort((left, right) => {
    const path = String(left.path ?? '').localeCompare(String(right.path ?? ''));
    if (path !== 0) return path;
    const line = (left.line ?? 0) - (right.line ?? 0);
    if (line !== 0) return line;
    return left.id.localeCompare(right.id);
  });
}
