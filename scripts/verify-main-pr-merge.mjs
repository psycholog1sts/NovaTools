const repository = process.env.GITHUB_REPOSITORY?.trim();
const sha = process.env.GITHUB_SHA?.trim();
const token = process.env.GITHUB_TOKEN?.trim();

if (!repository || !sha || !token) {
  console.error('::error::Production merge guard requires GITHUB_REPOSITORY, GITHUB_SHA and GITHUB_TOKEN.');
  process.exit(1);
}

const endpoint = `https://api.github.com/repos/${repository}/commits/${sha}/pulls`;
const response = await fetch(endpoint, {
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'novatools-production-merge-guard',
    'X-GitHub-Api-Version': '2022-11-28'
  }
});

if (!response.ok) {
  console.error(`::error::Unable to verify production commit provenance (GitHub HTTP ${response.status}).`);
  process.exit(1);
}

const pullRequests = await response.json();
if (!Array.isArray(pullRequests)) {
  console.error('::error::Unexpected GitHub response while verifying production commit provenance.');
  process.exit(1);
}

const mergedMainPullRequest = pullRequests.find((pullRequest) =>
  pullRequest?.merged_at && pullRequest?.base?.ref === 'main'
);

if (!mergedMainPullRequest) {
  console.error('::error::Refusing production deploy: main commit is not associated with a merged pull request targeting main.');
  process.exit(1);
}

console.log(`Production provenance verified through merged PR #${mergedMainPullRequest.number}.`);
