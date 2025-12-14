import { supabase } from '../config/supabase';

const CURRENT_USER_KEY = 'currentUser';

export const authService = {
  /**
   * Verify PIN and authenticate user
   * @param {string} pin - 4-digit PIN code
   * @returns {Promise<Object|null>} User profile or null if invalid
   */
  async verifyPin(pin) {
    try {
      // Call Supabase RPC function to verify PIN
      const { data, error } = await supabase.rpc('verify_pin', {
        input_pin: pin
      });

      if (error) {
        console.error('PIN verification error:', error);
        return null;
      }

      // RPC returns array, get first result
      if (data && data.length > 0) {
        const user = data[0];
        // Store user in session
        this.setCurrentUser(user);
        return user;
      }

      return null;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return null;
    }
  },

  /**
   * Get current authenticated user from session
   * @returns {Object|null} Current user or null
   */
  getCurrentUser() {
    try {
      const userJson = sessionStorage.getItem(CURRENT_USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  /**
   * Set current user in session storage
   * @param {Object} user - User profile object
   */
  setCurrentUser(user) {
    try {
      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting current user:', error);
    }
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  },

  /**
   * Check if current user has specific role
   * @param {string|string[]} roles - Role or array of roles to check
   * @returns {boolean} True if user has one of the specified roles
   */
  hasRole(roles) {
    const user = this.getCurrentUser();
    if (!user) return false;

    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  },

  /**
   * Logout current user
   */
  logout() {
    sessionStorage.removeItem(CURRENT_USER_KEY);
  },

  /**
   * Get user's display name
   * @returns {string} User name or empty string
   */
  getUserName() {
    const user = this.getCurrentUser();
    return user ? user.name : '';
  },

  /**
   * Get user's role
   * @returns {string|null} User role or null
   */
  getUserRole() {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }
};

export default authService;
