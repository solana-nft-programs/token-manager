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
    console.log("Error: Failed to create payment manager");
  } else {
    console.log(
      `Created payment manager ${paymentManagerName} (${paymentManagerId.toString()})`,
      paymentManagerData.parsed.feeCollector.toString()
    );
  }
};

const paymentManagerName = "cardinal-mini-royale";

main(paymentManagerName).catch((e) => console.log(e));
