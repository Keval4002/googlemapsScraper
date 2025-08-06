const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  // Read URLs from results.csv
  const urls = [];
  fs.createReadStream('results.csv')
    .pipe(csv())
    .on('data', (row) => {
      if (row.URL) urls.push(row.URL);
    })
    .on('end', async () => {
      console.log(`Read ${urls.length} URLs from results.csv`);
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      const results = [];
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        try {
          console.log(`Opening URL ${i + 1}: ${url}`);
          await page.goto(url, { timeout: 60000 });
          await page.waitForSelector('[role="main"]', { timeout: 10000 });
          await page.waitForTimeout(500);
          // Extract fields using XPath and selector
          const getByXPath = async (xpath) => {
            const el = await page.$(`xpath=${xpath}`);
            if (!el) return '';
            return (await el.textContent()).trim();
          };
          const getBySelector = async (selector) => {
            const el = await page.$(selector);
            if (!el) return '';
            return (await el.textContent()).trim();
          };
          const businessName = await getByXPath('/html/body/div[1]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[1]/h1');
          const companyType = await getByXPath('/html/body/div[1]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[2]/span/span/button');
          const rating = await getByXPath('/html/body/div[1]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[1]/span[1]');
          let reviews = await getByXPath('/html/body/div[1]/div[3]/div[8]/div[9]/div/div/div[1]/div[2]/div/div[1]/div/div/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[2]/span/span');
          reviews = reviews.replace(/\(|\)/g, '');
          const address = await getBySelector('button[data-tooltip="Copy address"]');
          // Website: try Open website first, then Open menu link
          let website = await page.$eval('a[data-tooltip="Open website"]', el => el.href).catch(() => '');
          if (!website) {
            website = await page.$eval('a[data-tooltip="Open menu link"]', el => el.href).catch(() => '');
          }
          let phoneNumber = await getBySelector('button[data-tooltip="Copy phone number"]');
          phoneNumber = phoneNumber.replace(/[()]/g, '');
          results.push({
            'Business Name': businessName,
            'Company Type': companyType,
            'Rating': rating,
            'Reviews': reviews,
            'Address': address,
            'Website': website,
            'Phone Number': phoneNumber,
            'URL': url
          });
        } catch (err) {
          console.error(`Error scraping ${url}:`, err.message);
        }
      }
      await browser.close();
      // Write to CSV
      const csvWriter = createCsvWriter({
        path: 'enriched_results.csv',
        header: [
          { id: 'Business Name', title: 'Business Name' },
          { id: 'Company Type', title: 'Company Type' },
          { id: 'Rating', title: 'Rating' },
          { id: 'Reviews', title: 'Reviews' },
          { id: 'Address', title: 'Address' },
          { id: 'Website', title: 'Website' },
          { id: 'Phone Number', title: 'Phone Number' },
          { id: 'URL', title: 'URL' }
        ]
      });
      await csvWriter.writeRecords(results);
      console.log('Enriched results written to enriched_results.csv');
    });
})();
