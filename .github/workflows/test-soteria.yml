name: Test soteria

on:
  workflow_dispatch: {}

permissions:
  checks: write
  contents: read
  issues: read
  pull-requests: write

env:
  CARGO_TERM_COLOR: always
  SOLANA_VERSION: 1.9.13
  ANCHOR_GIT: https://github.com/project-serum/anchor
  RUST_TOOLCHAIN: nightly
  NPM_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}

jobs:
  test:
    runs-on: ubuntu-latest
    name: Publish test results
    steps:
      - uses: actions/checkout@v3

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

      - uses: ./.github/actions/install-soteria

      - uses: actions/cache@v2
        with:
          path: |
            ~/.cargo/bin/
            ~/.cargo/registry/index/
            ~/.cargo/registry/cache/
            ~/.cargo/git/db/
            ./rust/target
          key: ${{ env.cache_id }}-${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}-${{ env.RUSTC_HASH }}
      - name: Soteria token-manager
        working-directory: ./programs/cardinal-token-manager
        run: soteria -analyzeAll .
        shell: bash
