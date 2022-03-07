require('dotenv').config();
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC));
const accounts = require('../../accounts.json');
const tokenABI = require('../ABI/ERC20.json');
const nftABI = require('../ABI/ERC721.json')

const tokenAddress = '0xdCe0cF324155F6331bA1Bb1957b47d80d107Eb5D';
const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
const spender = '0x25fB7400d4D0affeD4991005eBA703d31727829D';

const nftAddress = '0xfd404Faadb1FE9A1D08c74F2711D92FaBbDC7433';
const nftContract = new web3.eth.Contract(nftABI, nftAddress);

const MaxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

const defaultWei = 5000000000; // default 5 GWei
const gasPrice = defaultWei * 1.1;

const approveToken = async (account, privateKey) => {
  try {
    const dataTx = tokenContract.methods.approve(spender, MaxUint256).encodeABI();
    const nonce = await web3.eth.getTransactionCount(account);
    
    const rawTransaction = {
      nonce: web3.utils.toHex(nonce),
      from: account,
      to: tokenContract,
      data: dataTx,
      gasPrice: web3.utils.toHex(gasPrice),
    };

    const gasLimit = await web3.eth.estimateGas(rawTransaction);
    const gasLimitHex = web3.utils.toHex(gasLimit);
    rawTransaction.gasLimit = gasLimitHex;
    
    const signedTransaction= await web3.eth.accounts.signTransaction(rawTransaction, privateKey);
    
    return web3.eth
      .sendSignedTransaction(signedTransaction.rawTransaction)
      .on('receipt', ({ transactionHash }) => {
        console.log(`${process.env.EXPLORER}/tx/${transactionHash}`);
      })
      .catch((err) => {
        console.log('error1', err);
      });
  } catch (err) {
    console.log('error2', err);
  }
};

const approveNFT = async (account, privateKey) => {
  try {
    const dataTx = nftContract.methods.setApprovalForAll(spender, true).encodeABI();

    const nonce = await web3.eth.getTransactionCount(account);
    const rawTransaction = {
      nonce: web3.utils.toHex(nonce),
      from: account,
      to: nftContract,
      data: dataTx,
      gasPrice: web3.utils.toHex(gasPrice),
    };

    const gasLimit = await web3.eth.estimateGas(rawTransaction);
    const gasLimitHex = web3.utils.toHex(gasLimit);
    rawTransaction.gasLimit = gasLimitHex;

    const signedTransaction= await web3.eth.accounts.signTransaction(rawTransaction, privateKey);
    
    return web3.eth
      .sendSignedTransaction(signedTransaction.rawTransaction)
      .on('receipt', ({ transactionHash }) => {
        console.log(`${process.env.EXPLORER}/tx/${transactionHash}`);
      })
      .catch((err) => {
        console.log('error1', err);
      });
  } catch (err) {
    console.log('error2', err);
  }
};

const script = async () => {
  const length = accounts.length;
  for (let i = 0; i < length; i++) {
    const { address, privateKey } = accounts[i];
    // await approveToken(address, privateKey);
    await approveNFT(address, privateKey);
  }
};

script();