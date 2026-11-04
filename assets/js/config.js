/* ==========================================================
   ANGIE NAILS CRÉATION : configuration modifiable
   Tout ce qui change dans la vie du salon est ici :
   horaires, jours fermés, créneaux bloqués, prestations.
   ========================================================== */
window.ANGIE = {
  name: 'Angie Nails Création',
  phone: '06 99 60 95 26',
  phoneIntl: '+33699609526',
  instagram: 'angie_nails_creation',
  mapsUrl: 'https://www.google.com/maps/place/Angie+Nails+Cr%C3%A9ation/@43.529906,5.4455776,17z/data=!4m6!3m5!1s0x12c98d748e08eab1:0x6a0bca0f68168c1f!8m2!3d43.529906!4d5.4455776!16s%2Fg%2F11w9hk4s3g',
  address: 'Pl. Forum des Cardeurs, 13100 Aix-en-Provence',

  /* Horaires : 0 = dimanche … 6 = samedi. [ouverture, fermeture] en heures, ou null si fermé.
     Source : fiche Google Maps (heures) + Instagram « ouverte du mardi au dimanche » (lundi fermé). */
  hours: {
    0: [10, 20],
    1: null,
    2: [10, 22],
    3: [10, 20],
    4: [10, 20],
    5: [10, 20],
    6: [10, 20]
  },

  /* Jours de congés (format AAAA-MM-JJ) : ils deviennent grisés dans le calendrier. */
  closedDates: [],

  /* Créneaux déjà pris (format { 'AAAA-MM-JJ': ['14:00', '16:30'] }). */
  blockedSlots: {},

  slotStepMinutes: 30,   // pas entre deux créneaux proposés
  horizonDays: 45,       // jusqu'à combien de jours à l'avance on peut demander un rendez-vous
  leadMinutes: 120,      // délai minimum avant un créneau le jour même

  /* Prestations. prix: null  => « tarif confirmé à la réservation ».
     Pour afficher un tarif : prix: 35  (ou prix: '35 €'). Durées indicatives. */
  services: [
    { id: 'semi',  titre: 'Semi-permanent', duree: 60,  prix: null,
      texte: 'Une couleur éclatante, une brillance miroir et une tenue qui traverse les semaines.' },
    { id: 'gainage', titre: 'Gainage', duree: 75, prix: null,
      texte: 'Une gaine de gel sur votre ongle naturel : plus solide, plus lisse, sans changer votre longueur.' },
    { id: 'extensions', titre: 'Extensions', duree: 120, prix: null,
      texte: 'Longueur et forme à la carte, amande, coffin ou carrée, construites en gel sur mesure.' },
    { id: 'nailart', titre: 'Nail art sur mesure', duree: 90, prix: null,
      texte: 'Filets dorés, french revisité, chrome, motifs de saison : la création dessinée rien que pour vous.' },
    { id: 'remplissage', titre: 'Remplissage', duree: 90, prix: null,
      texte: 'On entretient votre pose pour garder la même allure, du premier au dernier jour.' },
    { id: 'depose', titre: 'Dépose', duree: 30, prix: null,
      texte: 'Retrait en douceur de votre ancienne pose, pour repartir sur de belles bases.' }
  ]
};
