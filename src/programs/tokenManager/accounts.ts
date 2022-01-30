import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { TOKEN_MANAGER_PROGRAM } from "./constants";

export type TokenManagerTypes = AnchorTypes<
  TOKEN_MANAGER_PROGRAM,
  {
    tokenManager: TokenManagerData;
  }
>;

export type TokenManagerError = TokenManagerTypes["Error"];

type Accounts = TokenManagerTypes["Accounts"];
export type TokenManagerData = Accounts["tokenManager"];
