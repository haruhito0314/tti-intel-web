import '@testing-library/jest-dom/vitest';

function createMemoryStorage(): Storage {
    const values = new Map<string, string>();
    return {
        get length() { return values.size; },
        clear() { values.clear(); },
        getItem(key) { return values.get(key) ?? null; },
        key(index) { return [...values.keys()][index] ?? null; },
        removeItem(key) { values.delete(key); },
        setItem(key, value) { values.set(String(key), String(value)); },
    };
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
    if (typeof globalThis[name]?.clear !== 'function') {
        Object.defineProperty(globalThis, name, {
            configurable: true,
            value: createMemoryStorage(),
        });
    }
}

HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
};

HTMLDialogElement.prototype.close = function close() {
    this.open = false;
};
