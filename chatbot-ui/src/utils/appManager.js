import { Component } from 'react';

export default new class AppManager extends Component {

    // --- Helpers ---
    parseData = (raw) => {
        try {
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    };

    // --- Cookie helpers ---
    setCookie = (name, value, days = 7) => {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
    };

    getCookie = (name) => {
        return document.cookie
            .split('; ')
            .find(row => row.startsWith(name + '='))?.split('=')[1];
    };

    deleteCookie = (name) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    };

    // --- Core storage: always save in all storages ---
    store = ({ data = {} }) => {
        // LocalStorage
        const localExisting = this.parseData(localStorage.getItem('ollama_data'));
        const localUpdated = { ...localExisting, ...data };
        localStorage.setItem('ollama_data', JSON.stringify(localUpdated));

        // SessionStorage
        const sessionExisting = this.parseData(sessionStorage.getItem('ollama_data'));
        const sessionUpdated = { ...sessionExisting, ...data };
        sessionStorage.setItem('ollama_data', JSON.stringify(sessionUpdated));

        // Cookie
        const cookieExisting = this.parseData(this.getCookie('ollama_data'));
        const cookieUpdated = { ...cookieExisting, ...data };
        this.setCookie('ollama_data', JSON.stringify(cookieUpdated));
    };

    // --- Retrieve from all storages (merge) ---
    get = ({ keys = [] }) => {
        const localData = this.parseData(localStorage.getItem('ollama_data'));
        const sessionData = this.parseData(sessionStorage.getItem('ollama_data'));
        const cookieData = this.parseData(this.getCookie('ollama_data'));

        // Merge priority: session > local > cookie
        const merged = { ...cookieData, ...localData, ...sessionData };

        const result = {};
        keys.forEach((key) => {
            if (merged[key] !== undefined) {
                result[key] = merged[key];
            }
        });

        return result;
    };

    // --- Clear keys from all storages ---
    clear = ({ keys = [] }) => {
        // Local
        const localData = this.parseData(localStorage.getItem('ollama_data'));
        keys.forEach((key) => delete localData[key]);
        localStorage.setItem('ollama_data', JSON.stringify(localData));

        // Session
        const sessionData = this.parseData(sessionStorage.getItem('ollama_data'));
        keys.forEach((key) => delete sessionData[key]);
        sessionStorage.setItem('ollama_data', JSON.stringify(sessionData));

        // Cookie
        const cookieData = this.parseData(this.getCookie('ollama_data'));
        keys.forEach((key) => delete cookieData[key]);
        this.setCookie('ollama_data', JSON.stringify(cookieData));
    };

    // --- Clear everything from all storages ---
    clearAll = () => {
        localStorage.removeItem('ollama_data');
        sessionStorage.removeItem('ollama_data');
        this.deleteCookie('ollama_data');
        console.log('All ollama_data cleared from localStorage, sessionStorage, and cookies');
    };

    // In AppManager class
    saveUserSession = ({ session_id, user_id, current_session, created_at }) => {
        try {
            const sessionData = { session_id, user_id, current_session, created_at };

            // Merge into localStorage
            const localExisting = this.parseData(localStorage.getItem('ollama_data'));
            const localUpdated = { ...localExisting, session: sessionData };
            localStorage.setItem('ollama_data', JSON.stringify(localUpdated));

            // Merge into sessionStorage
            const sessionExisting = this.parseData(sessionStorage.getItem('ollama_data'));
            const sessionUpdated = { ...sessionExisting, session: sessionData };
            sessionStorage.setItem('ollama_data', JSON.stringify(sessionUpdated));

            // Merge into cookie
            const cookieExisting = this.parseData(this.getCookie('ollama_data'));
            const cookieUpdated = { ...cookieExisting, session: sessionData };
            this.setCookie('ollama_data', JSON.stringify(cookieUpdated));
            return true;
        } catch (error) {
            console.error('Error saving user session:', error);
            return false;
        }
    };

    getUserSession = () => {
        try {
            const cookieData = this.parseData(this.getCookie('ollama_data'));
            const localData = this.parseData(localStorage.getItem('ollama_data'));
            const sessionData = this.parseData(sessionStorage.getItem('ollama_data'));

            // Priority: sessionStorage > localStorage > cookie
            return sessionData.session || localData.session || cookieData.session || null;
        } catch (error) {
            console.error('Error retrieving user session:', error);
            return null;
        }
    };

    clearUserSession = () => {
        try {
            // Local
            const localData = this.parseData(localStorage.getItem('ollama_data'));
            delete localData.session;
            localStorage.setItem('ollama_data', JSON.stringify(localData));

            // Session
            const sessionData = this.parseData(sessionStorage.getItem('ollama_data'));
            delete sessionData.session;
            sessionStorage.setItem('ollama_data', JSON.stringify(sessionData));

            // Cookie
            const cookieData = this.parseData(this.getCookie('ollama_data'));
            delete cookieData.session;
            this.setCookie('ollama_data', JSON.stringify(cookieData));

            console.log('User session cleared');
        } catch (error) {
            console.error('Error clearing user session:', error);
        }
    };

    // In AppManager class
    updateOllamaMessages = (newMessages) => {
        try {
            const localExisting = this.parseData(localStorage.getItem('ollama_data'));
            const sessionExisting = this.parseData(sessionStorage.getItem('ollama_data'));
            const cookieExisting = this.parseData(this.getCookie('ollama_data'));

            const base = {
            ...cookieExisting,
            ...localExisting,
            ...sessionExisting
            };

            // Ensure chatMessages exists
            base.chatMessages = newMessages;

            const stringified = JSON.stringify(base);
            localStorage.setItem('ollama_data', stringified);
            sessionStorage.setItem('ollama_data', stringified);
            this.setCookie('ollama_data', stringified);

            return true;
        } catch (err) {
            console.error("Error updating ollama chat messages:", err);
            return false;
        }
    };

    updateOllamaSidebarHistory = (sidebarData) => {
        try {
            const localExisting = this.parseData(localStorage.getItem('ollama_data'));
            const sessionExisting = this.parseData(sessionStorage.getItem('ollama_data'));
            const cookieExisting = this.parseData(this.getCookie('ollama_data'));

            const base = {
            ...cookieExisting,
            ...localExisting,
            ...sessionExisting
            };

            base.sidebarHistory = sidebarData.conversations || [];

            const stringified = JSON.stringify(base);
            localStorage.setItem('ollama_data', stringified);
            sessionStorage.setItem('ollama_data', stringified);
            this.setCookie('ollama_data', stringified);

            return true;
        } catch (err) {
            console.error("Error updating ollama sidebar history:", err);
            return false;
        }
    };

    // In AppManager class
    updateCurrentSession = (newCurrentSession) => {
        try {
            const localExisting = this.parseData(localStorage.getItem('ollama_data'));
            const sessionExisting = this.parseData(sessionStorage.getItem('ollama_data'));
            const cookieExisting = this.parseData(this.getCookie('ollama_data'));

            // Merge all data
            const base = {
                ...cookieExisting,
                ...localExisting,
                ...sessionExisting
            };

            // Update only current_session inside session object
            if (!base.session) base.session = {};
            base.session.current_session = newCurrentSession;

            const stringified = JSON.stringify(base);
            localStorage.setItem('ollama_data', stringified);
            sessionStorage.setItem('ollama_data', stringified);
            this.setCookie('ollama_data', stringified);

            return true;
        } catch (err) {
            console.error("Error updating current session:", err);
            return false;
        }
    };

    // In AppManager class
    getCurrentSession = () => {
        try {
            const cookieData = this.parseData(this.getCookie('ollama_data'));
            const localData = this.parseData(localStorage.getItem('ollama_data'));
            const sessionData = this.parseData(sessionStorage.getItem('ollama_data'));

            // Merge priority: sessionStorage > localStorage > cookie
            const merged = { ...cookieData, ...localData, ...sessionData };

            // Return only the current_session if it exists
            return merged.session?.current_session || null;
        } catch (err) {
            console.error("Error retrieving current session:", err);
            return null;
        }
    };


};
