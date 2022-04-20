require('dotenv').config();
const axios = require('axios');
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_BSC));

const lotteryABI = require('../ABI/Lottery.json');
const lotteryAddress = '0x4Aee3e0cd5f62fc2a23283fFB0874fCEe26c6a3e';
const lotteryContract = new web3.eth.Contract(lotteryABI, lotteryAddress);

const tokenABI = require('../ABI/ERC20.json');
const MaxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

const IPFS_UPLOAD_URL = 'https://dev-ipfs.w3w.app/api/v0/add'
const apiUrl = 'https://dev-cig-api-v2.w3w.app';
const messageHash = 'Crypto Ishtar';
const accounts = require('../../accounts1.json');
// const tokens = ["0x10297304eEA4223E870069325A2EEA7ca4Cd58b4", "0x979Db64D8cD5Fed9f1B62558547316aFEdcf4dBA", "0x013345B20fe7Cf68184005464FBF204D9aB88227", "0xd2926D1f868Ba1E81325f0206A4449Da3fD8FB62", "0xf6f3F4f5d68Ddb61135fbbde56f404Ebd4b984Ee"];
const tokens = ['0x10297304eEA4223E870069325A2EEA7ca4Cd58b4'];

const uploadFile = async (file) => {
	try {
		const link = IPFS_UPLOAD_URL;
		const rs = await axios.post(link, file);
		if (rs && rs.data && rs.data.Hash) {
			return rs.data.Hash;
		}
		return null;
	} catch (error) {
		console.log(error)
		return null
	}
}

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

//1. Approve for lottery use tokens
const approves = async () => {
  const length = 50;
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
        };
      }
    } catch (error) {
      console.log('error')
    }
  }
};

// 2.1 Save data on IPFS

const cart = ['0123'];

const uploadData = async (series ,user, privateKey) => {
	const signature = await web3.eth.accounts.sign(messageHash, privateKey);
	const timestamp = Date.now();
	const paymentBy = 'ETH';
	const totalAmount = 0.032;
	const tickets = cart.map((num, index) => {
		return {
			numbers: num,
			ticketId: parseInt(timestamp) + index + 1,
			status: 'TICKET_SELLING'
		}
	})

	// eslint-disable-next-line no-undef
	const data = new FormData()
	data.append('file', JSON.stringify({
		seriesId: series,
		buyer: user,
		tickets,
		paymentBy,
		totalAmount,
		timestamp
	}));

	const resHash = await uploadFile(data);
	if (resHash) {
		return axios.post(
			`${apiUrl}/nft`,
			{
				series,
				buyer: user,
				timestamp,
				ipfsHash: resHash,
				tickets,
				paymentBy,
				totalAmount,
			},
			{
				headers: {
					Authorization: `${signature}|${user}`
				}
			}
		).catch(err => {
			console.log(444, err)
		});
	}
};

// 2.2 calling contract
const buy = async (account, privateKey, timestamp, _seri, _numberInfo, _assetIndex, totalTicket) => {
	try {
		const dataTx = lotteryContract.methods.buy(_seri, _numberInfo, _assetIndex, totalTicket).encodeABI();
		const gasPrice = await web3.eth.getGasPrice();
		const gasPriceHex = web3.utils.toHex(Math.round(gasPrice));
  
		const nonce = await web3.eth.getTransactionCount(account);
		const rawTx = {
			nonce: '0x' + (nonce).toString(16),
			from: account,
			to: lotteryContract,
			data: dataTx,
			gasPrice: gasPriceHex,
		};
  
		const gasLimit = await web3.eth.estimateGas(rawTx);
		const gasLimitHex = web3.utils.toHex(gasLimit);
		rawTx.gasLimit = gasLimitHex
		const tx = new Tx(rawTx);
		const key = Buffer.from(privateKey, 'hex')
		tx.sign(key);
		const serializedTx = tx.serialize();
		return web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).
			on('receipt', ({transactionHash}) => {
				return axios.put(
					`${apiUrl}/nft`,
					{
						seri: _seri,
						buyer: account,
						timestamp,
						txHash: transactionHash,
						isTxCompleted: true
					},
				).catch(err => {
					console.log(111, account, err)
				});
			}).catch(err => {
				console.log(222, account, err)
			});
	} catch (error) {
		console.log('estimate gas error');
	}
};