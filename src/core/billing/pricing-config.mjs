export const PRICING_MODE = 'interest-only';

export const PRICING_PLANS = Object.freeze({
  free: Object.freeze({
    planKey: 'free',
    name: 'Free',
    displayPrice: '$0',
    billingInterval: 'forever',
    description: 'Core single-task utilities with no forced signup.',
    features: Object.freeze([
      'Existing core tools',
      'Single-file and basic utility workflows',
      'Browser-first processing where technically practical',
      'No forced signup'
    ])
  }),
  pro_monthly: Object.freeze({
    planKey: 'pro_monthly',
    name: 'Pro Monthly',
    displayPrice: '$12',
    priceSuffix: '/month',
    billingInterval: 'monthly',
    description: 'Planned launch pricing for higher-throughput browser workflows.',
    features: Object.freeze([
      'Batch workflows',
      'Saved presets',
      'Workflow chaining',
      'Bulk export',
      'Ad-free experience',
      'Local workflow history without file contents'
    ])
  }),
  pro_annual: Object.freeze({
    planKey: 'pro_annual',
    name: 'Pro Annual',
    displayPrice: '$120',
    priceSuffix: '/year',
    billingInterval: 'annual',
    description: 'Planned annual option with a measured discount versus monthly billing.',
    features: Object.freeze([
      'Same planned Pro workflow features',
      'Annual billing interval',
      'No extra entitlement tier or hidden feature split'
    ])
  })
});

export const PRICING_DISCLOSURE = Object.freeze({
  checkoutEnabled: false,
  copy: 'NovaTools Pro billing is not live yet. These are planned launch prices for value validation; no payment or subscription is created on this page.'
});

export function getPricingPlan(planKey) {
  return Object.values(PRICING_PLANS).find((plan) => plan.planKey === planKey) || null;
}
