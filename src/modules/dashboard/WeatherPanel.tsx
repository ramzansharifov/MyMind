import { useEffect, useState } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Loader2,
  MapPin,
  Search,
  Settings,
  Sun,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import { useI18n } from '../../shared/i18n/I18nProvider';
import { LoadingState } from '../../shared/components/LoadingState';
import { Tooltip } from '../../shared/components/Tooltip';
import type { AppSettings } from '../../shared/types/common';

interface WeatherPanelProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => Promise<void>;
}

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface CurrentWeatherData {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  weather_code: number;
  wind_speed_10m: number;
}

interface DailyWeatherData {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

interface ForecastResponse {
  current: CurrentWeatherData;
  daily: DailyWeatherData;
}

interface CacheData {
  timestamp: number;
  latLonKey: string;
  data: ForecastResponse;
}

export function WeatherPanel({ settings, onSettingsChange }: WeatherPanelProps) {
  const { t, language } = useI18n();
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);

  const city = settings.weatherCity;

  // Search for cities via Geocoding API
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingApi(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const lang = language === 'ru' ? 'ru' : 'en';
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          searchQuery
        )}&count=5&language=${lang}&format=json`
      );
      if (!response.ok) {
        throw new Error('Geocoding search failed');
      }
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchError(t('No cities found'));
      }
    } catch (err) {
      console.error(err);
      setSearchError(language === 'ru' ? 'Не удалось выполнить поиск. Попробуйте еще раз.' : 'Search failed. Please try again.');
    } finally {
      setIsSearchingApi(false);
    }
  };

  // Select a city and save it to app settings
  const handleSelectCity = async (selected: GeocodingResult) => {
    const weatherCity = {
      name: selected.name,
      latitude: selected.latitude,
      longitude: selected.longitude,
      country: selected.country || selected.admin1 || '',
    };
    await onSettingsChange({
      ...settings,
      weatherCity,
    });
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Fetch forecast data
  useEffect(() => {
    if (!city) {
      setForecastData(null);
      return;
    }

    const fetchForecast = async () => {
      const latLonKey = `${city.latitude.toFixed(4)},${city.longitude.toFixed(4)}`;
      
      // Check cache first
      try {
        const cached = localStorage.getItem('mymind_weather_cache');
        if (cached) {
          const cacheParsed: CacheData = JSON.parse(cached);
          const isFresh = Date.now() - cacheParsed.timestamp < 15 * 60 * 1000; // 15 mins cache
          const isSameCity = cacheParsed.latLonKey === latLonKey;
          if (isFresh && isSameCity) {
            setForecastData(cacheParsed.data);
            setForecastError('');
            return;
          }
        }
      } catch (e) {
        console.error('Failed to parse weather cache', e);
      }

      setIsLoadingForecast(true);
      setForecastError('');

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        if (!response.ok) {
          throw new Error('Weather forecast fetch failed');
        }
        const data: ForecastResponse = await response.json();
        setForecastData(data);
        
        // Save to cache
        const cacheObj: CacheData = {
          timestamp: Date.now(),
          latLonKey,
          data,
        };
        localStorage.setItem('mymind_weather_cache', JSON.stringify(cacheObj));
      } catch (err) {
        console.error(err);
        setForecastError(
          language === 'ru'
            ? 'Не удалось загрузить данные о погоде.'
            : 'Failed to load weather data.'
        );
      } finally {
        setIsLoadingForecast(false);
      }
    };

    void fetchForecast();
  }, [city, language]);

  // Weather codes mapping to Icons and Text
  const getWeatherInfo = (code: number) => {
    switch (code) {
      case 0:
        return {
          icon: Sun,
          text: language === 'ru' ? 'Ясно' : 'Clear',
        };
      case 1:
      case 2:
        return {
          icon: CloudSun,
          text: language === 'ru' ? 'Переменная облачность' : 'Partly cloudy',
        };
      case 3:
        return {
          icon: Cloud,
          text: language === 'ru' ? 'Пасмурно' : 'Overcast',
        };
      case 45:
      case 48:
        return {
          icon: CloudFog,
          text: language === 'ru' ? 'Туман' : 'Fog',
        };
      case 51:
      case 53:
      case 55:
      case 56:
      case 57:
        return {
          icon: CloudDrizzle,
          text: language === 'ru' ? 'Морось' : 'Drizzle',
        };
      case 61:
      case 63:
      case 65:
      case 66:
      case 67:
        return {
          icon: CloudRain,
          text: language === 'ru' ? 'Дождь' : 'Rain',
        };
      case 71:
      case 73:
      case 75:
      case 77:
        return {
          icon: CloudSnow,
          text: language === 'ru' ? 'Снег' : 'Snow',
        };
      case 80:
      case 81:
      case 82:
        return {
          icon: CloudRain,
          text: language === 'ru' ? 'Ливень' : 'Showers',
        };
      case 85:
      case 86:
        return {
          icon: CloudSnow,
          text: language === 'ru' ? 'Ливневый снегопад' : 'Snow showers',
        };
      case 95:
      case 96:
      case 99:
        return {
          icon: CloudLightning,
          text: language === 'ru' ? 'Гроза' : 'Thunderstorm',
        };
      default:
        return {
          icon: Cloud,
          text: language === 'ru' ? 'Пасмурно' : 'Overcast',
        };
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short' };
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', options);
  };

  // Rendering setup screen
  if (!city || isSearching) {
    return (
      <section className="panel weather-panel">
        <div className="weather-header">
          <h3>
            <MapPin size={18} aria-hidden="true" />
            {t('Configure Weather')}
          </h3>
          {city && (
            <button
              className="icon-button ghost"
              type="button"
              onClick={() => setIsSearching(false)}
              aria-label={t('Close')}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="weather-setup">
          <p>{t('Enter city name')}:</p>
          <form onSubmit={handleSearch} className="weather-search-box">
            <input
              type="text"
              placeholder={t('Search city...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-input"
              required
            />
            <button className="button primary" type="submit" disabled={isSearchingApi}>
              {isSearchingApi ? <Loader2 size={16} className="weather-spinner" /> : <Search size={16} />}
              <span>{t('Search')}</span>
            </button>
          </form>

          {searchError && <p className="muted-text">{searchError}</p>}

          {searchResults.length > 0 && (
            <div className="weather-search-results-list">
              <p>{t('Select your city')}:</p>
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  className="weather-search-result-item"
                  type="button"
                  onClick={() => void handleSelectCity(res)}
                >
                  <strong>{res.name}</strong>
                  <span>{res.country ? `${res.admin1 ? `${res.admin1}, ` : ''}${res.country}` : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  // Rendering error screen
  if (forecastError) {
    return (
      <section className="panel weather-panel">
        <div className="weather-header">
          <h3>
            <MapPin size={18} aria-hidden="true" />
            {city.name}
          </h3>
          <Tooltip content={t('Change city')} position="bottom-end">
            <button
              className="icon-button ghost"
              type="button"
              aria-label={t('Change city')}
              onClick={() => setIsSearching(true)}
            >
              <Settings size={16} />
            </button>
          </Tooltip>
        </div>
        <div className="stack">
          <p className="muted-text">{forecastError}</p>
          <button className="button" type="button" onClick={() => setIsSearching(true)}>
            {t('Change city')}
          </button>
        </div>
      </section>
    );
  }

  // Rendering loading state
  if (isLoadingForecast || !forecastData) {
    return (
      <section className="panel weather-panel">
        <div className="weather-header">
          <h3>
            <MapPin size={18} aria-hidden="true" />
            {city.name}
          </h3>
        </div>
        <LoadingState title={t('Loading weather...')} message={t('Preparing forecast for your dashboard.')} variant="compact" />
      </section>
    );
  }

  const current = forecastData.current;
  const daily = forecastData.daily;
  const currentInfo = getWeatherInfo(current.weather_code);
  const CurrentIcon = currentInfo.icon;

  return (
    <section className="panel weather-panel">
      <div className="weather-header">
        <h3>
          <MapPin size={16} aria-hidden="true" />
          <span>{city.name}</span>
        </h3>
        <Tooltip content={t('Change city')} position="bottom-end">
          <button
            className="icon-button ghost"
            type="button"
            aria-label={t('Change city')}
            onClick={() => setIsSearching(true)}
          >
            <Settings size={15} />
          </button>
        </Tooltip>
      </div>

      <div className="weather-grid">
        {/* Current Weather Card */}
        <div className="weather-current">
          <CurrentIcon size={44} className="weather-icon-large" aria-hidden="true" />
          <div className="weather-current-temp-block">
            <span className="weather-current-temp">{Math.round(current.temperature_2m)}°C</span>
            <span className="weather-current-condition">{currentInfo.text}</span>
            {city.country && <span className="weather-current-city">{city.country}</span>}
          </div>
        </div>

        {/* Current Details */}
        <div className="weather-details-grid">
          <div className="weather-detail-card">
            <Thermometer size={16} aria-hidden="true" />
            <span>{t('Feels like')}</span>
            <strong>{Math.round(current.apparent_temperature)}°C</strong>
          </div>
          <div className="weather-detail-card">
            <Wind size={16} aria-hidden="true" />
            <span>{t('Wind')}</span>
            <strong>{Math.round(current.wind_speed_10m)} {language === 'ru' ? 'км/ч' : 'km/h'}</strong>
          </div>
          <div className="weather-detail-card">
            <Droplets size={16} aria-hidden="true" />
            <span>{t('Humidity')}</span>
            <strong>{current.relative_humidity_2m}%</strong>
          </div>
        </div>

        {/* 5-day Forecast list */}
        <div className="weather-forecast-list">
          {daily.time.slice(0, 5).map((date, idx) => {
            const dayCode = daily.weather_code[idx];
            const dayInfo = getWeatherInfo(dayCode);
            const DayIcon = dayInfo.icon;
            return (
              <div key={date} className="weather-forecast-day">
                <span className="weather-forecast-day-name">{idx === 0 ? t('Today') : getDayName(date)}</span>
                <DayIcon size={20} style={{ color: 'var(--accent-strong)' }} aria-hidden="true" />
                <div className="weather-forecast-temp">
                  <span className="weather-forecast-max">{Math.round(daily.temperature_2m_max[idx])}°</span>
                  <span className="weather-forecast-min">{Math.round(daily.temperature_2m_min[idx])}°</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
