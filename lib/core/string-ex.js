/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("../core/trace.js").get(module.id);
const { prefs } = require("sdk/simple-prefs");
const { Options } = require("./options.js");

var StrEx = {};

// HTML Wrap

StrEx.wrapText = function(text, noEscapeHTML)
{
    var reNonAlphaNumeric = /[^A-Za-z_$0-9'"-]/;

    var html = [];
    var wrapWidth = Options.get("textWrapWidth");

    // Split long text into lines and put every line into a <code> element (only in case
    // if noEscapeHTML is false). This is useful for automatic scrolling when searching
    // within response body (in order to scroll we need an element).
    // Don't use <pre> elements since this adds additional new line endings when copying
    // selected source code using Firefox->Edit->Copy (Ctrl+C) (issue 2093).
    var lines = splitLines(text);
    for (var i = 0; i < lines.length; ++i)
    {
        var line = lines[i];

        if (wrapWidth > 0)
        {
            while (line.length > wrapWidth)
            {
                var m = reNonAlphaNumeric.exec(line.substr(wrapWidth, 100));
                var wrapIndex = wrapWidth + (m ? m.index : 0);
                var subLine = line.substr(0, wrapIndex);
                line = line.substr(wrapIndex);

                if (!noEscapeHTML)
                  html.push("<code class=\"wrappedText focusRow\" role=\"listitem\">");

                html.push(noEscapeHTML ? subLine : StrEx.escapeForTextNode(subLine));

                if (!noEscapeHTML)
                  html.push("</code>");
            }
        }

        if (!noEscapeHTML)
          html.push("<code class=\"wrappedText focusRow\" role=\"listitem\">");

        html.push(noEscapeHTML ? line : StrEx.escapeForTextNode(line));

        if (!noEscapeHTML)
          html.push("</code>");
    }

    return html;
};

StrEx.insertWrappedText = function(text, textBox, noEscapeHTML)
{
    text = text ? text : "";
    var html = StrEx.wrapText(text, noEscapeHTML);
    textBox.innerHTML = "<pre role=\"list\">" + html.join("") + "</pre>";
};

// Helpers

function splitLines(text)
{
    if (!text)
        return [];

    const reSplitLines2 = /.*(:?\r\n|\n|\r)?/mg;
    var lines;
    if (text.match)
    {
        lines = text.match(reSplitLines2);
    }
    else
    {
        var str = text+"";
        lines = str.match(reSplitLines2);
    }
    lines.pop();
    return lines;
};

// Escaping

var entityConversionLists =
{
    normal : {
        whitespace : {
            "\t" : "\u200c\u2192",
            "\n" : "\u200c\u00b6",
            "\r" : "\u200c\u00ac",
            " "  : "\u200c\u00b7"
        }
    },
    reverse : {
        whitespace : {
            "&Tab;" : "\t",
            "&NewLine;" : "\n",
            "\u200c\u2192" : "\t",
            "\u200c\u00b6" : "\n",
            "\u200c\u00ac" : "\r",
            "\u200c\u00b7" : " "
        }
    }
};

var normal = entityConversionLists.normal;
var reverse = entityConversionLists.reverse;

function addEntityMapToList(ccode, entity)
{
    var lists = Array.slice(arguments, 2),
        len = lists.length,
        ch = String.fromCharCode(ccode);

    for (var i = 0; i < len; i++)
    {
        var list = lists[i];
        normal[list]=normal[list] || {};
        normal[list][ch] = "&" + entity + ";";
        reverse[list]=reverse[list] || {};
        reverse[list]["&" + entity + ";"] = ch;
    }
}

var e = addEntityMapToList,
    white = "whitespace",
    text = "text",
    attr = "attributes",
    css = "css",
    editor = "editor";

e(0x0000, "#0", text, attr, css, editor);
e(0x0022, "quot", attr, css);
e(0x0026, "amp", attr, text, css);
e(0x0027, "apos", css);
e(0x003c, "lt", attr, text, css);
e(0x003e, "gt", attr, text, css);
e(0xa9, "copy", text, editor);
e(0xae, "reg", text, editor);
e(0x2122, "trade", text, editor);

// See http://en.wikipedia.org/wiki/Dash
e(0x2012, "#8210", attr, text, editor); // figure dash
e(0x2013, "ndash", attr, text, editor); // en dash
e(0x2014, "mdash", attr, text, editor); // em dash
e(0x2015, "#8213", attr, text, editor); // horizontal bar

// See http://www.cs.tut.fi/~jkorpela/chars/spaces.html
e(0x00a0, "nbsp", attr, text, white, editor);
e(0x2002, "ensp", attr, text, white, editor);
e(0x2003, "emsp", attr, text, white, editor);
e(0x2004, "emsp13", attr, text, white, editor);
e(0x2005, "emsp14", attr, text, white, editor);
e(0x2007, "numsp", attr, text, white, editor);
e(0x2008, "puncsp", attr, text, white, editor);
e(0x2009, "thinsp", attr, text, white, editor);
e(0x200a, "hairsp", attr, text, white, editor);
e(0x200b, "#8203", attr, text, white, editor); // zero-width space (ZWSP)
e(0x200c, "zwnj", attr, text, white, editor);

e(0x202f, "#8239", attr, text, white, editor); // NARROW NO-BREAK SPACE
e(0x205f, "#8287", attr, text, white, editor); // MEDIUM MATHEMATICAL SPACE
e(0x3000, "#12288", attr, text, white, editor); // IDEOGRAPHIC SPACE
e(0xfeff, "#65279", attr, text, white, editor); // ZERO WIDTH NO-BREAK SPACE

e(0x200d, "zwj", attr, text, white, editor);
e(0x200e, "lrm", attr, text, white, editor);
e(0x200f, "rlm", attr, text, white, editor);
e(0x202d, "#8237", attr, text, white, editor); // left-to-right override
e(0x202e, "#8238", attr, text, white, editor); // right-to-left override

// ********************************************************************************************* //
// Entity escaping

var entityConversionRegexes =
{
    normal : {},
    reverse : {}
};

var escapeEntitiesRegEx =
{
    normal : function(list)
    {
        var chars = [];
        for (var ch in list)
            chars.push(ch);
        return new RegExp("([" + chars.join("") + "])", "gm");
    },
    reverse : function(list)
    {
        var chars = [];
        for (var ch in list)
            chars.push(ch);
        return new RegExp("(" + chars.join("|") + ")", "gm");
    }
};

function getEscapeRegexp(direction, lists)
{
    var name = "";
    var re;
    var groups = [].concat(lists);
    for (i = 0; i < groups.length; i++)
        name += groups[i].group;
    re = entityConversionRegexes[direction][name];
    if (!re)
    {
        var list = {};
        if (groups.length > 1)
        {
            for ( var i = 0; i < groups.length; i++)
            {
                var aList = entityConversionLists[direction][groups[i].group];
                for ( var item in aList)
                    list[item] = aList[item];
            }
        }
        else if (groups.length==1)
        {
            list = entityConversionLists[direction][groups[0].group]; // faster for special case
        }
        else
        {
            list = {}; // perhaps should print out an error here?
        }
        re = entityConversionRegexes[direction][name] = escapeEntitiesRegEx[direction](list);
    }
    return re;
}

function createSimpleEscape(name, direction)
{
    return function(value)
    {
        var list = entityConversionLists[direction][name];
        return String(value).replace(
                getEscapeRegexp(direction, {
                    group : name,
                    list : list
                }),
                function(ch)
                {
                    return list[ch];
                }
            );
    };
}

function escapeEntityAsName(char)
{
    try
    {
        return entityConverter.ConvertToEntity(char, entityConverter.entityW3C);
    }
    catch(e)
    {
        return char;
    }
}

function escapeEntityAsUnicode(char)
{
    var charCode = char.charCodeAt(0);

    if (charCode == 34)
        return "&quot;";
    else if (charCode == 38)
        return "&amp;";
    else if (charCode < 32 || charCode >= 127)
        return "&#" + charCode + ";";

    return char;
}

function escapeGroupsForEntities(str, lists, type)
{
    var results = [];
    var noEntityString = "";
    var textListIndex = -1;

    if (!type)
        type = "names";

    for (var i = 0, listsLen = lists.length; i < listsLen; i++)
    {
        if (lists[i].group == "text")
        {
            textListIndex = i;
            break;
        }
    }

    for (var i = 0, strLen = str.length; i < strLen; i++)
    {
        var result = str.charAt(i);

        // If there's "text" in the list groups, use a different
        // method for converting the characters
        if (textListIndex != -1)
        {
            if (type == "unicode")
                result = escapeEntityAsUnicode(str.charAt(i));
            else if (type == "names")
                result = escapeEntityAsName(str.charAt(i));
        }

        if (result != str.charAt(i))
        {
            if (noEntityString != "")
            {
                results.push({
                    "str": noEntityString,
                    "class": "",
                    "extra": ""
                });
                noEntityString = "";
            }

            results.push({
                "str": result,
                "class": lists[textListIndex].class,
                "extra": lists[textListIndex].extra[result] ? lists[textListIndex].class
                        + lists[textListIndex].extra[result] : ""
            });
        }
        else
        {
            var listEntity;
            for (var j = 0, listsLen = lists.length; j < listsLen; j++)
            {
                var list = lists[j];
                if (list.group != "text")
                {
                    listEntity = entityConversionLists.normal[list.group][result];
                    if (listEntity)
                    {
                        result = listEntity;

                        if (noEntityString != "")
                        {
                            results.push({
                                "str": noEntityString,
                                "class": "",
                                "extra": ""
                            });
                            noEntityString = "";
                        }

                        results.push({
                            "str": result,
                            "class": list.class,
                            "extra": list.extra[result] ? list.class + list.extra[result] : ""
                        });
                        break;
                    }
                }
            }

            if (result == str.charAt(i))
            {
                noEntityString += result;
            }
        }
    }

    if (noEntityString != "")
    {
        results.push({
            "str": noEntityString,
            "class": "",
            "extra": ""
        });
    }

    return results;
}

function unescapeEntities(str, lists)
{
    var re = getEscapeRegexp("reverse", lists),
        split = String(str).split(re),
        len = split.length,
        results = [],
        cur, r, i, ri = 0, l, list;

    if (!len)
        return str;

    lists = [].concat(lists);
    for (i = 0; i < len; i++)
    {
        cur = split[i];
        if (cur == '')
            continue;

        for (l = 0; l < lists.length; l++)
        {
            list = lists[l];
            r = entityConversionLists.reverse[list.group][cur];
            if (r)
            {
                results[ri] = r;
                break;
            }
        }

        if (!r)
            results[ri] = cur;
        ri++;
    }
    return results.join('') || '';
}

StrEx.escapeForTextNode = createSimpleEscape("text", "normal");
StrEx.unescapeForURL = createSimpleEscape('text', 'reverse');

// Exports from this module
exports.StrEx = StrEx;
