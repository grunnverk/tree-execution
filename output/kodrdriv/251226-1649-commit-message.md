ci: add GitHub Actions workflows (test, CodeQL, npm publish) and Dependabot config

Add initial CI/CD and dependency automation configuration:

- .github/workflows/test.yml
  - Run lint, build and tests on push (main, working, release/**, feature/**, dependabot/**) and pull requests to main
  - Uses Node 22, npm ci, runs npm run lint/build/test
- .github/workflows/codeql.yml
  - CodeQL Advanced workflow scheduled and triggered on push/PR to main
  - Matrix includes actions and javascript-typescript analysis
  - Initializes and runs CodeQL analysis (security events permission enabled)
- .github/workflows/npm-publish.yml
  - Builds and tests on release creation, then publishes package to npm (public) using Node 22
  - Sets appropriate package/contents/id-token permissions and updates npm before publish
- .github/dependabot.yml
  - Enable weekly Dependabot updates for npm at repository root
  - Ignore local @eldrforge/* file dependencies that are managed manually

Purpose: enable automated testing, code scanning, package publishing on releases, and automated dependency updates.

(Keeping these as a single commit because all files are part of initial CI/dependency automation setup.)