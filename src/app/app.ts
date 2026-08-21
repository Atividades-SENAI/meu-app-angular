import { Component, OnInit, inject, PLATFORM_ID, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeatherService } from './services/weather.service';
import {
  WeatherResponse,
  ForecastResponse,
  DailyForecast,
  HourlyForecast,
  AirQualityInfo,
  UvIndexInfo,
  ClothingRecommendation,
  ActivityRecommendation,
  CareGuide,
  ColorPaletteTrend
} from './models/weather.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private weatherService = inject(WeatherService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  isBrowser = isPlatformBrowser(this.platformId);

  // Busca e Histórico
  cidade: string = '';
  cidadesSugeridas: string[] = [
    'São Paulo',
    'Rio de Janeiro',
    'Brasília',
    'Curitiba',
    'Salvador',
    'Belo Horizonte',
    'Porto Alegre',
    'Recife',
    'Lisboa',
    'Nova York'
  ];
  historicoBuscas: string[] = [];

  // Placeholders para manter painéis visíveis
  placeholderHoras: string[] = ['+3h', '+6h', '+9h', '+12h', '+15h', '+18h', '+21h', '+24h'];
  placeholderDias: string[] = ['Hoje', 'Amanhã', 'Em 2 dias', 'Em 3 dias', 'Em 4 dias'];

  // Dados Meteorológicos
  dadosClima: WeatherResponse | null = null;
  dadosForecast: ForecastResponse | null = null;
  previsaoDiaria: DailyForecast[] = [];
  previsaoHoraria: HourlyForecast[] = [];
  alertaChuvaHoraria: boolean = false;
  qualidadeAr: AirQualityInfo | null = null;
  indiceUv: UvIndexInfo | null = null;

  // Painéis Inteligentes
  recomendacaoRoupas: ClothingRecommendation | null = null;
  recomendacaoAtividades: ActivityRecommendation | null = null;
  guiasCuidados: CareGuide[] = [];
  paletaTendencia: ColorPaletteTrend | null = null;

  // Estados de Interface e Controle
  carregando: boolean = false;
  carregandoGeoloc: boolean = false;
  erroMensagem: string = '';
  isDarkMode: boolean = false;
  autoThemeAviso: string = '';
  private timerAutoTheme: any = null;
  private timerRelogio: any = null;
  horaAtualFormatada: string = '';
  dataAtualFormatada: string = '';

  // Informações Formatadas
  nascerDoSol: string = '--:--';
  porDoSol: string = '--:--';
  direcaoVento: string = '--';
  classificacaoUmidade: { texto: string; cor: string } = { texto: 'Normal', cor: 'var(--accent-green)' };
  classificacaoVisibilidade: string = 'Boa';

  ngOnInit(): void {
    if (this.isBrowser) {
      this.carregarTemaSalvo();
      this.carregarHistorico();
      this.iniciarRelogio();

      // 1. Ao abrir o site, solicitar imediatamente a localização do usuário (Geolocation API)
      this.solicitarLocalizacaoInicial();
    }
  }

  ngOnDestroy(): void {
    if (this.timerRelogio) clearInterval(this.timerRelogio);
    if (this.timerAutoTheme) clearTimeout(this.timerAutoTheme);
  }

  private iniciarRelogio(): void {
    const atualizar = () => {
      const agora = new Date();
      this.horaAtualFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.dataAtualFormatada = agora.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      this.cdr.detectChanges();
    };
    atualizar();
    this.timerRelogio = setInterval(atualizar, 1000);
  }

  toggleDarkMode(): void {
    if (!this.isBrowser) return;
    this.aplicarTema(!this.isDarkMode, false);
  }

  private aplicarTema(dark: boolean, isAuto: boolean = false, motivo: string = ''): void {
    this.isDarkMode = dark;
    if (this.isBrowser) {
      if (dark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('darkMode', 'false');
      }

      if (isAuto && motivo) {
        this.autoThemeAviso = motivo;
        if (this.timerAutoTheme) clearTimeout(this.timerAutoTheme);
        this.timerAutoTheme = setTimeout(() => {
          this.autoThemeAviso = '';
          this.cdr.detectChanges();
        }, 5000);
      }
    }
    this.cdr.detectChanges();
  }

  private carregarTemaSalvo(): void {
    if (this.isBrowser) {
      const salvo = localStorage.getItem('darkMode');
      if (salvo !== null) {
        this.aplicarTema(salvo === 'true');
      } else {
        const prefereDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.aplicarTema(prefereDark);
      }
    }
  }

  /**
   * 5. Após cada pesquisa, recalcula imediatamente o tema:
   * - 20°C ou mais -> Light
   * - abaixo de 20°C -> Dark
   */
  private avaliarMudancaAutomaticaTema(temperatura: number): void {
    if (temperatura >= 20) {
      this.aplicarTema(false, true, `Temperatura de ${Math.round(temperatura)}°C (20°C ou mais): Modo Claro ativado.`);
    } else {
      this.aplicarTema(true, true, `Temperatura de ${Math.round(temperatura)}°C (abaixo de 20°C): Modo Escuro ativado.`);
    }
  }

  /**
   * Solicita localização via Geolocation API imediatamente
   */
  solicitarLocalizacaoInicial(): void {
    if (!this.isBrowser || !navigator.geolocation) {
      this.carregando = false;
      this.carregandoGeoloc = false;
      this.verificarFallbackSalvoOuAviso();
      return;
    }

    this.carregandoGeoloc = true;
    this.carregando = true;
    this.erroMensagem = '';
    this.cdr.detectChanges();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.ngZone.run(() => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          this.executarBuscaPorCoords(lat, lon);
        });
      },
      (erro) => {
        this.ngZone.run(() => {
          this.carregando = false;
          this.carregandoGeoloc = false;
          this.erroMensagem = 'Permita o acesso à localização ou pesquise uma cidade.';
          this.verificarFallbackSalvoOuAviso();
        });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  /**
   * 7. Fallback para reutilizar última cidade e/ou coordenadas salvas no LocalStorage
   */
  private verificarFallbackSalvoOuAviso(): void {
    if (!this.isBrowser) return;

    const coordsSalvas = localStorage.getItem('clima_ultimas_coords');
    const cidadeSalva = localStorage.getItem('clima_ultima_cidade');

    if (coordsSalvas) {
      try {
        const { lat, lon } = JSON.parse(coordsSalvas);
        if (lat !== undefined && lon !== undefined) {
          this.executarBuscaPorCoords(lat, lon);
          return;
        }
      } catch {}
    }

    if (cidadeSalva) {
      this.buscarClima(cidadeSalva);
      return;
    }

    this.cdr.detectChanges();
  }

  buscarClima(cidadeParam?: string): void {
    const termo = (cidadeParam || this.cidade || '').trim();

    if (!termo) {
      this.erroMensagem = 'Por favor, digite o nome de uma cidade para pesquisar.';
      this.cdr.detectChanges();
      return;
    }

    this.carregando = true;
    this.erroMensagem = '';
    this.cidade = termo;
    this.cdr.detectChanges();

    this.weatherService.getWeatherByCity(termo).subscribe({
      next: (dados) => {
        this.processarDadosClima(dados);
        this.salvarUltimaCidade(dados.name, dados.coord ? { lat: dados.coord.lat, lon: dados.coord.lon } : undefined);

        // Buscar estado através de geocoding reverso
        if (dados.coord) {
          this.weatherService.getGeocodingReverse(dados.coord.lat, dados.coord.lon).subscribe((estado) => {
            if (this.dadosClima) {
              this.dadosClima.estado = estado;
            }
            this.cdr.detectChanges();
          });

          // Buscar qualidade do ar
          this.weatherService.getAirPollution(dados.coord.lat, dados.coord.lon).subscribe((airRes) => {
            this.qualidadeAr = this.weatherService.processAirQuality(airRes);
            this.cdr.detectChanges();
          });
        }

        // Buscar previsão horária e diária
        this.weatherService.getForecastByCity(termo).subscribe({
          next: (forecast) => {
            this.processarDadosForecast(forecast);
            this.carregando = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.warn('Erro ao carregar previsão de 5 dias:', err);
            this.carregando = false;
            this.cdr.detectChanges();
          }
        });
        this.cdr.detectChanges();
      },
      error: (erro) => {
        this.carregando = false;
        console.error('Erro na requisição:', erro);
        if (erro.status === 404) {
          this.erroMensagem = `A cidade "${termo}" não foi encontrada. Verifique a ortografia e tente novamente.`;
        } else {
          this.erroMensagem = 'Falha na conexão com o serviço de meteorologia. Verifique sua rede e tente novamente.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  buscarPorLocalizacao(): void {
    this.solicitarLocalizacaoInicial();
  }

  private executarBuscaPorCoords(lat: number, lon: number): void {
    this.carregando = true;
    this.carregandoGeoloc = true;
    this.erroMensagem = '';
    this.cdr.detectChanges();

    this.weatherService.getWeatherByCoords(lat, lon).subscribe({
      next: (dados) => {
        this.cidade = dados.name;
        this.processarDadosClima(dados);
        this.salvarUltimaCidade(dados.name, { lat, lon });

        // Geocoding reverso para estado
        this.weatherService.getGeocodingReverse(lat, lon).subscribe((estado) => {
          if (this.dadosClima) {
            this.dadosClima.estado = estado;
          }
          this.cdr.detectChanges();
        });

        // Qualidade do ar
        this.weatherService.getAirPollution(lat, lon).subscribe((airRes) => {
          this.qualidadeAr = this.weatherService.processAirQuality(airRes);
          this.cdr.detectChanges();
        });

        this.weatherService.getForecastByCoords(lat, lon).subscribe({
          next: (forecast) => {
            this.processarDadosForecast(forecast);
            this.carregando = false;
            this.carregandoGeoloc = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.warn('Erro ao carregar previsão:', err);
            this.carregando = false;
            this.carregandoGeoloc = false;
            this.cdr.detectChanges();
          }
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.carregando = false;
        this.carregandoGeoloc = false;
        this.erroMensagem = 'Permita o acesso à localização ou pesquise uma cidade.';
        this.cdr.detectChanges();
      }
    });
  }

  private processarDadosClima(dados: WeatherResponse): void {
    this.dadosClima = dados;
    const temp = dados.main.temp;
    const conditionId = dados.weather[0]?.id || 800;
    const clouds = dados.clouds.all;

    // 5. Avaliação e recálculo automático do tema (>= 20°C Light, < 20°C Dark)
    this.avaliarMudancaAutomaticaTema(temp);

    // Calcular Índice UV
    this.indiceUv = this.weatherService.calculateUVIndex(dados.coord.lat, clouds, temp);

    // Gerar Recomendações Inteligentes de Roupas e Tecidos
    this.recomendacaoRoupas = this.weatherService.generateClothingRecommendation(temp);

    // Gerar Atividades Recomendadas (Passeios)
    this.recomendacaoAtividades = this.weatherService.generateActivityRecommendations(temp, conditionId, clouds);

    // Gerar Painel de Cuidados (Protetor solar, Manteiga de cacau, Bebidas quentes)
    this.guiasCuidados = this.weatherService.generateCareGuides(temp, this.indiceUv, conditionId);

    // Gerar Paleta de Tendências de Moda & Cores
    this.paletaTendencia = this.weatherService.generateColorPalette(temp);

    // Nascer e Pôr do Sol
    if (dados.sys) {
      this.nascerDoSol = this.formatarHoraComTimezone(dados.sys.sunrise, dados.timezone);
      this.porDoSol = this.formatarHoraComTimezone(dados.sys.sunset, dados.timezone);
    }

    // Vento
    this.direcaoVento = this.weatherService.getWindDirection(dados.wind.deg);

    // Umidade
    const umid = dados.main.humidity;
    if (umid < 30) {
      this.classificacaoUmidade = { texto: 'Muito Seco', cor: 'var(--accent-red)' };
    } else if (umid <= 60) {
      this.classificacaoUmidade = { texto: 'Ideal / Confortável', cor: 'var(--accent-green)' };
    } else if (umid <= 80) {
      this.classificacaoUmidade = { texto: 'Moderadamente Úmido', cor: 'var(--accent-cyan)' };
    } else {
      this.classificacaoUmidade = { texto: 'Muito Úmido', cor: 'var(--accent-purple)' };
    }

    // Visibilidade
    const visKm = dados.visibility / 1000;
    if (visKm >= 10) {
      this.classificacaoVisibilidade = 'Excelente (> 10 km)';
    } else if (visKm >= 5) {
      this.classificacaoVisibilidade = 'Boa (5 a 10 km)';
    } else if (visKm >= 2) {
      this.classificacaoVisibilidade = 'Moderada (2 a 5 km)';
    } else {
      this.classificacaoVisibilidade = 'Reduzida / Neblina (< 2 km)';
    }

    this.cdr.detectChanges();
  }

  private processarDadosForecast(forecast: ForecastResponse): void {
    this.dadosForecast = forecast;
    this.previsaoDiaria = this.weatherService.processDailyForecast(forecast);
    this.previsaoHoraria = this.weatherService.processHourlyForecast(forecast);

    // Checar se há previsão de chuva em qualquer um dos próximos horários
    this.alertaChuvaHoraria = this.previsaoHoraria.some((h) => h.isRain || h.rainProbability >= 40);
    this.cdr.detectChanges();
  }

  private formatarHoraComTimezone(unixTimestamp: number, timezoneOffsetSeconds: number): string {
    const utcDate = new Date(unixTimestamp * 1000);
    const localTimeMs = utcDate.getTime() + (timezoneOffsetSeconds * 1000) + (utcDate.getTimezoneOffset() * 60000);
    const targetDate = new Date(localTimeMs);
    const hh = targetDate.getHours().toString().padStart(2, '0');
    const mm = targetDate.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private carregarHistorico(): void {
    if (!this.isBrowser) return;
    try {
      const salvo = localStorage.getItem('clima_historico');
      if (salvo) {
        this.historicoBuscas = JSON.parse(salvo);
      }
    } catch {
      this.historicoBuscas = [];
    }
  }

  private salvarUltimaCidade(cidade: string, coords?: { lat: number; lon: number }): void {
    if (!this.isBrowser || !cidade) return;
    try {
      localStorage.setItem('clima_ultima_cidade', cidade);
      if (coords) {
        localStorage.setItem('clima_ultimas_coords', JSON.stringify(coords));
      }
      const filtrado = this.historicoBuscas.filter((item) => item.toLowerCase() !== cidade.toLowerCase());
      this.historicoBuscas = [cidade, ...filtrado].slice(0, 6);
      localStorage.setItem('clima_historico', JSON.stringify(this.historicoBuscas));
      this.cdr.detectChanges();
    } catch {}
  }

  removerDoHistorico(cidade: string, event: MouseEvent): void {
    event.stopPropagation();
    this.historicoBuscas = this.historicoBuscas.filter((c) => c !== cidade);
    if (this.isBrowser) {
      localStorage.setItem('clima_historico', JSON.stringify(this.historicoBuscas));
    }
    this.cdr.detectChanges();
  }

  obterIconeUrl(iconCode: string, size: '2x' | '4x' = '2x'): string {
    return this.weatherService.getWeatherIconUrl(iconCode, size);
  }
}