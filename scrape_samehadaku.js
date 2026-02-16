const puppeteer = require('puppeteer');
const fs = require('fs');

const DB_FILE = 'nanime_database.json';
const SOURCE_NAME = "Samehadaku";

(async () => {
    console.log(`⚡ [3/4] MEMULAI SCRAPE: ${SOURCE_NAME}...`);
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
                // Selector Samehadaku
                const elements = document.querySelectorAll('.post-show ul li, .animepost');
                elements.forEach(el => {
                    const title = el.querySelector('.entry-title a')?.innerText || el.querySelector('h2 a')?.innerText;
                    const link = el.querySelector('a')?.href;
                    const poster = el.querySelector('img')?.src; // Perlu cek lazy load
                    
                    if(title && link) {
                        list.push({ 
                            title, link, poster, 
                            type: "HD Anime", 
                            source: sSource 
                        });
                    }
                });
                return list;
            }, SOURCE_NAME);

            console.log(`   ✅ Ditemukan ${items.length} anime HD.`);

            for (const item of items) {
                if (!database.koleksi.find(a => a.title === item.title && a.source === SOURCE_NAME)) {
                    database.koleksi.push({ id: Date.now() + Math.random(), ...item, rating: "8.8", status: "Ongoing" });
                }
            }
            fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));

        } catch (e) { console.log(`   ❌ Error: ${e.message}`); }
    }

    // TARGET BARU AA
    await scrape('https://v1.samehadaku.how/');

    console.log(`🏁 ${SOURCE_NAME} Selesai!`);
    await browser.close();
})();