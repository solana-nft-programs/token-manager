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
  ANCHOR_GIT: https://github.com/project-serum/anchor
  RUST_TOOLCHAIN: nightly-2021-12-10
  NPM_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}

jobs:
  test:
    runs-on: ubuntu-latest
    name: Publish test results
    steps:
      - uses: actions/checkout@v2

      - uses: ./.github/actions/install-linux-build-deps
      - name: Install Rust nightly
        uses: actions-rs/toolchain@v1
        with:
          override: true
          profile: minimal
          toolchain: ${{ env.RUST_TOOLCHAIN }}
      - uses: ./.github/actions/install-solana
        with:
          solana_version: ${{ env.SOLANA_VERSION }}
      - uses: ./.github/actions/install-anchor
        with:
          anchor_git: ${{ env.ANCHOR_GIT }}

      # Restore Cache from previous build/test
      - uses: actions/cache@v2
        with:
          path: |
            ~/.cargo/bin/
            ~/.cargo/registry/index/
            ~/.cargo/registry/cache/
            ~/.cargo/git/db/
            ./rust/target
          key: ${{ env.cache_id }}-${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}-${{ env.RUSTC_HASH }}

      - name: Install Yarn dependencies
        run: yarn install
      - name: Test
        run: solana-test-validator --url https://api.devnet.solana.com --clone metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s --clone PwDiXFxQsGra4sFFTT8r1QWRMd4vfumiWC1jfWNfdYT --reset & echo $$! > validator.PID
      - run: sleep 6
      - run: solana airdrop 1000 twLqUrEvBPdtWFusa4MSWqkyE7TyhJTv3xBXiLYUNcX --url http://localhost:8899
      - run: anchor test --skip-local-validator --provider.cluster localnet

      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action/composite@v1
        if: always()
        with:
          files: tests/out.xml
