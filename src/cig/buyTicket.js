require("dotenv").config();
const axios = require('axios');
const request = require("request");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_BSC));

const lotteryABI = require("../ABI/Lottery.json");
const lotteryAddress = "0xe29005506840cB4707FA3c761C403A37335E7b4E";
const lotteryContract = new web3.eth.Contract(lotteryABI, lotteryAddress);

const tokenABI = require("../ABI/ERC20.json");
const MaxUint256 = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const IPFS_UPLOAD_URL = "https://dev-ipfs.w3w.app/api/v0/add";
const apiUrl = "https://dev-cig-api-v2.w3w.app";
const messageHash = "Crypto Ishtar";
const accounts = require("../../accounts.json");
// const tokens = ["0x10297304eEA4223E870069325A2EEA7ca4Cd58b4", "0x979Db64D8cD5Fed9f1B62558547316aFEdcf4dBA", "0x013345B20fe7Cf68184005464FBF204D9aB88227", "0xd2926D1f868Ba1E81325f0206A4449Da3fD8FB62", "0xf6f3F4f5d68Ddb61135fbbde56f404Ebd4b984Ee"];
const tokens = ["0x10297304eEA4223E870069325A2EEA7ca4Cd58b4"];

const symbols = ["BNB", "BUSD", "BTCB", "USDT", "ETH", "USDC", "XRP"];


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
      rawTransaction.value = web3.utils.toHex(web3.utils.toWei(value.toString(), "ether"));
    }

    const gasLimit = await web3.eth.estimateGas(rawTransaction);
    const gasLimitHex = web3.utils.toHex(gasLimit * 2);
    rawTransaction.gasLimit = gasLimitHex;

    const signedTransaction = await web3.eth.accounts.signTransaction(rawTransaction, privateKey);

    return web3.eth
      .sendSignedTransaction(signedTransaction.rawTransaction)
      .on("receipt", ({ transactionHash }) => {
        console.log(`${process.env.EXPLORER_BSC}/tx/${transactionHash}`);
        return transactionHash;
      })
      .catch((err) => {
        console.log("error1", err);
      });
  } catch (err) {
    console.log("error2", err);
  }
};

const uploadData = async ({ seriesId, buyer, tickets, paymentBy, totalAmount, timestamp }) => {
  return new Promise(resolve => {
    const r = request.post({ uri: IPFS_UPLOAD_URL }, function (
      err,
      httpResponse,
      body
    ) {
      const res = JSON.parse(body)
      console.log(`https://dev-ipfsgw.w3w.app/ipfs/${res.Hash}`);
      return resolve(res.Hash);
    });

    // eslint-disable-next-line no-undef
    const form = r.form();
    form.append("file", JSON.stringify({
      seriesId,
      buyer,
      tickets,
      paymentBy,
      totalAmount,
      timestamp,
    }));
  })
};

const buy = async (account, privateKey, seriesId, cart, paymentBy, totalAmount, cryptoRate) => {
  try {
    const timestamp = Date.now();
    const assetIndex = symbols.indexOf(paymentBy);
    const { signature } = await web3.eth.accounts.sign(messageHash, privateKey);
    const tickets = cart.map((num, index) => {
      return {
        numbers: num,
        ticketId: parseInt(timestamp) + index + 1,
        status: "TICKET_SELLING",
      };
    });

    // Save data on IPFS
    const ipfsHash = await uploadData({ seriesId, buyer: account, tickets, paymentBy, totalAmount, timestamp });

    if (ipfsHash) {
      const postObject = {
        series: seriesId,
        buyer: account,
        timestamp,
        ipfsHash,
        tickets,
        paymentBy,
        cryptoRate,
        totalAmount,
      };

      return axios.post(`${apiUrl}/nft`, postObject, { headers: { Authorization: `${signature}|${account}` } }).then((rs) => {
        console.log('Before sending txs: ', seriesId, ipfsHash, assetIndex, cart)
        const dataTx = lotteryContract.methods.buy(seriesId, ipfsHash, assetIndex, cart.length).encodeABI();
        return baseTx(lotteryAddress, account, privateKey, dataTx, 0).catch((err) => { console.log(222, account, err); });
      }).catch(error => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.log(error.response.data);
          console.log(error.response.status);
        }
      });
    };

  } catch (error) {
    console.log("Estimate gas error", error);
  }
};

const approves = async () => {
  const length = accounts.length;
  let ps = [];
  for (let i = 0; i < tokens.length; i++) {
    try {
      for (let j = 0; j < length; j++) {
        const { address, privateKey } = accounts[j];
        const tokenContract = new web3.eth.Contract(tokenABI, tokens[i]);
        const dataTx = tokenContract.methods.approve(lotteryAddress, MaxUint256).encodeABI();
        ps.push(baseTx(tokens[i], address, privateKey, dataTx, 0));
        if ((j + 1) % 50 === 0) {
          await Promise.all(ps);
          ps = [];
        }
      }
    } catch (error) {
      console.log("error");
    }
  }
};

const buys = async (from, length, seriesId, cart, paymentBy) => {
  try {
    const { price } = await lotteryContract.methods.series(seriesId).call();
    const totalAmount = await lotteryContract.methods.asset2USD(paymentBy, price).call();
    const cryptoRate = await lotteryContract.methods.asset2USD(paymentBy).call();
    let ps = [];

    for (let i = from; i < length; i++) {
      const { address, privateKey } = accounts[i];
      ps.push(buy(address, privateKey, seriesId, cart, paymentBy, totalAmount, cryptoRate));
      if ((i + 1) % 50 === 0) {
        await Promise.all(ps);
        ps = [];
      };
    }
  } catch (error) {
    console.log('buy-error', error);
  }
}

// approves();
buys(0, 1000, '1652758022', ["0123"], 'BUSD');