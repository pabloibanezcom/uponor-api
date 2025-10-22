const axios = require('axios');

class UponorClient {
  constructor(host) {
    this.endpoint = `http://${host}/JNAP/`;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Obtiene todos los datos del sistema Uponor
   */
  async getData() {
    try {
      const response = await axios({
        method: 'post',
        url: this.endpoint,
        headers: {
          ...this.headers,
          'x-jnap-action': 'http://phyn.com/jnap/uponorsky/GetAttributes'
        },
        data: {}
      });

      if (response.data.result !== 'OK') {
        throw new Error(`Error en respuesta Uponor: ${response.data.result}`);
      }

      // Convertir array de vars a objeto clave-valor para facilitar acceso
      const varsMap = {};
      response.data.output.vars.forEach(item => {
        varsMap[item.waspVarName] = item.waspVarValue;
      });

      return {
        raw: response.data,
        vars: varsMap
      };
    } catch (error) {
      throw new Error(`Error obteniendo datos de Uponor: ${error.message}`);
    }
  }

  /**
   * Establece valores en el sistema Uponor
   * @param {Array} vars - Array de objetos {waspVarName, waspVarValue}
   */
  async setData(vars) {
    try {
      const response = await axios({
        method: 'post',
        url: this.endpoint,
        headers: {
          ...this.headers,
          'x-jnap-action': 'http://phyn.com/jnap/uponorsky/SetAttributes'
        },
        data: { vars }
      });

      if (response.data.result !== 'OK') {
        throw new Error(`Error en respuesta Uponor: ${response.data.result}`);
      }

      return response.data;
    } catch (error) {
      throw new Error(`Error escribiendo datos a Uponor: ${error.message}`);
    }
  }

  /**
   * Obtiene lista de termostatos disponibles
   */
  async getThermostats() {
    const data = await this.getData();
    const thermostats = [];

    // Buscar controladores y termostatos presentes
    for (let c = 1; c <= 5; c++) {
      const controllerPresent = data.vars[`sys_controller_${c}_presence`];
      if (controllerPresent !== '1') continue;

      for (let t = 1; t <= 13; t++) {
        const thermostatPresent = data.vars[`C${c}_thermostat_${t}_presence`];
        if (thermostatPresent === '1') {
          const code = `C${c}_T${t}`;
          thermostats.push({
            code,
            id: data.vars[`C${c}_thermostat_${t}_id`],
            name: data.vars[`cust_${code}_name`],
            roomTemp: this.convertTemp(data.vars[`${code}_room_temperature`]),
            setpoint: this.convertTemp(data.vars[`${code}_setpoint`]),
            minTemp: this.convertTemp(data.vars[`${code}_minimum_setpoint`]),
            maxTemp: this.convertTemp(data.vars[`${code}_maximum_setpoint`]),
            active: data.vars[`${code}_stat_cb_actuator`] === '1'
          });
        }
      }
    }

    return thermostats;
  }

  /**
   * Convierte temperatura del formato Uponor a Celsius
   */
  convertTemp(uponorValue) {
    if (!uponorValue) return null;
    return ((parseInt(uponorValue) - 320) / 18).toFixed(1);
  }

  /**
   * Convierte temperatura de Celsius a formato Uponor
   */
  convertTempToUponor(celsius) {
    return Math.round(celsius * 18 + 320);
  }

  /**
   * Establece temperatura objetivo para un termostato
   */
  async setTemperature(thermostatCode, celsius) {
    const uponorValue = this.convertTempToUponor(celsius);
    return await this.setData([{
      waspVarName: `${thermostatCode}_setpoint`,
      waspVarValue: uponorValue.toString()
    }]);
  }

  /**
   * Obtiene modo de sistema (calor/frío)
   */
  async getSystemMode() {
    const data = await this.getData();
    return {
      isCooling: data.vars['sys_heat_cool_mode'] === '1',
      isAway: data.vars['sys_forced_eco_mode'] === '1'
    };
  }

  /**
   * Establece modo calor/frío (false = calor, true = frío)
   */
  async setCoolingMode(enabled) {
    return await this.setData([{
      waspVarName: 'sys_heat_cool_mode',
      waspVarValue: enabled ? '1' : '0'
    }]);
  }

  /**
   * Establece modo vacaciones/away
   */
  async setAwayMode(enabled) {
    return await this.setData([{
      waspVarName: 'sys_forced_eco_mode',
      waspVarValue: enabled ? '1' : '0'
    }]);
  }
}

module.exports = UponorClient;
