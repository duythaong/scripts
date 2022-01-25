require('dotenv').config();
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_MUMBAI));
const accounts = require('./accounts.json');

const stakeABI = require('./ABI/Stake.json');
const stakingAddress = '0x93b0264535f97e5e90653f3df186f0bb97d003db';
const stakingContract = new web3.eth.Contract(stakeABI, stakingAddress);
const stakingAmount = 1000;

const tokenABI = require('./ABI/ERC20.json');
const tokenAddress = '0xb7AfB6774f001c870F9fE6eA368F61e399b75c90'
const MaxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);

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

const approves = async () => {
  const length = accounts.length;
  let ps = [];
  for (let i = 0; i < length; i++) {
    const { address, privateKey } = accounts[i];
    try {
      const dataTx = tokenContract.methods.approve(stakingAddress, MaxUint256).encodeABI();
      ps.push(baseTx(tokenAddress, address, privateKey, dataTx, 0));
      if ((i + 1) % 50 === 0) {
        await Promise.all(ps);
      };
      ps = [];
    } catch (error) {
      console.log('error')
    }
  }
};

const stakes = async () => {
  const amount = stakingAmount;
  const amountInWei = web3.utils.toWei(amount.toString(), 'ether')
  const length = accounts.length;
  let ps = [];
  for (let i = 0; i < length; i++) {
    const { address, privateKey } = accounts[i];
    try {
      const dataTx = stakingContract.methods.stake(amountInWei).encodeABI();
      ps.push(baseTx(stakingAddress, address, privateKey, dataTx, 0));
      if ((i + 1) % 50 === 0) {
        await Promise.all(ps);
      };
      ps = []; 
    } catch (error) {
      console.log(error)
    }
  }
};


const unStakes = async () => {
  const amount = stakingAmount;
  const amountInWei = web3.utils.toWei(amount.toString(), 'ether')
  const length = accounts.length;
  let ps = [];
  for (let i = 0; i < length; i++) {
    const { address, privateKey } = accounts[i];
    try {
      const dataTx = stakingContract.methods.withdraw(amountInWei).encodeABI();
      ps.push(baseTx(stakingAddress, address, privateKey, dataTx, 0));
      if ((i + 1) % 50 === 0) {
        await Promise.all(ps);
      };
      ps = []; 
    } catch (error) {
      console.log(error)
    }
  }
};

// approves();
// stakes();
// unStakes();

const approves2 = async () => {
  const jsonArray = await csv().fromFile(path.join(__dirname, "account.csv"));
  let ps = [];
  const length = jsonArray.length;
  for (let i = 32602; i < length; i++) {
    const { address, privateKey } = jsonArray[i];
    try {
      const dataTx = tokenContract.methods.approve(stakingAddress, MaxUint256).encodeABI();
      ps.push(baseTx(tokenAddress, address, privateKey, dataTx, 0));
      if ((i + 1) % 50 === 0) {
        console.log(i, ps.length);
        await Promise.all(ps);
        ps = [];
      };
    } catch (error) {
      console.log('error')
    }
  }
};