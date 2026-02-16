const puppeteer = require('puppeteer');
const fs = require('fs');

const DB_FILE = 'nanime_database.json';
const SOURCE_NAME = "Kuramanime";

(async () => {
    console.log(`📜 [4/4] MEMULAI SCRAPE: ${SOURCE_NAME} (REVISI)...`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Load Database
    let database = { koleksi: [] };
    if (fs.existsSync(DB_FILE)) database = JSON.parse(fs.readFileSync(DB_FILE));

    async function scrape(url, typeLabel) {
        console.log(`   📂 Membuka: ${url}`);
        try {
            // Tunggu sampai jaringan tenang (networkidle2) biar data ke-load semua
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            const items = await page.evaluate((sType, sSource) => {
                const list = [];
                // SELECTOR SAPU JAGAT (Coba semua kemungkinan struktur Kuramanime)
                const elements = document.querySelectorAll('.product__item, .anime__item, .col-lg-3 .item, .list-view li');
                
                elements.forEach(el => {
                    // Coba cari judul di h5, h4, atau a biasa
                    const titleEl = el.querySelector('h5 a') || el.querySelector('h4 a') || el.querySelector('.title a');
                    const linkEl = el.querySelector('a');
                    
                    // Coba cari gambar di data-setbg atau src img biasa
                    const picEl = el.querySelector('.product__item__pic') || el.querySelector('.anime__item__pic');
                    let poster = picEl ? picEl.getAttribute('data-setbg') : el.querySelector('img')?.src;

                    // Fix URL Poster jika pakai style background-image
                    if (!poster && picEl) {
                        const style = picEl.getAttribute('style');
                        if (style && style.includes('url(')) {
                            poster = style.match(/url\(['"]?(.*?)['"]?\)/)[1];
                        }
                    }

                    if(titleEl && linkEl) {
                        list.push({ 
                            title: titleEl.innerText.trim(), 
                            link: linkEl.href, 
                            poster: poster, 
                            type: sType, 
                            source: sSource 
                        });
                    }
                });
                return list;
            }, typeLabel, SOURCE_NAME);

            console.log(`   ✅ Ditemukan ${items.length} item [${typeLabel}].`);

            // Simpan ke Database
            let countBaru = 0;
            for (const item of items) {
                // Cek duplikat ketat
                if (!database.koleksi.find(a => a.title === item.title)) {
                    database.koleksi.push({
                        id: Date.now() + Math.random(),
                        ...item,
                        rating: "9.2", 
                        status: typeLabel === 'Latest' ? "Ongoing" : "Completed"
                    });
                    countBaru++;
                }
            }
            if(countBaru > 0) console.log(`      💾 Disimpan ${countBaru} data baru.`);
            fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));

        } catch (e) { console.log(`   ❌ Error: ${e.message}`); }
    }

    // TARGET URL KURAMANIME (URL Update)
    // 1. Movie (Sudah OK)
    await scrape('https://v14.kuramanime.tel/properties/type/movie?order_by=popular', 'Movie');
    
    // 2. Completed / Tamat (Coba URL alternatif jika status/finished kosong)
    // Kita pakai halaman 'anime list' diurutkan berdasarkan popularitas biar dapet yang legend
    await scrape('https://v14.kuramanime.tel/anime?order_by=popular', 'Completed');

    // 3. Ongoing / Terbaru
    await scrape('https://v14.kuramanime.tel/properties/status/currently_airing', 'Latest');

    console.log(`🏁 ${SOURCE_NAME} Selesai!`);
    await browser.close();
})();