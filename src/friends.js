function createFriend(nameOrCode) {
  const clean = String(nameOrCode || "").trim();
  const label = clean.replace(/^@/, "") || "Ami";
  return {
    id: `friend-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    pseudo: label,
    code: `FR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    progressPercent: Math.floor(Math.random() * 85) + 10,
    streak: Math.floor(Math.random() * 21) + 1,
    prestige: Math.floor(Math.random() * 3),
    lastActivityAt: new Date().toISOString()
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function createFriendsService(data, persist, toastFn) {
  return {
    addFriend(input) {
      const friend = createFriend(input);
      data.friends.list.unshift(friend);
      persist();
      return friend;
    },
    getFriends() {
      return data.friends.list.slice();
    },
    canEncourage(friendId) {
      const key = `${friendId}-${todayKey()}`;
      return !data.friends.encouragements[key];
    },
    encourage(friendId) {
      const key = `${friendId}-${todayKey()}`;
      if (data.friends.encouragements[key]) return false;
      data.friends.encouragements[key] = {
        sentAt: new Date().toISOString()
      };
      persist();
      const friend = data.friends.list.find((f) => f.id === friendId);
      toastFn(`📖 Ton ami ${friend?.pseudo || "t"} t'encourage a lire aujourd'hui !`);
      return true;
    }
  };
}
