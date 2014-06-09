Firebug.next
============

Next Firebug generation built on top of native Firefox developer tools

License
-------
Firebug is free and open source software distributed under the
[BSD License](https://github.com/firebug/firebug.next/blob/master/license.txt).

Repository Structure
--------------------
Structure of the extension follows Jetpack standards. It's generated using
`cfx` tool

* **data** Stylesheets, images, localization files, etc. 
* **lib** Firebug extension javascript files.
* **test** Directory with test files

Hacking on Firebug.next
-----------------------
1. Get Add-ons SDK: `git clone https://github.com/mozilla/addon-sdk`
2. Switch into `devtools` branch
3. Add-on SDK requires Python 2.5, 2.6, or 2.7 [download](http://python.org/download/)
4. Activate `cfx` command line tool (coming from Add-ons SDK). Run `source bin/activate` in
Add-ons SDK directory. [Read more](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation)
about how to install and activate Add-ons SDK.
5. Get Firebug.next repo: `git clone https://github.com/firebug/firebug.next`
6. Run `cfx run -o` in Firebug.next directory to launch Firefox with auto-created clean profile.
[Read more](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation)
about how to use `cfx` command line tool.

Further Resources
-----------------

* Firebug.next wiki: https://getfirebug.com/wiki/index.php/Firebug.next
* Add-on SDK: https://developer.mozilla.org/en-US/Add-ons/SDK
* DevTools API: https://developer.mozilla.org/en-US/docs/Tools/DevToolsAPI
* Coding Style: https://github.com/mozilla/addon-sdk/wiki/Coding-style-guide
* DevTools Extension Examples: https://github.com/mozilla/addon-sdk/tree/devtools/examples
