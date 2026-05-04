# Running CLI Locally

Note: contributing requires `yarn` and it's recommended you install it as a global installation. If you don't have yarn installed already run `npm install -g yarn` in your terminal.

Run `yarn` or `yarn install` to install dependencies. Then, run `npm link` once to link to your local version of the CLI in the npm global namespace (`npm list -g`). Make sure you are working in `packages/cli` and not its alias package, `packages/mintlify`.

If you already have a non-local version of the CLI, you will need to uninstall it (`npm uninstall -g mint`) or force overwrite the executable file. Otherwise, you will get an `EEXIST` error on the mintlify binary. You can overwrite the file using the `--force` flag (`npm link --force`), but always double check the file(s) you are overwriting.

Make sure to build the CLI using `yarn build` or `yarn watch` to see your local changes reflected. Tip: keep `yarn watch` running in a separate terminal for changes to be quickly and continuously reflected while developing.

To uninstall locally, run `npm uninstall -g @mintlify/cli`.

If you wish to continue using the production version of the CLI, you will need to reinstall it (`npm install -g mint`). If you do not uninstall `@mintlify/cli`, then you will need to force overwrite the executable file (`npm install -g mint --force`) for the same reasons as mentioned above. As a best practice, we recommend always uninstalling `@mintlify/cli` first.

## Updating Version of Mint Client

The CLI uses GitHub releases to download specific versions of the client code used in `mintlify dev`. It will attempt to fetch the latest version of the client app specified by our [`mint-version.txt`](https://d1ctpt7j8wusba.cloudfront.net/mint-version.txt) file. The mint-version.txt and compressed versions of the client live in S3 under `mint-client-releases`.

Here's how new client changes are published, they should usually require no manual intervention:

1. When a PR is merged to main, we check whether or not the client app or any of its dependencies have changed with the `check-changes` workflow job
2. The `bump-packages` job always runs, which increments the version of any package that has changed in our monorepo packages, commits the version increment to github, and publishes the update to npm
3. If `check-changes` detected a client change, the `client-release` workflow is triggered after `bump-packages`
4. The `client-release` workflow creates a standalone zip of the client app and uploads it to S3 as mint-${version}.tar.gz
5. The `cli-test` workflow is triggered, which uses a local build of the CLI package and the new client version that was just zipped and shipped. It tests the CLI output has not changed (no new errors) and that the starter-kit passes some simple Puppeteer tests.
6. If the `cli-test` workflow passes, the `update-release-version` workflow is triggered, which uploads an updated version of the mint-version.txt file to S3 with the new version number, and invalidates the cache for that file.

## Manually triggering a client release and version update

You can still create a new client version whenever by dispatching the `client-release` workflow from the [Actions tab for the mint repo](https://github.com/mintlify/mint/actions). Click the "Run workflow" dropdown button and enter the version number you want to set it to, then click the green "Run workflow" button. This should run the steps 4-6 detailed above, creating a new package of the client app and updating the version number used by the CLI.

## Manually updating the version of the client app used by the CLI

If for some reason we need to roll back a client version, we can update the mint-version.txt file to swiftly change which version is downloaded by the CLI. This can be done 2 ways:

1. Via github workflow: Go to the [Actions tab for the mint repo](https://github.com/mintlify/mint/actions) and select the Update Release Version workflow. Click the "Run workflow" dropdown button and enter the version number you want to set it to, then click the green "Run workflow" button.
2. Manually: If you have S3 access, simply upload a new version of the mint-version.txt file in the `mint-client-releases` folder

## Manually uploading a packaged version of the client app

If for some reason the release workflow is broken or we can't access AWS programmatically, the newly zipped version of the client app is retained in the `client-release` workflow as a Github artifact for 1 day. We can download it manually from Github after the release and upload it wherever needed.

## Manually overriding the client version used locally

Run `mintlify dev --client-version x.x.xxxx` with the client version you would like to use and that version will be downloaded instead of the latest client version.
