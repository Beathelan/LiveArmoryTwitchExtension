const videoElem = document.getElementById("videoPlayer");
const startScanningElem = document.getElementById("startScanning");
const stopScanningElem = document.getElementById("stopScanning");
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const formQrPos = document.getElementById("formQrPos");
const btnResetQrPos = document.getElementById("btnResetQrPos");
const btnCanvasSelect = document.getElementById("btnCanvasSelect");
const canvasSelect = document.getElementById("canvasSelect");

const SAMPLE_FREQUENCY_MS = 1000;
const MIN_SAMPLE_FREQUENCY_MS = 1000;

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
  const videoHeight = videoElem.videoHeight;
  const videoWidth = videoElem.videoWidth;
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  context.drawImage(videoElem, 0, 0, videoWidth, videoHeight);
  const img = context.getImageData(captureSettings.qrX, captureSettings.qrY, captureSettings.qrWidth, captureSettings.qrHeight);
  //const frame = canvas.toDataURL("image/png");
  try {
    const code = jsQR(img.data, captureSettings.qrWidth, captureSettings.qrHeight, 'dontInvert');
    if (!!code) {
      if (code.data !== latestQrMessage) {
        latestQrMessage = code.data;
        latestDecodedQr = await decodeQRMessage(code.data);
        console.log(`Latest QR Message: ${latestQrMessage}`);
        console.log(`Latest Decoded QR: ${JSON.stringify(latestDecodedQr)}`);
        sendPubSubMessage(latestDecodedQr);
        //sendPubSubMessage({ captureSettings.qrWidth, captureSettings.qrHeight, captureSettings.qrX, captureSettings.qrY }, `whisper-${auth.userId}`);
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
    console.log(`Attempted to start a new capture stream but we're already capturing. Aborting.`);
    return;
  }
  console.log(`Attempting to start a capture stream`);
  captureStream = await startCapture(displayMediaOptions);
  videoElem.srcObject = captureStream;
  captureStream.getVideoTracks()[0].addEventListener('ended', () => {
    console.log(`Capture stream has ended externally`);
    clearCaptureStream();
  });
  console.log(`Got a capture stream!`);
  sampleInterval = setInterval(trySampleStreamForQR, SAMPLE_FREQUENCY_MS);
  resizeVideo();
  formQrPos.classList.remove('hidden');
};

let stopScanning = async () => {
  if (!captureStream) {
    console.log(`Attempted to start a stop capture stream but we're already capturing. Aborting.`);
    return;
  }
  console.log(`Stopping the capture stream!`);
  let tracks = captureStream.getTracks();
  tracks.forEach((track) => track.stop());
  clearCaptureStream();
};

let clearCaptureStream = () => {
  videoElem.srcObject = null;
  captureStream = undefined;
  clearInterval(sampleInterval);
  latestQrMessage = undefined;
  latestDecodedQr = undefined;
  formQrPos.classList.add('hidden');
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
  console.log(`Binding config to UI: ${JSON.stringify(configCache)}`);
  bindFormToSettings();
  for (const settingName in captureSettingsElemIds) {
    const elemId = captureSettingsElemIds[settingName];
    document.getElementById(elemId).addEventListener("change", (event) => {
      captureSettings[settingName] = parseInt(event.target.value) || 0;
      resizeVideo();
    });
  }
  videoElem.addEventListener("click", (event) => {
     console.log(`clicked video at (${event.offsetX},${event.offsetY})`);
  });
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
    qrWidth: CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrWidth,
    qrHeight: CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrHeight,
    qrX: CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrX,
    qrY: CONFIG_DISPLAY_SETTINGS_CLASSIC_DEFAULTS.qrY,
  };
  bindFormToSettings();
  resizeVideo();
}

function initCanvasSelect() {
  canvasSelect.width = videoElem.offsetWidth;
  canvasSelect.height = videoElem.offsetHeight;
  canvasSelect.classList.remove('hidden');
}

function endCanvasSelect() {
  canvasSelect.classList.add('hidden');
}

function setCaptureSettingsFromCanvasSelect() {
  captureSettings.qrWidth = canvasCapture.mouseX - canvasCapture.lastMouseX;
  captureSettings.qrHeight = canvasCapture.mouseY - canvasCapture.lastMouseY;
  captureSettings.qrX += canvasCapture.lastMouseX;
  captureSettings.qrY += canvasCapture.lastMouseY;
  bindFormToSettings();
  resizeVideo();
}

startScanningElem.addEventListener("click", startScanning);
stopScanningElem.addEventListener("click", stopScanning);

initForm();