import { logger } from './logger';
export class ApplicationError extends Error {
    isOperational;
    constructor(message, isOperational = true) {
        super(message);
        this.name = 'ApplicationError';
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
/**
 * Log error details and return a safe message for the user.
 * @param error Error object or unknown
 * @param context Optional context object for logging
 * @returns User-friendly error message
 */
export function handleError(error, context = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error('Error occurred', {
        message: errorMessage,
        stack,
        ...context
    });
    if (error instanceof ApplicationError && error.isOperational) {
        return error.message;
    }
    // Generic message for unexpected errors
    return 'Terjadi kesalahan sistem. Silakan coba lagi nanti.';
}
