# Releasing Polysome

Polysome uses Release Please for versioning and changelogs, npm trusted
publishing for package delivery, and a GitHub repository dispatch event to
notify dandelion.art.

The first release is bootstrapped after commit `5420f41`; older experimental
history remains in Git without being copied into the initial changelog.

## One-time setup

### 1. Confirm the npm scope

The package is named `@teamdandelion/polysome` and is configured as public. The
publishing npm account must be allowed to publish within the `teamdandelion`
scope.

If that npm organization does not exist, create it or deliberately choose a
different owned scope before the first release. Update the package name, the
release workflow, and this documentation together.

### 2. Bootstrap the first npm publication

Trusted publishing is configured on an existing npm package. For the first
release, create a granular npm automation token that can publish this package
and add it to the Polysome GitHub repository as the `NPM_TOKEN` Actions secret.

After the first release exists on npm:

1. Open the package's publishing-access settings on npm.
2. Add a GitHub Actions trusted publisher.
3. Use organization/user `teamdandelion`, repository `polysome`, and workflow
   filename `release.yml`.
4. Allow `npm publish`.
5. Remove `NPM_TOKEN` from the GitHub repository after one successful
   trusted-publishing release.

The release workflow grants `id-token: write`, uses Node 24/npm 11+, and has a
repository URL matching the publishing repository, as npm trusted publishing
requires.

### 3. Allow Release Please pull requests to run CI

Add a fine-grained GitHub token as the `RELEASE_PLEASE_TOKEN` repository secret.
It should be able to create branches, pull requests, releases, and tags in the
Polysome repository.

The workflow falls back to `GITHUB_TOKEN`, but GitHub suppresses new workflow
runs caused by that token. A dedicated token ensures the generated release pull
request receives normal CI checks.

### 4. Configure the dandelion.art notification

Add a fine-grained token as `DANDELION_ART_DISPATCH_TOKEN`. It must be able to
send repository dispatch events to `teamdandelion/dandelion.art`.

Without this secret, npm publication still succeeds and the workflow records a
notice that site notification was skipped.

## Normal release flow

1. Merge conventional commits into `main`, such as `fix: ...` or `feat: ...`.
2. Release Please creates or updates its release pull request, including the
   next version and changelog.
3. Review and merge that release pull request when the package should ship.
4. The workflow creates the GitHub release and tag.
5. CI builds and verifies the exact release commit.
6. npm publishes the version.
7. Polysome sends the site notification described below.

Release Please derives versions from conventional commits:

- `fix:` produces a patch release.
- `feat:` produces a minor release.
- `BREAKING CHANGE:` produces a major release after 1.0.

Do not edit `package.json` versions manually during normal development.

## dandelion.art event contract

Polysome sends a GitHub `repository_dispatch` request to
`teamdandelion/dandelion.art` with this shape:

```json
{
  "event_type": "polysome-released",
  "client_payload": {
    "package": "@teamdandelion/polysome",
    "version": "0.2.0",
    "tag": "v0.2.0",
    "repository": "teamdandelion/polysome"
  }
}
```

The eventual dandelion.art handler should install the exact payload version,
run its checks, and open an automatically mergeable dependency pull request.
That preserves a reviewable deployment boundary while making upgrades nearly
immediate.

## Recovery

- If npm publication fails, fix authentication or packaging and re-run the
  failed workflow job. Never reuse a version that reached npm.
- If only site notification fails, manually re-run the release workflow job or
  send the same repository dispatch payload; do not republish npm.
- If a release is bad, publish a forward fix. npm versions are immutable and
  should not be deleted as routine rollback.
