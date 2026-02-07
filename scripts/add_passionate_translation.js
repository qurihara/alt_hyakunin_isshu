
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const passionateWakaPath = path.join(__dirname, '..', '小倉百人一首現代解釈.csv');
const finalWakaPath = path.join(__dirname, 'waka_final.csv');
const outputPath = path.join(__dirname, 'waka_passionate.csv');

// 小倉百人一首現代解釈.csv を読み込む
const passionateWakaData = fs.readFileSync(passionateWakaPath, 'utf8');
// waka_final.csv を読み込む
const finalWakaData = fs.readFileSync(finalWakaPath, 'utf8');

// 情熱ポジティブ現代語訳のマップを作成（キー：歌番号, 値：ポジティブな解釈をした 現代語訳）
const passionateMap = new Map();
Papa.parse(passionateWakaData, {
    header: true,
    complete: function(results) {
        results.data.forEach(row => {
            if (row['歌番号'] && row['ポジティブな解釈をした 現代語訳']) {
                passionateMap.set(row['歌番号'].toString(), row['ポジティブな解釈をした 現代語訳'].trim());
            }
        });

        // waka_final.csv に列を追加
        Papa.parse(finalWakaData, {
            header: true,
            complete: function(finalResults) {
                const updatedData = finalResults.data.map(row => {
                    const poemNumber = row['歌番号'] ? row['歌番号'].toString() : null;
                    if (poemNumber && passionateMap.has(poemNumber)) {
                        row['情熱ポジティブ現代語訳'] = passionateMap.get(poemNumber);
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
