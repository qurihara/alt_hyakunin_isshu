// scripts/scrape.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const linkFilePath = path.join(__dirname, 'link.txt');
const csvFilePath = path.join(__dirname, 'waka.csv');

async function main() {
    try {
        const urls = fs.readFileSync(linkFilePath, 'utf-8').split('\n').filter(Boolean);
        
        fs.writeFileSync(csvFilePath, '歌番号,歌人,歌,現代語訳,出典,決まり字\n');

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            try {
                const response = await axios.get(url, { timeout: 10000 });
                const $ = cheerio.load(response.data);

                const getInfo = (headingText) => {
                    const context = $('.karuta-everyday-article-content2__textbox');
                    const heading = context.find('h5').filter(function() {
                        return $(this).text().trim() === headingText;
                    });
                    if (heading.length > 0) {
                        const content = heading.first().next('p').text().trim();
                        if (content) {
                            return content.replace(/,/g, '、'); // 念のためカンマを読点に置換
                        }
                    }
                    return '';
                };
                
                const author = getInfo('歌人');
                const poem = getInfo('歌');
                const translation = getInfo('現代語訳');
                const source = getInfo('出典');
                const kimariji = getInfo('決まり字');

                const csvRow = [i + 1, author, poem, translation, source, kimariji].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');

                fs.appendFileSync(csvFilePath, csvRow + '\n');
                
                console.log(`${i + 1}/${urls.length} 完了: ${url}`);

            } catch (error) {
                console.error(`Error fetching ${url}: ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log(`CSVファイルの作成が完了しました: ${csvFilePath}`);

    } catch (error) {
        console.error(`Error reading ${linkFilePath}: ${error.message}`);
    }
}

main();