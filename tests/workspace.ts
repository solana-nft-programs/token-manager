import type { Idl } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { chaiSolana } from "@saberhq/chai-solana";
import chai, { assert } from "chai";

chai.use(chaiSolana);

export const getProvider = (): anchor.Provider => {
  const anchorProvider = anchor.Provider.env();
  anchor.setProvider(anchorProvider);
  return anchorProvider;
};

type IDLError = NonNullable<Idl["errors"]>[number];

export const assertError = (error: IDLError, other: IDLError): void => {
  assert.strictEqual(error.code, other.code);
  assert.strictEqual(error.msg, other.msg);
};
