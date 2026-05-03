import { TOTAL_SURAHS } from "./storage.js";

const AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64,
  77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49,
  62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
];

const SURAH_NAMES_FR = [
  "L'Ouverture", "La Vache", "La Famille d'Imran", "Les Femmes", "La Table Servie", "Les Bestiaux", "Les Murailles", "Le Butin",
  "Le Repentir", "Younous", "Houd", "Youssouf", "Le Tonnerre", "Abraham", "Al-Hijr", "Les Abeilles", "Le Voyage Nocturne",
  "La Caverne", "Marie", "Ta-Ha", "Les Prophètes", "Le Pèlerinage", "Les Croyants", "La Lumière", "Le Discernement", "Les Poètes",
  "Les Fourmis", "Le Récit", "L'Araignée", "Les Romains", "Luqman", "La Prosternation", "Les Coalisés", "Saba", "Le Créateur",
  "Ya-Sin", "Les Rangés", "Sad", "Les Groupes", "Le Pardonneur", "Les Versets Détaillés", "La Consultation", "L'Ornement",
  "La Fumée", "L'Agenouillée", "Les Dunes", "Muhammad", "La Victoire", "Les Appartements", "Qaf", "Qui Éparpillent", "Le Mont",
  "L'Étoile", "La Lune", "Le Tout Miséricordieux", "L'Événement", "Le Fer", "La Discussion", "Le Rassemblement", "L'Éprouvée",
  "Le Rang", "Le Vendredi", "Les Hypocrites", "La Grande Perte", "Le Divorce", "L'Interdiction", "La Royauté", "La Plume",
  "L'Inévitable", "Les Voies d'Ascension", "Noé", "Les Djinns", "L'Enveloppé", "Le Revêtu", "La Résurrection", "L'Homme",
  "Les Envoyés", "La Nouvelle", "Les Anges qui Arrachent", "Il s'est Renfrogné", "L'Obscurcissement", "La Fissure",
  "Les Fraudeurs", "La Déchirure", "Les Constellations", "L'Astre Nocturne", "Le Très-Haut", "L'Enveloppante", "L'Aube",
  "La Cité", "Le Soleil", "La Nuit", "Le Jour Montant", "L'Ouverture de la Poitrine", "Le Figuier", "L'Adhérence",
  "La Destinée", "La Preuve", "Le Séisme", "Les Coursiers", "Le Fracas", "La Course aux Richesses", "Le Temps", "Les Calomniateurs",
  "L'Éléphant", "Quraych", "L'Ustensile", "L'Abondance", "Les Mécréants", "Le Secours", "Les Fibres", "Le Monothéisme Pur",
  "L'Aube Naissante", "Les Hommes"
];

export const surahs = Array.from({ length: TOTAL_SURAHS }, (_, i) => {
  const numero = i + 1;
  const ayahs = AYAH_COUNTS[i];
  let categorie = "Longue";
  if (ayahs <= 10) categorie = "TresCourte";
  else if (ayahs <= 40) categorie = "Courte";
  else if (ayahs <= 120) categorie = "Moyenne";
  return { numero, nomFr: SURAH_NAMES_FR[i], categorie };
});

export const surahMap = new Map(surahs.map((s) => [s.numero, s]));
