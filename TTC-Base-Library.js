// ==UserScript==
// @name         TTC-Base-Libraries
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Base library 
// @author       You
// @match        https://us.tamrieltradecentre.com/pc/Trade/*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://momentjs.com/downloads/moment.js
// @icon         https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://tamrieltradecentre.com&size=16
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /**************************/
   /*     Script Startup     */
  /**************************/

    // Resolve namespace issue with imported jQuery by changing the namespace to "fox" for jQuery calls within thise code
    var fox = $.noConflict();

    // Add a "stop" method to the audio node/object's prototype, which will cause the currently playing audio to stop by pausing it and setting time index to 0
    Audio.prototype.stop = function() {
        this.pause();
        this.currentTime = 0;
    };

    // Define constants used throughout the script but that do not change in the scrript itselfs
    const itemName = "TTC-Base" // The name of the item being scanned for; used in the notification
    const search = 500000; // Change this to find a different string
    const interval = 180; // Interval between searches, in seconds
    const successAudioUrl = "https://www.myinstants.com/media/sounds/smoke_weed_everyday_song.mp3"; // Snoop Dogg "Smoke Weed Everyday" to celebrate a deal being found, obviously
    const captchaRequestAudioUrl = "https://www.myinstants.com/media/sounds/now-you-fucked-up.mp3"; // Whitest Kids U Know "Now you fucked up!" line from Abe Lincoln sketch, used when required to manually bypass CAPTCHA
    const shouldRequireInteraction = true; //Used to set whether notifications persist until interacted withs
    const backgroundColorStart = "#e0ffff";
    const backgroundColorHighlight = "#6589f1";
    const lastRefreshDateTimeElement = '<div id="LastRefreshedDateTime" style="position: fixed; top: 0px; right: 0px; z-index: 5000; width: 275px; height: 50px; color: #fff;font-size:30px;">' + moment().format('LLL') + '</div';

    // Variable to hold the matching item listing IDs
    var matchingListings = [];

    // Check if user has granted permissions for Chrome notifications on the sites
    if (Notification.permission !== "granted") {Notification.requestPermission();}

    // Create an iframe to play a silent MP3 file and add it to the DOM; this is a workaround required because Chrome by default otherwise does not allow autoplay of <audio> objects/nodes
    var iframeWorkaround = document.createElement("iframe");
    iframeWorkaround.setAttribute("id", "iframeAudioPlayer");
    //iframeWorkaround.setAttribute("src", "https://github.com/anars/blank-audio/blob/master/250-milliseconds-of-silence.mp3");
    iframeWorkaround.setAttribute("src", successAudioUrl);
    iframeWorkaround.setAttribute("allow", "autoplay");
    iframeWorkaround.setAttribute("style", "display: none;");
    document.body.appendChild(iframeWorkaround);

    // Add an <audio> node with specified attributes to the DOM. The src will be set based on whether the scan was a success or a manual CAPTCHA must be bypassed
    var audioPlayer = document.createElement("audio");
    audioPlayer.setAttribute("id", "audioPlayer");
    //audioPlayer.setAttribute("crossorigin", "anonymous");
    audioPlayer.setAttribute("src", "");
    audioPlayer.setAttribute("loop", "");
    document.body.appendChild(audioPlayer);

    // Create CSS for pulsating animation, then dynamically create and add the style block containing this CSS
    var css =
    `.pulsating-animation {
      background-color: ` + backgroundColorStart + `;
      animation-name: pulsateColor;
      animation-duration: 2s;
      animation-iteration-count: infinite;
    }

    .mouseOver_highlight:hover {
      background-color: ` + backgroundColorHighlight + `;
    }

    @keyframes pulsateColor {
      0% {
        background-color: ` + backgroundColorStart + `;
      }
      50% {
        background-color: ` + backgroundColorHighlight + `;
      }
      100 {
        background-color: ` + backgroundColorStart + `;
      }
    }`,
    head = document.head || document.getElementsByTagName('head')[0],
    style = document.createElement('style');

    // Append the new style node to the head
    head.appendChild(style);

    // Set the type of the new script node, and then set the contents using one of two methods based on browser
    style.type = 'text/css';
    if (style.styleSheet){
        // This is required for IE8 and below.
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }

    // Main logic for setting up the mutation observer once jQuery's ready event has fired
    fox(document).ready(function() {
        //search-result-view
        fox("body").append(lastRefreshDateTimeElement);

        let observerTarget = document.getElementById("search-result-view"),
            observerOptions = { childList: true },
            observer = new MutationObserver(moCallback);

        observer.observe(observerTarget, observerOptions);
    });

    /**************************/
   /*  Function Definitions  */
  /**************************/

    // The callback function specified when setting up the main mutation observer, this checks what nodes are added to the container for the search results; these nodes are added by Knockout when it finishes binding data
    // The function checks to see if an "element" node (e.g. <div>) has been added, and if it has the attribute that the container of the data-bound items has. If it exists, meaning data has loaded, it calls main logic to check prices.
    function moCallback(mutations) {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                if (mutation.addedNodes.length > 0) {
                    let addedNode = mutation.addedNodes[0];
                    if (addedNode.nodeType === Node.ELEMENT_NODE) {
                        if (addedNode.attributes.length > 0) {
                            if (addedNode.attributes["data-bind"].value === "with: TradeListPageModel") {
                                console.log("Search Results Loaded using TradeListPageModel.");
                                parseOnSearchResultLoad();
                            }
                        }
                    }
                }
            }
        }
    }

    // The method used to set the src for the <audio> node and begin play
    function play(url) {
        var audioPlayer = document.getElementById("audioPlayer");
        audioPlayer.setAttribute("src", url);
        audioPlayer.play();
    }

    // The method that creates the Chrome notification, with the specified parameters and onclick callback to stop audio playback, focus the tab it spawned from, and close the notification.
    function notifyMe(notificationTitle, notificationMessage, iconURL) {
        if (Notification.permission !== "granted") {
            Notification.requestPermission();
        } else {
            var audioPlayer = document.getElementById("audioPlayer");

            var notification = new Notification(notificationTitle, {
                icon: ((iconURL == null) ? 'https://www.google.com/s2/favicons?domain=tamrieltradecentre.com' : iconURL),
                body: notificationMessage,
                requireInteraction: shouldRequireInteraction
            });

            notification.onclick = function () {
                audioPlayer.stop();
                parent.focus();
                window.focus(); //just in case, older browsers
                this.close();
            };
        }
    }

    function markListingAcknowledged(data, element) {
        let url = "/" + window.location.platform + "/Trade/Detail/" + this.ID.toString();
        window.open(url);
    }

    // The method to check for a price matching the oen declared in the const section at the top of the script. If a match is found, the audio is set to play the one for success and show a Chrome notification. If not, it sets the timeout to reload the page.
    function parseOnSearchResultLoad() {
        if (fox('body').hasClass('modal-open')) {
            notifyMe('CAPTCHA Request - ' + itemName, 'Click this alert to open the tab and solve the CAPTCHA Request', "https://eso-hub.com/storage/icons/housing_torchbug_red.webp");
            play(captchaRequestAudioUrl);
        } else {
            var priceFound = checkForPrice();
            if (priceFound) {
                var iconImage = $("img.trade-item-icon").attr("src");
                notifyMe('Deal Found - ' + itemName, 'Click this alert to open the tab.', "https://us.tamrieltradecentre.com/" + iconImage);
                play(successAudioUrl);
            } else {
                var intervalHandle = setInterval(function () {
                    location.reload();
                }, interval * 1000);
            }
        }
    }

    // The method to scan the listings on the page to see if any have an amount eual to or less than the threshold set in the const section at the top of the script
    function checkForPrice() {
        var priceFound = false;
        var amounts = fox('.gold-amount span[data-bind="localizedNumber: UnitPrice"]');
        fox(amounts).each(function( index ) {
            var amount = parseInt(fox(this).text().replace(/,/g, ''));
            if (amount <= search) {
                var timeElapsed = fox(this).parent().siblings('td[data-bind="minutesElapsed: DiscoverUnixTime"]');
                if (fox(timeElapsed).text().includes('Minute')) {
                    var item = fox(this).parent().parent().attr("data-bind", "click: markListingAcknowledged.bind($data), attr: { title: Message }");
                    priceFound = true;
                }
            }
        });
        return priceFound;
    }

})();

// Pulsating visibility CSS
//  `@keyframes pulsingAnimation {
//         0%   { opacity:1; }
//         50%  { opacity:0; }
//         100% { opacity:1; }
//     }
//      @-o-keyframes pulsingAnimation{
//         0%   { opacity:1; }
//         50%  { opacity:0; }
//         100% { opacity:1; }
//     }
//     @-moz-keyframes pulsingAnimation{
//         0%   { opacity:1; }
//         50%  { opacity:0; }
//         100% { opacity:1; }
//     }
//     @-webkit-keyframes pulsingAnimation{
//         0%   { opacity:1; }
//         50%  { opacity:0; }
//         100% { opacity:1; }
//     }
//     .animate-flicker {
//         -webkit-animation: pulsingAnimation 3s infinite;
//         -moz-animation: pulsingAnimation 3s infinite;
//         -o-animation: pulsingAnimation 3s infinite;
//         animation: pulsingAnimation 3s infinite;
//     }`