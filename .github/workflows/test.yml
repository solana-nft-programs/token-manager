name: Test

on:
  workflow_dispatch: {}
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  checks: write
  contents: read
  issues: read
  pull-requests: write

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

      - name: Setup
        run: mkdir -p target/deploy
      - run: cp -r tests/test-keypairs/* target/deploy
      - run: find . -type f -name "*" -exec sed -i'' -e "s/mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM/$(solana-keygen pubkey tests/test-keypairs/cardinal_token_manager-keypair.json)/g" {} +
      - run: find . -type f -name "*" -exec sed -i'' -e "s/pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR/$(solana-keygen pubkey tests/test-keypairs/cardinal_paid_claim_approver-keypair.json)/g" {} +
      - run: find . -type f -name "*" -exec sed -i'' -e "s/tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE/$(solana-keygen pubkey tests/test-keypairs/cardinal_time_invalidator-keypair.json)/g" {} +
      - run: find . -type f -name "*" -exec sed -i'' -e "s/useZ65tbyvWpdYCLDJaegGK34Lnsi8S3jZdwx8122qp/$(solana-keygen pubkey tests/test-keypairs/cardinal_use_invalidator-keypair.json)/g" {} +
      - run: find . -type f -name "Anchor.toml" -exec sed -i'' -e "s/yarn mocha tests\/\*.spec.ts/yarn mocha tests\/\*.spec.ts --reporter mocha-junit-reporter --reporter-options mochaFile=.\/tests\/out.xml/g" {} +

      - name: Test
        run: solana-test-validator --url https://api.devnet.solana.com --clone metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s --clone PwDiXFxQsGra4sFFTT8r1QWRMd4vfumiWC1jfWNfdYT --reset & echo $$! > validator.PID
      - run: sleep 6

      - run: cat Anchor.toml
      - run: solana airdrop 1000 $(solana-keygen pubkey tests/test-key.json) --url http://localhost:8899
      - run: anchor test --skip-local-validator --provider.cluster localnet

      # - uses: dorny/test-reporter@v1
      #   if: always()
      #   with:
      #     artifact: test-results
      #     name: Local Tests
      #     path: tests/*.json
      #     reporter: mocha-json
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: Unit Test Results
          path: tests/out.xml
      - name: Publish Unit Test Results
        uses: EnricoMi/publish-unit-test-result-action/composite@v1
        if: always()
        with:
          files: tests/out.xml
