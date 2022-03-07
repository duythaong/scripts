const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_BSC));

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
        console.log(`${process.env.EXPLORER_BSC}/tx/${transactionHash}`);
      })
      .catch((err) => {
        console.log('error1', err);
      });
  } catch (err) {
    console.log('error2', err);
  }
}

module.exports = { baseTx };