require("dotenv").config()
const ethers = require('ethers')
const { Pair, Route, Trade } = require('@duythao_bacoor/v2-sdk');
const { CurrencyAmount, Token, TradeType, Percent } = require('@uniswap/sdk-core');
const Web3 = require('web3');
const JSBI = require('jsbi');
const web3 = new Web3(new Web3.providers.HttpProvider('https://rpc-mumbai.matic.today'));
const { JsonRpcProvider } = require("@ethersproject/providers");
const { Contract } = require('@ethersproject/contracts')
const { Interface } = require('@ethersproject/abi')
const { abi: IUniswapV2PairABI } =  require('@uniswap/v2-core/build/IUniswapV2Pair.json')
const provider = new JsonRpcProvider('https://rpc-mumbai.matic.today');
const { address: admin } = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY)

const MATIC_CHAIN_ID = 80001;
const PAIR_INTERFACE = new Interface(IUniswapV2PairABI)
const FACTORY_ADDRESS = '0x0D2213eBe800337AD55F13D7F8250e523006aB18'
const INIT_CODE_HASH = '0x382b467d14af068d251d3cbefe9f3215d45754761c1ceff2c26be390261f6479'


const addresses = {
    WMATIC: '0x86652c1301843B4E06fBfbBDaA6849266fb2b5e7',
    USDT: '0x4b1691404797D407F5bAdb1CE1EDABF867e271fd',
    SWAP_ROUTER: '0x20E017D2605228CD369438e60C52aE038eC608d8'
}

const fetchPairData = async (tokenA, tokenB, provider) => {
  const address = Pair.getAddress(FACTORY_ADDRESS, INIT_CODE_HASH, tokenA, tokenB)
  const [reserves0, reserves1] = await new Contract(address, PAIR_INTERFACE, provider).getReserves()
  const balances = tokenA.sortsBefore(tokenB) ? [reserves0, reserves1] : [reserves1, reserves0]
  return new Pair(FACTORY_ADDRESS, INIT_CODE_HASH, CurrencyAmount.fromRawAmount(tokenA, balances[0].toString()), CurrencyAmount.fromRawAmount(tokenB, balances[1].toString()))
}

// const ONE_ETH_IN_WEI = web3.utils.toBN(web3.utils.toWei('1'))
// const tradeAmount = ONE_ETH_IN_WEI.div(web3.utils.toBN('1000'))

const init = async () => {
const [WMATIC, USDT] = await Promise.all([addresses.WMATIC, addresses.USDT].map(tokenAddress => (new Token(MATIC_CHAIN_ID, tokenAddress, 18))));

const pair = await fetchPairData(WMATIC, USDT, provider)

const route = await new Route([pair], WMATIC, USDT)

//
// new Trade(
//   new Route([pair12], token1, token2),
//   CurrencyAmount.fromRawAmount(token1, JSBI.BigInt(1000)),
//   TradeType.EXACT_INPUT
// )

const trade = await new Trade(route, CurrencyAmount.fromRawAmount(WMATIC, JSBI.BigInt(20000)), TradeType.EXACT_INPUT)

const slippageTolerance = new Percent('50', '10000')

const amountOutMin = trade.minimumAmountOut(slippageTolerance).raw
const path = [WMATIC.address, USDT.address]
const to = admin
const deadline = Math.floor(Date.now() / 1000) + 60 * 20

const wallet = new ethers.Wallet(Buffer.from(process.env.PRIVATE_KEY, 'hex'))
const signer = wallet.connect(provider)

const pancakeswap = new ethers.Contract(
    addresses.PANCAKE_ROUTER,
    ['function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'],
    signer
)

const swapRouter = new ethers.Contract(
  addresses.SWAP_ROUTER,
  ['function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)'],
  signer
)

// Allow Pancakeswap
// let abi = ["function approve(address _spender, uint256 _value) public returns (bool success)"]
// let contract = new ethers.Contract(WBNB.address, abi, signer)
// await contract.approve(addresses.PANCAKE_ROUTER, ethers.utils.parseUnits('1000.0', 18), {gasLimit: 100000, gasPrice: 5e9})

// Execute transaction
const tx = await pancakeswap.swapExactTokensForTokens(
    ethers.utils.parseUnits('0.1', 18),
    ethers.utils.parseUnits(web3.utils.fromWei(amountOutMin.toString()), 18),
    path,
    to,
    deadline,
    { gasLimit: ethers.utils.hexlify(200000), gasPrice: ethers.utils.parseUnits("10", "gwei") }
)

const tx2 = await swapRouter.swapExactETHForTokens(
  ethers.utils.parseUnits(web3.utils.fromWei(amountOutMin.toString()), 18),
  path,
  to,
  deadline,  
  { value: ethers.utils.parseUnits('0.1', 18), gasLimit: ethers.utils.hexlify(200000), gasPrice: ethers.utils.parseUnits('10', 'gwei') }
)

console.log(`Tx-hash: ${tx.hash}`)

const receipt = await tx.wait();

console.log(`Tx was mined in block: ${receipt.blockNumber}`)
}

init()