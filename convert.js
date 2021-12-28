require('dotenv').config();
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC));
const accounts = require('./accounts.json');
const ABI = require('./ABI/Convert.json');

const contractAddress = process.env.CONVERT_ADDRESS;
const cardTypes = [1, 1, 1];

// const defaultWei = 5000000000; // default 5 GWei
const contract = new web3.eth.Contract(ABI, contractAddress);

const run = async (account, privateKey, _tokenId, _cardTypes) => {
  try {
    const dataTx = contract.methods.convert(_tokenId, _cardTypes).encodeABI();
    const gasPrice = await web3.eth.getGasPrice();
    const nonce = await web3.eth.getTransactionCount(account);

    const rawTransaction = {
      nonce: web3.utils.toHex(nonce),
      gasPrice: web3.utils.toHex(gasPrice * 1.1),
      from: account,
      to: contractAddress,
      data: dataTx,
    };
    const gasLimit = await web3.eth.estimateGas(rawTransaction);

    const gasLimitHex = web3.utils.toHex(gasLimit);
    rawTransaction.gasLimit = gasLimitHex;

    const signedTransaction = await web3.eth.accounts.signTransaction(rawTransaction, privateKey);

    return web3.eth
      .sendSignedTransaction(signedTransaction.rawTransaction)
      .on('receipt', ({ transactionHash }) => {
        console.log(orderId, `${process.env.EXPLORER}/tx/${transactionHash}`);
      })
      .catch((err) => {
        console.log('error1', err);
      });
  } catch (error) {
    console.log('error2', error);
  }
};

const convertPackage = async ({ from, to, address, privateKey }) => {
  for (let i = from; i < to; i++) {
    await run(address, privateKey, _tokenId, cardTypes);
  }
};


const script = () => {
  for (let i = 0; i < accounts.length; i++) {
    const { address, privateKey, from, to } = accounts[i];
    convertPackage({ from, to, address, privateKey });
  }
};

script();
