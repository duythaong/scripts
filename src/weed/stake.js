require('dotenv').config();
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_BSC));
const stakeABI = require('../ABI/StakeW.json');
const stakingAddress = '0xF403C43300Cd722AEf5f2E305F655AD7753Db935';
const stakingContract = new web3.eth.Contract(stakeABI, stakingAddress);
const stakingAmount = 1000;

const accounts = require('../../accounts1.json');
const tokenABI = require('../ABI/ERC20.json');
const MaxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const tokens = ["0x10297304eEA4223E870069325A2EEA7ca4Cd58b4", "0x979Db64D8cD5Fed9f1B62558547316aFEdcf4dBA", "0x013345B20fe7Cf68184005464FBF204D9aB88227", "0xd2926D1f868Ba1E81325f0206A4449Da3fD8FB62", "0xf6f3F4f5d68Ddb61135fbbde56f404Ebd4b984Ee"];

const baseTx = async (contract, account, privateKey, dataTx, value) => {
  try {
    const nonce = await web3.eth.getTransactionCount(account);
    const gasPrice = await web3.eth.getGasPrice();
    
    const rawTransaction = {
      nonce: web3.utils.toHex(nonce),
      from: account,
      to: contract,
      data: dataTx,
      gasPrice: web3.utils.toHex(gasPrice),
    };

    if (value) {
      rawTransaction.value = web3.utils.toHex(web3.utils.toWei(value.toString(), 'ether'))
    }

    const gasLimit = await web3.eth.estimateGas(rawTransaction);
    const gasLimitHex = web3.utils.toHex(gasLimit * 2);
    rawTransaction.gasLimit = gasLimitHex;
    
    const signedTransaction= await web3.eth.accounts.signTransaction(rawTransaction, privateKey);
    
    return web3.eth
      .sendSignedTransaction(signedTransaction.rawTransaction)
      .on('receipt', ({ transactionHash }) => {
        console.log(`${process.env.EXPLORER_BSC}/tx/${transactionHash}`);
      })
      .catch((err) => {
        console.log('error1', err);
      });
  } catch (err) {
    console.log('error2', err);
  }
}

const approves = async () => {
  const length = 50;
  let ps = [];
  for (let i = 0; i < tokens.length; i++) {
    try {
      for (let j = 0; j < length; j++) {
        const { address, privateKey } = accounts[j];
        const tokenContract = new web3.eth.Contract(tokenABI, tokens[i]);
        const dataTx = tokenContract.methods.approve(stakingAddress, MaxUint256).encodeABI();
        ps.push(baseTx(tokens[i], address, privateKey, dataTx, 0));
        if ((j + 1) % 50 === 0) {
          await Promise.all(ps);
          ps = [];
        };
      }
    } catch (error) {
      console.log('error')
    }
  }
};

const stakes = async () => {
  const amountInWei = web3.utils.toWei(stakingAmount.toString(), 'ether')
  const length = 50;
  let ps = [];
  for (let i = 2; i < tokens.length; i++) {
    try {
      for (let j = 0; j < length; j++) {
        const { address, privateKey } = accounts[j];
        const dataTx = stakingContract.methods.stake(tokens[i], amountInWei).encodeABI();
        ps.push(baseTx(stakingAddress, address, privateKey, dataTx, 0));
        if ((j + 1) % 50 === 0) {
          await Promise.all(ps);
          ps = [];
        };
      }
    } catch (error) {
      console.log('error')
    }
  }
};

const unStakes = async () => {
  const amountInWei = web3.utils.toWei(stakingAmount.toString(), 'ether')
  const length = 50;
  let ps = [];
  for (let i = 0; i < tokens.length; i++) {
    try {
      for (let j = 0; j < length; j++) {
        const { address, privateKey } = accounts[j];
        const dataTx = stakingContract.methods.unstake(tokens[i], amountInWei).encodeABI();
        ps.push(baseTx(stakingAddress, address, privateKey, dataTx, 0));
        if ((j + 1) % 50 === 0) {
          await Promise.all(ps);
          ps = [];
        };
      }
    } catch (error) {
      console.log('error')
    }
  }
};

// approves();
stakes()
// unStakes();
