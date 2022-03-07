require('dotenv').config();
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_MUMBAI));
const accounts = require('../../accounts1.json');
const ABI = require('../../ABI/MultiTransfer.json');

const contractAddress = process.env.MULTI_TRANSFER_MUMBAI;
const contract = new web3.eth.Contract(ABI, contractAddress);

const token = process.env.TOKEN;
const amountToken = 10000;
const ownerAddress = '0x922Da0C59EaF48926CFeE218A461bC510EE7dBb8';
const ownerPrivateKey = '0x7e25712b8472d66bfd4c3550467ab68889268be1357a21077efefd548eb1d686';

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
      rawTransaction.value = web3.utils.toHex(web3.utils.toWei(value.toString(), 'ether'))
    }

    const gasLimit = await web3.eth.estimateGas(rawTransaction);
    const gasLimitHex = web3.utils.toHex(gasLimit);
    rawTransaction.gasLimit = gasLimitHex;
    
    const signedTransaction= await web3.eth.accounts.signTransaction(rawTransaction, privateKey);
    
    return web3.eth
      .sendSignedTransaction(signedTransaction.rawTransaction)
      .on('receipt', ({ transactionHash }) => {
        console.log(`${process.env.EXPLORER_MUMBAI}/tx/${transactionHash}`);
      })
      .catch((err) => {
        console.log('error1', err);
      });
  } catch (err) {
    console.log('error2', err);
  }
}

const sendTokens = async () => {
  const amountTokenInWei = web3.utils.toWei(amountToken.toString(), 'ether')
  const length = accounts.length;
  let recipients = [];
  for (let i = 0; i < length; i++) {
    const { address } = accounts[i];
    recipients.push(address);
    if (recipients.length % 50 === 0) {
      try {
        const dataTx = contract.methods.distributeTokenSingleValue(token, recipients, amountTokenInWei).encodeABI();
        await baseTx(ownerAddress, ownerPrivateKey, dataTx, 0);
        recipients = [];
      } catch (error) {
        console.log('error')
      }
    }
  }
};

const send = async () => {
  const amount = 0.01;
  const amountInWei = web3.utils.toWei(amount.toString(), 'ether')
  const length = accounts.length;
  let recipients = [];
  for (let i = 0; i < length; i++) {
    const { address } = accounts[i];
    recipients.push(address);
    if (recipients.length % 50 === 0) {
      try {
        const dataTx = contract.methods.distributeSingleValue(recipients, amountInWei).encodeABI();
        console.log('dataTx', dataTx)
        await baseTx(ownerAddress, ownerPrivateKey, dataTx, amount * recipients.length);
        recipients = []; 
      } catch (error) {
        console.log(error)
      }
    }
  }
};

sendTokens();
// send();


// const distributeTokens = (account, privateKey, token, recipients, value) => {
//   const dataTx = contract.methods.distributeTokenSingleValue(token, recipients, value).encodeABI();
//   return Promise.resolve(baseTx(account, privateKey, dataTx, 0))
// };

// const distribute = (account, privateKey, recipients, value, payableAmout) => {
//   const dataTx = contract.methods.distributeSingleValue(recipients, value).encodeABI();
//   return baseTx(account, privateKey, dataTx, payableAmout)
// };
