import type { Idl } from "@project-serum/anchor";
import { AnchorProvider, setProvider } from "@project-serum/anchor";
import { chaiSolana } from "@saberhq/chai-solana";
import chai, { assert } from "chai";

chai.use(chaiSolana);

export const getProvider = (): AnchorProvider => {
  const anchorProvider = AnchorProvider.env();
  setProvider(anchorProvider);
  return anchorProvider;
};

type IDLError = NonNullable<Idl["errors"]>[number];

export const assertError = (error: IDLError, other: IDLError): void => {
  assert.strictEqual(error.code, other.code);
  assert.strictEqual(error.msg, other.msg);
};
