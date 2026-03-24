export interface TagoTrainInfo {
  adultcharge: number;
  arrplacename: string;  // 검색 시 지정한 도착역
  arrplandtime: string;
  depplacename: string;  // 검색 시 지정한 출발역
  depplandtime: string;
  traingradename: string;
  trainno: number;
  startplacename?: string; // 열차의 실제 시발역 (제공될 경우)
  endplacename?: string;   // 열차의 실제 종착역 (제공될 경우)
  vehiclekndid?: string;   // 차종 ID 추가
}

const STATION_MAPPING: Record<string, string> = {
  "서울": "NAT010000", "광명": "NATH10219", "대전": "NAT011668", "동대구": "NAT013271", "경주": "NATH13421",
  "울산": "NATH13717", "부산": "NAT014445", "김천구미": "NATH12383", "천안아산": "NATH10960", "오송": "NAT050044",
  "서대구": "NAT013189", "행신": "NAT110147", "밀양": "NAT013841", "물금": "NAT014150", "구포": "NAT014281",
  "경산": "NAT013395", "영등포": "NAT010091", "수원": "NAT010415", "진영": "NAT880177", "창원중앙": "NAT880281",
  "창원": "NAT880310", "마산": "NAT880345", "진주": "NAT881014", "포항": "NAT8B0351", "용산": "NAT010032",
  "공주": "NATH20438", "익산": "NAT030879", "정읍": "NAT031314", "광주송정": "NAT031857", "목포": "NAT032563",
  "나주": "NAT031998", "서대전": "NAT030057", "계룡": "NAT030254", "논산": "NAT030508", "장성": "NAT031638",
  "김제": "NAT031056", "전주": "NAT040257", "남원": "NAT040868", "순천": "NAT041595", "여천": "NAT041866",
  "여수엑스포": "NAT041993", "구례구": "NAT041285", "곡성": "NAT041072", "청량리": "NAT130126", "양평": "NAT020524",
  "원주": "NAT020947", "제천": "NAT021549", "단양": "NAT021784", "영주": "NAT022188", "안동": "NAT022558",
  "서원주": "NAT020864", "상봉": "NAT020040", "풍기": "NAT022053", "태화강": "NAT750726", "부전": "NAT750046",
  "영천": "NAT023449", "의성": "NAT022844", "판교(경기)": "NAT250007", "부발": "NAT250428", "가남": "NAT280090",
  "감곡장호원": "NAT280212", "앙성온천": "NAT280358", "충주": "NAT050827", "살미": "NAT280666", "수안보온천": "NAT280751",
  "연풍": "NAT280814", "문경": "NAT280927", "만종": "NAT021033", "평창": "NATN10625", "강릉": "NAT601936",
  "진부": "NATN10787", "둔내": "NATN10428", "횡성": "NATN10230", "동해": "NAT601485", "묵호": "NAT601545",
  "정동진": "NAT601774", "평택": "NAT010754", "천안": "NAT010971", "조치원": "NAT011298", "영동": "NAT012124",
  "김천": "NAT012546", "구미": "NAT012775", "왜관": "NAT012968", "대구": "NAT013239", "청도": "NAT013629",
  "삼랑진": "NAT013967", "신탄진": "NAT011524", "옥천": "NAT011833", "신해운대": "NAT750189", "함안": "NAT880520",
  "화명": "NAT014244", "아산": "NAT080045", "온양온천": "NAT080147", "예산": "NAT080402", "삽교": "NAT080492",
  "홍성": "NAT080622", "광천": "NAT080749", "대천": "NAT080952", "웅천": "NAT081099", "서천": "NAT081343",
  "장항": "NAT081318", "군산": "NAT081388", "신례원": "NAT080353", "오산": "NAT010570", "강경": "NAT030607",
  "신태인": "NAT031179", "함평": "NAT032212", "몽탄": "NAT032313", "일로": "NAT032422", "광주": "NAT883012",
  "서정리": "NAT010670", "백양사": "NAT031486", "오수": "NAT040667", "삼례": "NAT040133", "임실": "NAT040536",
  "원동": "NAT014058", "하동": "NAT881460", "광양": "NAT881708", "신보성": "NAT470804", "전남장흥": "NAT470584",
  "강진": "NAT470446", "해남": "NAT470312", "영암": "NAT470133", "덕소": "NAT020178", "용문": "NAT020641",
  "지평": "NAT020677", "석불": "NAT020717", "일신": "NAT020760", "매곡": "NAT020803", "양동": "NAT020845",
  "삼산": "NAT020884", "봉양": "NAT021478", "상동": "NAT013747", "사상": "NAT014331", "남성현": "NAT013542",
  "신창": "NAT080216", "기장": "NAT750329", "북울산": "NAT750781", "하양": "NAT830200", "영월": "NAT650341",
  "민둥산": "NAT650722", "사북": "NAT650782", "태백": "NAT650978", "도계": "NAT601122", "군위": "NAT023073",
  "아화": "NAT023601", "남창": "NAT750560", "센텀": "NAT750161", "서경주": "NAT8B0082", "월포": "NAT8B0504",
  "영덕": "NAT8B0737", "영해": "NAT752029", "고래불": "NAT752102", "후포": "NAT752196", "평해": "NAT752245",
  "기성": "NAT752319", "울진": "NAT752540", "죽변": "NAT752618", "흥부": "NAT752682", "옥원": "NAT752787",
  "근덕": "NAT752946", "삼척": "NAT630129", "매화": "NAT752428", "임원": "NAT752850", "합덕": "NAT460641",
  "인주": "NAT460553", "안중": "NAT460378", "향남": "NAT460187", "화성시청": "NAT460073", "서화성": "NAT460000",
  "부강": "NAT011403", "황간": "NAT012270", "추풍령": "NAT012355", "이원": "NAT011916", "안양": "NAT010239",
  "약목": "NAT012903", "심천": "NAT012016", "신동": "NAT013067", "전의": "NAT011154", "성환": "NAT010848",
  "지탄": "NAT011972", "청주": "NAT050114", "오근장": "NAT050215", "청주공항": "NAT050244", "증평": "NAT050366",
  "음성": "NAT050596", "주덕": "NAT050719", "삼탄": "NAT051006", "함열": "NAT030718", "무안": "NAT032273",
  "연산": "NAT030396", "다시": "NAT032099", "극락강": "NAT883086", "도고온천": "NAT080309", "청소": "NAT080827",
  "판교(충남)": "NAT081240", "대야": "NAT320131", "예미": "NAT650515", "고한": "NAT650828", "동백산": "NAT651053",
  "신기": "NAT601275", "쌍룡": "NAT650177", "봉화": "NAT600147", "춘양": "NAT600379", "분천": "NAT600593",
  "양원": "NAT600655", "승부": "NAT600692", "석포": "NAT600768", "철암": "NAT600870", "현동": "NAT600527",
  "임기": "NAT600476", "안강": "NAT8B0190", "옥산": "NAT300200", "청리": "NAT300271", "상주": "NAT300360",
  "함창": "NAT300558", "점촌": "NAT300600", "용궁": "NAT300669", "개포": "NAT300733", "예천": "NAT300850",
  "강구": "NAT8B0671", "장사": "NAT8B0595", "한림정": "NAT880099", "반성": "NAT880766", "군북": "NAT880608",
  "중리": "NAT880408", "진례": "NAT880179", "완사": "NAT881168", "북천": "NAT881269", "횡천": "NAT881386",
  "진상": "NAT881538", "벌교": "NAT882034", "득량": "NAT882237", "장동": "NAT470718", "임성리": "NAT032489",
  "조성": "NAT882141", "예당": "NAT882194", "보성": "NAT882328", "이양": "NAT882544", "능주": "NAT882666",
  "화순": "NAT882755", "효천": "NAT882904", "서광주": "NAT882936", "명봉": "NAT882416", "평내호평": "NAT140214",
  "가평": "NAT140576", "남춘천": "NAT140840", "춘천": "NAT140873", "마석": "NAT140277", "사릉": "NAT140133",
  "퇴계원": "NAT140098", "왕십리": "NAT130104", "강촌": "NAT140701", "청평": "NAT140436", "옥수": "NAT130070",
  "대곡": "NAT110180", "원릉": "NAT150057", "일영": "NAT150167", "장흥": "NAT150191", "송추": "NAT150231",
  "의정부": "NAT130312", "각계": "NAT012054",
  "수서": "NATH30000", "평택지제": "NATH30536", "동탄": "NATH30326"
};

// 공공데이터포털 인증키 목록 (현재 API_Key.env에 업데이트된 인코딩 키를 사용합니다)
const SERVICE_KEYS = [
  "v9G5jEOuxwgs4r9ExyF%2F%2BU6g1YwOzwU6RD4Mbw0C4mlQQ%2FFPaXefgmEB1EKqNdGWrf62kQZAlw4xcBH2VO7K7g%3D%3D", // Encoding Key 1
  "ef02050a887a949287368265eae38c0d855d0cfe37a780453c3ecba35bb087b1",
  "102d5e512766a732af8743b4c2b5e735f5bd60f645e15f135f2a8648835a6530"
];

const KEY_INDEX = 0;

// 배포 환경과 개발 환경 구분
const isProd = import.meta.env.PROD;
const AZURE_BASE_URL = "https://krtraintimetable.azurewebsites.net";
const TAGO_BASE = isProd ? AZURE_BASE_URL : "/api-tago";
const RAILBLUE_BASE = isProd ? AZURE_BASE_URL : "/api-railblue";

export const fetchTrainSchedule = async (
  depStation: string,
  arrStation: string,
  date: string // YYYYMMDD
) => {
  const depNodeId = STATION_MAPPING[depStation];
  const arrNodeId = STATION_MAPPING[arrStation];

  if (!depNodeId || !arrNodeId) {
    throw new Error("유효하지 않은 역 이름입니다.");
  }

  const key = SERVICE_KEYS[KEY_INDEX];
  
  // Azure 프록시를 통한 호출 (isProd일 때)
  let url = "";
  if (isProd) {
    const targetUrl = new URL(`${AZURE_BASE_URL}/api/tago`);
    // 이미 인코딩된 키를 decode하여 URLSearchParams가 표준에 맞게 다시 인코딩하도록 함
    targetUrl.searchParams.set("serviceKey", decodeURIComponent(key));
    targetUrl.searchParams.set("depPlaceId", depNodeId);
    targetUrl.searchParams.set("arrPlaceId", arrNodeId);
    targetUrl.searchParams.set("depPlandTime", date);
    url = targetUrl.toString();
  } else {
    url = `${TAGO_BASE}/1613000/TrainInfo/GetStrtpntAlocFndTrainInfo?serviceKey=${key}&_type=json&depPlaceId=${depNodeId}&arrPlaceId=${arrNodeId}&depPlandTime=${date}&numOfRows=1000&pageNo=1`;
  }

  console.log(`[API] Requesting Schedule: ${depStation} -> ${arrStation} (${date})`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.response?.header?.resultCode !== "00") {
      throw new Error(data.response?.header?.resultMsg || "API 호출 실패");
    }

    const items = data.response.body.items.item;
    return Array.isArray(items) ? items : items ? [items] : [];
  } catch (error) {
    console.error("[API] Schedule Error:", error);
    throw error;
  }
};

export const fetchTrainStopsFromRailBlue = async (trainNo: string, date: string) => {
  const url = isProd 
    ? `${AZURE_BASE_URL}/api/railblue?train=${trainNo}&date=${date}`
    : `${RAILBLUE_BASE}/railroad/logis/getscheduleinfo.aspx?u=1&train=${trainNo}&date=${date}&json=1&version=20180415`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`RailBlue Proxy Error (${response.status})`);

    const data = await response.json();
    if (!data.s || !Array.isArray(data.s)) throw new Error("상세 경로 정보를 찾을 수 없습니다.");

    return data.s.map((stop: any) => ({
      station: stop.s.d || stop.s.i, 
      arrTime: stop.a ? stop.a.substring(0, 5) : "--:--",
      depTime: stop.b ? stop.b.substring(0, 5) : "--:--",
      stopType: stop.stop
    })).filter((stop: any) => stop.stopType !== 'skip');
  } catch (error) {
    console.error("[RailBlue] API error:", error, "URL:", url);
    throw error;
  }
};
