import { startScheduler } from './scheduler';
import { getTransactions, decodeInputData } from './etherscan';
import { extractNamadaKey, saveTransactions, markBlocksAsScraped } from './db';

const ADDRESS = process.env.COINCENTER_ADDRESS;
const STARTING_BLOCK = process.env.SCANNING_START_BLOCK || 0;
let isInitialized = false;

async function performInitialScrape() {
  console.log('Starting initial blockchain scrape...');
  try {
    const transactions = await getTransactions(ADDRESS, STARTING_BLOCK, 99999999);
    // Decode input data filters out transactions that don't have input data, as well as failed txs
    const decodedTransactions = decodeInputData(transactions);
    const filteredTransactions = decodedTransactions.filter(tx =>
      tx.decodedRawInput && 
      extractNamadaKey(tx.decodedRawInput) !== ''
    );

    console.log(`Found ${filteredTransactions.length} historical transactions`);

    // Save all transactions in bulk
    await saveTransactions(filteredTransactions);

    // Group transactions by block number and count them
    const blockCounts = filteredTransactions.reduce((acc, tx) => {
      acc[tx.blockNumber] = (acc[tx.blockNumber] || 0) + 1;
      return acc;
    }, {});

    // Convert to array of objects for markBlocksAsScraped
    const blocksToMark = Object.entries(blockCounts).map(([blockNumber, count]) => ({
      blockNumber: parseInt(blockNumber),
      transactionsFound: count
    }));

    // Mark all blocks as scraped in bulk
    await markBlocksAsScraped(blocksToMark);

    console.log('Initial scrape complete');
    return filteredTransactions;
  } catch (error) {
    console.error('Error during initial scrape:', error);
    throw error;
  }
}

export async function initialize(skipInitialScrape = false) {
  if (isInitialized) {
    console.log('Server already initialized, skipping...');
    return;
  }

  console.log('Initializing server...');
  try {
    // Only perform initial scrape if not skipped
    if (!skipInitialScrape) {
      console.log('Performing initial scrape...');
      await performInitialScrape();
    } else {
      console.log('Skipping initial scrape...');
    }
    
    // Always start the scheduler
    console.log('Starting scheduler for ongoing updates...');
    startScheduler();
    
    isInitialized = true;
    console.log('Server initialization complete');
  } catch (error) {
    console.error('Error during server initialization:', error);
    throw error;
  }
} 