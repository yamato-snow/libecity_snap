export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const PRESIGNED_URL_EXPIRY = 3600; // 1 hour
export const MAX_UPLOAD_CONCURRENCY = 2;
export const MAX_RETRY_COUNT = 5;
export const RETRY_BASE_DELAY = 1000; // 1 second
export const PHOTOS_PER_PAGE = 24;
export const RECENT_PHOTOS_LIMIT = 12;
export const EVENT_DATE = process.env.NEXT_PUBLIC_EVENT_DATE || "2027-01-31";
