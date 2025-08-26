import { Component } from 'react';

export default new class AppManager extends Component {

    // Store everything inside "data"
    store = ({ data = {}, type = 'local' }) => {
        const storage = type === 'local' ? localStorage : sessionStorage;

        // Get existing data first
        let existing = storage.getItem('ollama_data');
        try {
            existing = existing ? JSON.parse(existing) : {};
        } catch {
            existing = {};
        }

        // Merge new data
        const updated = { ...existing, ...data };

        // Save back under "data"
        storage.setItem('ollama_data', JSON.stringify(updated));
    };

    // Retrieve keys from "data"
    get = ({ keys = [], type = 'local' }) => {
        const storage = type === 'local' ? localStorage : sessionStorage;

        let stored = storage.getItem('ollama_data');
        try {
            stored = stored ? JSON.parse(stored) : {};
        } catch {
            stored = {};
        }

        // Return only requested keys
        const result = {};
        keys.forEach((key) => {
            result[key] = stored[key];
        });
        return result;
    };

    // Clear keys from "data"
    clear = ({ keys = [], type = 'local' }) => {
        const storage = type === 'local' ? localStorage : sessionStorage;

        let stored = storage.getItem('ollama_data');
        try {
            stored = stored ? JSON.parse(stored) : {};
        } catch {
            stored = {};
        }

        keys.forEach((key) => {
            delete stored[key];
        });

        storage.setItem('ollama_data', JSON.stringify(stored));
    };
};
