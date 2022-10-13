name: Deps

on:
  workflow_dispatch: {}

env:
  CARGO_TERM_COLOR: always
  SOLANA_VERSION: 1.10.30
  RUST_TOOLCHAIN: nightly
  NPM_AUTH_TOKEN: ${{ secrets.NPM_PUBLISH_TOKEN }}
  ANCHOR_GIT: https://github.com/project-serum/anchor
  ANCHOR_VERSION: 0.24.2

jobs:
  test:
    runs-on: ubuntu-latest
    name: Build deps and cache
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
          anchor_version: ${{ env.ANCHOR_VERSION }}

      - uses: actions/cache@v2
        with:
          path: |
            ~/.cargo/bin/
            ~/.cargo/registry/index/
            ~/.cargo/registry/cache/
            ~/.cargo/git/db/
            ./rust/target
          key: ${{ env.cache_id }}-${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}-${{ env.RUSTC_HASH }}
