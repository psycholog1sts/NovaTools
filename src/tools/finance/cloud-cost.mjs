/**
 * Cloud Cost Calculator
 * Estimates cloud infrastructure costs across providers
 */

// Pricing per unit (approximate, updated periodically)
const PRICING = {
  aws: {
    compute: {
      perVCPU: 0.04,
      perGB: 0.004
    },
    storage: {
      ssd: 0.10,
      hdd: 0.045
    }
  },
  azure: {
    compute: {
      perVCPU: 0.043,
      perGB: 0.0045
    },
    storage: {
      ssd: 0.12,
      hdd: 0.048
    }
  },
  gcp: {
    compute: {
      perVCPU: 0.038,
      perGB: 0.0042
    },
    storage: {
      ssd: 0.11,
      hdd: 0.040
    }
  }
};

/**
 * Calculate cloud costs
 * @param {Object} inputs - Calculator inputs
 * @returns {Object} Cost estimation results
 */
export function cloudCostCalculator(inputs) {
  const provider = inputs.provider || 'aws';
  const vcpus = parseInt(inputs.vcpus);
  const memory = parseInt(inputs.memory);
  const storage = parseInt(inputs.storage);
  const hoursPerMonth = parseInt(inputs.hoursPerMonth) || 730;

  const pricing = PRICING[provider];

  // Compute cost (vCPU + Memory per hour)
  const computeHourly = (vcpus * pricing.compute.perVCPU) + (memory * pricing.compute.perGB);
  const computeMonthly = computeHourly * hoursPerMonth;

  // Storage cost (per GB-month)
  const storageMonthly = storage * pricing.storage.ssd;

  // Total costs
  const totalMonthly = computeMonthly + storageMonthly;
  const totalYearly = totalMonthly * 12;

  return {
    computeCost: round(computeMonthly),
    storageCost: round(storageMonthly),
    totalMonthly: round(totalMonthly),
    totalYearly: round(totalYearly),
    provider,
    specs: { vcpus, memory, storage, hoursPerMonth },
    html: formatCloudCostResult({
      computeMonthly, storageMonthly, totalMonthly, totalYearly, provider,
      specs: { vcpus, memory, storage }
    })
  };
}

/**
 * Format result as HTML
 */
function formatCloudCostResult(data) {
  const providerNames = { aws: 'AWS', azure: 'Azure', gcp: 'Google Cloud' };

  return `
    <div class="cloud-cost-results">
      <div class="provider-badge">${providerNames[data.provider]}</div>
      
      <div class="specs-row">
        <span class="spec">${data.specs.vcpus} vCPUs</span>
        <span class="spec">${data.specs.memory} GB RAM</span>
        <span class="spec">${data.specs.storage} GB SSD</span>
      </div>

      <div class="result-highlight warning">
        <div class="result-big">$${data.totalMonthly.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
        <div class="result-label">Estimated Monthly Cost</div>
      </div>

      <div class="result-grid">
        <div class="result-card">
          <span class="result-value">$${data.computeMonthly.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          <span class="result-label">Compute</span>
        </div>
        <div class="result-card">
          <span class="result-value">$${data.storageMonthly.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          <span class="result-label">Storage</span>
        </div>
        <div class="result-card accent">
          <span class="result-value">$${data.totalYearly.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          <span class="result-label">Yearly Total</span>
        </div>
      </div>

      <div class="cost-note">
        <p>💡 Prices are estimates. Actual costs may vary based on region, reserved instances, and other factors.</p>
      </div>
    </div>
  `;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export default cloudCostCalculator;
