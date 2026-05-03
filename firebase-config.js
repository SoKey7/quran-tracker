// Créez votre projet sur https://console.firebase.google.com
// Puis remplacez les valeurs ci-dessous par vos clés de configuration.
export const firebaseConfig = {
  apiKey: "AIzaSyB_BNnY_fixFia2S7QmHwSTt6vHbU-X-P0",
  authDomain: "quran-tracker-17.firebaseapp.com",
  projectId: "quran-tracker-1",
  storageBucket: "quran-tracker-17.firebasestorage.app",
  messagingSenderId: "1080973372482",
  appId: "1:1080973372482:web:391932bd190cb33fa491db"
};

function hasValidConfig() {
  return Boolean(
    firebaseConfig.apiKey !== "REMPLACER" &&
    firebaseConfig.authDomain !== "REMPLACER" &&
    firebaseConfig.projectId !== "REMPLACER" &&
    firebaseConfig.appId !== "REMPLACER"
  );
}

export function isFirebaseConfigured() {
  return hasValidConfig();
}

if (window.firebase && hasValidConfig()) {
  if (!window.firebase.apps.length) window.firebase.initializeApp(firebaseConfig);
  window.auth = window.firebase.auth();
  window.db = window.firebase.firestore();
}
