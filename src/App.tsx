import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { fetchTrainSchedule, TagoTrainInfo, fetchTrainStopsFromRailBlue } from './api';
import { searchStations } from './utils/search';

interface StationStop {
  station: string;
  arrTime: string;
  depTime: string;
  stopType?: string;
  durationFromPrev?: number;
}

interface Train {
  id: string;
  type: string; 
  trainNo: string;
  destination: string;
  depTime: string;
  arrTime: string;
  originalType: string;
  isDestinationLoaded?: boolean;
}

const DESTINATION_CACHE: Record<string, string> = {};

const mapTrainType = (id: string | undefined, name: string) => {
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
};

const getTrainClass = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('ktx-산천') || t.includes('a산천') || t.includes('b산천')) return 'sancheon';
  if (t.includes('ktx-이음') || t.includes('이음')) return 'eum';
  if (t.includes('ktx-청룡') || t.includes('청룡')) return 'cheongryong';
  if (t.includes('ktx')) return 'ktx';
  if (t.includes('srt')) return 'srt';
  if (t.includes('itx-청춘') || t.includes('i청춘')) return 'itx-cheongchun';
  if (t.includes('itx-마음') || t.includes('마음')) return 'itx-maum';
  if (t.includes('itx-새마을') || t.includes('i새마을') || t.includes('새마을')) return 'itx-saemaul';
  if (t.includes('무궁화')) return 'mugunghwa';
  if (t.includes('누리로')) return 'nuriro';
  return '';
};

const formatDestination = (dest: string) => dest;
const formatTime = (timeStr: string) => `${timeStr.substring(8, 10)}:${timeStr.substring(10, 12)}`;
const formatTrainNo = (trainNo: string) => {
  const val = parseInt(trainNo.replace(/[^0-9]/g, ''), 10);
  if (isNaN(val)) return trainNo;
  const s = String(val);
  return s.length <= 3 ? s.padStart(3, '0') : s.padStart(4, '0');
};
const formatTrainType = (type: string) => type;
const getDayOfWeek = (dateString: string) => {
  const year = parseInt(dateString.substring(0, 4));
  const month = parseInt(dateString.substring(4, 6)) - 1; 
  const day = parseInt(dateString.substring(6, 8));
  const date = new Date(year, month, day);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[date.getDay()];
};

interface StationInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

const StationInput = ({ label, value, onChange, placeholder }: StationInputProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onChange(query);
    if (query) {
      setSuggestions(searchStations(query).slice(0, 10)); 
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelect = (station: string) => {
    onChange(station);
    setShowSuggestions(false);
  };

  return (
    <div className="input-group station-input-wrapper" ref={wrapperRef}>
      <label>{label}</label>
      <input 
        value={value} 
        onChange={handleInputChange} 
        onFocus={() => value && setShowSuggestions(true)}
        placeholder={placeholder} 
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((s, i) => (
            <li key={i} onClick={() => handleSelect(s)}>{s.replace(/^·\s*/, '')}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

function App() {
  const [view, setView] = useState<'search' | 'timetable'>('search');
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [selectedTrainStops, setSelectedTrainStops] = useState<StationStop[]>([]);
  const [loadingStops, setLoadingStops] = useState(false);
  const [depStation, setDepStation] = useState('');
  const [arrStation, setArrStation] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [trains, setTrains] = useState<Train[]>([]);
  const [loading, setLoading] = useState(false);

  const getAdjustedHour = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    let hour = parseInt(timeStr.split(':')[0]);
    if (hour >= 0 && hour <= 3) return hour + 24;
    return hour;
  };

  const hours = Array.from({ length: 28 }, (_, i) => i);

  const updateDestinationsBackground = async (initialTrains: Train[], date: string) => {
    const chunkSize = 3;
    for (let i = 0; i < initialTrains.length; i += chunkSize) {
      const chunk = initialTrains.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (train) => {
        if (train.isDestinationLoaded) return;
        try {
          const stops = await fetchTrainStopsFromRailBlue(train.trainNo, date);
          if (stops && stops.length > 0) {
            const dest = `${stops[stops.length - 1].station}행`;
            DESTINATION_CACHE[train.trainNo] = dest;
            setTrains(prevTrains => prevTrains.map(t => 
              t.trainNo === train.trainNo 
                ? { ...t, destination: dest, isDestinationLoaded: true } 
                : t
            ));
          }
        } catch (e) {
          console.error(`Background update failed for train #${train.trainNo}:`, e);
        }
      }));
      await new Promise(res => setTimeout(res, 100));
    }
  };

  const loadData = async () => {
    if (!depStation || !arrStation) {
      alert('출발역과 도착역을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      const data = await fetchTrainSchedule(depStation, arrStation, targetDate);
      console.log("[App] API Data received:", data);
      
      if (!data || data.length === 0) {
        alert(`${depStation}역에서 ${arrStation}역으로 향하는 직통열차가 없습니다.`);
        setTrains([]);
        setLoading(false);
        return;
      }

      const baseTrains: Train[] = data.map((item: TagoTrainInfo, index: number) => {
        const cachedDest = DESTINATION_CACHE[String(item.trainno)];
        return {
          id: `${item.trainno}-${index}`,
          type: mapTrainType(item.vehiclekndid, item.traingradename),
          trainNo: String(item.trainno),
          destination: cachedDest || `${item.arrplacename}행`,
          depTime: formatTime(String(item.depplandtime)),
          arrTime: formatTime(String(item.arrplandtime)),
          originalType: item.traingradename,
          isDestinationLoaded: !!cachedDest
        };
      });

      console.log("[App] Formatted trains count:", baseTrains.length);
      setTrains(baseTrains);
      setView('timetable');
      setLoading(false);

      updateDestinationsBackground(baseTrains, targetDate);
      
    } catch (error) {
      console.error("[App] Load error:", error);
      alert(error instanceof Error ? error.message : '데이터를 가져오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleTrainClick = async (train: Train) => {
    setSelectedTrain(train);
    setLoadingStops(true);
    setSelectedTrainStops([]);
    try {
      const stops = await fetchTrainStopsFromRailBlue(train.trainNo, targetDate);
      if (stops && stops.length > 0) {
        setSelectedTrainStops(stops);
        const lastStop = stops[stops.length - 1];
        if (lastStop && lastStop.station) {
          setSelectedTrain(prev => prev ? { ...prev, destination: `${lastStop.station}행` } : null);
        }
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
              <input type="text" value={targetDate} onChange={e => setTargetDate(e.target.value)} placeholder="YYYYMMDD" />
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
                  <span className="full-date">{targetDate.substring(4, 6)}월 {targetDate.substring(6, 8)}일 ({getDayOfWeek(targetDate)})</span>
                  <span className="short-date">{targetDate.substring(4, 6)}/{targetDate.substring(6, 8)} ({getDayOfWeek(targetDate)})</span>
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
                      <div key={`dep-${train.id}`} className={`train-box ${getTrainClass(train.type)}`} onClick={() => handleTrainClick(train)}>
                        <span className="minute">{train.depTime.split(':')[1]}</span>
                        <span className="train-info">{formatTrainType(train.type)}#{formatTrainNo(train.trainNo)}</span>
                        <span className="train-dest">{formatDestination(train.destination)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="hour-cell">{hour}</div>
                  <div className="arrival-cell">
                    {arrivals.map(train => (
                      <div key={`arr-${train.id}`} className={`train-box ${getTrainClass(train.type)}`} onClick={() => handleTrainClick(train)}>
                        <span className="minute">{train.arrTime.split(':')[1]}</span>
                        <span className="train-info">{formatTrainType(train.type)}#{formatTrainNo(train.trainNo)}</span>
                        <span className="train-dest">{formatDestination(train.destination)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {selectedTrain && (
        <div className="modal-overlay" onClick={() => setSelectedTrain(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="train-title">{selectedTrain.type}#{formatTrainNo(selectedTrain.trainNo)} {depStation}→{selectedTrain.destination}</div>
              <div className="route-summary">
                {depStation} <span className="time-small">({selectedTrain.depTime})</span> 
                <span> → </span> 
                {arrStation} <span className="time-small">({selectedTrain.arrTime})</span>
              </div>
            </div>

            <div className="modal-body">
              {loadingStops ? (
                <p style={{ textAlign: 'center', padding: '20px' }}>전체 경로 정보를 불러오는 중입니다...</p>
              ) : selectedTrainStops.length > 0 ? (
                <div className="timeline-list">
                  {selectedTrainStops.map((stop, idx) => (
                    <div key={idx} className="station-row">
                      <div className="station-name" style={{ whiteSpace: 'normal', wordBreak: 'keep-all' }}>{stop.station}</div>
                      <div className="station-times">
                        <div className="time-box">
                          {idx !== 0 && stop.arrTime !== '--:--' && (
                            <>
                              <span className="time-label-small">도착</span>
                              <span className="time-value">{stop.arrTime}</span>
                            </>
                          )}
                        </div>
                        <div className="time-box">
                          {idx !== selectedTrainStops.length - 1 && stop.depTime !== '--:--' && (
                            <>
                              <span className="time-label-small">출발</span>
                              <span className="time-value">{stop.depTime}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', padding: '20px' }}>경로 정보를 불러올 수 없습니다.</p>
              )}
            </div>
            <div className="modal-footer">
              <a href={`https://rail.blue/railroad/logis/scheduleinfo.aspx?date=${targetDate}&train=${formatTrainNo(selectedTrain.trainNo)}#!`} target="_blank" rel="noopener noreferrer" className="railblue-btn">레일블루 바로가기</a>
              <div className="close-btn" onClick={() => setSelectedTrain(null)}>창 닫기</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
