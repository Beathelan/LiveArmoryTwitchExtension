const openScannerElem = document.getElementById("openScanner");
const formElem = document.getElementById("form");

var auth;
let configCache = {};

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;
let scannerWindow;
let isListening = false;

// onContext callback called when context of an extension is fired 
twitch.onContext((context) => {
  console.log(`onContext fired with: ${JSON.stringify(context)}`);
});

// onAuthorized callback called each time JWT is fired
twitch.onAuthorized((auth) => {
  console.log(`onAuthorized fired`);
  // save our credentials
  window.auth = auth;
  if (scannerWindow) {
    scannerWindow.auth = auth;
  }
  if (!isListening) {
    twitch.listen(`whisper-${auth.userId}`, (target, contentType, message) => {
      console.log(`Got a whisper through PubSub with target: ${target}, contentType: ${contentType} and message: ${message}`);
      message = JSON.parse(message);
      if (message[PUB_SUB_WRAPPER_COMMAND] === PUB_SUB_COMMAND_UPDATE_SETTINGS) {
        storeScannerConfig(message[PUB_SUB_WRAPPER_PAYLOAD]);
      }
    });
    isListening = true;
  }
});

twitch.configuration.onChanged(() => {
  console.log('config changed');
  console.dir(twitch.configuration.broadcaster);
  refreshConfigCache(JSON.parse(twitch.configuration.broadcaster?.content || '{}'));
  initForm();
});

let openScannerWindow = () => {
  console.log('Attempting to open scanner');
  scannerWindow = open('qr_capture.html', 'qrScanner');
  console.log(`Opened scanner and scannerWindow's name is ${scannerWindow.name}`);
  scannerWindow.auth = auth;
  scannerWindow.configCache = configCache;
};

openScannerElem.addEventListener("click", openScannerWindow);

function refreshConfigCache(config) {
  // Merge configs with defaults
  configCache = { ...CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS, ...(config || {}) }
}

function updateConfig(selections) {
  const fullConfig = { ...configCache, ...(selections || {}) };
  const serializedConfig = JSON.stringify(fullConfig);
  console.log(`About to set config: ${serializedConfig}`);
  try {
    twitch.configuration.set('broadcaster', CONFIG_VERSION, serializedConfig);
    configCache = fullConfig;
    if (scannerWindow) {
      scannerWindow.configCache = configCache;
    }
  } catch (error) {
    console.error(`Error: ${err}`);
  }
}

function initForm() {
  console.log(`Binding config to UI: ${JSON.stringify(configCache)}`);
  bindConfigToCheckbox('optNameplate', configCache.includeNameplate);
  bindConfigToCheckbox('optResources', configCache.includeResources);
  bindConfigToCheckbox('optEquipment', configCache.includeEquipment);
  bindConfigToCheckbox('optTalents', configCache.includeTalents);
  bindConfigToCheckbox('optDeadOrGhost', configCache.includeDeadOrGhost);
  bindConfigToCheckbox('optGold', configCache.includeGold);
}

function storeScannerConfig(config) {
  let selections = {};
  for (const supportedSetting of SUPPORTED_SCANNER_SETTINGS) {
    if (config.hasOwnProperty(supportedSetting)) {
      selections[supportedSetting] = config[supportedSetting];
    }
  }
  updateConfig(selections);
}

formElem.addEventListener('submit', (event) => {
  event.preventDefault();
  let selections = {};
  document.querySelectorAll(`input[type=checkbox]`).forEach((checkbox) => {
    selections[checkbox.value] = !!checkbox.checked;
  });
  updateConfig(selections);
  const txtSettingsSaved = document.getElementById('txtSettingsSaved');
  txtSettingsSaved.classList.add('visible');
  setTimeout(() => txtSettingsSaved.classList.remove('visible'), 750);
});

