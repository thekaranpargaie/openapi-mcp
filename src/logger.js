import config from '../config.js';

export const logger = {
  // Verbose logging - only shown with --verbose flag
  debug: (message, data = null) => {
    if (config.app.verbose) {
      console.log(`\n[DEBUG] ${message}`, data || '');
    }
  },

  // Info logging - only shown with --verbose flag
  info: (message, data = null) => {
    if (config.app.verbose) {
      console.log(`\n[INFO] ${message}`, data || '');
    }
  },

  // Error logging - always shown
  error: (message, data = null) => {
    console.error(`\n[ERROR] ${message}`, data || '');
  },

  // User output - always shown in clean format
  output: (message) => {
    console.log(message);
  },

  // Success message - always shown
  success: (message) => {
    console.log(`\n✓ ${message}`);
  }
};

export default logger;
