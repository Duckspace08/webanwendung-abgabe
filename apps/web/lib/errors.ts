export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(args: { status: number; code: string; message: string; details?: unknown }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.details = args.details;
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  typeof error === 'object' && error !== null && (error as { name?: string }).name === 'ApiError';

export const toUserMessage = (error: unknown): string => {
  if (isApiError(error)) {
    switch (error.code) {
      case 'INVALID_PARAMS':
        return 'Bitte prüfen Sie die Eingaben (Parameter sind ungültig).';
      case 'NOT_FOUND':
        return 'Die Station wurde nicht gefunden.';
      default:
        return 'Ein unerwarteter Fehler ist aufgetreten.';
    }
  }

  if (error instanceof Error) {
    return error.message || 'Ein unerwarteter Fehler ist aufgetreten.';
  }

  return 'Ein unerwarteter Fehler ist aufgetreten.';
};

export const parseApiError = async (response: Response): Promise<ApiError> => {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    if (data?.error?.code && data?.error?.message) {
      return new ApiError({
        status: response.status,
        code: data.error.code,
        message: data.error.message,
        details: data.error.details,
      });
    }
  } catch {
    // ignore
  }

  return new ApiError({
    status: response.status,
    code: 'HTTP_ERROR',
    message: `HTTP ${response.status} ${response.statusText}`,
  });
};