const outcomes = {
  reconcile_hosts: process.env.RECONCILE_OUTCOME || 'missing',
  apex_edge: process.env.APEX_EDGE_OUTCOME || 'missing',
  www_edge: process.env.WWW_EDGE_OUTCOME || 'missing',
};

const failed = Object.entries(outcomes).filter(([, outcome]) => outcome !== 'success');
if (failed.length) {
  console.error(`Production diagnostics failed: ${failed.map(([name, outcome]) => `${name}=${outcome}`).join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Production diagnostics gate: pass');
}
