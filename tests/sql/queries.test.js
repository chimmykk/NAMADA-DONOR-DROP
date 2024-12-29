const { testPool } = require('./setup');
const { seedTestData, seedScrapedBlockData } = require('./testData');



describe('SQL Queries Tests', () => {
  beforeAll(async () => {
    
    // Insert donations test data
    await seedTestData(testPool);
    
    // Insert test data for scraped blocks
    await seedScrapedBlockData(testPool);
  });

  afterAll(async () => {
    // Clean up test data
    await testPool.query("DELETE FROM donations WHERE transaction_hash LIKE 'test-%'");
    await testPool.query("DELETE FROM scraped_blocks WHERE block_number >= 1000000");
    await testPool.end();
  });

  describe('donation_stats view', () => {
    test('correctly calculates eligible totals', async () => {
      const result = await testPool.query('SELECT * FROM donation_stats');
      expect(result.rows[0]).toHaveProperty('eligible_total_eth');
      expect(parseFloat(result.rows[0].eligible_total_eth)).toBe(0.3);
      expect(result.rows[0]).toHaveProperty('cutoff_timestamp');
    });
  });

  describe('checkEthAddress', () => {
    test('returns correct totals for valid address', async () => {
      const query = `
        WITH address_total AS (
          SELECT 
            COALESCE(SUM(amount_eth), 0) as total_eth,
            CASE 
              WHEN SUM(CASE WHEN timestamp <= $2 THEN amount_eth ELSE 0 END) >= 0.03 
              THEN LEAST(SUM(CASE WHEN timestamp <= $2 THEN amount_eth ELSE 0 END), 0.3)
              ELSE 0
            END as eligible_eth
          FROM donations 
          WHERE from_address = $1
        )
        SELECT total_eth, eligible_eth FROM address_total
      `;
      
      const result = await testPool.query(query, ['0xdbc69e6731975d3aa710d9e2ba85ce14131b6454', '2024-12-31']);
      
      expect(parseFloat(result.rows[0].total_eth)).toBe(0.36);
      expect(parseFloat(result.rows[0].eligible_eth)).toBe(0.3);
    });
  });

  describe('findNamAddress', () => {
    test('returns latest namada address before end date', async () => {
      const query = `
        SELECT namada_key, timestamp
        FROM donations 
        WHERE from_address = $1
        AND timestamp <= $2
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      
      const result = await testPool.query(query, ['0xdbc69e6731975d3aa710d9e2ba85ce14131b6454', '2024-12-31']);
      expect(result.rows[0].namada_key).toBe('tnam1qp03nsz7sn83h9s9cxjmge0a5t7ktzh6gc8dha0q');
      
      // Convert dates to timestamps for comparison
      const resultDate = new Date(result.rows[0].timestamp).getTime();
      const endDate = new Date('2024-12-31T23:59:59.999Z').getTime();
      expect(resultDate).toBeLessThanOrEqual(endDate);
    });
  });

  // Add new tests for block scraping functions
  describe('Block Scraping Stats', () => {
    test('getBlockScrapingStats returns correct data', async () => {
      const query = `
        SELECT 
          block_number,
          transactions_found,
          scraped_at
        FROM scraped_blocks 
        WHERE block_number = $1
      `;

      const result = await testPool.query(query, [1000000]);
      expect(result.rows[0]).toEqual({
        block_number: '1000000',
        transactions_found: 5,
        scraped_at: expect.any(Date)
      });
    });

    test('getRecentScrapingActivity returns correct number of records', async () => {
      const query = `
        SELECT 
          block_number,
          transactions_found,
          scraped_at
        FROM scraped_blocks 
        ORDER BY scraped_at DESC 
        LIMIT $1
      `;

      const limit = 2;
      const result = await testPool.query(query, [limit]);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].block_number).toBe('1000002');
      expect(result.rows[1].block_number).toBe('1000001');
    });
  });
});
