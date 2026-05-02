import csv
import random
from datetime import date, datetime

# =====================================================
# CONFIG
# =====================================================

CSV_FILE = "sourates.csv"

POINTS = {
    "TresCourte": 1,
    "Courte": 2,
    "Moyenne": 5,
    "Longue": 10
}

OBJECTIFS = {
    10: 5,
    20: 10,
    30: 15
}

# =====================================================
# CSV
# =====================================================

def charger_csv():
    with open(CSV_FILE, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def sauvegarder_csv(data):
    champs = [
        "Numero",
        "NomArabe",
        "NomFrancais",
        "Categorie",
        "Lu",
        "Date"
    ]

    with open(CSV_FILE, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=champs)
        writer.writeheader()
        writer.writerows(data)


# =====================================================
# LECTURE DU JOUR
# =====================================================

def generer_lecture(data, temps):
    points_cible = OBJECTIFS[temps]
    points = 0

    non_lues = [x for x in data if x["Lu"] == "Non"]
    lecture = []

    while points < points_cible:

        categories = list(set(
            x["Categorie"] for x in non_lues
            if x not in lecture
        ))

        if not categories:
            break

        categorie = random.choice(categories)
        valeur = POINTS[categorie]

        if points + valeur > points_cible + 1:
            continue

        candidates = [
            x for x in non_lues
            if x["Categorie"] == categorie
            and x not in lecture
        ]

        if not candidates:
            continue

        sourate = random.choice(candidates)

        lecture.append(sourate)
        points += valeur

    return lecture


def lecture_du_jour(data):
    print("\nTemps disponible ?")
    print("1. 10 min")
    print("2. 20 min")
    print("3. 30 min")

    choix = input("> ")

    mapping = {
        "1": 10,
        "2": 20,
        "3": 30
    }

    temps = mapping.get(choix, 10)

    lecture = generer_lecture(data, temps)

    print("\n📖 Lecture du jour :\n")

    for s in lecture:
        print(f"{s['Numero']} - {s['NomFrancais']} ({s['Categorie']})")

    rep = input("\nAs-tu terminé ? (o/n) : ")

    if rep.lower() == "o":

        nums = [x["Numero"] for x in lecture]
        today = str(date.today())

        for ligne in data:
            if ligne["Numero"] in nums:
                ligne["Lu"] = "Oui"
                ligne["Date"] = today

        sauvegarder_csv(data)
        print("✅ Lecture validée.")


# =====================================================
# PROGRESSION
# =====================================================

def voir_progression(data):

    total = len(data)
    lues = len([x for x in data if x["Lu"] == "Oui"])
    restantes = total - lues
    pourcent = round(lues / total * 100, 1)

    print("\n📊 Progression")
    print(f"Lues : {lues}/{total}")
    print(f"Restantes : {restantes}")
    print(f"Progression : {pourcent}%\n")

    cats = ["TresCourte", "Courte", "Moyenne", "Longue"]

    for c in cats:
        nb = len([
            x for x in data
            if x["Categorie"] == c and x["Lu"] == "Non"
        ])
        print(f"{c} restantes : {nb}")


# =====================================================
# RECOMMENCER
# =====================================================

def recommencer(data):

    rep = input(
        "\n⚠️ Recommencer le cycle ? Tout sera remis à zéro (o/n) : "
    )

    if rep.lower() == "o":

        for ligne in data:
            ligne["Lu"] = "Non"
            ligne["Date"] = ""

        sauvegarder_csv(data)
        print("🔄 Nouveau cycle lancé.")


# =====================================================
# MARQUER MANUELLEMENT
# =====================================================

def marquer_manuellement(data):

    terme = input(
        "\nNuméro ou mot-clé de la sourate : "
    ).lower()

    candidats = []

    for x in data:

        if (
            terme in x["Numero"].lower()
            or terme in x["NomFrancais"].lower()
            or terme in x["NomArabe"].lower()
        ):
            candidats.append(x)

    if not candidats:
        print("Aucun résultat.")
        return

    print()

    for i, s in enumerate(candidats, start=1):
        print(f"{i}. {s['Numero']} - {s['NomFrancais']}")

    choix = input("\nChoisir numéro : ")

    try:
        s = candidats[int(choix) - 1]
    except:
        return

    s["Lu"] = "Oui"
    s["Date"] = str(date.today())

    sauvegarder_csv(data)

    print("✅ Sourate marquée comme lue.")


# =====================================================
# STATS
# =====================================================

def statistiques(data):

    lues = [x for x in data if x["Lu"] == "Oui"]

    print("\n📈 Statistiques\n")

    print(f"Sourates lues : {len(lues)}")

    total_points = sum(
        POINTS[x["Categorie"]]
        for x in lues
    )

    print(f"Temps estimé total : {total_points * 2} min")

    dates = sorted(
        [
            x["Date"]
            for x in lues
            if x["Date"]
        ]
    )

    if dates:
        print(f"Dernière lecture : {dates[-1]}")

    # série simple
    streak = 0
    jour = date.today()

    while str(jour) in dates:
        streak += 1
        jour = date.fromordinal(
            jour.toordinal() - 1
        )

    print(f"Série actuelle : {streak} jour(s)")


# =====================================================
# MENU
# =====================================================

def main():

    while True:

        data = charger_csv()

        print("\n==========================")
        print("📖 Quran Tracker")
        print("==========================")
        print("1. Lecture du jour")
        print("2. Voir progression")
        print("3. Recommencer cycle")
        print("4. Marquer manuellement")
        print("5. Statistiques")
        print("6. Quitter")

        choix = input("> ")

        if choix == "1":
            lecture_du_jour(data)

        elif choix == "2":
            voir_progression(data)

        elif choix == "3":
            recommencer(data)

        elif choix == "4":
            marquer_manuellement(data)

        elif choix == "5":
            statistiques(data)

        elif choix == "6":
            break


if __name__ == "__main__":
    main()
