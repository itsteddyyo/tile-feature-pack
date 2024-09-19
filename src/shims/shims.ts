declare global {
    interface Window {
        loadCardHelpers: Function;
        customTileFeatures: Array<Record<string, any>>;
    }
    //@ts-ignore
    interface CustomEvent extends CustomEvent {
        target: EventTarget & {
            getAttribute: Function;
        };
    }
}

export {};
