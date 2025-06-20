import Filter from 'bad-words';

const adjectives = ["Crimson", "Azure", "Golden", "Emerald", "Obsidian", "Silent", "Wandering", "Forgotten", "Phantom", "Cosmic", "Mystic", "Shadow", "Electric", "Rogue", "Frozen", "Whispering"];
const nouns = ["Fox", "Jaguar", "Phoenix", "Specter", "Wanderer", "Drifter", "Nexus", "Oracle", "Golem", "Nomad", "Revenant", "Cipher", "Agent", "Echo", "Void"];

export function generateAnonName(): string {
  const filter = new Filter();
  let name = '';
  do {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 100);
    name = `${adj}${noun}${number}`;
  } while (filter.isProfane(name));
  return name;
}
