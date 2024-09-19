import { LitElement, html, css, property } from "lit-element";
import { classMap } from "lit/directives/class-map.js";
import { mdiRestore } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { C_HomeAssistant } from "./util/types";
import "./homeassistant/ha-bar";

interface ConsumableConfig {
    title: string;
    sensorEntity: string;
    minValue?: number;
    maxValue?: number;
    resetEntity?: string;
}

interface Config {
    type: "custom:consumable-feature";
    config: ConsumableConfig;
}

const supportsConsumableFeature = (stateObj: HassEntity) => {
    const domain = stateObj.entity_id.split(".")[0];
    return domain === "vacuum";
};

class ConsumableFeature extends LitElement {
    @property({ attribute: false }) hass!: C_HomeAssistant;
    @property({ attribute: false }) private config!: Config;
    @property({ attribute: false }) private stateObj!: HassEntity;

    constructor() {
        super();
    }

    static getStubConfig(): Config {
        return {
            type: "custom:consumable-feature",
        } as any;
    }

    async setConfig(config: Config) {
        if (!config) {
            throw new Error("Invalid configuration");
        }
        if (!customElements.get("ha-gauge")) {
            const cardHelpers = await window.loadCardHelpers();
            cardHelpers.createCardElement({ type: "gauge" });
        }
        this.config = config;
    }

    _reset(ev: CustomEvent<{ value: string }>) {
        ev.stopPropagation();
        const button = ev.target.getAttribute("key");
        this.hass.callService("button", "press", {
            entity_id: button,
        });
    }

    render() {
        if (!this.config || !this.hass || !this.stateObj || !supportsConsumableFeature(this.stateObj)) {
            return null;
        }

        const minValue = this.config.config.minValue || 0;
        const maxValue = this.config.config.maxValue || 100;
        const currentValue = parseFloat(this.hass.states[this.config.config.sensorEntity].state);

        const warningValue = maxValue * 0.3;
        const errorValue = maxValue * 0.1;

        return html`
            <ha-control-button-group>
                <span class="secondary">${this.config.config.title}</span>
                <ha-bar
                    class=${classMap({
                        warning: currentValue < warningValue,
                        error: currentValue < errorValue,
                    })}
                    .value=${currentValue}
                    .min=${minValue}
                    .max=${maxValue}
                ></ha-bar>
                <ha-control-button
                    key=${this.config.config.resetEntity}
                    @click=${this._reset}
                    .disabled=${!this.config.config.resetEntity}
                    label="Reset"
                >
                    <ha-svg-icon path=${mdiRestore}></ha-svg-icon>
                </ha-control-button>
            </ha-control-button-group>
        `;
    }

    static get styles() {
        return css`
            ha-control-button-group {
                margin: 0 12px 12px 12px;
                --control-button-group-spacing: 12px;
            }
            .secondary {
                max-width: 200px;
                font-weight: 400;
                font-size: 12px;
                line-height: 16px;
                letter-spacing: 0.4px;
                color: var(--primary-text-color);
            }
        `;
    }
}

customElements.define("consumable-feature", ConsumableFeature);

window.customTileFeatures = window.customTileFeatures || [];
window.customTileFeatures.push({
    type: "consumable-feature",
    name: "Consumable",
    supported: supportsConsumableFeature, // Optional
    configurable: true, // Optional - defaults to false
});
