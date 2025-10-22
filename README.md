# Uponor API REST

API REST para controlar sistemas Uponor Smatrix Pulse desde Postman o cualquier cliente HTTP.

## 🚀 Instalación

```bash
cd uponor-api
npm install
```

## ⚙️ Configuración

1. Copia el archivo de configuración:
```bash
cp .env.example .env
```

2. Edita `.env` y configura la IP de tu dispositivo Uponor:
```env
UPONOR_HOST=192.168.1.100  # Cambia por tu IP
PORT=3000
```

## 🏃 Ejecutar

### Modo desarrollo (con auto-reload):
```bash
npm run dev
```

### Modo producción:
```bash
npm start
```

La API estará disponible en `http://localhost:3000`

## 📡 Endpoints Disponibles

### Lectura de datos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/raw` | Datos completos raw del sistema |
| GET | `/api/thermostats` | Lista todos los termostatos |
| GET | `/api/thermostat/:code` | Info de un termostato (ej: `C1_T1`) |
| GET | `/api/system` | Estado del sistema (modo, away) |

### Control de termostatos

| Método | Endpoint | Body | Descripción |
|--------|----------|------|-------------|
| POST | `/api/thermostat/:code/temperature` | `{"temperature": 21.5}` | Cambia temperatura objetivo |

### Control del sistema

| Método | Endpoint | Body | Descripción |
|--------|----------|------|-------------|
| POST | `/api/system/mode` | `{"mode": "heating"}` o `"cooling"` | Cambia modo calor/frío |
| POST | `/api/system/away` | `{"enabled": true}` | Activa/desactiva modo vacaciones |

### Control avanzado

| Método | Endpoint | Body | Descripción |
|--------|----------|------|-------------|
| POST | `/api/raw/set` | `{"vars": [...]}` | Establece variables raw directamente |

## 📮 Importar en Postman

1. Abre Postman
2. Click en **Import**
3. Selecciona el archivo `Uponor_API.postman_collection.json`
4. La colección incluye todos los endpoints con ejemplos

## 📝 Ejemplos de uso

### Obtener lista de termostatos
```bash
curl http://localhost:3000/api/thermostats
```

### Cambiar temperatura a 21.5°C
```bash
curl -X POST http://localhost:3000/api/thermostat/C1_T1/temperature \
  -H "Content-Type: application/json" \
  -d '{"temperature": 21.5}'
```

### Cambiar a modo frío
```bash
curl -X POST http://localhost:3000/api/system/mode \
  -H "Content-Type: application/json" \
  -d '{"mode": "cooling"}'
```

### Activar modo vacaciones
```bash
curl -X POST http://localhost:3000/api/system/away \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

## 🔍 Códigos de termostato

Los termostatos se identifican con el formato `C{controlador}_T{termostato}`:
- `C1_T1` = Controlador 1, Termostato 1
- `C1_T2` = Controlador 1, Termostato 2
- `C2_T1` = Controlador 2, Termostato 1
- etc.

Para saber qué códigos están disponibles en tu instalación, llama a:
```bash
GET /api/thermostats
```

## 🌡️ Conversión de temperaturas

La API convierte automáticamente entre el formato interno de Uponor y Celsius:
- **Formato Uponor**: `(valor - 320) / 18 = °C`
- **Ejemplo**: valor `410` = `(410-320)/18 = 5°C`

## ⚠️ Limitaciones

- El sistema Uponor no permite apagar termostatos individualmente
- El modo calor/frío es global para todo el sistema
- Cache de 1 segundo en el dispositivo puede causar delay en actualizaciones

## 🛠️ Tecnologías

- Node.js + Express
- Axios para HTTP
- CORS habilitado
