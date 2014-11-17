Firebug.next [![Build Status](https://travis-ci.org/firebug/firebug.next.png)](https://travis-ci.org/firebug/firebug.next)
============

Next Firebug generation built on top of native Firefox developer tools

License
-------
Firebug is free and open source software distributed under the
[BSD License](https://github.com/firebug/firebug.next/blob/master/license.txt).

Repository Structure
--------------------
Structure of the extension follows Jetpack standards. It's generated using the
`cfx` tool

* **data** HTML pages, etc.
* **chrome** Stylesheets, localization files, etc.
* **lib** Firebug extension javascript files.
* **test** Directory with test files

Hacking on Firebug.next (aka Firebug 3)
---------------------------------------
1. Get the Add-on SDK: `git clone https://github.com/mozilla/addon-sdk`
2. Get Python 2.5, 2.6, or 2.7: [download](http://python.org/download/) (required by Add-on SDK)
[Read more](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation)
about how to install and activate the Add-on SDK.
3. Get [JPM](https://developer.mozilla.org/en-US/Add-ons/SDK/Tools/jpm): `git clone https://github.com/mozilla/jpm`
4. Switch to the JPM folder and [install](https://www.npmjs.org/doc/cli/npm-install.html) and [link](https://www.npmjs.org/doc/cli/npm-link.html) it via `npm install` and `npm link`. (Also needs to be done after fetching the latest changes to the JPM repo.)
5. Get the Firebug.next repo: `git clone https://github.com/firebug/firebug.next`
6. (Optional) Install [FBTrace](https://github.com/firebug/tracing-console) in your Firefox dev profile
7. Run `jpm run -o <path to Add-on SDK> -b <file path to your Firefox binary>` in the Firebug.next directory to launch Firefox (you need Firefox [Nightly build](https://nightly.mozilla.org/) at the moment), which automatically creates a clean profile.
If you wish to run it with an existing profile (e.g. to include FBTrace), first create a new profile via the [Profile Manager](https://support.mozilla.org/en-US/kb/profile-manager-create-and-remove-firefox-profiles), and then run `jpm run -o <path to Add-on SDK> -b <file path to your Firefox binary> -p <path to your Firefox profile (needs to start with /)>`.

Examples
--------

Run Firebug with Firefox Nightly on OSX:

`jpm run -b /Applications/FirefoxNightly.app`

Build Firebug `.xpi` file for deployment and installation:

`jpm xpi`

Run Firebug test suite:

`jpm test`

Running tests requires some external modules, you need to download and install them:

`npm install`

Further Resources
-----------------

* Firebug.next wiki: https://getfirebug.com/wiki/index.php/Firebug.next
* Add-on SDK: https://developer.mozilla.org/en-US/Add-ons/SDK
* DevTools API: https://developer.mozilla.org/en-US/docs/Tools/DevToolsAPI
* Coding Style: https://github.com/mozilla/addon-sdk/wiki/Coding-style-guide
* DevTools Extension Examples: https://github.com/mozilla/addon-sdk/tree/devtools/examples
* DevTools/Hacking: https://wiki.mozilla.org/DevTools/Hacking
* Firefox Developer Edition: https://developer.mozilla.org/en-US/docs/Tools
