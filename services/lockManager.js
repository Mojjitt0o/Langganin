// services/lockManager.js - Prevent race conditions for order processing

const locks = new Map(); // { orderId: { startTime, timeoutId } }
const LOCK_TIMEOUT = 30000; // 30 seconds

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
