const videoElem = document.getElementById("videoPlayer");
const startScanningElem = document.getElementById("startScanning");
const stopScanningElem = document.getElementById("stopScanning");
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d", { willReadFrequently: true });

const SAMPLE_FREQUENCY_MS = 1000;

let qrSize = 250;
let qrX = 0;
let qrY = 0;

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

let resizeVideo = () => {
  videoElem.setAttribute('width', qrSize);
  videoElem.setAttribute('height', qrSize);
  videoElem.style['object-position'] = `${qrX}px ${qrY}px`;
};

let sendPubSubMessage = async (message) => {
  const body = {
    target: 'broadcast',
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

let trySampleStreamForQR = () => {
  const videoHeight = videoElem.videoHeight;
  const videoWidth = videoElem.videoWidth;
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const qrSize = 117;
  context.drawImage(videoElem, 0, 0, videoWidth, videoHeight);
  const img = context.getImageData(qrX, qrY, qrSize, qrSize);
  //const frame = canvas.toDataURL("image/png");
  try {
    const code = jsQR(img.data, qrSize, qrSize, 'dontInvert');
    if (!!code && code.data !== latestQrMessage) {
      latestQrMessage = code.data;
      latestDecodedQr = decodeQRMessage(code.data);
      console.log(`Latest QR Message: ${latestQrMessage}`);
      console.log(`Latest Decoded QR: ${JSON.stringify(latestDecodedQr)}`);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
  }
  sendPubSubMessage(latestDecodedQr);
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

startScanningElem.addEventListener("click", startScanning);
stopScanningElem.addEventListener("click", stopScanning);