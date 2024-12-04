const openScannerElem = document.getElementById("openScanner");

var auth;
var options = [];

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;
let scannerWindow;




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
    //scannerWindow.channelID = channelID;
  }
});

let openScannerWindow = () => {
  console.log('Attempting to open scanner');
  scannerWindow = open('qr_capture.html', 'qrScanner');
  console.log(`Opened scanner and scannerWindow's name is ${scannerWindow.name}`);
  scannerWindow.auth = auth;
};

openScannerElem.addEventListener("click", openScannerWindow);



