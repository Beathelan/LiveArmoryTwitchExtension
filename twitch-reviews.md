# Twitch Review Materials

## Walkthrough

Viewer experience:
This is a very simple extension mostly for display purposes. It enriches the experience of viewers on World of Warcraft Classic broadcasts by offering them real-time information about the character on screen.

If the channel is offline or there isn't a WoW Classic character being played, the extension displays its "title screen", which is just the name of the extension and a link to the author's channel.

Once the broadcaster starts playing a WoW Classic character, and assuming the broadcaster has done the required configuration, the extension will automatically switch to the "detail screen", which includes some or all of the following information about the character:
* Level
* Race and class
* Current and max HP
* Current and max "power" (i.e. mana, energy or rage)
* Current gold
* Current equipment, presented as icons laid out around the borders of the frame so that they resemble the equipment panel in-game; each icon represents a piece of equipment and can be clicked, which opens the corresponding Wowhead page in a new browser tab. Additionally, if the viewer hovers their mouse over a piece of equipment, its Wowhead-powered tooltip will display containing information such as stats and required level
* A link to Wowhead's talent calculator pre-loaded with the current talent selections

Configuration:
What information is shown to the viewers is decided by the broadcaster, and can be changed at any time from either the Config or Live Config panels.

The extension makes use of PubSub to keep the viewers updated with the latest information from the game. Broadcasters must go to the "QR Code Scanner" page linked from either the Config or Live Config panel and use the controls provided therein to establish the flow of data between their game client and PubSub (achieved by scanning their game window for a QR code). They can do this before or during the broadcast, and can choose to stop sending the data at any time through the provided controls or simply by closing the "QR Code Scanner" page.

The following images are sourced from Wowhead's CDN:
* Class icons:
** https://wow.zamimg.com/images/wow/icons/large/class_mage.jpg
** https://wow.zamimg.com/images/wow/icons/large/class_warlock.jpg
** https://wow.zamimg.com/images/wow/icons/large/class_priest.jpg
** https://wow.zamimg.com/images/wow/icons/large/class_rogue.jpg
** https://wow.zamimg.com/images/wow/icons/large/class_druid.jpg
** https://wow.zamimg.com/images/wow/icons/large/class_hunter.jpg
** https://wow.zamimg.com/images/wow/icons/large/class_shaman.jpg
** https://wow.zamimg.com/images/wow/icons/large/class_warrior.jpg
** https://wow.zamimg.com/images/wow/icons/large/class_paladin.jpg

* Money icons:
** https://wow.zamimg.com/images/icons/money-gold.gif
** https://wow.zamimg.com/images/icons/money-silver.gif
** https://wow.zamimg.com/images/icons/money-copper.gif

* Equipment icons:
** https://wow.zamimg.com/images/wow/icons/large/{ITEM_NAME}.jpg
*** {ITEM_NAME} is dynamic, based on the equipment the character has on, but the file structure is the same for all such icons, e.g. https://wow.zamimg.com/images/wow/icons/large/inv_helmet_13.jpg, https://wow.zamimg.com/images/wow/icons/large/inv_gauntlets_22.jpg

* Equipment placeholder icons:
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_head.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_neck.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_shoulder.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_chest.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_shirt.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_tabard.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_wrists.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_hands.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_waist.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_legs.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_feet.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_finger.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_trinket.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_mainhand.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_offhand.jpg
** https://wow.zamimg.com/images/wow/icons/large/inventoryslot_ranged.jpg

* Tooltip icons:
** https://wow.zamimg.com/images/Icon/medium/border/default.png
** https://wow.zamimg.com/images/wow/tooltip.png

## v0.0.1

### Allowlist for Image Domains

* https://wow.zamimg.com

## v0.0.2

### Change Log

The following functionality has been added in v0.0.2:
* The tooltips displayed when the viewer hovers their mouse over any equipment icon are now powered by Wowhead and thus contain much more information.
* A link has been added that takes viewers to Wowhead's talent calculator (in a new tab), where the current character's talents are already pre-loaded.
* Minor styling adjustments were made.

The following NEW images are sourced from Wowhead's CDN (already added to Allowlist of Image Domains):
** https://wow.zamimg.com/images/Icon/medium/border/default.png
** https://wow.zamimg.com/images/wow/tooltip.png

The following NEW Restful endpoint is required to fetch (GET) equipment tooltip data from Wowhead:
** https://nether.wowhead.com/

### Allowlist for Image Domains

* https://wow.zamimg.com

### Allowlist for URL Fetching Domains

* https://nether.wowhead.com/

## v0.1.0

### Change Log

The following functionality has been added or changed in v0.1.0:
* The broadcaster is now able to decide which information to display on the "detail screen", from either the Config or Live Config panel. The change takes place within a second on average for viewers.
* Previous versions relied on a Windows Companion App to scan the game window for the required information (as a QR code), and then send it to PubSub. Starting with this version, that dependency has been eliminated, and its responsibility moved to the "QR Code Scanner" page of this project (`qr_capture.html`). Broadcasters can now access the "QR Code Scanner" page as a link from either the Config or Live Config panel, and perform the following actions:
** Start or stop a screen capture session of their game window.
** Specify an area of the screen capture to focus on for the purposes of locating the QR code on the screen.
** Start or stop sending PubSub messages to their viewers containing the latest information as decoded from the QR code.

Other miscellaneous stuff:
* Minor code refactoring was done to remove the dependency on jQuery.
* This version marks the transition from "Friends & Family Alpha" to "Open Beta" status.
* The Config and Live Config panels now include links to the broadcaster's "quickstart video guide" (WIP) and the required "Live Armory QR" WoW addon.

### Allowlist for Image Domains

* https://wow.zamimg.com

### Allowlist for URL Fetching Domains

* https://nether.wowhead.com/
