const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// CORS 설정 강화
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health Check
app.get('/ping', (req, res) => {
  res.send('pong');
});

app.get('/', (req, res) => {
  res.send('Azure Proxy Server is Running');
});

// [추가] TAGO 열차 스케줄 프록시 엔드포인트
app.get('/api/tago', async (req, res) => {
  try {
    const { serviceKey, depPlaceId, arrPlaceId, depPlandTime } = req.query;
    const targetUrl = `https://apis.data.go.kr/1613000/TrainInfo/GetStrtpntAlocFndTrainInfo`;
    
    const response = await axios.get(targetUrl, {
      params: {
        serviceKey,
        _type: 'json',
        depPlaceId,
        arrPlaceId,
        depPlandTime,
        numOfRows: 1000,
        pageNo: 1
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching from TAGO:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from TAGO' });
  }
});

// RailBlue 프록시 엔드포인트
app.get('/api/railblue', async (req, res) => {
  try {
    const { train, date } = req.query;
    if (!train || !date) {
      return res.status(400).json({ error: 'Missing train or date parameter' });
    }

    const targetUrl = `https://rail.blue/railroad/logis/getscheduleinfo.aspx?u=1&train=${train}&date=${date}&json=1&version=20180415`;
    
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching from RailBlue:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from RailBlue' });
  }
});

app.listen(port, () => {
  console.log(`Azure API Proxy Server running on port ${port}`);
});
