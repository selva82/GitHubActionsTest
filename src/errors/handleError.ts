import { AppError } from './AppError';

export function handleError(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new AppError(error.message, error);
  }

  throw new AppError('An unexpected error occurred.', error);
}