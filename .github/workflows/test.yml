name: Test

on:
  workflow_dispatch: {}
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  CARGO_TERM_COLOR: always
  SOLANA_VERSION: 1.8.5
  RUST_TOOLCHAIN: nightly-2021-12-10
  NPM_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}

jobs:
  test:
    runs-on: ubuntu-latest
    name: Publish test results
    steps:
      - uses: actions/checkout@v2

      - uses: cachix/install-nix-action@v16
        with:
          install_url: https://nixos-nix-install-tests.cachix.org/serve/i6laym9jw3wg9mw6ncyrk6gjx4l34vvx/install
          install_options: "--tarball-url-prefix https://nixos-nix-install-tests.cachix.org/serve"
          extra_nix_config: |
            experimental-features = nix-command flakes

      - uses: ./.github/actions/install-solana
        with:
          solana_version: ${{ env.SOLANA_VERSION }}

      - name: Setup Cachix
        uses: cachix/cachix-action@v10
        with:
          name: cardinal-token-manager
          extraPullNames: cardinal
          authToken: ${{ secrets.CACHIX_AUTH_TOKEN }}
      - name: Get yarn cache directory path
        id: yarn-cache-dir-path
        run: echo "::set-output name=dir::$(yarn config get cacheFolder)"
      - name: Yarn Cache
        uses: actions/cache@v2
        with:
          path: ${{ steps.yarn-cache-dir-path.outputs.dir }}
          key: ${{ runner.os }}-modules-${{ hashFiles('**/yarn.lock') }}
          restore-keys: |
            ${{ runner.os }}-modules-
      - name: Install Rust nightly
        uses: actions-rs/toolchain@v1
        with:
          override: true
          profile: minimal
          toolchain: ${{ env.RUST_TOOLCHAIN }}

      - name: Install Yarn dependencies
        run: yarn install
      - name: Test
        run: nix shell .#ci --command	solana-test-validator --url https://api.devnet.solana.com --clone metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s --clone PwDiXFxQsGra4sFFTT8r1QWRMd4vfumiWC1jfWNfdYT --reset & echo $$! > validator.PID
      - run: nix shell .#ci --command sleep 6
      - run: nix shell .#ci --command solana airdrop 1000 twLqUrEvBPdtWFusa4MSWqkyE7TyhJTv3xBXiLYUNcX --url http://localhost:8899
      - run: nix shell .#ci --command anchor deploy --provider.cluster localnet
      - run: nix shell .#ci --command anchor test --skip-local-validator --skip-build --skip-deploy --provider.cluster localnet

      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action/composite@v1
        if: always()
        with:
          files: tests/out.xml
