import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

// Validação de conectividade com o Firestore
async function validateConnection() {
  try {
    await getDocFromServer(doc(db, "counters", "raffle_counter"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firestore em modo offline/cache local.");
    }
  }
}
validateConnection();
