import {
    LitElement,
    html,
    css,
    property,
} from "lit-element";
import {
    mdiLink,
    mdiLinkOff,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { EntityRegistryEntry } from "./homeassistant/entity_registry";
import { DeviceRegistryEntry } from "./homeassistant/device_registry";
import { C_HomeAssistant } from "./util/types";
import { notNil } from "./util/helper";

interface Config {
    type: "custom:multiroom-tile-feature";
    useAreaIcons: Boolean;
}

const supportsMultiroomTileFeature = (stateObj: HassEntity) => {
    const domain = stateObj.entity_id.split(".")[0];
    return (
        domain === "media_player" &&
        stateObj?.attributes?.mass_player_type == "sync_group"
    );
};

class MultiroomTileFeature extends LitElement {
    @property({ attribute: false }) hass!: C_HomeAssistant;
    @property({ attribute: false }) private config!: Config;
    @property({ attribute: false }) private stateObj!: HassEntity;

    constructor() {
        super();
    }

    static getStubConfig(): Config {
        return {
            type: "custom:multiroom-tile-feature",
            useAreaIcons: true,
        };
    }

    async setConfig(config: Config) {
        if (!config) {
            throw new Error("Invalid configuration");
        }
        if (!customElements.get("ha-control-switch")) {
            const cardHelpers = await window.loadCardHelpers();
            cardHelpers.importMoreInfoControl("switch");
        }
        this.config = config;
    }

    _pressOnOff(ev: CustomEvent<{ checked: boolean }>) {
        ev.stopPropagation();
        if (!ev.target) {
            throw Error("Target not set");
        }
        ev.detail.checked
        const player = ev.target.getAttribute("key");
        const checked = (ev.target as any).checked;
        if (checked) {
            this.hass.callService("media_player", "turn_on", {
                entity_id: player,
            });
        } else {
            this.hass.callService("media_player", "turn_off", {
                entity_id: player,
            });
        }
    }

    _pressLink(ev: CustomEvent<{ value: string }>) {
        ev.stopPropagation();
        const player = ev.target.getAttribute("key");
        const leader = ev.target.getAttribute("leader");
        const link = ev.detail.value;
        if (link == "unlink") {
            this.hass.callService("media_player", "unjoin", {
                entity_id: player,
            });
        } else {
            this.hass.callService("media_player", "join", {
                group_members: [player],
                entity_id: leader,
            });
        }
    }

    render() {
        if (
            !this.config ||
            !this.hass ||
            !this.stateObj ||
            !supportsMultiroomTileFeature(this.stateObj)
        ) {
            return null;
        }

        const getEntity = (entity_id: string) => {
            return this.hass.entities[entity_id];
        };

        const getDevice = (entity: EntityRegistryEntry) => {
            return Object.values(this.hass.devices).find(
                (device) => device.id == entity.device_id
            );
        };

        const getArea = (entity?: EntityRegistryEntry, device?: DeviceRegistryEntry) => {
            return Object.values(this.hass.areas).find(
                (area) => area.area_id == (entity?.area_id || device?.area_id)
            );
        };

        const group_member_ids: Array<string> = this.stateObj?.attributes?.group_members || [];

        const group_players = group_member_ids
            .map((id) => {
                const matchingEntitiesEntry = Object.entries(this.hass.states).find(
                    ([_entity_id, entity_state]) => {
                        if (!!entity_state?.attributes?.mass_player_id) {
                            return entity_state?.attributes?.mass_player_id == id;
                        } else {
                            return false;
                        }
                    }
                );
                return !!matchingEntitiesEntry ? matchingEntitiesEntry[0] : null;
            })
            .filter(notNil)
            .map(getEntity)
            .filter((entity) => !entity.disabled_by && !entity.hidden_by)
            .map((entity) => {
                const state = this.hass.states[entity.entity_id];
                const isGroupMember =
                    (state?.attributes?.group_members || []).length > 0;
                const isGroupLeader = isGroupMember && !state?.attributes?.group_leader;
                return {
                    ...entity,
                    _isGroupMember: isGroupMember,
                    _isGroupLeader: isGroupLeader,
                };
            });

        return html`
        <div>
          <ha-control-button-group>
            ${group_players.map((player) => {
            const entity = player;
            const device = getDevice(entity);
            const area = getArea(entity, device);
            const checked = this.hass.states[player.entity_id]?.state != 'off';
            return html`
                <ha-control-switch
                  key=${player.entity_id}
                  .checked=${checked}
                  @change=${this._pressOnOff}
                >
                  ${!!this.config.useAreaIcons && !!area
                    ? html`
                        <ha-icon 
                          slot="icon-on" 
                          .icon=${area.icon}
                        ></ha-icon>
                        <ha-icon 
                          slot="icon-off" 
                          .icon=${area.icon}
                        ></ha-icon>
                        `
                    : html`
                        <ha-state-icon
                          slot="icon-on"
                          .hass=${this.hass}
                          .stateObj=${this.hass.states[player.entity_id]}
                          .state=${this.hass.states[player.entity_id]}
                        ></ha-state-icon>
                        <ha-state-icon
                          slot="icon-off"
                          .hass=${this.hass}
                          .stateObj=${this.hass.states[player.entity_id]}
                          .state=${this.hass.states[player.entity_id]}
                        ></ha-state-icon>
                      `}
                </ha-control-switch>
              `;
        })}
          </ha-control-button-group>
          <ha-control-button-group>
            ${group_players.map((player) => {
            const options = [
                {
                    value: "link",
                    path: mdiLink,
                },
                {
                    value: "unlink",
                    path: mdiLinkOff,
                },
            ];
            const leader = group_players.find(
                (entity) => !!entity._isGroupLeader
            );
            const linked = player._isGroupMember ? "link" : "unlink";

            return html`
                <ha-control-select
                  class="item"
                  key=${player.entity_id}
                  leader=${leader?.entity_id}
                  @value-changed=${this._pressLink}
                  .options=${options}
                  .value=${linked}
                  .disabled=${player._isGroupLeader || !leader}
                >
                </ha-control-select>
              `;
        })}
          </ha-control-button-group>
        </div>
      `;
    }

    static get styles() {
        return css`
        ha-control-button-group {
          margin: 0 12px 12px 12px;
          --control-button-group-spacing: 12px;
        }
      `;
    }
}

customElements.define("multiroom-tile-feature", MultiroomTileFeature);

window.customTileFeatures = window.customTileFeatures || [];
window.customTileFeatures.push({
    type: "multiroom-tile-feature",
    name: "Multiroom",
    supported: supportsMultiroomTileFeature, // Optional
    configurable: true, // Optional - defaults to false
});
