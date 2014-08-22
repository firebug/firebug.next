Firebug.next
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

* **data** Stylesheets, images, localization files, etc. 
* **lib** Firebug extension javascript files.
* **test** Directory with test files

Hacking on Firebug.next
-----------------------
1. Get the Add-on SDK: `git clone https://github.com/mozilla/addon-sdk`
2. Switch into the `devtools` branch
3. The Add-on SDK requires Python 2.5, 2.6, or 2.7 [download](http://python.org/download/)
4. Activate the `cfx` command line tool (included in Add-on SDK). Run `source bin/activate` in
the Add-on SDK directory. [Read more](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation)
about how to install and activate the Add-on SDK.
5. Get the Firebug.next repo: `git clone https://github.com/firebug/firebug.next`
6. (Optional) Install [FBTrace](https://github.com/firebug/tracing-console) in your Firefox dev profile
7. Run `cfx run -o` in the Firebug.next directory to launch Firefox (you need
Firefox [Nightly build](https://nightly.mozilla.org/) at this moment)
with an auto-created clean profile. 
If you wish to run it with FBTrace, use `cfx run -o --profiledir=<yourProfileDir>`.
[Read more](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Installation)
about how to use the `cfx` command line tool.

Further Resources
-----------------

* Firebug.next wiki: https://getfirebug.com/wiki/index.php/Firebug.next
* Add-on SDK: https://developer.mozilla.org/en-US/Add-ons/SDK
* DevTools API: https://developer.mozilla.org/en-US/docs/Tools/DevToolsAPI
* Coding Style: https://github.com/mozilla/addon-sdk/wiki/Coding-style-guide
* DevTools Extension Examples: https://github.com/mozilla/addon-sdk/tree/devtools/examples
* DevTools/Hacking: https://wiki.mozilla.org/DevTools/Hacking
