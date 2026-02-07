const fs = require('fs');
const path = require('path');

// --- 最終・決定版 CSVパーサー ---
function parseCsv(text) {
    const rows = [];
    const textWithoutBom = text.charCodeAt(0) === 0xFEFF ? text.substring(1) : text;
    const lines = textWithoutBom.split(/\r?\n/);

    // ヘッダー行もパース対象に含める
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        
        const row = [];
        let field = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (inQuotes) {
                if (char === '"') {
                    if (j + 1 < line.length && line[j+1] === '"') {
                        field += '"';
                        j++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    row.push(field);
                    field = '';
                } else {
                    field += char;
                }
            }
        }
        row.push(field);
        rows.push(row);
    }
    return rows;
}

try {
    // --- STEP 1: 全てのソースファイルを読み込む ---
    const csvPath1 = path.resolve('./小倉百人一首現代解釈.csv');
    const csvPath2 = path.resolve('./scripts/waka.csv');
    const outputPath = path.resolve('./data.csv');

    const text1 = fs.readFileSync(csvPath1, 'utf8');
    const text2 = fs.readFileSync(csvPath2, 'utf8');

    // --- STEP 2: 各ファイルをメモリ上でパースし、Mapを作成 ---
    const wakaMap = new Map();
    const lines2 = parseCsv(text2);
    lines2.shift(); // ヘッダーを削除

    lines2.forEach(columns => {
        // waka.csvが途中で形式が変わる問題に対応
        let num, kajin, waka, gendaigo, positive_y;
        if (columns.length >= 7 && columns[0].trim() !== "") { // クォートあり形式
            num = columns[0];
            kajin = columns[1];
            waka = columns[2];
            gendaigo = columns[3];
            positive_y = columns[6];
        } else if (columns.length >= 4 && columns[0].trim() !== "") { // クォートなし形式
            num = columns[0];
            kajin = columns[1];
            waka = columns[2];
            gendaigo = columns[3];
            positive_y = columns[3];
        } else {
            return; // 不正な行はスキップ
        }
        
        wakaMap.set(num.trim(), { 
            kajin: kajin.trim(),
            waka: waka.trim(),
            gendaigo: gendaigo.trim(),
            positive_y: positive_y.trim()
        });
    });

    // --- STEP 3: もう一方のファイルをパースし、Mapの情報と結合 ---
    const karutaData = [];
    const lines1 = parseCsv(text1);
    lines1.shift(); // ヘッダーを削除

    lines1.forEach(columns => {
        if (columns.length >= 4) {
            const num = columns[0];
            const positive_x = columns[3];
            
            const wakaInfo = wakaMap.get(num.trim());
            if (num && num.trim() && wakaInfo) {
                karutaData.push({
                    number: num.trim(),
                    kajin: wakaInfo.kajin,
                    waka: wakaInfo.waka,
                    gendaigo: wakaInfo.gendaigo,
                    positive_x: positive_x.trim(),
                    positive_y: wakaInfo.positive_y
                });
            }
        }
    });

    // --- STEP 4: 最終的なCSV文字列を生成 ---
    function escapeCsvField(field) {
        if (field === null || field === undefined) return '';
        let str = String(field);
        str = str.replace(/(\r\n|\n|\r)/gm, " ");
        if (str.includes(',') || str.includes('"')) {
            str = str.replace(/"/g, '""');
            return `"${str}"`;
        }
        return str;
    }

    const header = ["歌番号", "歌人", "歌", "一般的な解釈", "令和おだやかポジティブ解釈", "令和情熱ポジティブ解釈"].join(',');
    const rows = karutaData
        .sort((a, b) => parseInt(a.number) - parseInt(b.number))
        .map(karuta => [
            escapeCsvField(karuta.number),
            escapeCsvField(karuta.kajin),
            escapeCsvField(karuta.waka),
            escapeCsvField(karuta.gendaigo),
            escapeCsvField(karuta.positive_y),
            escapeCsvField(karuta.positive_x)
        ].join(','));
    const csvContent = [header, ...rows].join('\n');

    // --- STEP 5: ファイルに書き込み ---
    fs.writeFileSync(outputPath, csvContent, 'utf8');
    console.log(`data.csv を作成しました。全${karutaData.length}首のデータが出力されています。`);

} catch (error) {
    console.error('エラーが発生しました:', error.message);
    process.exit(1);
}