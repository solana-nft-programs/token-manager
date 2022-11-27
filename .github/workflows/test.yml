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
  SOLANA_VERSION: 1.10.30
  RUST_TOOLCHAIN: nightly
  SOTERIA_VERSION: 0.0.0
  ANCHOR_GIT: https://github.com/project-serum/anchor
  ANCHOR_VERSION: 0.24.2

jobs:
  rust-clippy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          override: true
          components: rustfmt, clippy
          profile: minimal
          toolchain: ${{ env.RUST_TOOLCHAIN }}
      - uses: actions-rs/clippy-check@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          toolchain: ${{ env.RUST_TOOLCHAIN }}
          args: --all-features

  rust-fmt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          override: true
          components: rustfmt, clippy
          profile: minimal
          toolchain: ${{ env.RUST_TOOLCHAIN }}
      - name: Run fmt
        uses: actions-rs/cargo@v1
        with:
          command: fmt
          args: --all --manifest-path ./Cargo.toml -- --check

  soteria-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          override: true
          profile: minimal
          toolchain: ${{ env.RUST_TOOLCHAIN }}
      - uses: ./.github/actions/install-solana
        with:
          solana_version: ${{ env.SOLANA_VERSION }}
      - uses: ./.github/actions/install-soteria
        with:
          soteria_version: ${{ env.SOTERIA_VERSION }}
      - name: Soteria scan programs
        working-directory: ./programs
        run: >-
          for PROGRAM in ./*; do
              if [ -d "$PROGRAM" ]; then
                  cd "$PROGRAM"
                  echo "Soteria scan for $PROGRAM"
                  soteria -analyzeAll .
                  cd ..
              fi
          done
        shell: bash

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: ./.github/actions/install-linux-build-deps
      - uses: actions-rs/toolchain@v1
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

      - uses: actions/cache@v3
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
      - run: anchor build
      - run: find . -type f -name "Anchor.toml" -exec sed -i'' -e "s/tests\/\*.spec.ts/tests\/\*.spec.ts --reporter mocha-junit-reporter --reporter-options mochaFile=.\/tests\/out.xml/g" {} +

      - name: Run tests
        run: solana-test-validator --url https://api.devnet.solana.com --clone metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s --clone PwDiXFxQsGra4sFFTT8r1QWRMd4vfumiWC1jfWNfdYT --clone pmvYY6Wgvpe3DEj3UX1FcRpMx43sMLYLJrFTVGcqpdn --clone 355AtuHH98Jy9XFg5kWodfmvSfrhcxYUKGoJe8qziFNY --clone crkdpVWjHWdggGgBuSyAqSmZUmAjYLzD435tcLDRLXr --bpf-program mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM ./target/deploy/cardinal_token_manager.so --bpf-program pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR ./target/deploy/cardinal_paid_claim_approver.so --bpf-program tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE ./target/deploy/cardinal_time_invalidator.so --bpf-program useZ65tbyvWpdYCLDJaegGK34Lnsi8S3jZdwx8122qp ./target/deploy/cardinal_use_invalidator.so --bpf-program trsMRg3GzFSNgC3tdhbuKUES8YvGtUBbzp5fjxLtVQW ./target/deploy/cardinal_transfer_authority.so --reset & echo $$! > validator.PID
      - run: sleep 6
      - run: solana airdrop 1000 $(solana-keygen pubkey tests/test-key.json) --url http://localhost:8899
      - run: anchor test --skip-local-validator --provider.cluster localnet
      # - uses: dorny/test-reporter@v1
      #   if: always()
      #   with:
      #     artifact: test-results
      #     name: Local Tests
      #     path: tests/*.json
      #     reporter: mocha-json
      - name: upload-integration-tests
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: Unit Test Results
          path: tests/out.xml
      - name: publish-integration-tests
        uses: EnricoMi/publish-unit-test-result-action/composite@v1
        if: always()
        with:
          files: tests/out.xml
