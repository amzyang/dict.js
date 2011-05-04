"use strict";
XML.ignoreWhitespace = false;
XML.prettyPrinting = false;
var INFO =
<plugin name="dict.js" version="0.9.0"
    href="https://github.com/grassofhust/dict.js"
    summary="An online dict."
    xmlns={NS}>
    <author email="frederick.zou@gmail.com">Yang Zou</author>
    <license href="http://opensource.org/licenses/mit-license.php">MIT</license>
    <project name="Pentadactyl" minVersion="1.0"/>
    <p>
        A dict plugin for pentadactyl, dict.js only support dict.cn now.
		I will add google translate later.
    </p>

    <p>
		Dict.js use mpg321 to support sound, you can use other program (:set dict-audioplayer=mplayer)
		or just disable it (:set dict-hasaudio=false).
    </p>

    <item>
		<tags>'dich' 'dict-hasaudio'</tags>
        <spec>'dict-hasaudio' 'dich'</spec>
        <type>boolean</type>
        <default>true</default>
        <description>
            <p>
				Toggle sound on or off.
            </p>
        </description>
    </item>

    <item>
		<tags>'dica' 'dict-audioplayer'</tags>
        <spec>'dict-audioplayer' 'dica'</spec>
        <type>string</type>
        <default>mpg321</default>
        <description>
            <p>
				External audio player, may be not work very well on Windows.
            </p>
        </description>
    </item>
</plugin>;

var walk_the_DOM = function (node, func) {
	func(node);
	node = node.firstChild;
	while (node) {
		walk_the_DOM(node, func);
		node = node.nextSibling;
	}
};

// http://stackoverflow.com/questions/822452/strip-html-from-text-javascript
var _strip = function (html) {
	var tmp = content.window.document.createElement('div');
	tmp.innerHTML = html;
	// remove unused childs
	// javascript block, css style sheets, comments
	walk_the_DOM(tmp, function(node) {
		if (node.nodeType == 8 || node.nodeName == 'SCRIPT' || node.nodeName == 'STYLE') {
			node.parentNode.removeChild(node);
		}
	});
	return tmp.textContent || tmp.innerText;
};

var _local_play = function (uri) {
	ex.silent("!" + options.get('dict-audioplayer').value + ' ' + uri);
};

var getElementsByAttribute = function(node, att, value) {
	var result = [];
	walk_the_DOM(node, function (node) {
		var actual = node.nodeType === 1 && node.getAttribute(att);
		if (typeof actual === 'string' && (actual === value || typeof value !==
			'string')) {
			result.push(node);
		}
	});
	return result;
};

var createDict = function (_content, keyword) {
	dactyl.echomsg(_strip(_content));
	var dictDiv = content.window.document.createElement('div');
	dictDiv.innerHTML=_content;
	if (options.get('dict-hasaudio').value) { // set! dict.has.audio=true
		var scripts = dictDiv.getElementsByTagName('script');
		var uri = "";
		if (scripts.length == 1) {
			dactyl.userEval('var pronu=[];' + scripts[0].text); // fetch the audio uri
			uri = "http://dict.baidu.com/" + pronu['zzj7'];
		} else // now we use google unreleased text-to-speech service.
			uri = '"http://translate.google.com/translate_tts?q=' + escape(keyword) + '"';
		_local_play(uri);
	}
};

var dictBaidu = function (args) {
	if (typeof args[0] == "undefined" || args[0].length==0) {
		var keyword = content.window.getSelection().toString() || dactyl.clipboardRead();
		if (keyword)
			keyword = keyword.trim().replace(/\s+/g, "+");
	} else {
		var keyword = args[0];
		for (var i = 1; i < args.length; i++) {
			if (typeof args[i] == "undefined")
				break;
			else
				keyword = keyword + "+" +args[i];
		}
	}
	if (!keyword || keyword.length == 0) {
		commandline.input("Lookup: ", function(arg) {
			keyword = arg;
			var req = new XMLHttpRequest();
			req.open("GET",
				"http://dict.baidu.com/s?word="+keyword+"&tn=simple&ie=utf-8",
				true
			);

			req.onreadystatechange = function (ev) {
				if (req.readyState == 4 ) {
					if (req.status == 200) {
						createDict(req.responseText, keyword);
					} else {
						dactyl.echomsg("Lookup the word: \"" + keyword + "\" failed!");
					}
				}
			};
			req.send(null);
		},
		{
			completer: function (context) {
				dictSug(makeRequest(context, [commandline.command]), context);
			}
		});
	} else {
		var req = new XMLHttpRequest();
		req.open("GET",
			"http://dict.baidu.com/s?word="+keyword+"&tn=simple&ie=utf-8",
			true
		);

		req.onreadystatechange = function (ev) {
			if (req.readyState == 4 ) {
				if (req.status == 200) {
					createDict(req.responseText, keyword);
				} else {
					dactyl.echomsg("Lookup the word: \"" + keyword + "\" failed!");
				}
			}
		};
		req.send(null);
	}
};

var makeRequest = function (context, args) {
		var url = function(item, text) 
		<>
        <a xmlns:dactyl={NS} identifier={item.id || ""} dactyl:command={item.command || ""}
           href={item.item.url} highlight="URL">{text || ""}</a>
		</>;
		// context.waitingForTab = true;
		context.title = ['Original', 'Translation'];
		context.keys = {"text":'g', "description":'e'};
		context.filterFunc = null;
		context.quote = ['', util.identity, ''];
		context.offset=context.value.indexOf(" ") + 1;
		context.process[1] = url;
	if (args.length == 0) {
	} else {
		var req = new XMLHttpRequest();
		req.open("POST",
			"http://dict.cn/ajax/suggestion.php"
		);
		req.onreadystatechange = function () {
			dictSug(req, context);
		}
		// req.send(null);
		var formData = new FormData();
		formData.append('q', args.join(" "));
		formData.append('s', 'd');
		req.send(formData);
		return req;
	}
	
};

var dictSug = function(req, context) {
	if (req.readyState == 4) {
		if (req.status == 200) {
			var result_arr = JSON.parse(req.responseText);
			var suggestions = [];
			result_arr['s'].forEach(function (r) {
				r['e'] = r['e'].trim().replace(/&nbsp;/g, " ");
				r['g'] = r['g'].trim();
				r['url'] = 'http://dict.cn/' + encodeURIComponent(r['g']);
				suggestions.push(r); // trim blank chars
			});
			context.completions = suggestions;
		} else {
		}
		req.onreadystatechange = fnNull;
	}
};

var fnNull = function () {}

options.add(["dict-audioplayer", "dicp"],
	"External audio player.",
	"string",
	'mpg321'
);

options.add(["dict-hasaudio", "dich"],
	"Audio support.",
	"boolean",
	true
);

group.commands.add(["di[ct]", "dic"],
	"Dict Lookup",
	dictBaidu,
	{
		argCount: "*",
		// http://stackoverflow.com/questions/1203074/firefox-extension-multiple-xmlhttprequest-calls-per-page/1203155#1203155
		// http://code.google.com/p/dactyl/issues/detail?id=514#c2
		completer: function (context, args) dictSug(makeRequest(context, args), context),
		bang: true
	}
);

group.mappings.add([modes.NORMAL, modes.VISUAL],
	//["<Leader>z"],
	["<A-d>"],
	"Dict Lookup",
	function() {ex.dict();},
	{

	}
);

