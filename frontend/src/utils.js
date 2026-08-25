import CryptoJS from "crypto-js";

const SECRET_KEY = "chatapp-e2e-secret-key-2024";

export function encryptMessage(text) {
  if (!text) return "";
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch {
    return text;
  }
}

export function decryptMessage(encryptedMessage) {
  if (!encryptedMessage) return "";
  if (typeof encryptedMessage !== "string") return "";
  try {
    if (!encryptedMessage.startsWith("U2FsdGVkX1")) return encryptedMessage;
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedMessage;
  } catch {
    return encryptedMessage;
  }
}
