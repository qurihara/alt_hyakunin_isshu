const fs = require('fs');
const path = require('path');

// 以前のデバッグで動作が証明された、堅牢なCSVパーサー
function parseCsv(text) {
    const rows = [];
    const textWithoutBom = text.charCodeAt(0) === 0xFEFF ? text.substring(1) : text;
    const lines = textWithoutBom.split(/\r?\n/);

    // ヘッダー行も今回は含めて、後で再構成する
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
            }
            else {
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

// CSVフィールドをエスケープする関数
function escapeCsvField(field) {
    if (field === null || field === undefined) return '';
    let str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = str.replace(/"/g, '""');
        return `"${str}"`;
    }
    return str;
}


try {
    const inputPath = path.resolve('./scripts/waka.csv');
    const outputPath = path.resolve('./scripts/waka.csv'); // 同じファイルに上書き

    const text = fs.readFileSync(inputPath, 'utf8');
    const rows = parseCsv(text);

    const header = rows.shift(); // ヘッダー行を抜き出す

    const cleanedRows = rows.map(columns => {
        // 43番以降のデータ形式が違う問題に対応
        if (columns.length < 4) return null; // 不正な行はスキップ

        // 現代語訳(4列目)のカンマを「、」に置換
        if(columns[3]) {
            columns[3] = columns[3].replace(/,/g, '、');
        }
        // ポジティブ現代語訳(7列目)のカンマを「、」に置換
        if(columns[6]) {
            columns[6] = columns[6].replace(/,/g, '、');
        }
        
        // 正しいCSV形式で各フィールドを再構成
        return columns.map(escapeCsvField).join(',');
    }).filter(row => row !== null);

    // ヘッダーとクリーンな行を結合
    const finalCsv = [header.join(','), ...cleanedRows].join('\n');
    
    fs.writeFileSync(outputPath, finalCsv, 'utf8');
    console.log(`scripts/waka.csv をクリーンアップし、全${cleanedRows.length}首のデータで上書きしました。`);

} catch (error) {
    console.error('エラーが発生しました:', error.message);
    process.exit(1);
}
