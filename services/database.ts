/**
 * This service acts as a simple client-side database using localStorage.
 * It centralizes all data storage and retrieval for the application.
 */

const DB_KEY = 'aura_app_data';

// Represents the structure of our client-side "database"
interface AppDatabase {
    user: any | null;
    preferences: {
        voice: 'auto' | 'male' | 'female';
    };
    history: {
        user: string;
        assistant: string;
        timestamp: string;
    }[];
}

/**
 * Retrieves the entire database object from localStorage.
 * @returns The parsed database object or a default structure if not found.
 */
const getDb = (): AppDatabase => {
    try {
        const data = localStorage.getItem(DB_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (error) {
        console.error("Failed to parse database from localStorage", error);
    }
    // Return a default structure if nothing is found or parsing fails
    return { user: null, preferences: { voice: 'auto' }, history: [] };
};

/**
 * Saves the entire database object to localStorage.
 * @param db The database object to save.
 */
const saveDb = (db: AppDatabase) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (error) {
        console.error("Failed to save database to localStorage", error);
    }
};

// --- User Management ---
export const dbSaveUser = (userData: any) => {
    const db = getDb();
    db.user = userData;
    saveDb(db);
};

export const dbGetUser = () => {
    const db = getDb();
    return db.user;
};

export const dbClearUser = () => {
    const db = getDb();
    db.user = null;
    db.history = []; // Also clear history on logout for privacy
    saveDb(db);
};

// --- Preferences Management ---
export const dbSaveVoicePreference = (preference: 'auto' | 'male' | 'female') => {
    const db = getDb();
    db.preferences.voice = preference;
    saveDb(db);
};

export const dbGetVoicePreference = () => {
    const db = getDb();
    return db.preferences.voice || 'auto'; // Default to 'auto'
};

// --- History Management ---
export const dbAddConversation = (userTranscript: string, assistantTranscript: string) => {
    if (!userTranscript.trim() && !assistantTranscript.trim()) return;
    const db = getDb();
    db.history.unshift({ // Add to the beginning of the array for reverse chronological order
        user: userTranscript,
        assistant: assistantTranscript,
        timestamp: new Date().toISOString(),
    });
    // Limit history to the last 20 entries to prevent localStorage from getting too large
    if (db.history.length > 20) {
        db.history.pop();
    }
    saveDb(db);
};

export const dbGetConversationHistory = () => {
    const db = getDb();
    return db.history || [];
};
