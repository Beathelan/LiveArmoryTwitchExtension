const videoElem = document.getElementById("videoPlayer");
const startScanningElem = document.getElementById("startScanning");
const stopScanningElem = document.getElementById("stopScanning");
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const formQrPos = document.getElementById("formQrPos");
const btnResetQrPos = document.getElementById("btnResetQrPos");
const btnCanvasSelect = document.getElementById("btnCanvasSelect");
const canvasSelect = document.getElementById("canvasSelect");
const videoWrapper = document.getElementById("videoWrapper");
const btnSaveQrPos = document.getElementById("btnSaveQrPos");
const btnStopBroadcast = document.getElementById("btnStopBroadcast");

const SAMPLE_FREQUENCY_MS = 1000;
const MIN_SAMPLE_FREQUENCY_MS = 1000;
const VIDEO_WRAPPER_PADDING = 15; 

let captureSettings = {
  qrWidth: configCache.qrWidth || CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrWidth,
  qrHeight: configCache.qrHeight || CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrHeight,
  qrX: configCache.qrX || CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrX,
  qrY: configCache.qrY || CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrY,
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

let resizeVideo = () => {
  // TODO: video size works wierdly when one dimension has a value and the other one is 'auto'
  videoElem.style['width'] = captureSettings.qrWidth > 0 ? `${captureSettings.qrWidth}px` : 'auto';
  videoElem.style['height'] = captureSettings.qrHeight > 0 ? `${captureSettings.qrHeight}px` : 'auto';
  videoElem.style['object-position'] = `${captureSettings.qrX * -1}px ${captureSettings.qrY * -1}px`;
};

let sendPubSubMessage = async (message, target) => {
  const body = {
    target: target || 'broadcast',
    broadcaster_id: auth.channelId,
    message: JSON.stringify(message),
    is_global_broadcast: false,
  };
  const uri = 'https://api.twitch.tv/helix/extensions/pubsub';

  const headers = new Headers();
  headers.append(`Authorization`, `Bearer ${auth.token}`);
  headers.append(`Client-Id`, `bi2i06banhj1cx7cv05uiy447hhu59`);
  headers.append(`Content-Type`, `application/x-www-form-urlencoded`);

  try {
    const response = await fetch(uri, {
      method: 'POST',
      body: new URLSearchParams(body),
      headers: headers,
    });
    if (response.ok) {
      console.log(`Successfully sent message to Twitch PubSub`); 
    } else {
      console.error(`Obtained unexpected ${response.status} response from Twitch PubSub`);
    }
  } catch (error) {
    console.error(`Error: ${err}`);
  }
};

let trySampleStreamForQR = async () => {
  if (!captureStream) {
    // Can't sample stream if there is no stream!
    return;
  }
  canvas.width = captureSettings.qrWidth;
  canvas.height = captureSettings.qrHeight;
  context.drawImage(videoElem, captureSettings.qrX, captureSettings.qrY, captureSettings.qrWidth, captureSettings.qrHeight, 0, 0, captureSettings.qrWidth, captureSettings.qrHeight);
  const img = context.getImageData(0, 0, captureSettings.qrWidth, captureSettings.qrHeight);
  //const frame = canvas.toDataURL("image/png");
  //console.log(frame);
  try {
    const code = jsQR(img.data, captureSettings.qrWidth, captureSettings.qrHeight, 'dontInvert');
    if (!!code) {
      if (code.data !== latestQrMessage) {
        latestQrMessage = code.data;
        latestDecodedQr = await decodeQRMessage(code.data);
        console.log(`Latest QR Message: ${latestQrMessage}`);
        console.log(`Latest Decoded QR: ${JSON.stringify(latestDecodedQr)}`);
        sendPubSubMessage(latestDecodedQr);
      } else {
        console.log(`Code hasn't changed`);
      }
    } else {
      console.log('Could not find code...');
    }
  } catch (error) {
    console.error(`Error: ${error}`);
  }
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
  startScanningElem.classList.add('hidden');
  stopScanningElem.classList.remove('hidden');
  videoElem.srcObject = captureStream;
  captureStream.getVideoTracks()[0].addEventListener('ended', () => {
    console.log(`Capture stream has ended externally`);
    cleanUpAfterStopScanning();
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  videoWrapper.classList.remove('hidden');
  defaultQrDimensions();
  bindFormToSettings();
  resizeVideo();
  trySampleStreamForQR();
  formQrPos.classList.remove('hidden');
};

let stopScanning = async () => {
  if (!captureStream) {
    console.warn(`Attempted to stop a capture stream but we're already capturing. Aborting.`);
    return;
  }
  console.log(`Stopping the capture stream!`);
  let tracks = captureStream.getTracks();
  tracks.forEach((track) => track.stop());
  cleanUpAfterStopScanning();
};

let cleanUpAfterStopScanning = () => {
  stopBroadcasting();
  videoElem.srcObject = null;
  captureStream = undefined;
  latestQrMessage = undefined;
  latestDecodedQr = undefined;
  formQrPos.classList.add('hidden');
  startScanningElem.classList.remove('hidden');
  stopScanningElem.classList.add('hidden');
  videoWrapper.classList.add('hidden');
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
  btnResetQrPos.addEventListener("click", (event) => {
    resetQrPosition();
  });
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
      canvasCapture.context.fillStyle = 'rgba(255, 0, 0, 0.25)';
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
  console.log(`videoElem.videoWidth: ${videoElem.videoWidth}`);
  console.log(`videoElem.videoHeight: ${videoElem.videoHeight}`);
  captureSettings.qrWidth = captureSettings.qrWidth || videoElem.videoWidth;
  captureSettings.qrHeight = captureSettings.qrHeight || videoElem.videoHeight;
}

function initCanvasSelect() {
  canvasSelect.width = videoElem.offsetWidth + 2 * VIDEO_WRAPPER_PADDING;
  canvasSelect.height = videoElem.offsetHeight + 2 * VIDEO_WRAPPER_PADDING;
  canvasSelect.classList.remove('hidden');
}

function endCanvasSelect() {
  canvasSelect.classList.add('hidden');
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
  captureSettings.qrX += originX;
  captureSettings.qrY += originY;
  bindFormToSettings();
  resizeVideo();
  trySampleStreamForQR();
}

async function saveAndStartBroadcasting() {
  const settingsToSave = {
    qrWidth: captureSettings.qrWidth,
    qrHeight: captureSettings.qrHeight,
    qrX: captureSettings.qrX,
    qrY: captureSettings.qrY,
  }
  sendPubSubMessage({
    [PUB_SUB_WRAPPER_COMMAND]: PUB_SUB_COMMAND_UPDATE_SETTINGS,
    [PUB_SUB_WRAPPER_PAYLOAD]: settingsToSave,
  }, `whisper-${auth.userId}`);
  startBroadcasting();
}

function startBroadcasting() {
  btnStopBroadcast.classList.remove('hidden');
  btnSaveQrPos.classList.add('hidden');
  broadcasting = true;
  sampleInterval = setInterval(trySampleStreamForQR, SAMPLE_FREQUENCY_MS);
}

function stopBroadcasting() {
  btnStopBroadcast.classList.add('hidden');
  btnSaveQrPos.classList.remove('hidden');
  broadcasting = false;
  clearInterval(sampleInterval);
}

startScanningElem.addEventListener("click", startScanning);
stopScanningElem.addEventListener("click", stopScanning);
btnSaveQrPos.addEventListener("click", saveAndStartBroadcasting);
btnStopBroadcast.addEventListener("click", stopBroadcasting);
videoWrapper.style['padding'] = `${VIDEO_WRAPPER_PADDING}px`;

const blockFormSubmit = (event) =>
  event.key === 'Enter' &&
  event.target.closest('form input') &&
  event.preventDefault();

globalThis.document.addEventListener('keypress', blockFormSubmit);

initForm();