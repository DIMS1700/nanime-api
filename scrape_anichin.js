const puppeteer = require('puppeteer');
const fs = require('fs');

const DB_FILE = 'nanime_database.json';
const SOURCE_NAME = "Anichin";

(async () => {
    console.log(`🐉 [2/4] MEMULAI SCRAPE: ${SOURCE_NAME}...`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    let database = { koleksi: [] };
    if (fs.existsSync(DB_FILE)) database = JSON.parse(fs.readFileSync(DB_FILE));

    async function scrape(url) {
        console.log(`   📂 Membuka: ${url}`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            const items = await page.evaluate((sSource) => {
                const list = [];
                // Selector Anichin (Mirip Animestream theme)
                const elements = document.querySelectorAll('.listupd .bs');
                elements.forEach(el => {
                    const title = el.querySelector('.tt')?.innerText.trim();
                    const link = el.querySelector('a')?.href;
                    const poster = el.querySelector('img')?.src;
                    
                    if(title && link) {
                        list.push({ 
                            title, link, poster, 
                            type: "Donghua", 
                            source: sSource 
                        });
                    }
                });
                return list;
            }, SOURCE_NAME);

            console.log(`   ✅ Ditemukan ${items.length} donghua.`);

            for (const item of items) {
                if (!database.koleksi.find(a => a.title === item.title && a.source === SOURCE_NAME)) {
                    database.koleksi.push({ id: Date.now() + Math.random(), ...item, rating: "9.0", status: "Ongoing" });
                }
            }
            fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));

        } catch (e) { console.log(`   ❌ Error: ${e.message}`); }
    }

    // TARGET BARU AA
    await scrape('https://anichin.cafe/');

    console.log(`🏁 ${SOURCE_NAME} Selesai!`);
    await browser.close();
})();