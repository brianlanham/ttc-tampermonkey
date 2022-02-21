// ==UserScript==
// @name         Fox
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

//(function() {

    class Fox {
        constructor(_furColor) {
            this.furColor = _furColor;
        }

        // Getter
        get description() {
            return this.describeFox();
        }

        // Method
        describeFox() {
            return "This is a " + this.furColor + " fox.";
        }
    }

    class Rectangle {
        constructor(height, width) {
            this.height = height;
            this.width = width;
        }
    }
//})();
