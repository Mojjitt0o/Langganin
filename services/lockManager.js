// services/lockManager.js - Prevent race conditions for order processing
// Used by: webhook handler, background task, and IIFE in Order.create()

const locks = new Map(); // { orderId: { startTime, timeoutId } }
const LOCK_TIMEOUT = 180000; // 180 seconds (3 minutes) - must be longer than max fetch + retry
// Note: WR API fetch + retry (10×15s) = max ~150s, need buffer for processing time

module.exports = {
    // Acquire lock for an order
    acquireLock(orderId) {
        if (locks.has(orderId)) {
            return false; // Already locked
        }

        // Set timeout to auto-release lock if stuck
        const timeoutId = setTimeout(() => {
            locks.delete(orderId);
            console.warn(`[LockManager] Auto-released stuck lock for ${orderId}`);
        }, LOCK_TIMEOUT);

        locks.set(orderId, {
            startTime: Date.now(),
            timeoutId
        });

        return true; // Lock acquired
    },

    // Release lock
    releaseLock(orderId) {
        const lock = locks.get(orderId);
        if (lock) {
            clearTimeout(lock.timeoutId);
            locks.delete(orderId);
            return true;
        }
        return false;
    },

    // Check if locked
    isLocked(orderId) {
        return locks.has(orderId);
    },

    // Get all locked orders
    getLockedOrders() {
        return Array.from(locks.keys());
    }
};
