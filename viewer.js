let token, userId;
let isListening = false;
const wowheadTalentCalcUrlTemplate = "https://classic.wowhead.com/talent-calc/embed/{{className}}/{{exportString}}";
let lastWowheadTalentCalcUrl;
let lastEquipment;
let lastCharacterClass;
let lastDeadOrGhost = false;

const SUPPORTED_EQUIPMENT_SLOTS = 19; 
const CLASS_HIDDEN = "hidden";

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;
const EQUIPMENT_SLOT_PLACEHOLDERS = [
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_head.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_neck.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_shoulder.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_chest.jpg', // cloak
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_chest.jpg', // chest
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_shirt.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_tabard.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_wrists.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_hands.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_waist.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_legs.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_feet.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_finger.jpg', // finger slot 0
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_finger.jpg', // finger slot 1
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_trinket.jpg', // trinket slot 0
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_trinket.jpg', // trinket slot 1
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_mainhand.jpg', 
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_offhand.jpg',
  'https://wow.zamimg.com/images/wow/icons/large/inventoryslot_ranged.jpg', // TODO: replace with relic for Paladin, Shaman, Druid
];

const BG_COLORS_PER_POWER_TYPE = {
  hp: '#007300',
  mana: '#0000FF',
  energy: '#C7A914',
  rage: '#FF0000',
  focus: '#FF8040',
}

let getWowheadTalentCalcUrl = (characterStatus) => {
  if (!characterStatus?.Class?.Name) {
    // Class name is required to build wowhead URL
    console.warn('Class name missing');
    return null;
  }
  if (!characterStatus?.Talents?.ExportString) {
    // Talents ExportString is required to build wowhead URL
    console.warn('ExportString missing');
    return null;
  }
  return `https://classic.wowhead.com/talent-calc/embed/${characterStatus.Class.Name.toLowerCase()}/${characterStatus.Talents.ExportString}`;
};

let refreshEquipmentDisplay = (equipment) => {
  let divSelector = `#equipment`;
  if (!equipment) {
    $(divSelector).addClass(CLASS_HIDDEN);
    return;
  }
  $(divSelector).removeClass(CLASS_HIDDEN);
  for (let i = 0; i < Math.min(equipment.length, SUPPORTED_EQUIPMENT_SLOTS); i++) {
    equippedItem = equipment[i];
    if (lastEquipment && lastEquipment.length > i && lastEquipment[i]?.ItemId === equippedItem?.ItemId) {
      // If there is no change from last snapshot, ignore
      continue;
    }
    let slotSelector = `#equipmentSlot-${i}`;
    $(slotSelector).empty();
    $(slotSelector).removeClass (function (index, className) {
      return (className.match(/(^|\s)item-rarity-\S+/g) || []).join(' ');
    });
    if (!equippedItem) {
      // If there is no item, show an empty slot
      $(slotSelector).append(`<ins style="background-image: url('${EQUIPMENT_SLOT_PLACEHOLDERS[i]}')"></ins><del></del>`);
    } else {
      $(slotSelector).addClass(`item-rarity-${equippedItem.WowheadQualityId || 0}`);
      $(slotSelector).append(`<ins style="background-image: url('${equippedItem.WowheadIconUrl}')"></ins><del></del>`);
      $(slotSelector).append(`<a href="${equippedItem.WowheadItemUrl}"></a>`);
    }
  }
  lastEquipment = equipment;
};

let refreshWowheadTalentCalc = (wowheadTalentCalcUrl) => {
  if (wowheadTalentCalcUrl !== lastWowheadTalentCalcUrl) {
    lastWowheadTalentCalcUrl = wowheadTalentCalcUrl;
    console.log(`New Wowhead Talent Calc URL: ${wowheadTalentCalcUrl}`);
    if (wowheadTalentCalcUrl) {
      $('#btnTalents').removeClass('hidden');
    } else {
      $('#btnTalents').addClass('hidden');
    }
  }
};

let getBgGradientForPowerType = (powerType, percent) => {
  let bgColor = BG_COLORS_PER_POWER_TYPE[powerType] || BG_COLORS_PER_POWER_TYPE.hp;
  //return `green`;
  return `linear-gradient(to right, ${bgColor} ${percent}%, rgba(255,0,0,0) ${percent}%, rgba(255,0,0,0) 100%)`
};

let refreshCharacterStatus = (characterStatus) => {
  let level = characterStatus?.Level;
  let characterClass = characterStatus?.Class?.Name;
  let race = characterStatus?.Race?.Name;
  let basicStatusDisplay = 'Adventurer of Azeroth';

  if (!!level && !!characterClass && !!race) {
    basicStatusDisplay = `Level ${level} ${race} ${characterClass}`;
  }

  $('#charBasicData').text(basicStatusDisplay);

  let hpCurrent = 0, hpMax = 0, powerCurrent = 0, powerMax = 0;
  
  hpCurrent = characterStatus?.HitPoints?.Current || hpCurrent;
  hpMax = characterStatus?.HitPoints?.Max || hpMax;
  let hpPercent = hpMax !== 0 ? hpCurrent / hpMax * 100 : 100;

  let hpDisplay = `${hpCurrent}/${hpMax} (${hpPercent.toFixed()}%)`;
  $('#charHP').text(hpDisplay);
  
  $('#charHpBar').css('background', getBgGradientForPowerType('hp', hpPercent));

  let powerTypeName = 'Mana';
  
  if (characterStatus.Power?.length > 0) {
    powerCurrent = characterStatus.Power[0]?.Current || powerCurrent;
    powerMax = characterStatus.Power[0]?.Max || powerMax;
    powerTypeName = characterStatus.Power[0]?.Name || powerTypeName;
  }
  let powerPercent = powerMax !== 0 ? powerCurrent / powerMax * 100 : 100;

  let powerDisplay = `${powerCurrent}/${powerMax} (${powerPercent.toFixed()}%)`;
  $('#charPower').text(powerDisplay);
  $('#charPowerBar').css('background', getBgGradientForPowerType(powerTypeName.toLowerCase(), powerPercent));

  if (lastCharacterClass !== characterClass) {
    $('#charClassIcon').empty();
    $('#charClassIcon').append(`<ins style="background-image: url('https://wow.zamimg.com/images/wow/icons/large/class_${characterClass.toLowerCase()}.jpg')"></ins>`);
    lastCharacterClass = characterClass;
  }

  let money = characterStatus.Gold || 0;
  let gold = Math.floor(money / 10000);
  money = money - gold * 10000;
  let silver = Math.floor(money / 100);
  money = money - silver * 100;
  let copper = money;
  $('#charGold').html(`${gold.toFixed()}<span class="money gold"></span> ${silver.toFixed()}<span class="money silver"></span> ${copper.toFixed()}<span class="money copper"></span>`);
}

let refreshDeadOrGhost = (characterStatus) => {
  if (characterStatus?.DeadOrGhost) {
    $('html').addClass('rip-filter');
  } else {
    $('html').removeClass('rip-filter');
  }
}

// callback called when context of an extension is fired 
twitch.onContext((context) => {
  console.log(`onContext fired with: ${JSON.stringify(context)}`);
});


// onAuthorized callback called each time JWT is fired
twitch.onAuthorized((auth) => {
  // save our credentials
  console.log(`onAuthorized fired for user: ${auth.userId}`);
  token = auth.token;  
  userId = auth.userId; 
  if (!isListening) {
    twitch.listen('broadcast', (target, contentType, message) => {
      // Uncomment to debug comms issues
      //console.log(`PubSub message recieved with target: ${target}, contentType: ${contentType} and message: ${message}`);
      let jsonMessage = JSON.parse(message);
      if (!jsonMessage.CharacterStatus) {
        console.warn('PubSub message must contain CharacterStatus');
        return;
      }
      let characterStatus = jsonMessage.CharacterStatus;
      refreshCharacterStatus(characterStatus);
      refreshDeadOrGhost(characterStatus);
      let wowheadTalentCalcUrl = getWowheadTalentCalcUrl(characterStatus);
      refreshWowheadTalentCalc(wowheadTalentCalcUrl);
      let equipment = jsonMessage.CharacterStatus?.EquippedItems;
      refreshEquipmentDisplay(equipment);
      $('#mainUnitData').removeClass(CLASS_HIDDEN);
      $('#noDataPlaceholder').addClass(CLASS_HIDDEN);
    });
    isListening = true;
  }
  console.log('Now listening for broadcast messages');
});

twitch.configuration.onChanged(function() {
  // Checks if configuration is defined
  if (twitch.configuration.broadcaster) {
    try {
      // Parsing the array saved in broadcaster content
      var config = JSON.parse(twitch.configuration.broadcaster.content);
      
      // Checking the content is an object
      if (typeof config === 'object') {
        // Updating the value of the options array to be the content from config
        options = config;
      } else {
        console.error('Broadcaster config is invalid (not an object)');
      }
    } catch (e) {
      console.error('Broadcaster config is invalid with exception)', e);
    }
  } else {
    console.info('Broadcaster config not defined');
  }
});

let showTalents = () => {
  console.log("Showing talents");
  let newHref = $(`<a id="wowheadTalentCalcLink" class="full-screen-link" href="${lastWowheadTalentCalcUrl}">Mouseover to load</a>`);
  $('#talentsWrapper').append(newHref); 
  $('#talentsWrapper').removeClass('hidden'); 
};

let hideTalents = () => {
  $('#talentsWrapper .wowhead-embed.wowhead-embed-talent-calc').remove();
  $('#talentsWrapper').addClass('hidden');
}