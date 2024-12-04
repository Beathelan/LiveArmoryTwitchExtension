const videoElem = document.getElementById("videoPlayer");
const startScanningElem = document.getElementById("startScanning");
const stopScanningElem = document.getElementById("stopScanning");
const canvas = document.createElement("canvas");
const context = canvas.getContext("2d", { willReadFrequently: true });

const SAMPLE_FREQUENCY_MS = 1000;

let qrSize = 250;
let qrX = 0;
let qrY = 0;

let token = window.token || undefined;

let captureStream;
let sampleInterval;

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


let trySampleStreamForQR = () => {
  clearInterval(sampleInterval);
  console.log(`About to sample stream for QR`);
  const videoHeight = videoElem.videoHeight;
  const videoWidth = videoElem.videoWidth;
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const qrSize = 117;
  context.drawImage(videoElem, 0, 0, videoWidth, videoHeight);
  const img = context.getImageData(qrX, qrY, qrSize, qrSize);
  //const frame = canvas.toDataURL("image/png");
  const code = jsQR(img.data, qrSize, qrSize, 'dontInvert');
  console.log(code);
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
};



async function startCapture(displayMediaOptions) {
  let captureStream;

  try {
    captureStream =
      await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
  } catch (err) {
    console.error(`Error: ${err}`);
  }
  return captureStream;
};

startScanningElem.addEventListener("click", startScanning);
stopScanningElem.addEventListener("click", stopScanning);