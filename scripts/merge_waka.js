
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const originalWakaPath = path.join(__dirname, '..', '小倉百人一首現代解釈.csv');
const positiveWakaPath = path.join(__dirname, 'waka_positive.csv');
const outputPath = path.join(__dirname, 'waka_final.csv');

// 小倉百人一首現代解釈.csv を読み込む
const originalWakaData = fs.readFileSync(originalWakaPath, 'utf8');
// waka_positive.csv を読み込む
const positiveWakaData = fs.readFileSync(positiveWakaPath, 'utf8');

// 和歌のマップを作成（キー：歌番号, 値：もとの和歌）
const wakaMap = new Map();
Papa.parse(originalWakaData, {
    header: true,
    complete: function(results) {
        results.data.forEach(row => {
            if (row['歌番号'] && row['もとの和歌']) {
                wakaMap.set(row['歌番号'].toString(), row['もとの和歌'].trim());
            }
        });

        // waka_positive.csv を更新
        Papa.parse(positiveWakaData, {
            header: true,
            complete: function(positiveResults) {
                const updatedData = positiveResults.data.map(row => {
                    const poemNumber = row['歌番号'] ? row['歌番号'].toString() : null;
                    if (poemNumber && wakaMap.has(poemNumber)) {
                        row['歌'] = wakaMap.get(poemNumber);
                    }
                    return row;
                }).filter(row => row['歌番号']); // 空行を除外

                // 新しいCSVファイルを生成
                const newCsv = Papa.unparse(updatedData, {
                    header: true
                });

                fs.writeFileSync(outputPath, newCsv, 'utf8');
                console.log(`新しいCSVファイルを作成しました: ${outputPath}`);
            }
        });
    }
});
