const puppeteer = require('puppeteer');
const fs = require('fs');

const DB_FILE = 'nanime_database.json';
const SOURCE_NAME = "Otakudesu";

(async () => {
    console.log(`🚀 [1/4] MEMULAI SCRAPE: ${SOURCE_NAME}...`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Load Database jika ada
    let database = { koleksi: [] };
    if (fs.existsSync(DB_FILE)) database = JSON.parse(fs.readFileSync(DB_FILE));

    async function scrape(url, type) {
        console.log(`   📂 Membuka: ${url}`);
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            
            // Selector Otakudesu.best (biasanya .venz atau .detpost)
            const items = await page.evaluate((sType, sSource) => {
                const list = [];
                const elements = document.querySelectorAll('.venz ul li, .detpost');
                elements.forEach(el => {
                    const title = el.querySelector('h2 a')?.innerText || el.querySelector('.jdlflm')?.innerText;
                    const link = el.querySelector('h2 a')?.href || el.querySelector('a')?.href;
                    const poster = el.querySelector('img')?.src;
                    
                    if(title && link) {
                        list.push({ 
                            title, link, poster, 
                            type: sType, 
                            source: sSource 
                        });
                    }
                });
                return list;
            }, type, SOURCE_NAME);

            console.log(`   ✅ Ditemukan ${items.length} anime.`);
            
            // Simpan Data
            for (const item of items) {
                // Cek duplikat berdasarkan judul DAN source
                if (!database.koleksi.find(a => a.title === item.title && a.source === SOURCE_NAME)) {
                    database.koleksi.push({
                        id: Date.now() + Math.random(),
                        ...item,
                        rating: "8.5", // Default
                        status: "Ongoing"
                    });
                }
            }
            fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
            
        } catch (e) { console.log(`   ❌ Error: ${e.message}`); }
    }

    // TARGET BARU AA
    await scrape('https://otakudesu.best/ongoing-anime/', 'Latest');

    console.log(`🏁 ${SOURCE_NAME} Selesai!`);
    await browser.close();
})();