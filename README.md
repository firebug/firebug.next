Firebug.next [![Build Status](https://travis-ci.org/firebug/firebug.next.png)](https://travis-ci.org/firebug/firebug.next)
============
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/firebug/firebug.next?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Next Firebug generation built on top of native Firefox developer tools [getfirebug.com](https://getfirebug.com)

[Download](https://addons.mozilla.org/en-US/firefox/addon/firebug/)
[Release Notes](https://github.com/firebug/firebug.next/blob/master/release-notes.md)

License
-------
Firebug is free and open source software distributed under the
[BSD License](https://github.com/firebug/firebug.next/blob/master/license.txt).

Repository Structure
--------------------
Structure of the extension follows Jetpack standards.

* **data** HTML pages, etc.
* **chrome** Stylesheets, localization files, etc.
* **lib** Firebug extension javascript files.
* **test** Directory with test files

Hacking on Firebug.next (aka Firebug 3)
---------------------------------------
1. Get [JPM](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm): `git clone https://github.com/mozilla/jpm`
2. Switch to the JPM folder and [install](https://www.npmjs.org/doc/cli/npm-install.html) and [link](https://www.npmjs.org/doc/cli/npm-link.html) it via `npm install` and `npm link`. (Also needs to be done after fetching the latest changes to the JPM repo.)
3. Get the Firebug.next repo: `git clone https://github.com/firebug/firebug.next`
4. (Optional) Install [FBTrace](https://github.com/firebug/tracing-console) in your Firefox dev profile
5. Run `jpm run -b <file path to your Firefox binary>` in the Firebug.next directory to launch Firefox (you need Firefox [Nightly build](https://nightly.mozilla.org/) at the moment), which automatically creates a clean profile.
If you wish to run it with an existing profile (e.g. to include FBTrace), first create a new profile via the [Profile Manager](https://support.mozilla.org/en-US/kb/profile-manager-create-and-remove-firefox-profiles), and then run `jpm run -b <file path to your Firefox binary> -p <path to your Firefox profile (needs to start with /)>`.

Examples
--------

Run Firebug with Firefox Nightly on OSX:

`jpm run -b /Applications/FirefoxNightly.app`

Run Firebug with local installation of Add-on SDK (git clone https://github.com/mozilla/addon-sdk):

`jpm run -o <path to Add-on SDK> -b <file path to your Firefox binary>`

Build Firebug `.xpi` file for deployment and installation:

`jpm xpi`

Run Firebug test suite:

`jpm test`

Running tests requires some external modules, you need to download and install them:

`npm install`

Start Contributing
------------------
Read our [wiki](https://github.com/firebug/firebug.next/wiki#start-contributing)

Further Resources
-----------------

* Firebug.next wiki: https://getfirebug.com/wiki/index.php/Firebug.next
* Add-on SDK: https://developer.mozilla.org/en-US/Add-ons/SDK
* DevTools API: https://developer.mozilla.org/en-US/docs/Tools/DevToolsAPI
* Coding Style: https://github.com/mozilla/addon-sdk/wiki/Coding-style-guide
* DevTools Extension Examples: https://github.com/mozilla/addon-sdk/tree/devtools/examples
* DevTools/Hacking: https://wiki.mozilla.org/DevTools/Hacking
* Firefox Developer Edition: https://developer.mozilla.org/en-US/Firefox/Developer_Edition
