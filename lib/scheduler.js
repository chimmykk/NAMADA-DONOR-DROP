import { getLatestBlock, getTransactions, decodeInputData } from './etherscan';
import { saveTransactions, markBlocksAsScraped, getLastScrapedBlock, extractNamadaKey } from './db';
import cron from 'node-cron';

const ADDRESS = process.env.COINCENTER_ADDRESS;

export function startScheduler() {
  cron.schedule('*/13 * * * * *', async () => {
    try {
      const latestBlock = await getLatestBlock();
      if (!latestBlock) {
        console.error('Failed to fetch latest block');
        return;
      }

      const lastScrapedBlock = await getLastScrapedBlock();
      const startBlock = lastScrapedBlock + 1;

      // Don't proceed if we've already scraped up to the latest block
      if (startBlock > latestBlock) {
        console.log('No new blocks to scrape');
        return;
      }

      console.log(`Fetching transactions from blocks ${startBlock} to ${latestBlock}...`);
      
      // Get all transactions in one call
      const transactions = await getTransactions(ADDRESS, startBlock, latestBlock);
      const decodedTransactions = decodeInputData(transactions, new Date(0), new Date());
      const filteredTransactions = decodedTransactions.filter(tx =>
        tx.decodedRawInput && 
        extractNamadaKey(tx.decodedRawInput) !== ''
      );

      // Save filtered transactions to database in bulk
      if (filteredTransactions.length > 0) {
        await saveTransactions(filteredTransactions);
        console.log(`Found and saved ${filteredTransactions.length} transactions between blocks ${startBlock}-${latestBlock}`);
      }

      // Group transactions by block number and count them
      const blockCounts = filteredTransactions.reduce((acc, tx) => {
        acc[tx.blockNumber] = (acc[tx.blockNumber] || 0) + 1;
        return acc;
      }, {});

      // Create array of blocks to mark as scraped
      const blocksToMark = Array.from(
        { length: latestBlock - startBlock + 1 }, 
        (_, i) => ({
          blockNumber: startBlock + i,
          transactionsFound: blockCounts[startBlock + i] || 0
        })
      );

      // Mark blocks as scraped in bulk
      await markBlocksAsScraped(blocksToMark);

    } catch (error) {
      console.error('Error in cron job:', error);
    }
  });
}