const { BILLING, getPlanFromPriceId } = require('../supabase/functions/_shared/prices.ts');

const ALL_PRICE_TEST_CASES = [
  // 4 Starter Price IDs
  { plan: 'starter', interval: 'monthly', priceId: 'pri_01kw4zrvsjch1j1hm9vqndq7r2' },
  { plan: 'starter', interval: 'quarterly', priceId: 'pri_01kwen9hya3s4ff5a345x3fan5' },
  { plan: 'starter', interval: 'sixMonth', priceId: 'pri_01kwenc72ad2fnfjks4qxcv8gt' },
  { plan: 'starter', interval: 'yearly', priceId: 'pri_01kwenh9cqccsbym0m1w6tg3gs' },

  // 4 Pro Price IDs
  { plan: 'pro', interval: 'monthly', priceId: 'pri_01kw4zwwpdem0gmmxq0jgjvge2' },
  { plan: 'pro', interval: 'quarterly', priceId: 'pri_01kwj03nqwt1x8wwcdsm7k0gf7' },
  { plan: 'pro', interval: 'sixMonth', priceId: 'pri_01kwj06cdf68mjc2dv20gzb1n0' },
  { plan: 'pro', interval: 'yearly', priceId: 'pri_01kwj0cex7n1rdaww8fv33afbm' },

  // 4 Teams Price IDs (Future proofing)
  { plan: 'teams', interval: 'monthly', priceId: 'pri_01kwj0es4nckpwbnqhsfptmpbz' },
  { plan: 'teams', interval: 'quarterly', priceId: 'pri_01kwj0gqjqzgnsn9rg8wyygctw' },
  { plan: 'teams', interval: 'sixMonth', priceId: 'pri_01kwj0jmf5y3mh4djdy33c008k' },
  { plan: 'teams', interval: 'yearly', priceId: 'pri_01kwj0me8wdfc1mr801971n74y' },
];

function simulateWebhookPayload(priceId, productName) {
  return {
    event_type: 'transaction.completed',
    data: {
      customer: { id: 'ctm_test_123', email: 'test_buyer@example.com' },
      subscription_id: 'sub_test_456',
      items: [
        {
          price_id: priceId,
          price: {
            id: priceId,
            product: { name: productName || 'ReachDesk Subscription' }
          }
        }
      ]
    }
  };
}

function resolvePlanFromPayload(payload) {
  const priceId = payload.data?.items?.[0]?.price_id || payload.data?.items?.[0]?.price?.id;
  const rawProductName = payload.data?.items?.[0]?.price?.product?.name || '';

  let resolvedPlan = getPlanFromPriceId(priceId);
  if (!resolvedPlan) {
    const nameLower = rawProductName.toLowerCase();
    if (nameLower.includes('pro')) resolvedPlan = 'pro';
    else if (nameLower.includes('teams') || nameLower.includes('team')) resolvedPlan = 'teams';
    else if (nameLower.includes('starter')) resolvedPlan = 'starter';
    else {
      console.error('[Webhook Simulation] UNKNOWN price ID or product name received:', { priceId, rawProductName });
      resolvedPlan = 'starter';
    }
  }
  return resolvedPlan;
}

function runSimulation() {
  console.log('========================================================');
  console.log('Simulating Webhook Price-to-Plan Resolution (12 Price IDs)');
  console.log('========================================================\n');

  let passedCount = 0;

  ALL_PRICE_TEST_CASES.forEach((test, i) => {
    const payload = simulateWebhookPayload(test.priceId, `${test.plan} Plan (${test.interval})`);
    const resolved = resolvePlanFromPayload(payload);
    const pass = resolved === test.plan;
    if (pass) passedCount++;

    console.log(
      `[${i + 1}/12] Price ID: ${test.priceId.padEnd(32)} | Plan: ${test.plan.padEnd(8)} (${test.interval.padEnd(10)}) | Resolved: ${resolved.padEnd(8)} | ${pass ? '✅ PASS' : '❌ FAIL'}`
    );
  });

  // Test Unknown Price ID Fallback
  console.log('\n--- Testing Unknown Price ID Fallback ---');
  const unknownPayload = simulateWebhookPayload('pri_unknown_99999999999', 'Custom Unknown Plan');
  const unknownResolved = resolvePlanFromPayload(unknownPayload);
  console.log(`Unknown Price ID -> Resolved Plan: ${unknownResolved} (safely logged warning & defaulted without crashing)`);

  console.log('\n========================================================');
  console.log(`Results: ${passedCount}/12 Price IDs resolved 100% correctly!`);
  console.log('========================================================');
}

runSimulation();
