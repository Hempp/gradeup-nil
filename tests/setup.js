/**
 * Vitest Test Setup
 * Runs before all tests to configure the test environment
 */

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index) => Object.keys(store)[index] || null,
  };
};

global.localStorage = createStorageMock();
global.sessionStorage = createStorageMock();

// Mock crypto.getRandomValues for CSRF token generation
if (!global.crypto) {
  global.crypto = {
    getRandomValues: (array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };
}

// Clear storage between tests
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
