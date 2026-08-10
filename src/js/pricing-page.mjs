import { initConsentManager } from '../core/consent-manager.mjs';
import { PRICING_DISCLOSURE, PRICING_MODE, PRICING_PLANS } from '../core/billing/pricing-config.mjs';
import { analytics, initAnalytics } from './analytics.js';

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function hydratePricing() {
  setText('[data-price="free"]', PRICING_PLANS.free.displayPrice);
  setText('[data-price="pro_monthly"]', `${PRICING_PLANS.pro_monthly.displayPrice}${PRICING_PLANS.pro_monthly.priceSuffix}`);
  setText('[data-price="pro_annual"]', `${PRICING_PLANS.pro_annual.displayPrice}${PRICING_PLANS.pro_annual.priceSuffix}`);
  setText('[data-pricing-disclosure]', PRICING_DISCLOSURE.copy);
  document.documentElement.dataset.pricingMode = PRICING_MODE;
}

function bindInterestButtons() {
  document.querySelectorAll('[data-pro-interest]').forEach((button) => {
    button.addEventListener('click', () => {
      const planKey = button.dataset.planKey || 'pro_monthly';
      const plan = Object.values(PRICING_PLANS).find((item) => item.planKey === planKey);
      if (!plan) return;

      analytics.trackEvent('pro_cta_click', {
        page_type: 'pricing',
        cta_location: 'pricing_card',
        feature_key: 'pro_interest',
        experiment_variant: 'planned_launch_v1'
      });

      const status = document.getElementById('pricingInterestStatus');
      if (status) {
        status.textContent = `Thanks for the signal. ${plan.name} checkout is not live yet, and no payment or subscription was created.`;
        status.focus({ preventScroll: true });
      }
    });
  });
}

function init() {
  hydratePricing();
  initConsentManager();
  initAnalytics();
  bindInterestButtons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
