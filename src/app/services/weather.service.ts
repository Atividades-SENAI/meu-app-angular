import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import {
  WeatherResponse,
  ForecastResponse,
  AirPollutionResponse,
  AirQualityInfo,
  UvIndexInfo,
  DailyForecast,
  HourlyForecast,
  ClothingRecommendation,
  ActivityRecommendation,
  CareGuide,
  ColorPaletteTrend
} from '../models/weather.model';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private http = inject(HttpClient);
  private readonly apiKey = '78a0ebbf843d1b3baeff34cc8374b721';
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';
  private readonly geoUrl = 'https://api.openweathermap.org/geo/1.0';

  /**
   * Obtém o clima atual por nome da cidade
   */
  getWeatherByCity(city: string): Observable<WeatherResponse> {
    const url = `${this.baseUrl}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${this.apiKey}&lang=pt_br`;
    return this.http.get<WeatherResponse>(url);
  }

  /**
   * Obtém a previsão de 5 dias por nome da cidade
   */
  getForecastByCity(city: string): Observable<ForecastResponse> {
    const url = `${this.baseUrl}/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${this.apiKey}&lang=pt_br`;
    return this.http.get<ForecastResponse>(url);
  }

  /**
   * Obtém o clima atual por coordenadas geográficas
   */
  getWeatherByCoords(lat: number, lon: number): Observable<WeatherResponse> {
    const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}&lang=pt_br`;
    return this.http.get<WeatherResponse>(url);
  }

  /**
   * Obtém a previsão por coordenadas geográficas
   */
  getForecastByCoords(lat: number, lon: number): Observable<ForecastResponse> {
    const url = `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}&lang=pt_br`;
    return this.http.get<ForecastResponse>(url);
  }

  /**
   * Obtém a qualidade do ar pelas coordenadas
   */
  getAirPollution(lat: number, lon: number): Observable<AirPollutionResponse | null> {
    const url = `${this.baseUrl}/air_pollution?lat=${lat}&lon=${lon}&appid=${this.apiKey}`;
    return this.http.get<AirPollutionResponse>(url).pipe(
      catchError(() => of(null))
    );
  }

  /**
   * Busca estado / região pelo geocoding reverso
   */
  getGeocodingReverse(lat: number, lon: number): Observable<string> {
    const url = `${this.geoUrl}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.apiKey}`;
    return this.http.get<Array<{ name: string; state?: string; country: string }>>(url).pipe(
      map((res) => {
        if (res && res.length > 0 && res[0].state) {
          return res[0].state;
        }
        return '';
      }),
      catchError(() => of(''))
    );
  }

  /**
   * Processa os dados de qualidade do ar
   */
  processAirQuality(res: AirPollutionResponse | null): AirQualityInfo {
    if (!res || !res.list || res.list.length === 0) {
      return {
        indice: 1,
        classificacao: 'Boa',
        descricao: 'Qualidade do ar considerada satisfatória e o risco à saúde é praticamente nulo.',
        cor: 'var(--accent-green)',
        pm25: 12,
        pm10: 20,
        o3: 45
      };
    }

    const item = res.list[0];
    const aqi = item.main.aqi;
    const comps = item.components;

    switch (aqi) {
      case 1:
        return {
          indice: 1,
          classificacao: 'Excelente',
          descricao: 'Ar limpo e ideal para qualquer atividade ao ar livre.',
          cor: '#10b981',
          pm25: comps.pm2_5,
          pm10: comps.pm10,
          o3: comps.o3
        };
      case 2:
        return {
          indice: 2,
          classificacao: 'Boa',
          descricao: 'Qualidade aceitável. Pouco ou nenhum risco para a população geral.',
          cor: '#0ea5e9',
          pm25: comps.pm2_5,
          pm10: comps.pm10,
          o3: comps.o3
        };
      case 3:
        return {
          indice: 3,
          classificacao: 'Moderada',
          descricao: 'Pessoas sensíveis podem apresentar desconforto respiratório leve.',
          cor: '#f59e0b',
          pm25: comps.pm2_5,
          pm10: comps.pm10,
          o3: comps.o3
        };
      case 4:
        return {
          indice: 4,
          classificacao: 'Ruim',
          descricao: 'Qualidade insalubre para grupos sensíveis. Evite exercícios intensos ao ar livre.',
          cor: '#f97316',
          pm25: comps.pm2_5,
          pm10: comps.pm10,
          o3: comps.o3
        };
      case 5:
      default:
        return {
          indice: 5,
          classificacao: 'Muito Prejudicial',
          descricao: 'Ar com alta concentração de poluentes. Permaneça em ambientes fechados.',
          cor: '#ef4444',
          pm25: comps.pm2_5,
          pm10: comps.pm10,
          o3: comps.o3
        };
    }
  }

  /**
   * Calcula / Estima o Índice UV considerando latitude, altitude solar estimada e nuvens
   */
  calculateUVIndex(lat: number, clouds: number, temp: number): UvIndexInfo {
    const agora = new Date();
    const hora = agora.getHours();

    // Radiação solar direta atinge pico entre 11h e 15h
    let fatorHorario = 0;
    if (hora >= 6 && hora <= 18) {
      fatorHorario = Math.sin(((hora - 6) / 12) * Math.PI);
    }

    // Latitude próxima ao equador recebe mais radiação solar
    const fatorLat = Math.cos((lat * Math.PI) / 180);
    const atenNuvens = Math.max(0.2, 1 - (clouds / 100) * 0.75);

    let rawUv = Math.round(11 * fatorHorario * Math.max(0.4, fatorLat) * atenNuvens);
    if (temp > 28 && rawUv < 5 && hora >= 11 && hora <= 14) {
      rawUv = Math.min(10, rawUv + 2);
    }
    rawUv = Math.max(0, rawUv);

    if (rawUv <= 2) {
      return {
        valor: rawUv,
        classificacao: 'Baixo',
        nivel: 'baixo',
        cor: '#10b981',
        recomendacao: 'Baixo risco de danos causados pelo sol. Proteção mínima necessária.'
      };
    } else if (rawUv <= 5) {
      return {
        valor: rawUv,
        classificacao: 'Moderado',
        nivel: 'moderado',
        cor: '#f59e0b',
        recomendacao: 'Proteção recomendada. Fique na sombra durante o meio do dia e use protetor.'
      };
    } else if (rawUv <= 7) {
      return {
        valor: rawUv,
        classificacao: 'Alto',
        nivel: 'alto',
        cor: '#f97316',
        recomendacao: 'Proteção necessária. Use camisa, chapéu, óculos de sol e protetor solar FPS 30+.'
      };
    } else if (rawUv <= 10) {
      return {
        valor: rawUv,
        classificacao: 'Muito Alto',
        nivel: 'muito-alto',
        cor: '#ef4444',
        recomendacao: 'Risco muito alto. Evite exposição direta ao sol entre 10h e 16h.'
      };
    } else {
      return {
        valor: rawUv,
        classificacao: 'Extremo',
        nivel: 'extremo',
        cor: '#8b5cf6',
        recomendacao: 'Risco extremo. Tome todas as precauções: pele desprotegida queima em minutos.'
      };
    }
  }

  /**
   * Processa a previsão horária (timeline horizontal com indicadores de chuva, umidade e vento)
   */
  processHourlyForecast(forecast: ForecastResponse): HourlyForecast[] {
    if (!forecast || !forecast.list) return [];

    return forecast.list.slice(0, 8).map((item) => {
      const date = new Date(item.dt * 1000);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const popPercent = Math.round((item.pop || 0) * 100);
      const conditionId = item.weather[0]?.id || 800;
      const isRain = (conditionId >= 200 && conditionId < 600) || popPercent >= 40;

      return {
        time: `${hours}:${minutes}`,
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        icon: item.weather[0]?.icon || '01d',
        condition: item.weather[0]?.description || '',
        rainProbability: popPercent,
        humidity: Math.round(item.main.humidity),
        windSpeed: Math.round(item.wind.speed * 3.6),
        isRain,
        isNight: item.sys?.pod === 'n'
      };
    });
  }

  /**
   * Processa e agrupa a previsão de 5 dias por dia
   */
  processDailyForecast(forecast: ForecastResponse): DailyForecast[] {
    if (!forecast || !forecast.list || forecast.list.length === 0) return [];

    const daysMap = new Map<string, typeof forecast.list>();

    forecast.list.forEach((item) => {
      const dateKey = item.dt_txt.split(' ')[0];
      if (!daysMap.has(dateKey)) {
        daysMap.set(dateKey, []);
      }
      daysMap.get(dateKey)!.push(item);
    });

    const dailyList: DailyForecast[] = [];
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const hojeStr = new Date().toISOString().split('T')[0];

    daysMap.forEach((items, dateKey) => {
      let min = Infinity;
      let max = -Infinity;
      let totalTemp = 0;
      let totalHumidity = 0;
      let maxWind = 0;
      let maxPop = 0;

      items.forEach((it) => {
        if (it.main.temp_min < min) min = it.main.temp_min;
        if (it.main.temp_max > max) max = it.main.temp_max;
        totalTemp += it.main.temp;
        totalHumidity += it.main.humidity;
        if (it.wind.speed > maxWind) maxWind = it.wind.speed;
        if (it.pop > maxPop) maxPop = it.pop;
      });

      const middayItem = items.find((it) => it.dt_txt.includes('12:00:00')) || items[Math.floor(items.length / 2)];
      const dateObj = new Date(dateKey + 'T12:00:00');

      let dayName = diasSemana[dateObj.getDay()];
      if (dateKey === hojeStr) {
        dayName = 'Hoje';
      }

      const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      dailyList.push({
        date: dateObj,
        dayOfWeek: dayName,
        formattedDate,
        tempMin: Math.round(min),
        tempMax: Math.round(max),
        tempAvg: Math.round(totalTemp / items.length),
        condition: middayItem.weather[0]?.description || 'Normal',
        icon: middayItem.weather[0]?.icon || '01d',
        rainProbability: Math.round(maxPop * 100),
        humidity: Math.round(totalHumidity / items.length),
        windSpeed: Math.round(maxWind * 3.6)
      });
    });

    return dailyList.slice(0, 5);
  }

  /**
   * Painel Inteligente de Recomendações: Vestimenta, Tecidos e Cuidados
   */
  generateClothingRecommendation(temp: number): ClothingRecommendation {
    if (temp >= 20) {
      return {
        faixaTemp: 'Clima Quente / Agradável (20°C a 40°C+)',
        tipo: 'calor',
        roupas: [
          'Camiseta leve de manga curta',
          'Camisa leve de botões',
          'Bermuda ou shorts confortáveis',
          'Vestido leve e fluido',
          'Roupas frescas e respiráveis'
        ],
        tecidos: [
          'Algodão 100% natural',
          'Linho puro ou misto',
          'Viscose respirável',
          'Fibra de Bambu com toque suave'
        ],
        protecoesCuidados: [
          'Uso indispensável de protetor solar (FPS 30+)',
          'Beber no mínimo 2 a 3 litros de água ao longo do dia',
          'Óculos escuros com proteção UVA/UVB',
          'Boné, viseira ou chapéu para proteção do couro cabeludo'
        ],
        motivoExplicacao:
          'Em temperaturas elevadas, o corpo perde líquidos rapidamente através da transpiração. Tecidos naturais facilitam a evaporação do suor e a proteção solar impede queimaduras e o envelhecimento precoce da pele.'
      };
    } else if (temp >= 15 && temp < 20) {
      return {
        faixaTemp: 'Clima Ameno / Meia-Estação (15°C a 20°C)',
        tipo: 'ameno',
        roupas: [
          'Camisa de manga longa',
          'Blusa leve de tricô ou algodão',
          'Casaco fino ou cardigan',
          'Calça jeans ou sarja confortável'
        ],
        tecidos: [
          'Algodão encorpado',
          'Moletom leve',
          'Fleece fino e macio'
        ],
        protecoesCuidados: [
          'Manter hidratação regular da pele e lábios',
          'Aplicação de manteiga de cacau para prevenir ressecamento',
          'Consumo constante de água ao longo do expediente'
        ],
        motivoExplicacao:
          'O clima ameno traz oscilações térmicas entre a sombra e o sol. O uso de sobreposições leves permite adaptação rápida às variações de temperatura sem sobrecarregar o corpo.'
      };
    } else {
      return {
        faixaTemp: 'Clima Frio / Baixas Temperaturas (0°C a 15°C)',
        tipo: 'frio',
        roupas: [
          'Casaco pesado, jaqueta corta-vento ou sobretudo',
          'Cachecol aconchegante',
          'Touca ou gorro térmico',
          'Luvas para proteção das mãos',
          'Botas ou calçados fechados e impermeáveis'
        ],
        tecidos: [
          'Lã natural ou merino',
          'Fleece térmico de alta densidade',
          'Tecidos térmicos inteligentes (Segunda pele)'
        ],
        protecoesCuidados: [
          'Hidratante corporal intensivo pós-banho',
          'Manteiga de cacau ou balm labial regenerador',
          'Proteção das extremidades (mãos, pés e orelhas)'
        ],
        motivoExplicacao:
          'O ar frio e os ventos reduzem a umidade superficial da derme e contraem os vasos sanguíneos periféricos. O isolamento térmico em camadas retém o calor corporal e previne fissuras na pele.'
      };
    }
  }

  /**
   * Seção "Atividades Recomendadas" (Passeios)
   */
  generateActivityRecommendations(temp: number, conditionId: number, clouds: number): ActivityRecommendation {
    const isRain = conditionId >= 200 && conditionId < 600;

    if (isRain) {
      return {
        titulo: 'Dia Chuvoso — Experiências Confortáveis e Culturais',
        subtitulo: 'Sugestões para aproveitar o melhor de ambientes cobertos e acolhedores',
        categoria: 'chuvoso',
        atividades: [
          { nome: 'Restaurantes & Gastronomia', descricao: 'Aproveitar uma refeição especial em um bistrô acolhedor', tipo: 'indoor' },
          { nome: 'Teatros & Espetáculos', descricao: 'Assistir a peças, musicais ou apresentações culturais', tipo: 'indoor' },
          { nome: 'Bibliotecas & Sebos', descricao: 'Um refúgio tranquilo para leitura e estudo imersivo', tipo: 'indoor' },
          { nome: 'Jogos & Entretenimento', descricao: 'Tarde de jogos de tabuleiro, videogames ou boliche com amigos', tipo: 'indoor' },
          { nome: 'Atividades Culturais Internas', descricao: 'Workshops, cursos rápidos ou galerias protegidas', tipo: 'indoor' }
        ]
      };
    }

    if (temp < 15) {
      return {
        titulo: 'Dia Frio — Roteiro Charmoso e Aconchegante',
        subtitulo: 'Momentos quentes e passeios que combinam perfeitamente com temperaturas baixas',
        categoria: 'frio',
        atividades: [
          { nome: 'Cafeterias Especiais', descricao: 'Apreciar cafés especiais, cappuccinos e bolos artesanais', tipo: 'indoor' },
          { nome: 'Chocolate Quente & Docerias', descricao: 'Degustar bebidas quentes e sobremesas reconfortantes', tipo: 'indoor' },
          { nome: 'Noite de Fondue', descricao: 'Fondue de queijo ou chocolate para aquecer o paladar', tipo: 'indoor' },
          { nome: 'Livrarias & Cafés Literários', descricao: 'Explorar novidades literárias em ambientes com aquecimento', tipo: 'indoor' },
          { nome: 'Museus de Arte & História', descricao: 'Visitas tranquilas a exposições climatizadas', tipo: 'indoor' }
        ]
      };
    }

    if (clouds > 65) {
      return {
        titulo: 'Dia Nublado — Passeios Urbanos & Lazer Tranquilo',
        subtitulo: 'Clima suave sem sol forte: ótimo para circular e descobrir novidades',
        categoria: 'nublado',
        atividades: [
          { nome: 'Museus & Centros Culturais', descricao: 'Conhecer novas exposições de arte e ciência', tipo: 'indoor' },
          { nome: 'Cafeteria & Bistrô', descricao: 'Momento para uma conversa tranquila ou home office externo', tipo: 'indoor' },
          { nome: 'Shopping Centers', descricao: 'Compras, gastronomia e lazer em ambiente completo', tipo: 'indoor' },
          { nome: 'Cinema & Sessões Especiais', descricao: 'Assistir aos últimos lançamentos na telona', tipo: 'indoor' },
          { nome: 'Caminhada Urbana Leve', descricao: 'Explorar avenidas e ruas arborizadas sem o incômodo do calor', tipo: 'ar-livre' }
        ]
      };
    }

    // Dia Ensolarado
    return {
      titulo: 'Dia Ensolarado — Atividades ao Ar Livre & Natureza',
      subtitulo: 'Céu aberto e ótima iluminação: aproveite os espaços abertos',
      categoria: 'ensolarado',
      atividades: [
        { nome: 'Parques & Bosques', descricao: 'Caminhadas relaxantes em contato direto com o verde', tipo: 'ar-livre' },
        { nome: 'Caminhada & Corrida', descricao: 'Exercícios cardiovasculares ao ar livre no início da manhã ou fim de tarde', tipo: 'ar-livre' },
        { nome: 'Praia, Lagos ou Clubes', descricao: 'Refrescar-se, nadar e aproveitar a brisa da água', tipo: 'ar-livre' },
        { nome: 'Ciclismo Urbano', descricao: 'Passeio de bicicleta por ciclovias e orlas da cidade', tipo: 'ar-livre' },
        { nome: 'Piquenique no Gramado', descricao: 'Reunir amigos ou família para lanches ao ar livre', tipo: 'ar-livre' }
      ]
    };
  }

  /**
   * Painel de Cuidados Específicos: Protetor Solar, Manteiga de Cacau e Receitas de Bebidas Quentes
   */
  generateCareGuides(temp: number, uv: UvIndexInfo, conditionId: number): CareGuide[] {
    const guides: CareGuide[] = [];
    const isRain = conditionId >= 200 && conditionId < 600;

    // 1. Protetor Solar
    if (temp >= 20 || uv.valor >= 3) {
      guides.push({
        tipo: 'protetor-solar',
        titulo: 'Como Aplicar o Protetor Solar Corretamente',
        subtitulo: 'Proteção dermatológica avançada contra radiação UVA e UVB',
        itens: [
          'Aplicar generosamente 30 minutos antes da exposição solar para total absorção.',
          'Reaplicar a cada 2 horas em dias ensolarados ou após períodos na sombra.',
          'Reaplicar imediatamente após suor intenso, banho de mar, piscina ou uso de toalha.',
          'Utilizar FPS adequado (mínimo FPS 30 para o corpo e FPS 50+ para o rosto).',
          'Não esquecer de áreas vulneráveis: orelhas, nuca, peito dos pés e dorso das mãos.'
        ]
      });
    }

    // 2. Manteiga de Cacau
    if (temp < 20 || isRain) {
      guides.push({
        tipo: 'manteiga-cacau',
        titulo: 'Cuidados Labiais: Guia da Manteiga de Cacau',
        subtitulo: 'Prevenção de fissuras, descamação e ressecamento causados pelo vento e frio',
        itens: [
          'Quando aplicar: Logo ao acordar, antes de sair em ambientes com vento e antes de dormir.',
          'Frequência recomendada: 3 a 4 vezes ao dia ou sempre que sentir os lábios repuxando.',
          'Benefícios principais: Cria uma película lipídica protetora, retém a umidade natural e acelera a regeneração celular.'
        ]
      });
    }

    // 3. Bebidas Quentes
    if (temp < 20 || isRain) {
      guides.push({
        tipo: 'bebidas-quentes',
        titulo: 'Receitas de Bebidas Quentes Reconfortantes',
        subtitulo: 'Infusões e bebidas para aquecer o corpo, relaxar e aumentar a imunidade',
        itens: [],
        receitas: [
          {
            nome: 'Chá de Camomila Calmante',
            ingredientes: [
              '1 colher de sopa de flores de camomila secas (ou 1 sachê)',
              '250 ml de água mineral fervente',
              '1 colher de chá de mel puro ou gotas de limão (opcional)'
            ],
            preparo: [
              'Despeje a água fervente sobre a camomila em uma xícara.',
              'Tampe e deixe em infusão por 5 a 7 minutos.',
              'Coe, adoce com mel a gosto e consuma morno.'
            ],
            beneficios: 'Propriedades calmantes, alívio da tensão muscular, relaxamento digestivo e conforto térmico imediato.'
          },
          {
            nome: 'Chá de Gengibre com Limão & Mel',
            ingredientes: [
              '2 colheres de sopa de gengibre fresco ralado ou fatiado',
              '300 ml de água',
              'Suco de 1/2 limão fresco',
              '1 colher de sopa de mel'
            ],
            preparo: [
              'Ferva a água com o gengibre em fogo médio por 8 a 10 minutos.',
              'Desligue o fogo, coe em uma caneca.',
              'Esprema o suco de limão, adicione o mel e misture bem.'
            ],
            beneficios: 'Ação termogênica potente, fortalece as defesas imunológicas, descongestiona vias aéreas e aquece profundamente.'
          },
          {
            nome: 'Chocolate Quente Cremoso Tradicional',
            ingredientes: [
              '300 ml de leite integral (ou leite vegetal de aveia)',
              '60g de chocolate meio amargo 50% ou 70% picado',
              '1 colher de sopa de cacau em pó 100%',
              '2 colheres de sopa de creme de leite',
              '1 pitada de canela em pó'
            ],
            preparo: [
              'Em fogo baixo, aqueça o leite e dissolva o cacau em pó com um fouet.',
              'Adicione o chocolate picado e mexa até derreter completamente e engrossar.',
              'Adicione o creme de leite e a canela, misture por mais 1 minuto sem ferver e sirva.'
            ],
            beneficios: 'Rico em antioxidantes do cacau, estimula a liberação de serotonina e proporciona sensação duradoura de acolhimento.'
          }
        ]
      });
    }

    return guides;
  }

  /**
   * Painel de Tendências de Moda e Cores por Estação / Temperatura
   */
  generateColorPalette(temp: number): ColorPaletteTrend {
    if (temp >= 24) {
      return {
        estacao: 'Tendência Verão & Clima Solar',
        sugestaoContexto: 'Tons claros, solares e refrescantes que refletem a luminosidade e trazem leveza visual ao look.',
        cores: [
          { nome: 'Azul Claro', hex: '#7dd3fc', descricao: 'Sensação de frescor e tranquilidade' },
          { nome: 'Bege Areia', hex: '#e2d9cc', descricao: 'Elegância neutra e atemporal' },
          { nome: 'Branco Puro', hex: '#ffffff', descricao: 'Máxima reflexão térmica e sofisticação' },
          { nome: 'Verde Oliva Claro', hex: '#84cc16', descricao: 'Toque natural e conexão botânica' },
          { nome: 'Coral Vibrante', hex: '#fb7185', descricao: 'Energia solar e destaque moderno' }
        ]
      };
    } else if (temp >= 20 && temp < 24) {
      return {
        estacao: 'Tendência Primavera & Clima Fresco',
        sugestaoContexto: 'Paleta floral e suave, equilibrando delicadeza com modernidade para os dias agradáveis.',
        cores: [
          { nome: 'Lavanda Suave', hex: '#c084fc', descricao: 'Toque elegante e poético' },
          { nome: 'Rosa Claro', hex: '#f472b6', descricao: 'Delicadeza e romantismo contemporâneo' },
          { nome: 'Verde Menta', hex: '#6ee7b7', descricao: 'Sensação botânica e revigorante' },
          { nome: 'Amarelo Manteiga', hex: '#fef08a', descricao: 'Luminosidade suave e acolhedora' },
          { nome: 'Pêssego Aveludado', hex: '#fdba74', descricao: 'Calor sutil e harmonia visual' }
        ]
      };
    } else if (temp >= 16 && temp < 20) {
      return {
        estacao: 'Tendência Outono & Meia-Estação',
        sugestaoContexto: 'Tons terrosos e quentes que transmitem solidez, estilo e sofisticação para temperaturas amenas.',
        cores: [
          { nome: 'Terracota', hex: '#c2410c', descricao: 'Riqueza terrosa e presença marcante' },
          { nome: 'Mostarda Vintage', hex: '#d97706', descricao: 'Acento acolhedor e expressivo' },
          { nome: 'Oliva Intenso', hex: '#4d7c0f', descricao: 'Militar chique e versatilidade' },
          { nome: 'Caramelo Toffee', hex: '#b45309', descricao: 'Neutro aquecido de alto requinte' },
          { nome: 'Âmbar Dourado', hex: '#f59e0b', descricao: 'Contraste iluminado e sofisticado' }
        ]
      };
    } else {
      return {
        estacao: 'Tendência Inverno & Clima Frio',
        sugestaoContexto: 'Cores profundas, sóbrias e imponentes, perfeitas para casacos encorpados, sobreposições e lãs.',
        cores: [
          { nome: 'Vinho Marsala / Bordô', hex: '#881337', descricao: 'Clássico sofisticado de alta costura' },
          { nome: 'Azul Marinho Deep', hex: '#1e3a8a', descricao: 'Elegância executiva e atemporal' },
          { nome: 'Grafite Carvão', hex: '#334155', descricao: 'Modernidade urbana e neutro essencial' },
          { nome: 'Verde Escuro Floresta', hex: '#14532d', descricao: 'Profundidade orgânica e nobreza' },
          { nome: 'Marrom Café', hex: '#451a03', descricao: 'Calor robusto e sobriedade refinada' }
        ]
      };
    }
  }

  /**
   * Converte graus em ponto cardeal
   */
  getWindDirection(deg: number): string {
    const directions = [
      'Norte (N)',
      'Nordeste (NE)',
      'Leste (L)',
      'Sudeste (SE)',
      'Sul (S)',
      'Sudoeste (SO)',
      'Oeste (O)',
      'Noroeste (NO)'
    ];
    const index = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
    return directions[index];
  }

  /**
   * Retorna URL do ícone de clima oficial
   */
  getWeatherIconUrl(iconCode: string, size: '2x' | '4x' = '2x'): string {
    if (!iconCode) return '';
    return `https://openweathermap.org/img/wn/${iconCode}@${size}.png`;
  }
}
