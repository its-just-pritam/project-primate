// MIGRATE_TO_BACKEND=true serves data from the Kotlin backend (primate-backend/); anything else keeps
// the original Google Sheets implementation. Inlined by next.config.mjs for server and client.
export const isBackendEnabled = process.env.MIGRATE_TO_BACKEND === 'true';
