import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { CardinalTokenManager } from "../../types/cardinal_token_manager";

export type TokenManagerTypes = AnchorTypes<
  CardinalTokenManager,
  {
    tokenManager: TokenManagerData;
  }
>;

export type TokenManagerError = TokenManagerTypes["Error"];

type Accounts = TokenManagerTypes["Accounts"];
export type TokenManagerData = Accounts["tokenManager"];
