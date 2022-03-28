name: Install Solana

inputs:
  solana_version:
    description: Version of Solana to install
    required: true

runs:
  using: "composite"
  steps:
    - name: Cache Solana Install
      id: cache-solana-install
      uses: actions/cache@v2
      with:
        path: "$HOME/.local/share/solana/install/releases/${{ inputs.solana_version }}"
        key: ${{ runner.os }}-Solana-v${{ inputs.solana_version  }}

    - name: Install Solana
      # if: steps.cache-solana-install.outputs.cache-hit != 'true'
      run: |
        sh -c "$(curl -sSfL https://release.solana.com/v${{ inputs.solana_version }}/install)"
      shell: bash

    - name: Set Active Solana Version
      run: |
        rm -f "$HOME/.local/share/solana/install/active_release"
        ln -s "$HOME/.local/share/solana/install/releases/${{ inputs.solana_version }}/solana-release" "$HOME/.local/share/solana/install/active_release"
      shell: bash

    - name: Add Solana bin to Path
      run: |
        echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH
        export PATH="/home/runner/.local/share/solana/install/active_release/bin:$PATH"
      shell: bash

    - name: Verify Solana install
      run: |
        solana --version
      shell: bash

    - name: Install toolchain
      run: |
        echo Installing bpf toolchain...
        (cd /home/runner/.local/share/solana/install/active_release/bin/sdk/bpf/scripts; ./install.sh)
      shell: bash
