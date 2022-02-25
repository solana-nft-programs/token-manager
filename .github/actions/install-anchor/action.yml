name: Setup Anchor cli

inputs:
  anchor_git:
    description: Link to Anchor cli GH repository
    required: true

runs:
  using: "composite"
  steps:
    - uses: actions/cache@v2
      name: Cache Cargo registry + index
      if: ${{ !env.ACT }}
      id: cache-anchor
      with:
        path: |
          ~/.cargo/bin/
          ~/.cargo/registry/index/
          ~/.cargo/registry/cache/
          ~/.cargo/git/db/
          ./target/
        key: cargo-${{ runner.os }}-anchor-${{ hashFiles('**/Cargo.lock') }}
    - name: Install anchor
      if: ${{ !env.ACT }} && steps.cache-anchor.outputs.cache-hit != 'true'
      run: cargo install --git ${{inputs.anchor_git}} --tag v0.21.0 anchor-cli --locked --force
      shell: bash
    - uses: actions/upload-artifact@v2
      with:
        name: anchor-binary
        path: ~/.cargo/bin/anchor
