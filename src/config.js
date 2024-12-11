var token, userId;
var options = [];

const jwtFetchUrl = 'https://us-central1-wow-character-status-auth.cloudfunctions.net/twitch-jwt-get';

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;

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
  $('#channelID').text(channelID);
  updateJWT();
});

let retryUpdateJWT = () => {
  updateJWT();
}

let updateJWT = async (token) => {
  $('#lblTokenInProgress').removeClass(CLASS_HIDDEN);
  $('#divTokenSuccess').addClass(CLASS_HIDDEN);
  $('#lblTokenError').addClass(CLASS_HIDDEN);
  const jwt = await fetchPubSubJwt(token);
  $('#lblTokenInProgress').addClass(CLASS_HIDDEN);
  if (jwt) {
    $('#divTokenSuccess').removeClass(CLASS_HIDDEN);
    $('#lblTokenOutput').text(jwt);
  } else {
    $('#lblTokenError').removeClass(CLASS_HIDDEN);
  }
}

let fetchPubSubJwt = async () => {
  try {
    const response = await fetch(jwtFetchUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
      }
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    const jwt = await response.text();
    console.log(`Got JWT from service: ${jwt}`);
    return jwt;
  } catch (error) {
    console.error(error.message);
  }
};

let copyTokenToClipboard = () => {
  const jwt = $('#lblTokenOutput').text();
  navigator.clipboard.writeText(jwt);
}