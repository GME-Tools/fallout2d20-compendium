// Some Core Rulebook entries intentionally share a display name because the
// same modification is defined independently for several weapon families.
// Approval is tied to the complete, stable-ID group: adding, removing, or
// replacing an entry makes validation fail instead of silently hiding it.
export const APPROVED_CORE_DUPLICATE_NAME_GROUPS = {
  apparel: [
    ["F15SCdqO8m3rhpkc", "qEljKwu1UzA9BoL6"],
    ["CCrzErrpyLp7Ruz4", "Fn3CiQjQCfE9IMy4"],
    ["JTHWr7cr6HeS2mN5", "lW7UmLaX9cJtuYIV"],
    ["th5iQbnAiLsKzIVV", "U38QzZYOaKw1oC3h"],
    ["C5ifa1Dx7rIxx65I", "KSd9eiC0XaVlIXkN"]
  ],
  "creature-abilities": [
    ["klbQQiZH61sAtNuR", "lfMWVhIeAPx7Hgrs"],
    ["1tOlUrBjCQBoGMm3", "ypLFMHwSBdCcrrAf"],
    ["dYy0F73URJNTaojo", "ntfVlZWPlsm4TaRj"]
  ],
  weapons: [
    ["75n1EFSJw8xxti6s", "q3RjTNEYvfHVBzVk"]
  ],
  "weapon-mods": [
    ["SBiPJoDN1jWmENgs", "Sem0JhmbNdppKdJW", "bIxeUpjoKTniv7P7", "iqpxSXwVu0d13y7j"],
    ["CYODpO6JvopXWYW7", "pk8yYPVKXuuatunI"],
    ["IT15FDgwEelj1LYg", "mzi2nNJcbhMEnWIE"],
    ["hzqISjGQIiMI1ZP7", "xg5FEwwagDUpedcL"],
    ["4hbEFa5bvVFUlMBO", "HuhiTQsXyRgw5tZS", "brS0allrFP0vQ5Ac", "uOWSNksbDqlUOhJN", "xBtUynQ88d6dGQgL"],
    ["ULmvHBqIQuMGNg1o", "nO1q1OhQfQk9u6su"],
    ["dgUAFqVrT3FPOVUf", "yK9zc6hPHk1IRq01"],
    ["8nHC8z4vEY4yX7bM", "bRV8rXkptjU6mz9Y"],
    ["5gXCZXtJ4E9Blg97", "DQwdlCs54hWqQaZa"],
    ["MvrQv0wg5FE6j7TR", "hVD46UqAqiNB4f57"],
    ["D8hF1RjpOMVHjlHp", "VJOrfCwfPhDnMP18", "wQSPWsdrMfYqPAMO"],
    ["MIMSkUavfShkeY8x", "bhpEF2ZReAacz7NI", "cs76CKLMxYAzhNhb"],
    ["nBQq6MTdf40kleS5", "wvsSsznT8GDmdoUa"],
    ["U3fJYCYnDsxrr2Or", "sg1EfJrr3S307XPy"],
    ["Q6VUr8ae7Rf7WOhA", "zbzoOm7wspRTM8PJ"],
    ["5TezV1CMuZiRXrKU", "X7M3lII0wjlKV7l3"],
    ["inrCFrHdrIQrEXf1", "mcjlBsMoWIiiNoVw"],
    ["49zfOfotginM01u8", "7OZouPhriL9tzrOD", "Fa2RBTtGci73smRF", "LANB6wzhO8pIEsxK", "SoqIXVkZsUGhfofi", "ol8d48kNa9veV1kv"],
    ["H5uajcZl8MICYwfy", "pkYZNmGx0JPKquIC", "pxflsyihN3fjKgYq"],
    ["M5ox31Qif67xBC0m", "dgWySoP4IQ9p2uyO"],
    ["AMOEO5RXltJZM8kz", "qASlWkpHosmgn97l", "rh3GtWKomZnQpS1H"],
    ["7hxh0xRNMyflfbJp", "GFJP4TRDRaOQoOe8", "uUiwz6PvOMdkU6yE", "vq6OcwFKhScFr26X"],
    ["EuJw4xP1fRt5hdCy", "M2Tl0fVG6LzG9wtj", "fTMm3IipqcnU6tm4", "hfiueRXOH8ryrfrv", "uaOXQJwoub6ZmUdc"],
    ["4sOu5mfXcDlUVlUP", "zAlW93haMYH8Nwp2"],
    ["vyesQvmRObpdSNpO", "wUd5pTA33zRH1AWW"],
    ["TxOsscfkniBk2a85", "fyaQkFSXyexqZc0u"],
    ["5rADQbFyMO7zjDSi", "BX0Ox0ZdWJBDNsVl", "CFl42Fhuv4nToKcP", "CMVHMX7fGVSi9SzJ", "aKnqi2PPZyD6qLGe", "e1ycQYWvjDktlxvu", "eakJcz2neDjGIWWP", "frKj2bS1FVy8Ny3O"],
    ["2bv9B55Mk73ypTCZ", "G6FJ1gEgiS2553IN", "S8t6WX5aWZl3rXqT"]
  ]
};

export function duplicateGroupSignature(ids) {
  return [...ids].sort().join(":");
}

// French legitimately collapses a few distinct English labels to the same
// published term. Groups which overlap a language-neutral group are merged.
const APPROVED_LOCALIZED_DUPLICATE_NAME_GROUPS = {
  "fr/weapon-mods": [
    ["6hh0Evmfv0N8kX81", "CapaBoostCoil001"],
    ["6oW2tdrYzdu0klW4", "KkRxsFbFTL89H3Ra"],
    ["RyggZv9PwKChzJwB", "MIMSkUavfShkeY8x", "bhpEF2ZReAacz7NI", "cs76CKLMxYAzhNhb"]
  ]
};

export function approvedDuplicateNameGroups(language, pack) {
  const groups = (APPROVED_CORE_DUPLICATE_NAME_GROUPS[pack] ?? []).map(ids => [...ids]);
  for (const localized of APPROVED_LOCALIZED_DUPLICATE_NAME_GROUPS[`${language}/${pack}`] ?? []) {
    const overlaps = groups.flatMap((ids, index) => ids.some(id => localized.includes(id)) ? [index] : []);
    if (!overlaps.length) groups.push([...localized]);
    else {
      const merged = new Set(localized);
      for (const index of overlaps.reverse()) for (const id of groups.splice(index, 1)[0]) merged.add(id);
      groups.push([...merged]);
    }
  }
  return groups;
}
