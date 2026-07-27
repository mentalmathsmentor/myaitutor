import { API_URL } from '../config/api';

/**
 * Thin wrapper around `fetch` for the MAIT backend.
 *
 * Consolidates the boilerplate that was duplicated across pages, stores and
 * services: prefixing {@link API_URL}, attaching the `X-Student-Id` header, and
 * JSON-encoding request bodies.
 *
 * @param {string} path - API path beginning with `/` (e.g. `/query`).
 * @param {object} [options] - Standard `fetch` options plus:
 *   @param {string} [options.studentId] - When set, sent as the `X-Student-Id` header.
 *   @param {*} [options.json] - When set, JSON-stringified into the body and
 *     `Content-Type: application/json` is added.
 * @returns {Promise<Response>}
 */
export function apiFetch(path, { studentId, json, headers, body, ...options } = {}) {
  const finalHeaders = { ...headers };

  if (studentId) {
    finalHeaders['X-Student-Id'] = studentId;
  }

  let finalBody = body;
  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(json);
  }

  return fetch(`${API_URL}${path}`, { ...options, headers: finalHeaders, body: finalBody });
}
