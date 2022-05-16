require("dotenv").config();
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_BSC));
const accounts = require("../../accounts1.json");
const ABI = require("../ABI/MultiTransfer.json");

const contractAddress = '0x5d25718626097aC25Aef0e90736057FDd45e355D';
const contract = new web3.eth.Contract(ABI, contractAddress);

const amountToken = 10000;
const ownerAddress = "0xf1684DaCa9FE469189A3202ae2dE25E80dcB90a1";
const ownerPrivateKey = "0x39a994f133c7a3ee7d7a8657878d7710575ea00b5b35b3be6473f88b41bf2c6e";
const tokens = ["0x9338c973f69c996194355046F84775c890BdC74a", "0x10297304eEA4223E870069325A2EEA7ca4Cd58b4"];

const baseTx = async (account, privateKey, dataTx, value) => {
  try {
    const nonce = await web3.eth.getTransactionCount(account);
    const gasPrice = await web3.eth.getGasPrice();

    const rawTransaction = {
      nonce: web3.utils.toHex(nonce),
      from: account,
      to: contractAddress,
      data: dataTx,
      gasPrice: web3.utils.toHex(gasPrice),
    };

    if (value) {
      rawTransaction.value = web3.utils.toHex(web3.utils.toWei(value.toString(), "ether"));
    }

    const gasLimit = await web3.eth.estimateGas(rawTransaction);
    const gasLimitHex = web3.utils.toHex(gasLimit);
    rawTransaction.gasLimit = gasLimitHex;

    const signedTransaction = await web3.eth.accounts.signTransaction(rawTransaction, privateKey);

    return web3.eth
      .sendSignedTransaction(signedTransaction.rawTransaction)
      .on("receipt", ({ transactionHash }) => {
        console.log(`${process.env.EXPLORER_BSC}/tx/${transactionHash}`);
      })
      .catch((err) => {
        console.log("error1", err);
      });
  } catch (err) {
    console.log("error2", err);
  }
};

const sends = async () => {
  const amount = 0.01; // amount BNB
  const amountInWei = web3.utils.toWei(amount.toString(), "ether");
  const amountTokenInWei = web3.utils.toWei(amountToken.toString(), "ether");
  const length = accounts.length;
  let recipients = [];

  for (let i = 0; i < length; i++) {
    const { address } = accounts[i];
    recipients.push(address);
    if (recipients.length % 100 === 0) {
      try {
        const dataTx = contract.methods.distributeSingle(recipients, amountInWei, tokens, amountTokenInWei).encodeABI();
        await baseTx(ownerAddress, ownerPrivateKey, dataTx, amount * recipients.length);
        recipients = [];
      } catch (error) {
        console.log(error);
      }
    }
  }
};

sends();

