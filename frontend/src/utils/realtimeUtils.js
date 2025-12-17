/**
 * Utility functions for Supabase Realtime optimizations
 */

/**
 * Debounce function to prevent excessive refetches
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function to limit execution rate
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between executions in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 500) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Create a smart refetch function that debounces and batches updates
 * @param {Function} fetchFunction - The fetch function to call
 * @param {Object} options - Configuration options
 * @param {number} options.debounceMs - Debounce delay (default: 300ms)
 * @param {number} options.maxWait - Maximum wait time (default: 1000ms)
 * @returns {Function} Smart refetch function
 */
export const createSmartRefetch = (fetchFunction, options = {}) => {
  const { debounceMs = 300, maxWait = 1000 } = options;

  let timeout;
  let lastCallTime = 0;

  return function smartRefetch(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    // If max wait time exceeded, call immediately
    if (timeSinceLastCall >= maxWait) {
      clearTimeout(timeout);
      lastCallTime = now;
      return fetchFunction(...args);
    }

    // Otherwise, debounce
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      lastCallTime = Date.now();
      fetchFunction(...args);
    }, debounceMs);
  };
};

/**
 * Check if payload contains significant changes that warrant a refetch
 * @param {Object} payload - Supabase realtime payload
 * @param {Array} significantFields - Fields to check for changes
 * @returns {boolean} True if significant changes detected
 */
export const hasSignificantChanges = (payload, significantFields = []) => {
  if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
    return true;
  }

  if (payload.eventType === 'UPDATE' && significantFields.length > 0) {
    return significantFields.some(field =>
      payload.new?.[field] !== payload.old?.[field]
    );
  }

  return true;
};

/**
 * Connection status helper
 */
export class RealtimeConnectionMonitor {
  constructor() {
    this.listeners = new Set();
    this.status = 'connecting';
  }

  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately notify of current status
    callback(this.status);

    return () => {
      this.listeners.delete(callback);
    };
  }

  updateStatus(status) {
    this.status = status;
    this.listeners.forEach(callback => callback(status));
  }

  isConnected() {
    return this.status === 'connected';
  }
}

export const connectionMonitor = new RealtimeConnectionMonitor();

/**
 * Format realtime event for logging
 * @param {Object} payload - Supabase realtime payload
 * @returns {string} Formatted log message
 */
export const formatRealtimeEvent = (payload) => {
  const { eventType, table, new: newData, old: oldData } = payload;

  if (eventType === 'INSERT') {
    return `[Realtime] INSERT on ${table} - ID: ${newData?.id}`;
  }

  if (eventType === 'UPDATE') {
    const changes = Object.keys(newData || {}).filter(
      key => newData[key] !== oldData?.[key]
    );
    return `[Realtime] UPDATE on ${table} - ID: ${newData?.id} - Changed: ${changes.join(', ')}`;
  }

  if (eventType === 'DELETE') {
    return `[Realtime] DELETE on ${table} - ID: ${oldData?.id}`;
  }

  return `[Realtime] ${eventType} on ${table}`;
};

/**
 * Create a channel with automatic reconnection
 * @param {Object} supabase - Supabase client
 * @param {string} channelName - Unique channel name
 * @param {Object} config - Channel configuration
 * @returns {Object} Channel with reconnection logic
 */
export const createReconnectingChannel = (supabase, channelName, config) => {
  let channel = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000;

  const connect = () => {
    channel = supabase.channel(channelName);

    // Apply configuration
    Object.entries(config).forEach(([event, handler]) => {
      channel.on(event.type, event.filter, handler);
    });

    // Monitor connection status
    channel
      .on('system', {}, (payload) => {
        if (payload.status === 'SUBSCRIBED') {
          connectionMonitor.updateStatus('connected');
          reconnectAttempts = 0;
          console.log(`[Realtime] Connected to ${channelName}`);
        } else if (payload.status === 'CLOSED') {
          connectionMonitor.updateStatus('disconnected');
          console.log(`[Realtime] Disconnected from ${channelName}`);

          // Attempt reconnection
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            setTimeout(() => {
              console.log(`[Realtime] Reconnection attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
              connect();
            }, reconnectDelay * reconnectAttempts);
          }
        }
      })
      .subscribe();

    return channel;
  };

  return connect();
};
