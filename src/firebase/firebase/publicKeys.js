import { db } from "./firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Save/update public key
export async function uploadPublicKey(username, pubX, pubY) {
  try {
    await setDoc(doc(db, "public_keys", username), {
      pubX,
      pubY,
      updatedAt: Date.now()
    });
    console.log("[Firestore] Saved public key for", username);
    return true;
  } catch (err) {
    console.error("[Firestore] Failed to save public key for", username, err);
    throw err;
  }
}

// Fetch another user's public key
export async function fetchPublicKey(username) {
  try {
    const snap = await getDoc(doc(db, "public_keys", username));
    if (!snap.exists()) {
      console.log("[Firestore] No public key found for", username);
      return null;
    }
    const data = snap.data();
    console.log("[Firestore] Loaded public key for", username, data);
    return data;
  } catch (err) {
    console.error("[Firestore] Failed to fetch public key for", username, err);
    throw err;
  }
}
