import { dbSaveUser, dbGetUser, dbClearUser } from './database';

/**
 * NOTE: This is a mock authentication service using localStorage via a DB service.
 * In a real-world application, this would involve server-side logic,
 * secure password hashing, and proper session management.
 */

// A simple interface for our user data
export interface UserData {
  userName: string;
  displayName: string;
  assistantName: string;
  email: string;
  password?: string; // It's optional because we might not want to pass it around
}

/**
 * Signs up a new user. It rejects if the username is already taken.
 * @param userData - The user's details including password.
 * @returns A promise that resolves on success or rejects with an error message.
 */
export const signUp = (userData: UserData & { password: string }): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existingUser = dbGetUser();
    // Since this is a single-profile application, we prevent creating a new
    // user if one already exists. The user should log out to clear the data
    // if they wish to create a completely new profile.
    if (existingUser) {
        return reject('An account already exists. Please log in.');
    }
    // Store the new user data via the database service.
    dbSaveUser(userData);
    resolve();
  });
};

/**
 * Logs in a user by checking credentials against the database service.
 * @param userName - The user's username.
 * @param password - The user's password.
 * @returns A promise that resolves with user data (excluding password and email) on success,
 * or rejects with an error message.
 */
export const login = (userName: string, password: string): Promise<Omit<UserData, 'password' | 'email'>> => {
  return new Promise((resolve, reject) => {
    const storedUserData = dbGetUser();
    if (storedUserData) {
      // Check username (case-insensitive) and password (case-sensitive)
      if (storedUserData.userName?.toLowerCase() === userName.trim().toLowerCase() && storedUserData.password === password) {
        const { password: _, email: __, ...userToReturn } = storedUserData;
        resolve(userToReturn);
      } else {
        reject('Invalid username or password.');
      }
    } else {
      reject('No profiles found. Please Sign Up.');
    }
  });
};

/**
 * Logs out the user by clearing their data via the database service.
 */
export const logout = (): void => {
    dbClearUser();
};

/**
 * Checks for an existing user via the database service.
 * @returns The user's core data if found, otherwise null.
 */
export const checkExistingUser = (): Omit<UserData, 'password' | 'email'> | null => {
    const storedUserData = dbGetUser();
    if (storedUserData) {
      const { userName, displayName, assistantName } = storedUserData;
      if (userName && assistantName) {
          return { userName, displayName: displayName || userName, assistantName };
      }
    }
    return null;
}