import assert from 'node:assert/strict';
import { authorizeRuntimeTarget } from '../src/tools/security/rlsproof/core/runtime/target-authorization.mjs';

const localHttp = authorizeRuntimeTarget('http://localhost:54321/rest/v1/docs');
assert.equal(localHttp.authorized, true);
assert.equal(localHttp.reason, 'localhost');
assert.equal(localHttp.target.origin, 'http://localhost:54321');

const loopback = authorizeRuntimeTarget('http://127.0.0.1:54321/');
assert.equal(loopback.authorized, true);
assert.equal(loopback.reason, 'localhost');

const unattested = authorizeRuntimeTarget('https://project.example.com/rest/v1/docs');
assert.equal(unattested.authorized, false);
assert.equal(unattested.reason, 'ownership-attestation-required');

const attested = authorizeRuntimeTarget('https://project.example.com/rest/v1/docs', {
  attestedOwnedHosts: ['project.example.com'],
});
assert.equal(attested.authorized, true);
assert.equal(attested.reason, 'owned-target-attested');
assert.equal(attested.target.hostname, 'project.example.com');

const wrongHost = authorizeRuntimeTarget('https://other.example.com/', {
  attestedOwnedHosts: ['project.example.com'],
});
assert.equal(wrongHost.authorized, false);
assert.equal(wrongHost.reason, 'ownership-attestation-required');

const insecureRemote = authorizeRuntimeTarget('http://project.example.com/', {
  attestedOwnedHosts: ['project.example.com'],
});
assert.equal(insecureRemote.authorized, false);
assert.equal(insecureRemote.reason, 'https-required-for-remote-target');

const credentialed = authorizeRuntimeTarget('https://user:secret@project.example.com/', {
  attestedOwnedHosts: ['project.example.com'],
});
assert.equal(credentialed.authorized, false);
assert.equal(credentialed.reason, 'embedded-credentials-rejected');

const metadata = authorizeRuntimeTarget('http://169.254.169.254/latest/meta-data/', {
  attestedOwnedHosts: ['169.254.169.254'],
});
assert.equal(metadata.authorized, false);
assert.equal(metadata.reason, 'non-public-network-target-rejected');

const fileScheme = authorizeRuntimeTarget('file:///etc/passwd');
assert.equal(fileScheme.authorized, false);
assert.equal(fileScheme.reason, 'unsupported-scheme');

const invalid = authorizeRuntimeTarget('not a url');
assert.equal(invalid.authorized, false);
assert.equal(invalid.reason, 'invalid-url');

const again = authorizeRuntimeTarget('https://project.example.com/rest/v1/docs', {
  attestedOwnedHosts: ['PROJECT.EXAMPLE.COM'],
});
assert.deepEqual(attested, again, 'runtime target authorization must be deterministic');

console.log('RLSProof runtime target gate contract: PASS');
