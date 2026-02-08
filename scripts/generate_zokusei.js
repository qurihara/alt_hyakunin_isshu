
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const dataCsvPath = path.join(__dirname, '..', 'data.csv');
const outputPath = path.join(__dirname, '..', 'zokusei.csv');

const bouzuList = [
    '僧正遍昭', '喜撰法師', '素性法師', '恵慶法師', '前大僧正行尊', '能因法師', 
    '良暹法師', '道因法師', '俊恵法師', '西行法師', '寂蓮法師', '前大僧正慈円'
];

const himeList = [
    '持統天皇', '小野小町', '伊勢', '右近', '右大将道綱母', '儀同三司母', '和泉式部', 
    '紫式部', '大弐三位', '赤染衛門', '小式部内侍', '伊勢大輔', '清少納言', '相模', 
    '祐子内親王家紀伊', '待賢門院堀川', '皇嘉門院別当', '式子内親王', '殷富門院大輔', 
    '二条院讃岐', '周防内侍'
];


const data = fs.readFileSync(dataCsvPath, 'utf8');

Papa.parse(data, {
    header: true,
    complete: (results) => {
        const zokuseiData = results.data.map(row => {
            const id = row['歌番号'];
            const kajin = row['歌人'];
            let zokusei = '殿'; // デフォルトは殿

            if (bouzuList.includes(kajin) || kajin === '蝉丸') {
                zokusei = '坊主';
            } else if (himeList.includes(kajin)) {
                zokusei = '姫';
            }
            
            return {
                '歌ID': id,
                '歌人': kajin,
                '属性': zokusei
            };
        }).filter(row => row['歌ID']); // 空行を除外

        const csv = Papa.unparse(zokuseiData);
        fs.writeFileSync(outputPath, csv, 'utf8');
        console.log(`zokusei.csv を作成しました: ${outputPath}`);
    }
});
