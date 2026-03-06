// GoogleDriveService.js
// Handles client-side encryption and Google Drive AppData folder storage for BYOK Architecture

export class GoogleDriveService {
    static SALT = "mait-byok-salt-2026";
    static FILENAME = "mait_vault_key.enc";

    /**
     * Encrypts the raw Gemini API Key using AES-GCM
     * The key is derived from the user's student_id string
     */
    static async encryptKey(rawKey, studentId) {
        try {
            const enc = new TextEncoder();
            const keyMaterial = await window.crypto.subtle.importKey(
                "raw",
                enc.encode(studentId),
                { name: "PBKDF2" },
                false,
                ["deriveKey"]
            );

            const key = await window.crypto.subtle.deriveKey(
                {
                    name: "PBKDF2",
                    salt: enc.encode(this.SALT),
                    iterations: 100000,
                    hash: "SHA-256"
                },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt"]
            );

            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                enc.encode(rawKey)
            );

            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Convert to base64
            const binString = Array.from(combined, byte => String.fromCharCode(byte)).join('');
            return btoa(binString);
        } catch (err) {
            console.error("Encryption failed:", err);
            throw new Error("Failed to encrypt API key locally.");
        }
    }

    /**
     * Decrypts the stored key using the same student_id
     */
    static async decryptKey(encryptedB64, studentId) {
        try {
            const enc = new TextEncoder();
            const binString = atob(encryptedB64);
            const combined = new Uint8Array(binString.length);
            for (let i = 0; i < binString.length; i++) {
                combined[i] = binString.charCodeAt(i);
            }

            const iv = combined.slice(0, 12);
            const data = combined.slice(12);

            const keyMaterial = await window.crypto.subtle.importKey(
                "raw",
                enc.encode(studentId),
                { name: "PBKDF2" },
                false,
                ["deriveKey"]
            );

            const key = await window.crypto.subtle.deriveKey(
                {
                    name: "PBKDF2",
                    salt: enc.encode(this.SALT),
                    iterations: 100000,
                    hash: "SHA-256"
                },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                false,
                ["decrypt"]
            );

            const dec = new TextDecoder();
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                data
            );
            return dec.decode(decrypted);
        } catch (err) {
            console.error("Decryption failed:", err);
            return null; // Silent fail if tampering or wrong user
        }
    }

    /**
     * Searches for the encrypted key file in the Google Drive AppData folder
     */
    static async findKeyFile(accessToken) {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${this.FILENAME}'`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        if (!res.ok) throw new Error("Failed to query Drive APIs");
        const data = await res.json();
        if (data.files && data.files.length > 0) {
            return data.files[0];
        }
        return null;
    }

    /**
     * Safely load and decrypt the Gemini API key from Google Drive Vault
     */
    static async loadKeyFromDrive(accessToken, studentId) {
        try {
            const file = await this.findKeyFile(accessToken);
            if (!file) return null;

            // Fetch the file content
            const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
            if (!contentRes.ok) throw new Error("Could not download key file");

            const encryptedB64 = await contentRes.text();

            return await this.decryptKey(encryptedB64, studentId);
        } catch (err) {
            console.error("Load key error:", err);
            return null;
        }
    }

    /**
     * Encrypts and securely uploads the Gemini API key to Google Drive AppData folder
     */
    static async saveKeyToDrive(accessToken, rawKey, studentId) {
        try {
            const encryptedB64 = await this.encryptKey(rawKey, studentId);
            const existingFile = await this.findKeyFile(accessToken);

            const metadata = {
                name: this.FILENAME,
                parents: ['appDataFolder']
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([encryptedB64], { type: 'text/plain' }));

            let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            let method = 'POST';

            if (existingFile) {
                // Update existing file
                url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
                method = 'PATCH';
                // Don't modify parents on update
                delete metadata.parents;
                const updateForm = new FormData();
                updateForm.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                updateForm.append('file', new Blob([encryptedB64], { type: 'text/plain' }));

                const res = await fetch(url, {
                    method: method,
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    body: updateForm
                });
                return res.ok;
            } else {
                // Create new
                const res = await fetch(url, {
                    method: method,
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    body: form
                });
                return res.ok;
            }

        } catch (err) {
            console.error("Save key error:", err);
            return false;
        }
    }
}
