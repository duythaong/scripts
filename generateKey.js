const bip39 = require('bip39');
const fs = require('fs');
const { hdkey } = require('ethereumjs-wallet')

const generateWallet = async (mnemonic, index) => {
  if (!mnemonic) {
    mnemonic = await bip39.generateMnemonic()
  }
  
  const masterSeed = await bip39.mnemonicToSeed(mnemonic)
  const wallet = hdkey.fromMasterSeed(masterSeed).derivePath("m/44'/60'/0'/0").deriveChild(index).getWallet()
  const currentReceiveAddress = '0x' + wallet.getAddress().toString('hex')
  const privatekey = wallet.getPrivateKey().toString('hex')
  return { currentReceiveAddress, privatekey, mnemonic }
}

const generateAccounts = async (mnemonic, initIndex, endIndex) => {
  const stream = fs.createWriteStream('accounts3.json', { flags:'a' });
  const accounts = [];
  const init = initIndex ? initIndex : 0;
  const end = endIndex ? endIndex : init + 100;
  for (let i = init; i < end; i++) {
    const { currentReceiveAddress, privatekey } = await generateWallet(mnemonic, i);
    accounts.push({address: currentReceiveAddress, privateKey: `0x${privatekey}`});
  }
  stream.write(JSON.stringify(accounts));
  stream.end();
  console.log(`Completed!`)
};

// const generate = async () => {
//   const res = await generateWallet();
//   console.log(res)
// };
// generate()
generateAccounts('lady bar oak bone garden asset service suspect cloth copy feature cereal', 0, 100000);