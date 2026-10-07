export const avatarOptions = {
  head: ["Oval", "Redonda", "Quadrada"],
  body: ["Regular", "Largo", "Compacto"],
  hair: ["Curto", "Longo", "Cacheado", "Coque", "Sem cabelo"],
  face: ["Sorriso", "Alegre", "Sereno", "Piscando"],
  clothes: ["Camiseta", "Moletom", "Jaqueta", "Vestido"],
  shoes: ["Tênis", "Botas", "Casual"],
  accessory: ["Nenhum", "Óculos", "Boné", "Fones", "Brincos"],
  skin: ["Claro", "Dourado", "Moreno", "Escuro"],
  hairColor: ["Escuro", "Castanho", "Loiro", "Ruivo"],
  outfitColor: ["Violeta", "Verde", "Coral", "Azul"],
} as const;
export type AvatarKey = keyof typeof avatarOptions;
export type AvatarConfig = Record<AvatarKey, number>;
export const defaultAvatar: AvatarConfig = { head: 0, body: 0, hair: 0, face: 0, clothes: 0, shoes: 0, accessory: 0, skin: 1, hairColor: 0, outfitColor: 0 };
export function normalizeAvatar(value: unknown): AvatarConfig {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const config = { ...defaultAvatar };
  for (const key of Object.keys(avatarOptions) as AvatarKey[]) {
    const n = source[key];
    if (typeof n === "number" && Number.isInteger(n) && n >= 0 && n < avatarOptions[key].length) config[key] = n;
  }
  return config;
}
export function randomAvatar(): AvatarConfig {
  const config = { ...defaultAvatar };
  for (const key of Object.keys(avatarOptions) as AvatarKey[]) config[key] = Math.floor(Math.random() * avatarOptions[key].length);
  return config;
}