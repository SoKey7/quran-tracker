export function getHomeWidgets(data, weightedProgress) {
  return [
    {
      id: "streak",
      title: "🔥 Serie actuelle",
      value: `${data.streak.current} jours`
    },
    {
      id: "progress",
      title: "📖 Progression",
      value: `${weightedProgress.percent}%`
    },
    {
      id: "daily",
      title: "🌙 Lecture du jour",
      value: "Plan intelligent",
      actionLabel: "Commencer"
    },
    {
      id: "prestige",
      title: "⭐ Prestige",
      value: `Prestige ${data.prestige}`
    }
  ];
}
