import { HomeAssistant } from "custom-card-helpers";
import { EntityRegistryEntry } from "../homeassistant/entity_registry";
import { DeviceRegistryEntry } from "../homeassistant/device_registry";
import { AreaRegistryEntry } from "../homeassistant/area_registry";

export interface C_HomeAssistant extends HomeAssistant {
    entities: Record<string, EntityRegistryEntry>;
    devices: Record<string, DeviceRegistryEntry>;
    areas: Record<string, AreaRegistryEntry>;
}
