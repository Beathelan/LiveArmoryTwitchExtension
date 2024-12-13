# Live Armory Twitch Extension for WoW Classic

This is a very simple extension mostly for display purposes. It enriches the experience of viewers on World of Warcraft Classic broadcasts by offering them real-time information about the character on screen.

## Supported game versions

* Classic Era (including all 20th anniversary realms)
* Season of Discovery

## Quickstart video guide for broadcasters

Coming soon!

## Viewer experience 

If the channel is offline or there isn't a WoW Classic character being played, the extension displays its "title screen", which is just the name of the extension and a link to the author's channel.

Once the broadcaster starts playing a WoW Classic character, and assuming the broadcaster has done the required configuration, the extension will automatically switch to the "detail screen", which includes some or all of the following information about the character:
* Level
* Race and class
* Current and max HP
* Current and max "power" (i.e. mana, energy or rage)
* Current gold
* Current equipment, presented as icons laid out around the borders of the frame so that they resemble the equipment panel in-game; each icon represents a piece of equipment and can be clicked, which opens the corresponding Wowhead page in a new browser tab. Additionally, if the viewer hovers their mouse over a piece of equipment, its Wowhead-powered tooltip will display containing information such as stats and required level
* A link to Wowhead's talent calculator pre-loaded with the current talent selections

## Broadcaster experience

What information is shown to the viewers is decided by the broadcaster, and can be changed at any time from either the Config or Live Config panels.

The extension makes use of PubSub to keep the viewers updated with the latest information from the game. Broadcasters must go to the "QR Code Scanner" page linked from either the Config or Live Config panel and use the controls provided therein to establish the flow of data between their game client and PubSub (achieved by scanning their game window for a QR code). They can do this before or during the broadcast, and can choose to stop sending the data at any time through the provided controls or simply by closing the "QR Code Scanner" page.

## Live Armory QR addon

In order to extract the live status of their characters, broadcasters are required to run the [Live Armory QR] addon for WoW Classic
