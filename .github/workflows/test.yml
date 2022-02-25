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
      - run: mkdir -p target/deploy
      - run: cp -r tests/test-keypairs target/deploy

      - run: export TOKEN_MANAGER_KEYPAIR=$(solana-keygen pubkey tests/test-keypairs/cardinal_token_manager-keypair.json)
      - run: export CLAIM_APPROVER_KEYPAIR=$(solana-keygen pubkey tests/test-keypairs/cardinal_paid_claim_approver-keypair.json)
      - run: export TIME_INVALIDATOR_KEYPAIR=$(solana-keygen pubkey tests/test-keypairs/cardinal_time_invalidator-keypair.json)
      - run: export USE_INVALIDATOR_KEYPAIR=$(solana-keygen pubkey tests/test-keypairs/cardinal_use_invalidator-keypair.json)
      - run: echo $TOKEN_MANAGER_KEYPAIR

      - run: find . -type f -name "*" -exec sed -i'' -e "s/mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM/$TOKEN_MANAGER_KEYPAIR/g" {} +
      - run: find . -type f -name "*" -exec sed -i'' -e "s/pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR/$CLAIM_APPROVER_KEYPAIR/g" {} +
      - run: find . -type f -name "*" -exec sed -i'' -e "s/tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE/$TIME_INVALIDATOR_KEYPAIR/g" {} +
      - run: find . -type f -name "*" -exec sed -i'' -e "s/useZ65tbyvWpdYCLDJaegGK34Lnsi8S3jZdwx8122qp/$USE_INVALIDATOR_KEYPAIR/g" {} +

      - run: cat README.md
      - run: cat Anchor.toml

      - run: solana airdrop 1000 twLqUrEvBPdtWFusa4MSWqkyE7TyhJTv3xBXiLYUNcX --url http://localhost:8899
      - run: anchor test --skip-local-validator --provider.cluster localnet

      - uses: dorny/test-reporter@v1
        if: always()
        with:
          artifact: test-results
          name: Local Tests
          path: "tests/out.json"
          reporter: mocha-json
