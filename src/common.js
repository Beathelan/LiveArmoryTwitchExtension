// code common to viewers and streamers goes here
const SUPPORTED_EQUIPMENT_SLOTS = 19; 

const CONFIG_VERSION = '0.1.0';

const CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS = {
  includeNameplate: true,
  includeEquipment: true,
  includeTalents: true,
  includeGold: false,
  qrWidth: 0,
  qrHeight: 0,
  qrX: 0,
  qrY: 0, 
};

const SUPPORTED_SCANNER_SETTINGS = ['qrSize', 'qrX', 'qrY'];

function bindConfigToTextbox(id, value) {
  const textbox = document.getElementById(id);
  if (textbox) {
    textbox.value = value;
    textbox.disabled = false;
  }
}

function bindConfigToCheckbox(id, value) {
  const checkbox = document.getElementById(id);
  if (checkbox) {
    checkbox.checked = !!value;
    checkbox.disabled = false;
  }
}