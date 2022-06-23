import { PublicKey } from "@solana/web3.js";
import { findTokenManagerAddress } from "../src/programs/tokenManager/pda";

const MINT_IDS: string[] = [
  "4Ad7m2JBYnjWg9pqAuXcU1qobhktiYBsiGV89kWZhJLG",
  "8YYrAMPp2GmEHdgbsz33N2WG6KADwZZ8gXtyhWkouaJQ",
  "DfAf6LhwAo99fEyTKwkzsD9FtYBJrLnMt7kyjfSdKZrJ",
  "HqBn8694NyQhEZTbk8mwsM2rUevz9Ye9P9LxNwbSGDC9",
  "C323pV7AyR1cf2t7URCVezayVZVFhHT7qzr1R64npQJo",
  "8hz481NobkDMVXFsbHg2rtMZUJMopSSyJAvH9kPxevDq",
  "Hrh1ptUWNFYpoaDDyRTrWB8eLYtmcyThamsr8dyMUREE",
  "Apw74MevYpbeLoiq7pQALu4FvjU1kdf5zQoArR6zwRzK",
  "2hLBuwaYLjZ2BTVhgpbsavcbNgC1mLJvAZMT21sYTqJk",
  "Azb8zxYcMvuzfD5CfG31PTyrLZGNvHAF9Ew1ViR2EX1T",
  "8FMLVqK1w37iFQPyk1LckuxJ5XYa8XhPQSqbRTCFjtrp",
  "DPPisnRzWgFmFuCxeK28jNKZNYZgSTFAsFmkU6PsdTaN",
  "CZHAyCEQ2PWcbjNSAEZnRnV6idPw5iS3ZAnaYzUdVSTU",
  "6JEMopod8BYqYg2GPMC3RL7UoG5VM37wAicMuo7kv9xv",
  "2P6zxrhYx9KMGqUT4A1rDPPdBKLnimFNgd5tfDTXjhVQ",
  "78yhuoQ5T84d7qAj6wZCANviY1CGqTFci6LXQw3nEHga",
  "BFrzR5rZmL6QUXuBtnv7tKa5bRZuUSXFhyXRukpJiNic",
  "FHFsYYUctPZNx56yxjCP4emohCN2ukWnbdtFGSTLaX4w",
  "8PR6hGBiH1ZRWHRgXwgEjp3ZebrrCKt7fERxQNn1Nkpk",
  "4WDda2ktgvBcmd7TSvT1uE6WQpV5qhpVpbL79pSYmeib",
  "Gp4eq83xw4VNtBPnHd1ZYhs6q2oTpiRgBMQkVmUUpN8K",
  "3cbXgBMK7S6q41mtqYZoQ7sRAKqUVjv77PQPWEACgAgV",
  "7DtsTWDWLUVuV2STAkc82TdHZgkab3LgDukLqtD35itc",
  "521er77zGRo9JEoyz5SqcVXoCmdgfWfxQaRHq5NtBkAV",
  "DEmKnxSqC2wNSnh7GFKhKpUva2x6qMSX39UKydXZShtV",
  "DWibNzK8AGKKeYEgJjgHet5BAxafMKjSAKwJ9eqkSUQ",
  "Bmsv5ZpaBNpun3uBVkS9TaWsoGBxsbvRNZYYLLqwVd7v",
  "F88WvsAAFH8XeT5GXkdXneRVQNisJMkHTDysrEktbqT",
  "BLkn8RWSg4KWg5dUxFZPEeci9L5aMTQwXMAy63X39Dhj",
  "BjUfQvSN33mne5jcy95igYsSPEJpv2yeJLQ6upEGBjUJ",
  "9YrQ7FFKc3kwcNE5VtY4ncPyHKpSsDm5w3PmghzcZGEu",
];

const main = async (
  mintIds: string[]
): Promise<{ mintId: string; tokenManagerId: string }[]> => {
  return Promise.all(
    mintIds.map(async (m) => ({
      mintId: m,
      tokenManagerId: (
        await findTokenManagerAddress(new PublicKey(m))
      )[0].toString(),
    }))
  );
};

main(MINT_IDS)
  .then((ids) => console.log(ids, ids.length))
  .catch((e) => console.log(e));
