import React, { useState } from 'react';
import './App.css';
import { apiClient } from './services/apiClient';
import { Train, TrainStop } from './shared/types';
import StationInput from './components/StationInput';
import TrainBox from './components/TrainBox';
import TrainModal from './components/TrainModal';

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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9]/g, ''); // 숫자만 남김
    if (input.length > 8) return;

    // 실제 처리할 YYYYMMDD 형식
    setTargetDate(input); // 내부적으로는 YYYYMMDD 저장

    // UI에 보여줄 값은 포매팅된 YYYY/MM/DD(요일)
    setDisplayDate(formatDisplayDate(input));
  };

  const getAdjustedHour = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    let hour = parseInt(timeStr.split(':')[0]);
    // 0시 ~ 3시는 24시 ~ 27시로 변환하여 하단에 배치
    if (hour >= 0 && hour <= 3) return hour + 24;
    return hour;
  };

  // 4시부터 27시(다음날 새벽 3시)까지 생성
  const hours = Array.from({ length: 24 }, (_, i) => i + 4);

  const updateDestinations = async (initialTrains: Train[], date: string) => {
    const chunkSize = 3;
    for (let i = 0; i < initialTrains.length; i += chunkSize) {
      const chunk = initialTrains.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (train) => {
        try {
          const stops = await apiClient.fetchTrainStops(train.trainNo, date);
          if (stops && Array.isArray(stops) && stops.length > 0) {
            const finalStop = stops[stops.length - 1];
            const newDest = `${finalStop.station}행`;
            setTrains(prevTrains => prevTrains.map(t => 
              t.trainNo === train.trainNo ? { ...t, destination: newDest } : t
            ));
          }
        } catch (e) {
          console.error(`Background update failed for train #${train.trainNo}:`, e);
        }
      }));
      await new Promise(res => setTimeout(res, 500)); // rail.blue 요청 간격 500ms
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
        setTrains(response.trains);
        setView('timetable');
        updateDestinations(response.trains, targetDate);
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
            <div className="input-group">
              <label>조회 날짜</label>
              <input 
                type="text" 
                value={displayDate} 
                onChange={handleDateChange} 
                placeholder="YYYYMMDD" 
                maxLength={10} // YYYY/MM/DD + (요일) 까지 고려
              />
            </div>
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
