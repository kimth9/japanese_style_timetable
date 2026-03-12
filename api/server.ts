import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { STATION_MAPPING, ALL_STATIONS, TRAIN_TYPE_MAP } from '../src/shared/constants.ts';
import { Train, TrainStop } from '../src/shared/types.ts';
import stationRankData from '../src/station_rank.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const SERVICE_KEYS = [
  "v9G5jEOuxwgs4r9ExyF%2F%2BU6g1YwOzwU6RD4Mbw0C4mlQQ%2FFPaXefgmEB1EKqNdGWrf62kQZAlw4xcBH2VO7K7g%3D%3D"
];

const stationRank: Record<string, number> = stationRankData;

// 초성 추출 함수
function getChoseong(str: string) {
  const CHOSEONG = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ];
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code > -1 && code < 11172) {
      result += CHOSEONG[Math.floor(code / 588)];
    } else {
      result += str.charAt(i);
    }
  }
  return result;
}

// 1. 역 검색 API
app.get('/api/stations', (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.json([]);

  const isChoseong = /^[ㄱ-ㅎ]+$/.test(query);
  const filtered = ALL_STATIONS.filter(station => {
    if (isChoseong) {
      return getChoseong(station).includes(query);
    }
    return station.includes(query);
  });

  const sorted = filtered.sort((a, b) => {
    const rankA = stationRank[a] || 0;
    const rankB = stationRank[b] || 0;
    return rankB - rankA;
  });

  res.json(sorted);
});

// 차종 매핑 함수 (기존 로직 복구)
function mapTrainType(id: string, name: string) {
  if (id) {
    switch (id) {
      case "00": return "KTX";
      case "01": return "새마을";
      case "02": return "무궁화";
      case "03": return "통근";
      case "04": return "누리로";
      case "06": return "AREX직통";
      case "07": return "A산천";
      case "08": return "I새마을";
      case "09": return "I청춘";
      case "10": return "B산천";
      case "16": return "이음";
      case "17": return "SRT";
      case "18": return "마음";
      case "19": return "청룡";
    }
  }
  if (name.includes("KTX-산천(A-type)")) return "A산천";
  if (name.includes("KTX-산천(B-type)")) return "B산천";
  if (name.includes("KTX-산천")) return "산천";
  if (name.includes("ITX-새마을")) return "I새마을";
  if (name.includes("ITX-청춘")) return "I청춘";
  if (name.includes("ITX-마음")) return "마음";
  if (name.includes("KTX-이음")) return "이음";
  if (name.includes("KTX-청룡")) return "청룡";
  return name;
}

// 2. 열차 시간표 API
app.get('/api/timetable', async (req, res) => {
  const { dep, arr, date } = req.query;
  const depNodeId = STATION_MAPPING[dep as string];
  const arrNodeId = STATION_MAPPING[arr as string];

  if (!depNodeId || !arrNodeId) {
    return res.status(400).json({ error: '유효하지 않은 역 이름입니다.' });
  }

  try {
    const targetUrl = `https://apis.data.go.kr/1613000/TrainInfo/GetStrtpntAlocFndTrainInfo`;
    const response = await axios.get(targetUrl, {
      params: {
        serviceKey: decodeURIComponent(SERVICE_KEYS[0]),
        _type: 'json',
        depPlaceId: depNodeId,
        arrPlaceId: arrNodeId,
        depPlandTime: date,
        numOfRows: 1000,
        pageNo: 1
      }
    });

    const data = response.data;
    if (data.response?.header?.resultCode !== "00") {
      throw new Error(data.response?.header?.resultMsg || "API 호출 실패");
    }

    const items = data.response.body.items.item;
    const rawTrains = Array.isArray(items) ? items : items ? [items] : [];

    const trains: Train[] = rawTrains.map((item: any, index: number) => {
      const trainType = mapTrainType(item.vehiclekndid, item.traingradename);
      const depTimeStr = String(item.depplandtime);
      const arrTimeStr = String(item.arrplandtime);
      
      // 실제 종착역이 제공되면 사용, 없으면 검색 시의 도착역 사용
      const finalDest = item.endplacename ? `${item.endplacename}행` : `${item.arrplacename}행`;
      
      return {
        id: `${item.trainno}-${index}`,
        type: trainType,
        trainNo: String(item.trainno),
        destination: finalDest,
        depTime: `${depTimeStr.substring(8, 10)}:${depTimeStr.substring(10, 12)}`,
        arrTime: `${arrTimeStr.substring(8, 10)}:${arrTimeStr.substring(10, 12)}`,
        originalType: item.traingradename
      };
    });

    res.json({ trains });
  } catch (error: any) {
    console.error('Tago API Error:', error.message);
    res.status(500).json({ error: '열차 시간표를 가져오는데 실패했습니다.' });
  }
});

// 3. 열차 정차역 상세 API
app.get('/api/stops', async (req, res) => {
  const { trainNo, date } = req.query;
  const targetUrl = `https://rail.blue/railroad/logis/getscheduleinfo.aspx?u=1&train=${trainNo}&date=${date}&json=1&version=20180415`;

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    const data = response.data;
    if (!data.s || !Array.isArray(data.s)) {
      return res.status(404).json({ error: '상세 경로 정보를 찾을 수 없습니다.' });
    }

    const stops: TrainStop[] = data.s
      .filter((stop: any) => stop.stop !== 'skip')
      .map((stop: any) => ({
        station: stop.s.d || stop.s.i,
        arrTime: stop.a ? stop.a.substring(0, 5) : "--:--",
        depTime: stop.b ? stop.b.substring(0, 5) : "--:--",
        stopType: stop.stop
      }));

    res.json(stops);
  } catch (error: any) {
    console.error('RailBlue API Error:', error.message);
    res.status(500).json({ error: '정차역 정보를 가져오는데 실패했습니다.' });
  }
});

// 정적 파일 제공 (빌드된 프론트엔드)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
