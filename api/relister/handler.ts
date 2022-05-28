import { relistNFTs } from "./empireDAO";

module.exports.relist = async (event: any) => {
  if (process.env.RELISTING_DISABLED === "true") {
    `--------------- Relisting disabled on ${new Date().toLocaleString()}  ---------------`;
    return;
  }
  console.log(
    `--------------- Relisting empireDAO NFTs on ${new Date().toLocaleString()}  ---------------`
  );
  console.log(process.env, process.env.RELISTING_DISABLED);
  await relistNFTs();
  console.log(
    `--------------- Finished Relisting empireDAO NFTs on ${new Date().toLocaleString()}  ---------------`
  );
  return event;
};
