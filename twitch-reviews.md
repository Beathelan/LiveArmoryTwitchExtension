# Twitch Review Materials

## Walkthrough

This is a very simple extension mostly for display purposes. It enriches the experience of viewers on World of Warcraft Classic broadcasts by offering them real-time information about the character on screen.

If the channel is offline or there isn't a WoW Classic character being played, the extension displays its "title screen", which is just the name of the extension and a link to the author's channel.

Once the broadcaster starts playing a WoW Classic character, and assuming the broadcaster has done the required configuration, the extension will automatically switch to the "detail screen", which includes the following information about the character:
* Level
* Race and class
* Current and max HP
* Current and max "power" (i.e. mana, energy or rage)
* Current gold
* Current equipment, presented as icons laid out around the borders of the frame so that they resemble the equipment panel in-game; each icon represents a piece of equipment and can be clicked, which opens the corresponding Wowhead page in a new browser tab. Additionally, if the viewer hovers their mouse over a piece of equipment, its Wowhead-powered tooltip will display containing information such as stats and required level
* A link to Wowhead's talent calculator pre-loaded with the current talent selections

The extension makes use of PubSub to keep the viewers updated with the latest information from the game. Broadcasters require a Windows "companion app" in order to set up the PubSub mechanism for their channel. The Twitch configuration panel for this extension provides broadcasters quick access to their Channel ID so they can configure the companion app.

The following images are sourced from Wowhead's CDN (currently blocked by the default CSP):
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