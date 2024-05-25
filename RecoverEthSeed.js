const fs = require('fs');
const bip39 = require('bip39');
const hdkey = require('ethereumjs-wallet/hdkey');

const knownWords = ['collect', 'foot', 'ball', 'card', 'rookie', 'own', 'sport', 'game', 'digital', 'fantasy', 'basket', 'base']; // The words you remember
const knownPositions = {1: 'collect', 5: 'rookie', 10: 'fantasy'}; // The correct positions you remember
const targetAddress = '0xYourPublicKey';

const SAVE_PERIOD = 1000;

let resumeFrom = null;

if (fs.existsSync('stateV2.json')) {
  const state = JSON.parse(fs.readFileSync('stateV2.json', 'utf-8'));
  resumeFrom = state.resumeFrom;
  console.log('Resuming from:', resumeFrom);
}

const checkMnemonic = (words) => {
  const mnemonic = words.join(' ');
  const seed = bip39.mnemonicToSeedSync(mnemonic).toString('hex');
  const hdwallet = hdkey.fromMasterSeed(Buffer.from(seed, 'hex'));
  const wallet_hdpath = "m/44'/60'/0'/0/";
  const wallet = hdwallet.derivePath(wallet_hdpath + '0').getWallet();
  const address = '0x' + wallet.getAddress().toString('hex');
  return address.toLowerCase() === targetAddress.toLowerCase();
};

function* permute(arr, size, prefix = []) {
  if (size === 0) {
    yield prefix;
    return;
  }

  for (let i = 0; i < arr.length; i++) {
    const newElem = arr.splice(i, 1)[0];  // Remove the element at index i
    yield* permute([...arr], size - 1, [...prefix, newElem]);
    arr.splice(i, 0, newElem);  // Put the element back
  }
}

const filteredKnownWords = knownWords.filter(word => !Object.values(knownPositions).includes(word));

let currentIteration = 0;

const permGen = permute(filteredKnownWords, filteredKnownWords.length);

while (true) {
  const next = permGen.next();
  const nextPermutation = next.value;
  
  if (next.done) {
    console.log('Reached end of permutations.');
    break;
  }

  // Fill in known words at their positions
  const fullPermutation = Array(12).fill(null);
  for (let i = 0; i < 12; i++) {
    fullPermutation[i] = knownPositions[i + 1] || null;
  }
  let j = 0;
  for (let i = 0; i < 12; i++) {
    if (fullPermutation[i] === null) {
      fullPermutation[i] = nextPermutation[j++];
    }
  }

  currentIteration++;

  if (currentIteration % SAVE_PERIOD === 0) {
    fs.writeFileSync('stateV2.json', JSON.stringify({ resumeFrom: nextPermutation.join(',') }));
    console.log(`Processed ${currentIteration} mnemonics. Last processed permutation was ${fullPermutation.join(',')}. State saved.`);
  }

  if (checkMnemonic(fullPermutation)) {
    console.log(`<<<<<< Found it! The mnemonic is: ${fullPermutation.join(' ')} >>>>>>`);
    process.exit(0);
  }
}
