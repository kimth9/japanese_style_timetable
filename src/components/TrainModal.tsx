import React from 'react';
import { Train, TrainStop } from '../shared/types';

interface TrainModalProps {
  train: Train;
  stops: TrainStop[];
  loading: boolean;
  depStation: string;
  arrStation: string;
  targetDate: string;
  onClose: () => void;
}

const formatTrainNo = (trainNo: string) => {
  const val = parseInt(trainNo.replace(/[^0-9]/g, ''), 10);
  if (isNaN(val)) return trainNo;
  const s = String(val);
  return s.length <= 3 ? s.padStart(3, '0') : s.padStart(4, '0');
};

const TrainModal = ({ train, stops, loading, depStation, arrStation, targetDate, onClose }: TrainModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="train-title">{train.type}#{formatTrainNo(train.trainNo)} {depStation}→{train.destination}</div>
          <div className="route-summary">
            {depStation} <span className="time-small">({train.depTime})</span> 
            <span> → </span> 
            {arrStation} <span className="time-small">({train.arrTime})</span>
          </div>
        </div>

        <div className="modal-body">
          {loading ? (
            <p style={{ textAlign: 'center', padding: '20px' }}>전체 경로 정보를 불러오는 중입니다...</p>
          ) : stops.length > 0 ? (
            <div className="timeline-list">
              {stops.map((stop, idx) => (
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
                      {idx !== stops.length - 1 && stop.depTime !== '--:--' && (
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
          <a 
            href={`https://rail.blue/railroad/logis/scheduleinfo.aspx?date=${targetDate}&train=${formatTrainNo(train.trainNo)}#!`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="railblue-btn"
          >
            레일블루 바로가기
          </a>
          <div className="close-btn" onClick={onClose}>창 닫기</div>
        </div>
      </div>
    </div>
  );
};

export default TrainModal;
