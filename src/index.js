require('dotenv').config();
const express = require('express');
const cors = require('cors');
const UponorClient = require('./uponorClient');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración - Cambia esta IP por la de tu dispositivo Uponor
const UPONOR_HOST = process.env.UPONOR_HOST || '192.168.1.100';
const uponor = new UponorClient(UPONOR_HOST);

// ============ ENDPOINTS DE LECTURA ============

/**
 * GET / - Health check
 */
app.get('/', (req, res) => {
  res.json({
    service: 'Uponor API',
    version: '1.0.0',
    status: 'running',
    uponorHost: UPONOR_HOST
  });
});

/**
 * GET /api/raw - Obtiene datos raw completos del sistema
 */
app.get('/api/raw', async (req, res) => {
  try {
    const data = await uponor.getData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/thermostats - Lista todos los termostatos
 */
app.get('/api/thermostats', async (req, res) => {
  try {
    const thermostats = await uponor.getThermostats();
    res.json({
      count: thermostats.length,
      thermostats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/thermostat/:code - Obtiene info de un termostato específico
 * Ejemplo: /api/thermostat/C1_T1
 */
app.get('/api/thermostat/:code', async (req, res) => {
  try {
    const thermostats = await uponor.getThermostats();
    const thermostat = thermostats.find(t => t.code === req.params.code);

    if (!thermostat) {
      return res.status(404).json({ error: 'Termostato no encontrado' });
    }

    res.json(thermostat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/system - Obtiene estado del sistema (modo calor/frío, away)
 */
app.get('/api/system', async (req, res) => {
  try {
    const mode = await uponor.getSystemMode();
    res.json({
      mode: mode.isCooling ? 'cooling' : 'heating',
      isCooling: mode.isCooling,
      isAway: mode.isAway
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ENDPOINTS DE ESCRITURA ============

/**
 * POST /api/thermostat/:code/temperature
 * Body: { "temperature": 21.5 }
 */
app.post('/api/thermostat/:code/temperature', async (req, res) => {
  try {
    const { temperature } = req.body;

    if (!temperature || isNaN(temperature)) {
      return res.status(400).json({ error: 'Temperatura inválida' });
    }

    await uponor.setTemperature(req.params.code, parseFloat(temperature));

    res.json({
      success: true,
      message: `Temperatura establecida a ${temperature}°C para ${req.params.code}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/system/mode
 * Body: { "mode": "cooling" } o { "mode": "heating" }
 */
app.post('/api/system/mode', async (req, res) => {
  try {
    const { mode } = req.body;

    if (!mode || !['heating', 'cooling'].includes(mode)) {
      return res.status(400).json({ error: 'Modo inválido. Use "heating" o "cooling"' });
    }

    const isCooling = mode === 'cooling';
    await uponor.setCoolingMode(isCooling);

    res.json({
      success: true,
      message: `Modo cambiado a ${mode}`,
      mode
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/system/away
 * Body: { "enabled": true } o { "enabled": false }
 */
app.post('/api/system/away', async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'El campo "enabled" debe ser true o false' });
    }

    await uponor.setAwayMode(enabled);

    res.json({
      success: true,
      message: `Modo vacaciones ${enabled ? 'activado' : 'desactivado'}`,
      enabled
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/raw/set - Endpoint avanzado para establecer variables raw
 * Body: { "vars": [{"waspVarName": "...", "waspVarValue": "..."}] }
 */
app.post('/api/raw/set', async (req, res) => {
  try {
    const { vars } = req.body;

    if (!vars || !Array.isArray(vars)) {
      return res.status(400).json({ error: 'Formato inválido. Se requiere array "vars"' });
    }

    const result = await uponor.setData(vars);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Uponor API escuchando en http://localhost:${PORT}`);
  console.log(`📡 Conectado a Uponor en: ${UPONOR_HOST}`);
  console.log('\n📚 Endpoints disponibles:');
  console.log('  GET  /api/raw - Datos completos raw');
  console.log('  GET  /api/thermostats - Lista de termostatos');
  console.log('  GET  /api/thermostat/:code - Info de termostato específico');
  console.log('  GET  /api/system - Estado del sistema');
  console.log('  POST /api/thermostat/:code/temperature - Cambiar temperatura');
  console.log('  POST /api/system/mode - Cambiar modo heating/cooling');
  console.log('  POST /api/system/away - Activar/desactivar modo vacaciones');
  console.log('  POST /api/raw/set - Establecer variables raw');
});
