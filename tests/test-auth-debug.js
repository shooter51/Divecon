const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  console.log('1. Going to admin page...');
  await page.goto('https://diveelitebelize.com/#admin');
  await page.waitForTimeout(2000);
  
  console.log('2. Current URL:', page.url());
  console.log('3. Looking for login button...');
  
  const loginButton = await page.locator('text=Admin Login').first();
  const isVisible = await loginButton.isVisible().catch(() => false);
  console.log('4. Login button visible:', isVisible);
  
  if (isVisible) {
    console.log('5. Clicking login...');
    await loginButton.click();
    await page.waitForTimeout(3000);
    console.log('6. After click URL:', page.url());
    
    console.log('7. Filling username...');
    await page.fill('input[name="username"]', 'admin@eliteadventuresbelize.com');
    
    console.log('8. Filling password...');
    await page.fill('input[name="password"]', 'wbt2CGP2cxy_tqg1zqf');
    
    console.log('9. Looking for submit button...');
    const submitBtn = await page.locator('input[type="submit"], button[type="submit"], button:has-text("Sign in")').first();
    const submitVisible = await submitBtn.isVisible().catch(() => false);
    console.log('10. Submit button visible:', submitVisible);
    
    if (submitVisible) {
      console.log('11. Clicking submit...');
      await submitBtn.click();
      await page.waitForTimeout(5000);
      console.log('12. Final URL:', page.url());
      
      const content = await page.content();
      if (content.includes('error') || content.includes('Error')) {
        console.log('13. ERROR detected on page');
        console.log(content.substring(0, 500));
      }
    }
  }
  
  console.log('\nWaiting 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();
