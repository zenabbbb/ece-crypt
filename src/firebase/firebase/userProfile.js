import { db } from "./firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// Check if a username is already used by a *different* user.
async function isUsernameTaken(username, currentUid) {
  const clean = (username ?? "").trim();
  if (!clean) return false;

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", "==", clean));
  const snap = await getDocs(q);

  // If any document exists with this username and a different id, it's taken.
  return snap.docs.some((docSnap) => docSnap.id !== currentUid);
}

// Save a user's profile and try to keep usernames unique across all users.
export async function saveUserProfile(uid, profile) {
  const requestedUsername = (profile.username ?? "").trim();
  const finalUsername = requestedUsername === "" ? null : requestedUsername;

  // Enforce uniqueness in application logic (best-effort).
  if (finalUsername) {
    const taken = await isUsernameTaken(finalUsername, uid);
    if (taken) {
      const err = new Error("That username is already taken.");
      err.code = "username-taken";
      throw err;
    }
  }

  const userRef = doc(db, "users", uid);
  const dataToSave = {
    ...profile,
    username: finalUsername,
  };

  // Merge so we don't overwrite unrelated fields.
  await setDoc(userRef, dataToSave, { merge: true });
  return dataToSave;
}

export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}
