import { getPaymentManager } from "../src/programs/paymentManager/accounts";
import { findPaymentManagerAddress } from "../src/programs/paymentManager/pda";
import { tryGetAccount } from "../src";
import { connectionFor } from "./connection";

const main = async (paymentManagerName: string, cluster = "mainnet") => {
  const connection = connectionFor(cluster);
  const [paymentManagerId] = await findPaymentManagerAddress(
    paymentManagerName
  );
  const paymentManagerData = await tryGetAccount(() =>
    getPaymentManager(connection, paymentManagerId)
  );
  if (!paymentManagerData) {
    console.log("Error: Failed to get payment manager");
  } else {
    console.log(
      `Got payment manager ${paymentManagerName} (${paymentManagerId.toString()})`,
      paymentManagerData
    );
  }
};

const paymentManagerName = "cardinal-mini-royale";

main(paymentManagerName).catch((e) => console.log(e));
