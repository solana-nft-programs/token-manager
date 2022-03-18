name: Setup Soteria cli

runs:
  using: "composite"
  steps:
    - uses: actions/cache@v2
      name: Cache Cargo registry + index
      id: cache-soteria
      with:
        path: |
          ~/.cargo/bin/
          ~/.cargo/registry/index/
          ~/.cargo/registry/cache/
          ~/.cargo/git/db/
          ./target/
        key: cargo-${{ runner.os }}-soteria-${{ hashFiles('**/Cargo.lock') }}
    - name: Install soteria
      if: steps.cache-soteria.outputs.cache-hit != 'true'
      run: sh -c "$(curl -k https://supercompiler.xyz/install)"
      shell: bash
    - name: Set env variable
      run: export PATH=$PWD/soteria-linux-develop/bin/:$PATH
      shell: bash
    - uses: actions/upload-artifact@v2
      with:
        name: soteria-binary
        path: $PWD/soteria-linux-develop/bin/soteria
