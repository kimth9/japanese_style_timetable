import React, { useState } from 'react';
import './App.css';
import { apiClient } from './services/apiClient';
import { Train, TrainStop } from './shared/types';
import StationInput from './components/StationInput';
import TrainBox from './components/TrainBox';
import TrainModal from './components/TrainModal';
import DatePicker from './components/DatePicker';
import { VIA_ROUTE_MAP } from './shared/constants';

function App() {
  const [view, setView] = useState<'search' | 'timetable'>('search');
  const [depStation, setDepStation] = useState('');
  const [arrStation, setArrStation] = useState('');
  // 날짜 입력 필드의 실제 값 (YYYYMMDD)
  const [targetDate, setTargetDate] = useState('');
  // UI에 보여줄 날짜 값 (YYYY/MM/DD(요일))
  const [displayDate, setDisplayDate] = useState('');
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [selectedTrainStops, setSelectedTrainStops] = useState<TrainStop[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);

  const getDayOfWeek = (dateString: string) => {
    if (dateString.length !== 8) return '';
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1; 
    const day = parseInt(dateString.substring(6, 8));
    const date = new Date(year, month, day);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  const formatDisplayDate = (ymd: string) => {
    if (!ymd || ymd.length < 8) return ymd;
    const year = ymd.substring(0, 4);
    const month = ymd.substring(4, 6);
    const day = ymd.substring(6, 8);
    const formatted = `${year}/${month}/${day}`;
    if (ymd.length === 8) {
      const dayOfWeek = getDayOfWeek(ymd);
      return `${formatted}(${dayOfWeek})`;
    }
    return formatted;
  };

  const handleDateChange = (date: string) => {
    setTargetDate(date);
    setDisplayDate(formatDisplayDate(date));
  };

  const getAdjustedHour = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return -1;
    let hour = parseInt(timeStr.split(':')[0]);
    
    // 0시 ~ 3시는 24시 ~ 27시로 변환
    if (hour >= 0 && hour <= 3) return hour + 24;
    // 만약 이미 24시 이상으로 들어온 경우 그대로 반환 (4~27 범위 내라면)
    return hour;
  };

  const getViaMarker = (trainNo: string) => {
    const currentNo = parseInt(trainNo, 10);
    if (isNaN(currentNo)) return undefined;

    for (const [marker, patterns] of Object.entries(VIA_ROUTE_MAP)) {
      for (const pattern of patterns) {
        if (pattern.includes('~')) {
          const [rangePart, stepPart] = pattern.split('/');
          const [start, end] = rangePart.split('~').map(s => parseInt(s.trim(), 10));
          const step = stepPart ? parseInt(stepPart, 10) : 1;

          if (currentNo >= start && currentNo <= end) {
            if (step === 1 || (currentNo - start) % step === 0) {
              return marker;
            }
          }
        } else {
          // 문자열 비교 대신 숫자 비교를 수행하여 "01551"과 "1551"이 매칭되도록 함
          if (parseInt(pattern, 10) === currentNo) return marker;
        }
      }
    }
    return undefined;
  };

  // 4시부터 27시(다음날 새벽 3시)까지 생성
  const hours = Array.from({ length: 24 }, (_, i) => i + 4);

  const updateDestinations = async (initialTrains: Train[], date: string) => {
    const chunkSize = 5;
    const normalizeName = (name: string) => (name || '').replace(/역$/, '').trim();
    const normalizedDepStation = normalizeName(depStation);

    // 열차 리스트의 복사본을 사용하여 루프를 돕니다.
    const trainsToUpdate = [...initialTrains];

    for (let i = 0; i < trainsToUpdate.length; i += chunkSize) {
      const chunk = trainsToUpdate.slice(i, i + chunkSize);
      
      // 각 배치를 병렬로 처리하되, 개별 요청의 실패가 전체 루프를 막지 않도록 합니다.
      await Promise.all(chunk.map(async (train) => {
        try {
          const stops = await apiClient.fetchTrainStops(train.trainNo, date);
          if (stops && Array.isArray(stops) && stops.length > 0) {
            const finalStop = stops[stops.length - 1];
            const newDest = `${finalStop.station}행`;
            
            // 당역 출발 판별 (정규화된 이름으로 비교)
            const isOrigin = normalizeName(stops[0].station) === normalizedDepStation;

            setTrains(prevTrains => prevTrains.map(t => 
              t.trainNo === train.trainNo ? { 
                ...t, 
                destination: newDest,
                isOriginStation: isOrigin
              } : t
            ));
          }
        } catch (e) {
          console.error(`Background update failed for train #${train.trainNo}:`, e);
        }
      }));

      // 다음 배치를 보내기 전 대기 (속도 개선: 100ms)
      if (i + chunkSize < trainsToUpdate.length) {
        await new Promise(res => setTimeout(res, 100));
      }
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depStation || !arrStation || !targetDate) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.fetchTimetable({ depStation, arrStation, date: targetDate });
      if (response.trains.length === 0) {
        alert(`${depStation}역에서 ${arrStation}역으로 향하는 직통열차가 없습니다.`);
      } else {
        // 경유지 마커 초기화
        const processedTrains = response.trains.map(t => ({
          ...t,
          viaRouteMarker: getViaMarker(t.trainNo)
        }));
        
        setTrains(processedTrains);
        setView('timetable');
        updateDestinations(processedTrains, targetDate);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainClick = async (train: Train) => {
    setSelectedTrain(train);
    setLoadingStops(true);
    setSelectedTrainStops([]);
    try {
      const stops = await apiClient.fetchTrainStops(train.trainNo, targetDate);
      setSelectedTrainStops(stops);
      const lastStop = stops[stops.length - 1];
      if (lastStop) {
        setSelectedTrain(prev => prev ? { ...prev, destination: `${lastStop.station}행` } : null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStops(false);
    }
  };

  return (
    <div className={`container ${view === 'search' ? 'search-view' : 'timetable-view'}`}>
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">열차 정보를 불러오는 중입니다...</div>
        </div>
      )}

      {view === 'search' ? (
        <div className="search-page">
          <h1 className="main-title">열차 운행 시각표</h1>
          <form className="search-box-large" onSubmit={handleSearch}>
            <StationInput label="출발역" value={depStation} onChange={setDepStation} placeholder="서울, 대전..." />
            <StationInput label="도착역" value={arrStation} onChange={setArrStation} placeholder="동대구, 부산..." />
            <DatePicker value={targetDate} onChange={handleDateChange} />
            <button type="submit" className="search-btn-large" disabled={loading}>
              {loading ? '열차 정보 조회 중...' : '시간표 조회하기'}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="sticky-header-container">
            <div className="header-top-bar">
              <div style={{ width: '80px' }}></div>
              <h2 className="header-title">운행 시간표</h2>
              <button className="back-btn" onClick={() => setView('search')}>재검색</button>
            </div>
            <div className="timetable-header">
              <div className="header-col">
                <div className="station-label">{depStation}</div>
                <div className="time-label">출발시각</div>
              </div>
              <div className="header-col center">
                <div className="year-label">{targetDate.substring(0, 4)}년</div>
                <div className="date-label">
                  <span className="full-date">{displayDate}</span>
                  <span className="short-date">{displayDate}</span>
                </div>
              </div>
              <div className="header-col">
                <div className="station-label">{arrStation}</div>
                <div className="time-label">도착시각</div>
              </div>
            </div>
            
            {/* 해당하는 각주가 있을 때만 범례 표시 */}
            {(trains.some(t => t.isOriginStation) || trains.some(t => t.viaRouteMarker)) && (
              <div className="footnote-legend">
                {trains.some(t => t.isOriginStation) && (
                  <div className="legend-item"><span className="marker">●</span>당역출발</div>
                )}
                {trains.some(t => t.viaRouteMarker === '수') && (
                  <div className="legend-item"><span className="marker">수</span>수원경유</div>
                )}
                {trains.some(t => t.viaRouteMarker === '구') && (
                  <div className="legend-item"><span className="marker">구</span>구포경유</div>
                )}
                {trains.some(t => t.viaRouteMarker === '서') && (
                  <div className="legend-item"><span className="marker">서</span>서대전경유</div>
                )}
                {trains.some(t => t.viaRouteMarker === '홍내') && (
                  <div className="legend-item"><span className="marker">홍내</span>경로 : 홍성역→장항선→경부선→평택선→서해선→홍성역</div>
                )}
                {trains.some(t => t.viaRouteMarker === '홍외') && (
                  <div className="legend-item"><span className="marker">홍외</span>경로 : 홍성역→서해선→평택선→경부선→장항선→홍성역</div>
                )}
              </div>
            )}
          </div>

          <div className="timetable">
            {hours.map(hour => {
              const departures = trains.filter(t => getAdjustedHour(t.depTime) === hour);
              const arrivals = trains.filter(t => getAdjustedHour(t.arrTime) === hour);
              if (departures.length === 0 && arrivals.length === 0) return null;
              return (
                <div key={hour} className="hour-row">
                  <div className="departure-cell">
                    {departures.map(train => (
                      <TrainBox key={`dep-${train.id}`} train={train} type="dep" onClick={handleTrainClick} />
                    ))}
                  </div>
                  <div className="hour-cell">{hour}</div>
                  <div className="arrival-cell">
                    {arrivals.map(train => (
                      <TrainBox key={`arr-${train.id}`} train={train} type="arr" onClick={handleTrainClick} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedTrain && (
        <TrainModal 
          train={selectedTrain}
          stops={selectedTrainStops}
          loading={loadingStops}
          depStation={depStation}
          arrStation={arrStation}
          targetDate={targetDate}
          onClose={() => setSelectedTrain(null)}
        />
      )}
    </div>
  );
}

export default App;
