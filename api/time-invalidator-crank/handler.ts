import { invalidateAll } from "./invalidate";

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
module.exports.invalidate = async (event: any) => {
  console.log(
    `--------------- Expiring time-invalidators on ${new Date().toLocaleString()}  ---------------`
  );
  console.log(process.env, process.env.CRANK_DISABLED);
  if (process.env.CRANK_DISABLED === "true") {
    console.log("Crank disabled");
  } else {
    await invalidateAll();
  }
  console.log(
    `--------------- Finished expiring time-invalidators on ${new Date().toLocaleString()}  ---------------`
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return event;
};
