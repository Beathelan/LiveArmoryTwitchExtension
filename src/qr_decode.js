const BASE_32_ALPHABET = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  'A': 10,
  'B': 11,
  'C': 12,
  'D': 13,
  'E': 14,
  'F': 15,
  'G': 16,
  'H': 17,
  'I': 18,
  'J': 19,
  'K': 20,
  'L': 21,
  'M': 22,
  'N': 23,
  'O': 24,
  'P': 25,
  'Q': 26,
  'R': 27,
  'S': 28,
  'T': 29,
  'U': 30,
  'V': 31,
}

const CHARACTER_CLASSES = {
  [0]: 'None',
  [1]: 'Warrior',
  [2]: 'Paladin',
  [3]: 'Hunter',
  [4]: 'Rogue',
  [5]: 'Priest',
  [6]: 'Shaman',
  [7]: 'Mage',
  [8]: 'Warlock',
  [9]: 'Druid',
};
const DEFAULT_CHARACTER_CLASS = 0;

const CHARACTER_RACES = {
  [0]: 'None',
  [1]: 'Human',
  [2]: 'NightElf',
  [3]: 'Dwarf',
  [4]: 'Gnome',
  [5]: 'Orc',
  [6]: 'Troll',
  [7]: 'Forsaken',
  [8]: 'Tauren',
};
const DEFAULT_CHARACTER_RACE = 0;

const POWER_TYPES = {
  [0]: 'Mana',
  [1]: 'Rage',
  [2]: 'Focus',
  [3]: 'Energy',
};
const DEFAULT_POWER_TYPE = 0;

const INVENTORY_SLOTS = {
  [0]: 'HEADSLOT',
  [1]: 'NECKSLOT',
  [2]: 'SHOULDERSLOT',
  [3]: 'BACKSLOT',
  [4]: 'CHESTSLOT',
  [5]: 'SHIRTSLOT',
  [6]: 'TABARDSLOT',
  [7]: 'WRISTSLOT',
  [8]: 'HANDSSLOT',
  [9]: 'WAISTSLOT',
  [10]: 'LEGSSLOT',
  [11]: 'FEETSLOT',
  [12]: 'FINGER0SLOT',
  [13]: 'FINGER1SLOT',
  [14]: 'TRINKET0SLOT',
  [15]: 'TRINKET1SLOT',
  [16]: 'MAINHANDSLOT',
  [17]: 'SECONDARYHANDSLOT',
  [18]: 'RANGEDSLOT',
};
const SUPPORTED_EQUIPMENT_SLOTS = 19;

const DEFAULT_QUALITY = 0;

const FIELD_SEPARATOR = '$';
const VALUE_SEPARATOR = '-';
const SUB_VALUE_SEPARATOR = '+';
const IDX_ITEM_ID = 0;
const IDX_ITEM_ENCHANT = 1;
const IDX_ITEM_SUFFIX = 2;
const FIELD_INDEX_CLASS = 0;
const FIELD_INDEX_RACE = 1;
const FIELD_INDEX_LEVEL = 2;
const FIELD_INDEX_TALENTS = 3;
const FIELD_INDEX_EQUIPMENT = 4;
const FIELD_INDEX_CURRENT_HP = 5;
const FIELD_INDEX_MAX_HP = 6;
const FIELD_INDEX_POWER_TYPE = 7;
const FIELD_INDEX_CURRENT_POWER = 8;
const FIELD_INDEX_MAX_POWER = 9;
const FIELD_INDEX_GOLD = 10;
const FIELD_INDEX_DEAD_OR_GHOST = 11;
const VALUE_DEAD_OR_GHOST = "1";

let wowheadItemCache = {};

let parseBase32Int = (value) => {
  if (!value) {
    return undefined;
  }
  let total = 0;
  let power = 0;
  for (let i = value.length - 1; i >= 0; i--) {
    const char = value.charAt(i);
    total += Math.pow(32, power) * BASE_32_ALPHABET[char];
    power++;
  }
  return total;
};

let decodeClass = (fields) => {
  let classId = parseInt(fields[FIELD_INDEX_CLASS]) || DEFAULT_CHARACTER_CLASS;
  let className = CHARACTER_CLASSES[classId];
  if (!className) {
    classId = DEFAULT_CHARACTER_CLASS;
    className = CHARACTER_CLASSES[classId];
  }
  return {
    Type: classId,
    Name: className,
  };
};

let decodeRace = (fields) => {
  let raceId = parseInt(fields[FIELD_INDEX_RACE]) || DEFAULT_CHARACTER_RACE;
  let raceName = CHARACTER_RACES[raceId];
  if (!raceName) {
    raceId = DEFAULT_CHARACTER_RACE;
    raceName = CHARACTER_RACES[raceId];
  }
  return {
    Type: raceId,
    Name: raceName,
  };
};

let decodeLevel = (fields) => {
  return parseBase32Int(fields[FIELD_INDEX_LEVEL]) || 0;
};

let decodeHitPoints = (fields) => {
  return {
    Max: parseBase32Int(fields[FIELD_INDEX_MAX_HP]) || 0,
    Current: parseBase32Int(fields[FIELD_INDEX_CURRENT_HP]) || 0,
  }
};

let decodePower = (fields) => {
  let powerType = parseInt(fields[FIELD_INDEX_POWER_TYPE]) || DEFAULT_POWER_TYPE;
  let powerName = POWER_TYPES[powerType];
  if (!powerName) {
    powerType = DEFAULT_POWER_TYPE,
    powerName = POWER_TYPES[powerType];
  }
  return [{
    Type: powerType,
    Name: powerName,
    Max: parseBase32Int(fields[FIELD_INDEX_MAX_POWER]) || 0,
    Current: parseBase32Int(fields[FIELD_INDEX_CURRENT_POWER]) || 0,
  }];
};

let decodeGold = (fields) => {
  return parseBase32Int(fields[FIELD_INDEX_GOLD]) || 0;
};

let decodeTalents = (fields) => {
  return {
    ExportString: fields[FIELD_INDEX_TALENTS] || undefined,
  }
};

let decorateSingleItemData = async(item) => {
  if (!item) {
    return;
  }
  const itemId = item.ItemId;
  const suffix = item.SuffixId ? `&rand=${item.SuffixId}` : '';
  const itemKey = `${itemId}${suffix}`;

  // First try: cache
  let wowheadItemData = wowheadItemCache[itemKey];

  // Second try: wowhead API
  // TODO: retry wowhead
  if (!wowheadItemData) {
    try {
      const response = await fetch(`https://nether.wowhead.com/tooltip/item/${itemKey}&dataEnv=4&locale=0`);
      if (response.ok) {
        wowheadItemData = await response.json();
        wowheadItemCache[itemKey] = wowheadItemData;
        console.log(`Fetched new Wowhead item data for key: ${itemKey}`);
      } else {
        console.error(`Obtained unexpected ${response.status} response from Wowhead`);
      }
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  }
  // If we couldn't get from either cache or Wowhead, desist
  if (!wowheadItemData) {
    return;
  }
  item.WowheadIconUrl = wowheadItemData.icon ? `https://wow.zamimg.com/images/wow/icons/large/${wowheadItemData.icon}.jpg` : undefined;
  item.WowheadItemUrl = `https://www.wowhead.com/classic/item=${itemId}`;
  item.WowheadItemName = wowheadItemData.name ? wowheadItemData.name : undefined;
  item.WowheadQualityId = wowheadItemData.quality ? wowheadItemData.quality : DEFAULT_QUALITY;
}; 

let decorateAllItemData = async (items) => {
  let promises = [];
  items.forEach(item => {
    promises.push(decorateSingleItemData(item));
  });
  await Promise.allSettled(promises);
};

let decodeEquippedItem = (itemData, inventorySlotIndex) => {
  if (!itemData || typeof itemData !== 'string') {
    return undefined;
  }
  let itemDataParts = itemData.split(SUB_VALUE_SEPARATOR);
  const itemId = parseBase32Int(itemDataParts[IDX_ITEM_ID]);
  if (!itemId) {
    return undefined;
  }
  
  return {
    ItemId: itemId,
    InventorySlot: INVENTORY_SLOTS[inventorySlotIndex],
    EnchantId: parseBase32Int(itemDataParts[IDX_ITEM_ENCHANT]),
    SuffixId: parseBase32Int(itemDataParts[IDX_ITEM_SUFFIX]),
  }; 
};

let decodeEquippedItems = (fields) => {
  const fieldValue = fields[FIELD_INDEX_EQUIPMENT];
  if (!fieldValue || typeof fieldValue !== 'string') {
    return undefined;
  }
  let items = [];
  let itemIds = fieldValue.split(VALUE_SEPARATOR);
  for (let i = 0; i < SUPPORTED_EQUIPMENT_SLOTS; i++) {
    items.push(decodeEquippedItem(itemIds[i], i));
  }
  return items;
};

// Returns true if character is dead or ghost
let decodeDeadOrGhost = (fields) => {
  return fields[FIELD_INDEX_DEAD_OR_GHOST] === VALUE_DEAD_OR_GHOST;
};

let decodeQRMessage = (qrMessage) => {
  if (!qrMessage || typeof qrMessage !== 'string') {
    console.warn(`Attempted to decode a falsy or non-string QR Message. Ignoring.`)
    return undefined;
  }
  let decodedQR = {
    SnapshotCreatedTime: Date.now(),
    CharacterStatus: {},
  };

  const fields = qrMessage.split(FIELD_SEPARATOR);
  decodedQR.CharacterStatus.EquippedItems = decodeEquippedItems(fields);
  decorateAllItemData(decodedQR.CharacterStatus.EquippedItems);
  decodedQR.CharacterStatus.Class = decodeClass(fields);
  decodedQR.CharacterStatus.Race = decodeRace(fields);
  decodedQR.CharacterStatus.Level = decodeLevel(fields);
  decodedQR.CharacterStatus.HitPoints = decodeHitPoints(fields);
  decodedQR.CharacterStatus.Power = decodePower(fields);
  decodedQR.CharacterStatus.Gold = decodeGold(fields);
  decodedQR.CharacterStatus.Talents = decodeTalents(fields);
  decodedQR.CharacterStatus.DeadOrGhost = decodeDeadOrGhost(fields);
  return decodedQR;
};

