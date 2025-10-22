"""Climate platform for Uponor Smatrix."""
from __future__ import annotations

import logging
from typing import Any
import aiohttp

from homeassistant.components.climate import (
    ClimateEntity,
    ClimateEntityFeature,
    HVACMode,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_HOST, UnitOfTemperature
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import UponorDataUpdateCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Uponor climate entities."""
    coordinator: UponorDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]

    entities = []
    for thermostat in coordinator.data:
        entities.append(UponorClimate(coordinator, entry, thermostat))

    async_add_entities(entities)


class UponorClimate(CoordinatorEntity, ClimateEntity):
    """Representation of a Uponor thermostat."""

    _attr_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_supported_features = ClimateEntityFeature.TARGET_TEMPERATURE
    _attr_hvac_modes = [HVACMode.HEAT, HVACMode.COOL, HVACMode.OFF]
    _enable_turn_on_off_backwards_compatibility = False

    def __init__(
        self,
        coordinator: UponorDataUpdateCoordinator,
        entry: ConfigEntry,
        thermostat_data: dict,
    ) -> None:
        """Initialize the climate entity."""
        super().__init__(coordinator)
        self._thermostat_code = thermostat_data["code"]
        self._attr_unique_id = f"{entry.entry_id}_{self._thermostat_code}"
        self._attr_name = thermostat_data["name"]
        self._host = entry.data[CONF_HOST]
        self._session = aiohttp.ClientSession()

    @property
    def device_info(self):
        """Return device info."""
        return {
            "identifiers": {(DOMAIN, self._thermostat_code)},
            "name": self._attr_name,
            "manufacturer": "Uponor",
            "model": "Smatrix Pulse",
        }

    @property
    def _thermostat_data(self) -> dict:
        """Get current thermostat data from coordinator."""
        for thermostat in self.coordinator.data:
            if thermostat["code"] == self._thermostat_code:
                return thermostat
        return {}

    @property
    def current_temperature(self) -> float | None:
        """Return the current temperature."""
        return self._thermostat_data.get("currentTemperature")

    @property
    def target_temperature(self) -> float | None:
        """Return the target temperature."""
        return self._thermostat_data.get("targetTemperature")

    @property
    def hvac_mode(self) -> HVACMode:
        """Return current HVAC mode."""
        if not self._thermostat_data.get("active", True):
            return HVACMode.OFF

        mode = self._thermostat_data.get("mode", "heating")
        if mode == "heating":
            return HVACMode.HEAT
        elif mode == "cooling":
            return HVACMode.COOL
        return HVACMode.OFF

    async def async_set_temperature(self, **kwargs: Any) -> None:
        """Set new target temperature."""
        temperature = kwargs.get("temperature")
        if temperature is None:
            return

        try:
            async with self._session.post(
                f"http://{self._host}/api/thermostat/{self._thermostat_code}/temperature",
                json={"temperature": temperature},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    await self.coordinator.async_request_refresh()
                else:
                    _LOGGER.error(f"Failed to set temperature: {response.status}")
        except aiohttp.ClientError as err:
            _LOGGER.error(f"Error setting temperature: {err}")

    async def async_set_hvac_mode(self, hvac_mode: HVACMode) -> None:
        """Set new HVAC mode."""
        if hvac_mode == HVACMode.OFF:
            # Note: Uponor doesn't support turning off individual thermostats
            _LOGGER.warning("Turning off individual thermostats is not supported by Uponor")
            return

        mode_map = {
            HVACMode.HEAT: "heating",
            HVACMode.COOL: "cooling",
        }

        if hvac_mode not in mode_map:
            return

        try:
            async with self._session.post(
                f"http://{self._host}/api/system/mode",
                json={"mode": mode_map[hvac_mode]},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    await self.coordinator.async_request_refresh()
                else:
                    _LOGGER.error(f"Failed to set HVAC mode: {response.status}")
        except aiohttp.ClientError as err:
            _LOGGER.error(f"Error setting HVAC mode: {err}")

    async def async_will_remove_from_hass(self) -> None:
        """Clean up when entity is removed."""
        await self._session.close()
