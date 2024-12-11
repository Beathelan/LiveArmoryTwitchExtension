if (typeof configCache === 'undefined' || typeof auth === 'undefined') {
  document.body.innerHTML = '<div class="wrong-context">This page can only be launched from the extension configuration (or live config) page by clicking the "Open Scanner" button. DO NOT refresh it. Please close it and go back to the configuration page.</div>';
  throw 'This page was not opened from the correct context.';
}

const videoElem = document.getElementById("videoPlayer");
const startScanningElem = document.getElementById("startScanning");
const stopScanningElem = document.getElementById("stopScanning");
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const formQrPos = document.getElementById("formQrPos");
const btnCanvasSelect = document.getElementById("btnCanvasSelect");
const canvasSelect = document.getElementById("canvasSelect");
const canvasSelectOverlay = document.getElementById("canvasSelectOverlay");
const videoWrapper = document.getElementById("videoWrapper");
const btnStartBroadcast = document.getElementById("btnStartBroadcast");
const btnStopBroadcast = document.getElementById("btnStopBroadcast");
const qrTestResultDiv = document.getElementById("qrTestResult");
const qrTestResultSummarySpan = document.getElementById("qrTestResultSummary");
const qrTestResultDetailSpan = document.getElementById("qrTestResultDetail");
const btnTestQr = document.getElementById("btnTestQr");
const scanInProgressDiv = document.getElementById("scanInProgress");
const pubSubResultDiv = document.getElementById("twitchCommsResult");
const pubSubResultSummarySpan = document.getElementById("twitchCommsResultSummary");
const pubSubResultDetailSpan = document.getElementById("twitchCommsResultDetail");

const SAMPLE_FREQUENCY_MS = 1000;
const MIN_SAMPLE_FREQUENCY_MS = 1000;
const VIDEO_WRAPPER_PADDING = 15; 

const CSS_CLASS_QR_TEST_SUCCESS = 'success';
const CSS_CLASS_QR_TEST_FAILURE = 'failure';

let captureSettings = {
  qrWidth: configCache.qrWidth || CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrWidth,
  qrHeight: configCache.qrHeight || CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrHeight,
  qrX: configCache.qrX || CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrX,
  qrY: configCache.qrY || CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrY,
};

let savedSettings = {
  qrWidth: captureSettings.qrWidth,
  qrHeight: captureSettings.qrHeight,
  qrX: captureSettings.qrX,
  qrY: captureSettings.qrY,
};

let canvasCapture = {
  canvasX: canvasSelect.offsetLeft,
  canvasY: canvasSelect.offsetTop,
  lastMouseX: 0,
  lastMouseY: 0,
  mouseDown: false,
  context: canvasSelect.getContext('2d'),
};

let captureStream;
let sampleInterval;
let latestQrMessage;
let latestDecodedQr;
let broadcasting = false;
let lastScanAttemptSucceded = false;
let lastScanAttemptTime;
let lastScanSuccessTime;
let lastPubSubAttemptSucceded = false;
let lastPubSubAttemptTime;
let lastPubSubSuccessTime;

let inFlightScans = 0;

const displayMediaOptions = {
  video: {
    displaySurface: ["window", "monitor"],
  },
  audio:false,
};

const captureSettingsElemIds = {
  qrWidth: 'txtQrWidth',
  qrHeight: 'txtQrHeight',
  qrX: 'txtQrX',
  qrY: 'txtQrY',
};

let resizeVideo = (settings) => {
  let resizeSettings = settings || captureSettings;
  videoElem.style['width'] = `${resizeSettings.qrWidth}px`;
  videoElem.style['height'] = `${resizeSettings.qrHeight}px`;
  videoElem.style['object-position'] = `${resizeSettings.qrX * -1}px ${resizeSettings.qrY * -1}px`;
};

let sendPubSubMessage = async (message, target, keepalive) => {
  //console.log(JSON.stringify(message));
  const body = {
    target: target || PUB_SUB_TARGET_BROADCAST,
    broadcaster_id: auth.channelId,
    message: JSON.stringify(message),
    is_global_broadcast: false,
  };
  const uri = 'https://api.twitch.tv/helix/extensions/pubsub';

  const headers = new Headers();
  headers.append(`Authorization`, `Bearer ${auth.token}`);
  headers.append(`Client-Id`, `bi2i06banhj1cx7cv05uiy447hhu59`);
  headers.append(`Content-Type`, `application/x-www-form-urlencoded`);

  let thisAttemptSucceded = false;
  let thisAttemptTime = new Date();

  try {
    const response = await fetch(uri, {
      method: 'POST',
      body: new URLSearchParams(body),
      headers: headers,
      keepalive: keepalive === true,
    });
    if (response.ok) {
      thisAttemptSucceded = true;
      lastPubSubSuccessTime = thisAttemptTime;
      console.log(`Successfully sent message to Twitch PubSub`); 
    } else {
      console.error(`Obtained unexpected ${response.status} response from Twitch PubSub`);
    }
  } catch (error) {
    console.error(`Error: ${err}`);
  } finally {
    lastPubSubAttemptTime = thisAttemptTime;
    lastPubSubAttemptSucceded = thisAttemptSucceded;
    updatePubSubResult();
  }
};

let trySampleStreamForQR = async () => {
  if (!captureStream) {
    // Can't sample stream if there is no stream!
    return;
  }
  if (inFlightScans > 0) {
    console.warn('Skipped a scan attempt because there were scans in flight');
    return;
  }
  lastScanAttemptTime = new Date();
  addScansInFlight(1);
  setTimeout(async () => {
    lastScanAttemptTime = new Date();
    lastScanAttemptSucceded = false;
    canvas.width = captureSettings.qrWidth;
    canvas.height = captureSettings.qrHeight;
    context.drawImage(videoElem, captureSettings.qrX, captureSettings.qrY, captureSettings.qrWidth, captureSettings.qrHeight, 0, 0, captureSettings.qrWidth, captureSettings.qrHeight);
    const img = context.getImageData(0, 0, captureSettings.qrWidth, captureSettings.qrHeight);
    //const frame = canvas.toDataURL("image/png");
    //console.log(frame);
    try {
      const code = jsQR(img.data, captureSettings.qrWidth, captureSettings.qrHeight, 'dontInvert');
      if (!!code) {
        lastScanAttemptSucceded = true;
        lastScanSuccessTime = lastScanAttemptTime;
        if (code.data !== latestQrMessage) {
          latestQrMessage = code.data;
          console.log(`New QR Message: ${latestQrMessage}`);
        }
        latestDecodedQr = await decodeQRMessage(code.data, configCache);
        saveCaptureSettings();
      } else {
        console.log('Could not find code...');
      }
    } catch (error) {
      console.error(`Error: ${error}`);
    } finally {
      addScansInFlight(-1);
    }
    updateQrTestResult();
    if (broadcasting && !!latestDecodedQr && lastScanAttemptSucceded) {
      sendPubSubMessage(latestDecodedQr);
    }
  }, 50);
};

let startScanning = async () => {
  if (!!captureStream) {
    console.warn(`Attempted to start a new capture stream but we're already capturing. Aborting.`);
    return;
  }
  captureStream = await startCapture(displayMediaOptions);
  if (!captureStream) {
    return;
  }
  console.log(`Got a capture stream!`);
  startScanningElem.classList.add(CLASS_HIDDEN);
  stopScanningElem.classList.remove(CLASS_HIDDEN);
  videoElem.srcObject = captureStream;
  captureStream.getVideoTracks()[0].addEventListener('ended', () => {
    console.log(`Capture stream has ended externally`);
    cleanUpAfterStopScanning();
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  videoWrapper.classList.remove(CLASS_HIDDEN);
  defaultQrDimensions();
  bindFormToSettings();
  resizeVideo();
  trySampleStreamForQR();
  formQrPos.classList.remove(CLASS_HIDDEN);
};

let stopScanning = async () => {
  if (!captureStream) {
    console.warn(`Attempted to stop a capture stream but we're not currently capturing. Aborting.`);
    return;
  }
  console.log(`Stopping the capture stream!`);
  let tracks = captureStream.getTracks();
  tracks.forEach((track) => track.stop());
  cleanUpAfterStopScanning();
};

let cleanUpAfterStopScanning = () => {
  stopBroadcasting();
  resetQrScanningResults();
  resetPubSubResults();
  endCanvasSelect();
  videoElem.srcObject = null;
  captureStream = undefined;
  latestQrMessage = undefined;
  latestDecodedQr = undefined;
  formQrPos.classList.add(CLASS_HIDDEN);
  startScanningElem.classList.remove(CLASS_HIDDEN);
  stopScanningElem.classList.add(CLASS_HIDDEN);
  videoWrapper.classList.add(CLASS_HIDDEN);
};

async function startCapture(displayMediaOptions) {
  let captureStream;
  try {
    captureStream =
      await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
  } catch (error) {
    console.error(`Error: ${error}`);
  }
  return captureStream;
};

function initForm() {
  function onInputValueChange(event, settingName) {
    captureSettings[settingName] = parseInt(event.target.value) || 0;
    resizeVideo();
    trySampleStreamForQR();
  }
  for (const settingName in captureSettingsElemIds) {
    const elemId = captureSettingsElemIds[settingName];
    const elem = document.getElementById(elemId);
    elem.addEventListener("change", (event) => onInputValueChange(event, settingName));
    elem.addEventListener("keypress", (event) => event.key === 'Enter' && onInputValueChange(event, settingName));
  }

  btnCanvasSelect.addEventListener("click", (event) => {
    initCanvasSelect();
  });

  canvasSelect.addEventListener("mousedown", (event) => {
    canvasCapture.lastMouseX = parseInt(event.offsetX);
    canvasCapture.lastMouseY = parseInt(event.offsetY);
    canvasCapture.mouseDown = true;
  });

  canvasSelect.addEventListener("mouseup", (event) => {
    canvasCapture.mouseDown = false;
    canvasCapture.mouseX = parseInt(event.offsetX);
    canvasCapture.mouseY = parseInt(event.offsetY);
    endCanvasSelect();
    setCaptureSettingsFromCanvasSelect();
  });

  canvasSelect.addEventListener("mousemove", (event) => {
    canvasCapture.mouseX = parseInt(event.offsetX);
    canvasCapture.mouseY = parseInt(event.offsetY);
    if (canvasCapture.mouseDown) {
      canvasCapture.context.clearRect(0, 0, canvasCapture.context.canvas.width, canvasCapture.context.canvas.height);
      canvasCapture.context.beginPath();
      let width = canvasCapture.mouseX - canvasCapture.lastMouseX;
      let height = canvasCapture.mouseY - canvasCapture.lastMouseY;
      canvasCapture.context.rect(canvasCapture.lastMouseX, canvasCapture.lastMouseY, width, height);
      canvasCapture.context.fillStyle = 'rgba(255, 0, 0, 0.5)';
      canvasCapture.context.fill();
    }
  });
};

function bindFormToSettings() {
  for (const settingName in captureSettingsElemIds) {
    const elemId = captureSettingsElemIds[settingName];
    bindConfigToTextbox(elemId, captureSettings[settingName]);
  }
}

function resetQrPosition() {
  captureSettings = { 
    qrX: CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrX,
    qrY: CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrY,
  };
  defaultQrDimensions();
  bindFormToSettings();
  resizeVideo();
}

function defaultQrDimensions() {
  captureSettings.qrWidth = captureSettings.qrWidth || videoElem.videoWidth;
  captureSettings.qrHeight = captureSettings.qrHeight || videoElem.videoHeight;
}

function initCanvasSelect() {
  let tempCaptureSettings = { 
    qrX: CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrX,
    qrY: CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrY,
    qrWidth: videoElem.videoWidth,
    qrHeight: videoElem.videoHeight,
  };
  resizeVideo(tempCaptureSettings);

  canvasSelect.width = videoElem.offsetWidth + 2 * VIDEO_WRAPPER_PADDING;
  canvasSelect.height = videoElem.offsetHeight + 2 * VIDEO_WRAPPER_PADDING;
  canvasSelect.classList.remove(CLASS_HIDDEN);
  canvasSelectOverlay.classList.remove(CLASS_HIDDEN);
  canvasSelect.focus();
}

function endCanvasSelect() {
  canvasSelect.classList.add(CLASS_HIDDEN);
  canvasSelectOverlay.classList.add(CLASS_HIDDEN);
  resizeVideo();
}

function setCaptureSettingsFromCanvasSelect() {
  let mouseX = Math.max(0, canvasCapture.mouseX - VIDEO_WRAPPER_PADDING);
  let lastMouseX = Math.max(0, canvasCapture.lastMouseX - VIDEO_WRAPPER_PADDING);
  let mouseY = Math.max(0, canvasCapture.mouseY - VIDEO_WRAPPER_PADDING);
  let lastMouseY = Math.max(0, canvasCapture.lastMouseY - VIDEO_WRAPPER_PADDING);

  let originX = Math.min(mouseX, lastMouseX);
  let originY = Math.min(mouseY, lastMouseY);

  captureSettings.qrWidth = Math.abs(mouseX - lastMouseX);
  captureSettings.qrHeight = Math.abs(mouseY - lastMouseY);
  captureSettings.qrX = originX;
  captureSettings.qrY = originY;

  bindFormToSettings();
  resizeVideo();
  trySampleStreamForQR();
}

function saveCaptureSettings() {
  const settingsToSave = {
    qrWidth: captureSettings.qrWidth,
    qrHeight: captureSettings.qrHeight,
    qrX: captureSettings.qrX,
    qrY: captureSettings.qrY,
  }

  if (JSON.stringify(savedSettings) === JSON.stringify(settingsToSave)) {
    // Do not save if settings have not changed
    return;
  }
  
  savedSettings = settingsToSave;
  sendPubSubMessage({
    [PUB_SUB_WRAPPER_COMMAND]: PUB_SUB_COMMAND_UPDATE_SETTINGS,
    [PUB_SUB_WRAPPER_PAYLOAD]: settingsToSave,
  }, `whisper-${auth.userId}`);
}

function startBroadcasting() {
  if (broadcasting) {
    console.warn('Tried to start broadcasting but already broadcasting. Aborting.')
    return;
  }
  btnStopBroadcast.classList.remove(CLASS_HIDDEN);
  btnStartBroadcast.classList.add(CLASS_HIDDEN);
  broadcasting = true;
  sampleInterval = setInterval(trySampleStreamForQR, SAMPLE_FREQUENCY_MS);
}

function stopBroadcasting() {
  if (!broadcasting) {
    console.warn('Tried to stop broadcasting but not currently broadcasting. Aborting.')
    return;
  }
  btnStopBroadcast.classList.add(CLASS_HIDDEN);
  btnStartBroadcast.classList.remove(CLASS_HIDDEN);
  broadcasting = false;
  clearInterval(sampleInterval);
  sendPubSubMessage({
    [PUB_SUB_WRAPPER_COMMAND]: PUB_SUB_COMMAND_CLEAR_CHARACTER_DATA,
  }, PUB_SUB_TARGET_BROADCAST, true);
  resetPubSubResults();
}

function updateQrTestResult() {
  if (lastScanAttemptTime) {
    qrTestResultDiv.classList.remove(CLASS_HIDDEN);
    if (lastScanAttemptSucceded) {
      qrTestResultSummarySpan.textContent = 'QR looks good!';
      qrTestResultDiv.classList.add(CSS_CLASS_QR_TEST_SUCCESS);
      qrTestResultDiv.classList.remove(CSS_CLASS_QR_TEST_FAILURE);
    } else {
      qrTestResultSummarySpan.textContent = "Can't find QR...";
      qrTestResultDiv.classList.remove(CSS_CLASS_QR_TEST_SUCCESS);
      qrTestResultDiv.classList.add(CSS_CLASS_QR_TEST_FAILURE);
    }
    qrTestResultDetailSpan.textContent = `(last tried ${lastScanAttemptTime.toLocaleString('en-US')}), last successful ${lastScanSuccessTime ? lastScanSuccessTime.toLocaleString('en-US') : 'NEVER'})`;
  } else {
    qrTestResultDiv.classList.add(CLASS_HIDDEN);
  }
}

function updatePubSubResult() {
  if (broadcasting && lastPubSubAttemptTime) {
    pubSubResultDiv.classList.remove(CLASS_HIDDEN);
    if (lastPubSubAttemptSucceded) {
      pubSubResultSummarySpan.textContent = 'Sending data to Twitch!';
      pubSubResultDiv.classList.add(CSS_CLASS_QR_TEST_SUCCESS);
      pubSubResultDiv.classList.remove(CSS_CLASS_QR_TEST_FAILURE);
    } else {
      pubSubResultSummarySpan.textContent = "Twitch connection broken. Please close this tab and go back to settings.";
      pubSubResultDiv.classList.remove(CSS_CLASS_QR_TEST_SUCCESS);
      pubSubResultDiv.classList.add(CSS_CLASS_QR_TEST_FAILURE);
    }
    pubSubResultDetailSpan.textContent = 
      `(last tried ${lastPubSubAttemptTime.toLocaleString('en-US')}, last successful ${lastPubSubSuccessTime ? lastPubSubSuccessTime.toLocaleString('en-US') : 'NEVER'})`;
  } else {
    pubSubResultDiv.classList.add(CLASS_HIDDEN);
  }
}

function resetQrScanningResults() {
  lastScanAttemptSucceded = false;
  lastScanAttemptTime = undefined;
  lastScanSuccessTime = undefined;
  updateQrTestResult();
}

function resetPubSubResults() {
  lastPubSubAttemptSucceded = false;
  lastPubSubAttemptTime = undefined;
  lastPubSubSuccessTime = undefined;
  updatePubSubResult();
}

function addScansInFlight(number) {
  inFlightScans += number;
  if (inFlightScans > 0) {
    scanInProgressDiv.classList.add('visible');
  } else {
    scanInProgressDiv.classList.remove('visible');
  }
}

startScanningElem.addEventListener("click", startScanning);
stopScanningElem.addEventListener("click", stopScanning);
btnStartBroadcast.addEventListener("click", startBroadcasting);
btnStopBroadcast.addEventListener("click", stopBroadcasting);
btnTestQr.addEventListener("click", trySampleStreamForQR);

videoWrapper.style['padding'] = `${VIDEO_WRAPPER_PADDING}px`;

const blockFormSubmit = (event) =>
  event.key === 'Enter' &&
  event.target.closest('form input') &&
  event.preventDefault();

const escapeFromCanvasSelect = (event) => (event.key === 'Escape' || event.key === 'Esc') && endCanvasSelect();
  
globalThis.document.addEventListener('keypress', blockFormSubmit);
globalThis.document.addEventListener('keyup', escapeFromCanvasSelect);
globalThis.window.addEventListener('beforeunload', async () => {
  stopBroadcasting();
}, false);


initForm();