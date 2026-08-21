export interface WeatherResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type?: number;
    id?: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
  estado?: string;
}

export interface AirPollutionResponse {
  list: Array<{
    main: {
      aqi: number; // 1 = Bom, 2 = Razoável, 3 = Moderado, 4 = Ruim, 5 = Muito Ruim
    };
    components: {
      co: number;
      no: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      nh3: number;
    };
    dt: number;
  }>;
}

export interface AirQualityInfo {
  indice: number;
  classificacao: string;
  descricao: string;
  cor: string;
  pm25: number;
  pm10: number;
  o3: number;
}

export interface UvIndexInfo {
  valor: number;
  classificacao: string;
  nivel: 'baixo' | 'moderado' | 'alto' | 'muito-alto' | 'extremo';
  cor: string;
  recomendacao: string;
}

export interface ForecastItem {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    sea_level: number;
    grnd_level: number;
    humidity: number;
    temp_kf: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  clouds: {
    all: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust: number;
  };
  visibility: number;
  pop: number; // Probabilidade de precipitação (0 a 1)
  rain?: {
    '3h': number;
  };
  snow?: {
    '3h': number;
  };
  sys: {
    pod: string;
  };
  dt_txt: string;
}

export interface ForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: ForecastItem[];
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

export interface DailyForecast {
  date: Date;
  dayOfWeek: string;
  formattedDate: string;
  tempMin: number;
  tempMax: number;
  tempAvg: number;
  condition: string;
  icon: string;
  rainProbability: number;
  humidity: number;
  windSpeed: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  feelsLike: number;
  icon: string;
  condition: string;
  rainProbability: number;
  humidity: number;
  windSpeed: number;
  isRain: boolean;
  isNight: boolean;
}

export interface ClothingRecommendation {
  faixaTemp: string;
  roupas: string[];
  tecidos: string[];
  protecoesCuidados: string[];
  motivoExplicacao: string;
  tipo: 'calor' | 'ameno' | 'frio';
}

export interface ActivityRecommendation {
  titulo: string;
  subtitulo: string;
  categoria: 'ensolarado' | 'nublado' | 'chuvoso' | 'frio';
  atividades: Array<{
    nome: string;
    descricao: string;
    tipo: 'ar-livre' | 'indoor';
  }>;
}

export interface CareGuide {
  tipo: 'protetor-solar' | 'manteiga-cacau' | 'bebidas-quentes';
  titulo: string;
  subtitulo: string;
  itens: string[];
  receitas?: Array<{
    nome: string;
    ingredientes: string[];
    preparo: string[];
    beneficios: string;
  }>;
}

export interface ColorPaletteTrend {
  estacao: string;
  sugestaoContexto: string;
  cores: Array<{
    nome: string;
    hex: string;
    descricao: string;
  }>;
}
