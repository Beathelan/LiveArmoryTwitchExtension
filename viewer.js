let token, userId;
let isListening = false;
const wowheadTalentCalcUrlTemplate = "https://classic.wowhead.com/talent-calc/embed/{{className}}/{{exportString}}";
let lastWowheadTalentCalcUrl;

// so we don't have to write this out everytime 
const twitch = window.Twitch.ext;

let getWowheadTalentCalcUrl = (data) => {
  if (!data?.CharacterStatus?.Class?.Name) {
    // Class name is required to build wowhead URL
    console.log('Class name missing');
    return null;
  }
  if (!data?.CharacterStatus?.Talents?.ExportString) {
    // Talents ExportString is required to build wowhead URL
    console.log('ExportString missing');
    return null;
  }
  return `https://classic.wowhead.com/talent-calc/embed/${data.CharacterStatus.Class.Name.toLowerCase()}/${data.CharacterStatus.Talents.ExportString}`;
};

// callback called when context of an extension is fired 
twitch.onContext((context) => {
  console.log(`onContext fired with: ${JSON.stringify(context)}`);
});


// onAuthorized callback called each time JWT is fired
twitch.onAuthorized((auth) => {
  // save our credentials
  console.log(`onAuthorized fired for user: ${auth.userId}`);
  token = auth.token;  
  userId = auth.userId; 
  if (!isListening) {
    twitch.listen('broadcast', (target, contentType, message) => {
      console.log(`PubSub message recieved with target: ${target}, contentType: ${contentType} and message: ${message}`);
      $("#charData").text(message);
      let jsonMessage = JSON.parse(message);
      let wowheadTalentCalcUrl = getWowheadTalentCalcUrl(jsonMessage);
      if (wowheadTalentCalcUrl !== lastWowheadTalentCalcUrl) {
        lastWowheadTalentCalcUrl = wowheadTalentCalcUrl;
        console.log(`New Wowhead Talent Calc URL: ${wowheadTalentCalcUrl}`);
        $('#app .wowhead-embed.wowhead-embed-talent-calc').remove();
        if (wowheadTalentCalcUrl) {
          let newHref = $(`<a id="wowheadTalentCalcLink" href="${wowheadTalentCalcUrl}">Mouseover to see talents</a>`);
          $('#app').append(newHref);  
        }
      }
    });
    isListening = true;
  }
  console.log('Now listening for broadcast messages');
});

twitch.configuration.onChanged(function() {
  // Checks if configuration is defined
  if (twitch.configuration.broadcaster) {
    try {
      // Parsing the array saved in broadcaster content
      var config = JSON.parse(twitch.configuration.broadcaster.content);
      
      // Checking the content is an object
      if (typeof config === 'object') {
        // Updating the value of the options array to be the content from config
        options = config;
      } else {
        console.error('Broadcaster config is invalid (not an object)');
      }
    } catch (e) {
      console.error('Broadcaster config is invalid with exception)', e);
    }
  } else {
    console.info('Broadcaster config not defined');
  }
});