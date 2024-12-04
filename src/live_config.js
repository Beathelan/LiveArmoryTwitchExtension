const openScannerElem = document.getElementById("openScanner");

var token, userId;
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
  // save our credentials
  token = auth.token; //JWT passed to backend for authentication 
  userId = auth.userId; //opaque userID 
  channelID = auth.channelId;
  if (scannerWindow) {
    scannerWindow.token = token;
  }
});

let openScannerWindow = () => {
  console.log('Attempting to open scanner');
  scannerWindow = open('qr_capture.html', 'qrScanner');
  console.log(`Opened scanner and scannerWindow's name is ${scannerWindow.name}`);
  scannerWindow.token = token;
};

openScannerElem.addEventListener("click", openScannerWindow);



