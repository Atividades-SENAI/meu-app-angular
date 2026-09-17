import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import 'dotenv/config';

const browserDistFolder = join(import.meta.dirname, '../browser');
const openWeatherApiKey = process.env['OPENWEATHER_API_KEY'];

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * OpenWeather proxy endpoints to keep the API key server-side.
 */
const weatherBaseUrl = 'https://api.openweathermap.org/data/2.5';
const geoBaseUrl = 'https://api.openweathermap.org/geo/1.0';

const addApiKey = (url: URL) => {
  url.searchParams.set('appid', openWeatherApiKey ?? '');
  return url;
};

const fetchOpenWeather = async (url: URL, res: express.Response) => {
  if (!openWeatherApiKey) {
    res.status(500).json({ error: 'OPENWEATHER_API_KEY is not configured on the server.' });
    return;
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const payload = await response.text();
  try {
    const data = JSON.parse(payload);
    res.status(response.status).json(data);
  } catch {
    res.status(response.status).send(payload);
  }
};

app.get('/api/weather', async (req, res) => {
  const city = req.query['city'];
  if (!city || typeof city !== 'string') {
    res.status(400).json({ error: 'city is required' });
    return;
  }

  const url = addApiKey(new URL(`${weatherBaseUrl}/weather`));
  url.searchParams.set('q', city);
  url.searchParams.set('units', 'metric');
  url.searchParams.set('lang', 'pt_br');
  await fetchOpenWeather(url, res);
});

app.get('/api/forecast', async (req, res) => {
  const city = req.query['city'];
  if (!city || typeof city !== 'string') {
    res.status(400).json({ error: 'city is required' });
    return;
  }

  const url = addApiKey(new URL(`${weatherBaseUrl}/forecast`));
  url.searchParams.set('q', city);
  url.searchParams.set('units', 'metric');
  url.searchParams.set('lang', 'pt_br');
  await fetchOpenWeather(url, res);
});

app.get('/api/weather/coords', async (req, res) => {
  const lat = req.query['lat'];
  const lon = req.query['lon'];
  if (lat === undefined || lon === undefined) {
    res.status(400).json({ error: 'lat and lon are required' });
    return;
  }

  const url = addApiKey(new URL(`${weatherBaseUrl}/weather`));
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('units', 'metric');
  url.searchParams.set('lang', 'pt_br');
  await fetchOpenWeather(url, res);
});

app.get('/api/forecast/coords', async (req, res) => {
  const lat = req.query['lat'];
  const lon = req.query['lon'];
  if (lat === undefined || lon === undefined) {
    res.status(400).json({ error: 'lat and lon are required' });
    return;
  }

  const url = addApiKey(new URL(`${weatherBaseUrl}/forecast`));
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('units', 'metric');
  url.searchParams.set('lang', 'pt_br');
  await fetchOpenWeather(url, res);
});

app.get('/api/air-pollution', async (req, res) => {
  const lat = req.query['lat'];
  const lon = req.query['lon'];
  if (lat === undefined || lon === undefined) {
    res.status(400).json({ error: 'lat and lon are required' });
    return;
  }

  const url = addApiKey(new URL(`${weatherBaseUrl}/air_pollution`));
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  await fetchOpenWeather(url, res);
});

app.get('/api/geocoding/reverse', async (req, res) => {
  const lat = req.query['lat'];
  const lon = req.query['lon'];
  if (lat === undefined || lon === undefined) {
    res.status(400).json({ error: 'lat and lon are required' });
    return;
  }

  const url = addApiKey(new URL(`${geoBaseUrl}/reverse`));
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('limit', '1');
  await fetchOpenWeather(url, res);
});

app.get('/api/datetime', (_req, res) => {
  const now = new Date();

  res.json({
    iso: now.toISOString(),
    datetime: now.toLocaleString('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    unix: Math.floor(now.getTime() / 1000),
  });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
