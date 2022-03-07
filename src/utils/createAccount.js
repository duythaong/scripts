require('dotenv').config();
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_MUMBAI));
let stream;
const fs = require('fs');

const saveAccount = async (account) => {
  stream.write(account.address + "," + account.privateKey + "\n");
}

const createAccount = async (q = 0) => {
  stream = fs.createWriteStream("account.csv", {flags:'a'});
  if (q) {
    while (q >= 0) {
      const account = await web3.eth.accounts.create();
      console.log(account.address, account.privateKey);
  
      saveAccount(account);
      q -= 1;
    }
  }

  stream.end();
}

createAccount(100000);
