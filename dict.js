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
          External audio player, may be work not well on Windows.
          </p>
        </description>
      </item>
</plugin>;

// http://code.google.com/apis/language/translate/v1/using_rest_translate.html
// http://code.google.com/apis/language/translate/v1/using_rest_langdetect.html
// http://code.google.com/apis/language/translate/v1/reference.html
// http://code.google.com/apis/language/translate/v1/getting_started.html
// http://code.google.com/apis/language/
let google = {
	languages: [
		['af', 'Afrikaans'],
		['sq', 'Albanian'],
		['am', 'Amharic'],
		['ar', 'Arabic'],
		['hy', 'Armenian'],
		['az', 'Azerbaijani'],
		['eu', 'Basque'],
		['be', 'Belarusian'],
		['bn', 'Bengali'],
		['bh', 'Bihari'],
		['br', 'Breton'],
		['bg', 'Bulgarian'],
		['my', 'Burmese'],
		['ca', 'Catalan'],
		['chr', 'Cherokee'],
		['zh', 'Chinese'],
		['zh-CN', 'Chinese Simplified'],
		['zh-TW', 'Chinese Traditional'],
		['co', 'Corsican'],
		['hr', 'Croatian'],
		['cs', 'Czech'],
		['da', 'Danish'],
		['dv', 'Dhivehi'],
		['nl', 'Dutch'],
		['en', 'English'],
		['eo', 'Esperanto'],
		['et', 'Estonian'],
		['fo', 'Faroese'],
		['tl', 'Filipino'],
		['fi', 'Finnish'],
		['fr', 'French'],
		['fy', 'Frisian'],
		['gl', 'Galician'],
		['ka', 'Georgian'],
		['de', 'German'],
		['el', 'Greek'],
		['gu', 'Gujarati'],
		['ht', 'Haitian Creole'],
		['iw', 'Hebrew'],
		['hi', 'Hindi'],
		['hu', 'Hungarian'],
		['is', 'Icelandic'],
		['id', 'Indonesian'],
		['iu', 'Inuktitut'],
		['ga', 'Irish'],
		['it', 'Italian'],
		['ja', 'Japanese'],
		['jw', 'Javanese'],
		['kn', 'Kannada'],
		['kk', 'Kazakh'],
		['km', 'Khmer'],
		['ko', 'Korean'],
		['ku', 'Kurdish'],
		['ky', 'Kyrgyz'],
		['lo', 'Lao'],
		['la', 'Latin'],
		['lv', 'Latvian'],
		['lt', 'Lithuanian'],
		['lb', 'Luxembourgish'],
		['mk', 'Macedonian'],
		['ms', 'Malay'],
		['ml', 'Malayalam'],
		['mt', 'Maltese'],
		['mi', 'Maori'],
		['mr', 'Marathi'],
		['mn', 'Mongolian'],
		['ne', 'Nepali'],
		['no', 'Norwegian'],
		['oc', 'Occitan'],
		['or', 'Oriya'],
		['ps', 'Pashto'],
		['fa', 'Persian'],
		['pl', 'Polish'],
		['pt', 'Portuguese'],
		['pt-PT', 'Portuguese Portugal'],
		['pa', 'Ppnjabi'],
		['qu', 'Qpechua'],
		['ro', 'Rpmanian'],
		['ru', 'Rpssian'],
		['sa', 'Sanskrit'],
		['gd', 'Scots Gaelic'],
		['sr', 'Serbian'],
		['sd', 'Sindhi'],
		['si', 'Sinhalese'],
		['sk', 'Slovak'],
		['sl', 'Slovenian'],
		['es', 'Spanish'],
		['su', 'Sundanese'],
		['sw', 'Swahili'],
		['sv', 'Swedish'],
		['syr', 'Syriac'],
		['tg', 'Tajik'],
		['ta', 'Tamil'],
		['tt', 'Tatar'],
		['te', 'Telugu'],
		['th', 'Thai'],
		['bo', 'Tibetan'],
		['to', 'Tonga'],
		['tr', 'Turkish'],
		['uk', 'Ukrainian'],
		['ur', 'Urdu'],
		['uz', 'Uzbek'],
		['ug', 'Uighur'],
		['vi', 'Vietnamese'],
		['cy', 'Welsh'],
		['yi', 'Yiddish'],
		['yo', 'Yoruba'],
		['', 'Unknown']
	],
	get langpair() google._langpair || false,
	set langpair(langpair) {
		dict._langpair = langpair;
	},
	api: "",
	key: "",
	keyword: "",
	url: "https://ajax.googleapis.com/ajax/services/language/translate",
	userip: "", // TODO http://code.google.com/apis/language/translate/v1/using_rest_translate.html#userip
	init: function(keyword, args) {
		let langpair = options.get('dict-langpair').value;
		if (args.langpair)
			langpair=args.langpair;
		var formData = new FormData();
		formData.append("v", "1.0");
		formData.append("q", decodeURIComponent(keyword));
		formData.append("langpair", langpair); // en|zh_CN
		// formData.append('key', 'YOUR KEY HERE');
		formData.append("userip", "192.168.0.1"); // FIXME random ip address
		formData.append("format", "text"); // 
		var req = new XMLHttpRequest();
		req.open("POST", google.url, true);
		req.send(formData);
		req.onreadystatechange = function(ev) {
			dict.google(req);
		};
		dict.req = req;
		return req;
	},
	optsCompleter: function(context) {
		context.quote = ["", util.identity, ""];
		context.title = ["Langpair", "Description"];
		if (google.langpair)
			return google.langpair;
		let cpt = [];
		for (let [, [abbr, lang]] in Iterator(google.languages)) {
			for (let [, [inabbr, inlang]] in Iterator(google.languages)) {
				if (inabbr == "")
					continue;
				if (abbr == inabbr)
					continue;
				cpt.push([abbr+"|"+inabbr, "From "+lang+" to " + inlang]);
			}
		}
		google.langpair = cpt;
		return cpt;
	},
	opts: function() {
		return {
			names: ["-langpair", "-la"],
			// description: "This argument supplies the optional source language and required destination language, separated by a properly escaped vertical bar (|), which escapes as %7C. In order to translate from English to Spanish, specify a value of langpair=en%7Ces.

// To use the auto-detect source feature, leave off the source language and only specify the vertical bar followed by the destination langauge as in: langpair=%7Ces.",
			description: "This argument supplies the optional source language and required destination language, separated by a properly escaped vertical bar (|).",
			default: "en|zh-CN", // TODO en,zh-CN
			type: CommandOption.STRING
		};
	}
};

let dict_cn = {
	// http://dict.cn/tools.html
	keyword: "",
	url: "",
	template: "",
	init: function(keyword, args) {
		var req = new XMLHttpRequest();
		dict_cn.keyword = keyword;
		dict_cn.url = "http://dict.cn/"+keyword;
		req.open("POST",
			"http://dict.cn/ws.php?utf8=true&q="+keyword,
			true
		);
		req.onreadystatechange = function(ev) {
			dict.dict_cn(req);
		};
		req.send(null);
		dict.req = req;
		return req;
	},

	process: function(text) { // FIXME: too complex
		let ret = {
			notfound: false,
			ok: true,
			pron: false,
			def: false,
			simple: false,
			full: false,
			text: false,
			audio: false
		};
		var parser = new DOMParser();
		ret["text"] = text;
		var xml = parser.parseFromString(text, "text/xml");
		var def = xml.getElementsByTagName("def");
		if (def.length && (def[0].textContent !== "Not Found")) {
			ret["complex"] = {title: "", sub: {}}; // TODO

			// key
			var keyelem = xml.getElementsByTagName("key");
			ret["key"] = keyelem.length ? keyelem[0].textContent : false;
			// pron
			var pronelem = xml.getElementsByTagName("pron");
			ret["pron"] = pronelem.length ? pronelem[0].textContent : false;

			if (ret["pron"]) {
				ret["complex"]["title"] = <>
					<p xmlns={XHTML} style="text-indent:14px;"><a href={dict_cn.url} target="_blank" alt="" highlight="URL" xmlns={XHTML}>{ret["key"]}</a>
					<span xmlns={XHTML} style="margin-left:0.8em;">[{ret["pron"]}]</span></p>
				</>;
			} else {
				ret["complex"]["title"] = <>
					<p xmlns={XHTML}><a href="" target="_blank" alt="" highlight="URL" xmlns={XHTML}>{ret["key"]}</a></p>
				</>;
			}

			// def
			ret["def"] = dict._html_entity_decode(def[0].textContent);
			let piece = <></>;
			let ps = ret["def"].trim().split("\n");
			for (let [i, v] in Iterator(ps))
				piece += <><span xmlns={XHTML}>{v}</span><br/></>;
			ret["complex"]["sub"]["单词解释"] = <><div xmlns={XHTML}>{piece}</div></>;

			// origTrans
			var sentelems = xml.getElementsByTagName("sent");
			if (sentelems.length) {
				var origTrans = [];
				let oT = <></>;
				for (var i = 0; i < sentelems.length; i++) {
					let org = dict._html_entity_decode(dict._html_entity_decode(sentelems[i].firstChild.textContent)); // <em></em>
					let trans = dict._html_entity_decode(dict._html_entity_decode(sentelems[i].lastChild.textContent));
					let dt = <><dt xmlns={XHTML} style="font-weight:bolder;">{org}</dt></>;
					let dd = <><dd xmlns={XHTML} style="margin:0.2em 0;">{trans}</dd></>;
					oT += <>{dt}{dd}</>;

					origTrans.push([org, trans]);
				}
				ret["complex"]["sub"]["例句"] = <><dl xmlns={XHTML} style="line-height:22px;">{oT}</dl></>;
				ret["origTrans"] = origTrans;
			} else
				ret["origTrans"] = false;

			// rel
			var rels = xml.getElementsByTagName("rel");
			if (rels.length) {
				ret["rels"] = [];
				let rs = <></>;
				for (var i = 0; i < rels.length; i++) {
					rs += <><span xmlns={XHTML}>{rels[i].textContent}</span></>;
					ret["rels"].push(rels[i].textContent);
				}
				ret["complex"]["sub"]["相关单词"] = rs;
			} else
				ret["rels"] = false;

			// audio
			var audioelem = xml.getElementsByTagName("audio");
			ret["audio"] = audioelem.length ? audioelem[0].textContent : false;

			ret["simple"] = ret["key"] + ": ";
			if (ret["pron"])
				ret["simple"] += "["+ret["pron"] +"] ";
			ret["simple"] += dict._eolToSpace(ret["def"]);

		} else {
			ret["notfound"] = true;
		}
		return ret;
	}
}

let dict = {
	engines: {"dict_cn" : dict_cn, "google" : google},
	get req() dict._req || null,
	set req(req) {
		if (dict.req)
			dict.req.abort();
		dict._req = req;
	},
	get suggestReq() dict._suggestReq || null,
	set suggestReq(req) {
		if (dict.suggestReq)
			dict.suggestReq.abort();
		dict._suggestReq = req;
	},
	get keyword() dict._keyword,
	set keyword(keyword) {
		dict._keyword = encodeURIComponent(keyword.trim());
	},

	get timeout() dict._timeout || null,
	set timeout(timeout) {
		if (dict.timeout)
			dict.timeout.cancel();
		dict._timeout = timeout;
	},

	get engine() dict.engines[options.get("dict-engine").value],

	init: function(args) {
		let keyword = args.join(" ") || "";
		if (keyword.length == 0) {
			// keyword = content.window.getSelection().toString() || "";
			keyword = dict._selection();
		}
		if (keyword.length == 0) {
			commandline.input("Lookup: ", function(keyword) {
					dict.keyword = keyword;
					dict.engine.init(dict.keyword, args);
				},
				{
					completer: function (context) {
						dict.suggest(dict.makeRequest(context, [commandline.command]), context); // this != dict
					}
				}
			);
		} else {
			dict.keyword = keyword;
			dict.engine.init(dict.keyword, args);
		}
	},

	// check whether we are on Windows Platform.
	isWin: function() {
		let re = /^Win/;
		return re.test(window.navigator.platform);
	},
	process: function(ret) {
		// audio
		if (ret["audio"])
			dict._play(ret["audio"]);
		else {
			if (/^[\u0001-\u00ff]+$/.test(decodeURIComponent(dict.keyword))) { // 0-255
				let uri = "http://translate.google.com/translate_tts?q=" + dict.keyword; // FIXME: 当keyword过长时，应该分词
				dict._play(uri);
			}
		}

		if (ret["notfound"]) {
			dactyl.echo("未找到 " + decodeURIComponent(dict.keyword) + " 的翻译", commandline.FORCE_SINGLELINE); // TODO: i18n?
			dict.timeout = dactyl.timeout(dict._clear, 3000);
		} else {
			// dict._popup(ret);
			if (options.get("dict-simple").value) {
				dactyl.echomsg(ret["simple"], 0, commandline.FORCE_SINGLELINE);
				dict.timeout = dactyl.timeout(dict._clear, 60000); // TODO: clickable, styling
			} else {
				let list = template.table(ret["complex"]["title"], ret["complex"]["sub"]);
				dactyl.echo(list, commandline.FORCE_MULTILINE);
				// dactyl.echomsg(ret["complex"]); // commandline.FORCE_MULTILINE
			}
		}
	},

	dict_cn: function(req) {
		if (req.readyState == 4) {
			let ret = {};
			if (req.status == 200)
				ret = dict_cn.process(req.responseText);
			dict.process(ret);
			req.onreadystatechange = function() {};
		}
	},

	google: function(req) {
		if (req.readyState == 4) {
			if (req.status == 200) {
				let g = JSON.parse(req.responseText);
				let t = g.responseData.translatedText.replace(/\n$/, "").split("\n");
				if (t.length > 1 && !mow.visible)
					dactyl.echo("\n");
				for (let [i, v] in  Iterator(t))
					dactyl.echo(v);
			}
			req.onreadystatechange = function() {};
		}
	},

	makeRequest:  function (context, args) {
		var url = function(item, text)
		<>
		<a xmlns:dactyl={NS} identifier={item.id || ""} dactyl:command={item.command || ""}
		href={item.item.url} highlight="URL">{text || ""}</a>
		</>;
		// context.waitingForTab = true;
		context.title = ["Original", "Translation"];
		context.keys = {"text":"g", "description":"e"};
		context.filterFunc = null;
		context.quote = ["", util.identity, ""];
		context.offset=context.value.indexOf(" ") + 1;
		context.process[1] = url;
		context.key = encodeURIComponent(args.join("_"));
		if (args.length == 0) {
		} else {
			var req = new XMLHttpRequest();
			req.open("POST",
				"http://dict.cn/ajax/suggestion.php"
			);
			req.onreadystatechange = function () {
				dict.suggest(req, context);
			}
			// req.send(null);
			var formData = new FormData();
			formData.append("q", args.join(" "));
			formData.append("s", "d");
			req.send(formData);
			dict.suggestReq = req;
			return req;
		}
	},

	suggest: function(req, context) {
		if (req.readyState == 4) {
			if (req.status == 200) {
				var result_arr = JSON.parse(req.responseText);
				var suggestions = [];
				result_arr["s"].forEach(function (r) {
						r["e"] = dict._html_entity_decode(r["e"].trim());
						r["g"] = r["g"].trim();
						r["url"] = "http://dict.cn/" + encodeURIComponent(r["g"]);
						suggestions.push(r); // trim blank chars
				});
				context.completions = suggestions;
			} else {
			}
			req.onreadystatechange = function() {};
		}
	},

	opts: function () {
		if (dict.engine.hasOwnProperty('opts'))
			return dict.engine.opts() || undefined;
		return undefined;
	},

	_play: function(uri) {
		if (!options.get("dict-hasaudio").value)
			return false;
		if (dict.isWin()) {
			let dict_sound = document.getElementById("dict-sound");
			if (!dict_sound) {
				let sound = util.xmlToDom(<embed id="dict-sound" src="" autostart="false" type="application/x-mplayer2" hidden="true" height="0" width="0" enablejavascript="true" xmlns={XHTML}/>, document);
				let addonbar = document.getElementById("addon-bar"); // FIXME: firefox 3.6 support
				addonbar.appendChild(sound);
				dict_sound = document.getElementById("dict-sound");
				dict_sound.setAttribute("hidden", "false"); // dirty hack, tell me why.
				if (!dict_sound.Play)
					dict_sound.setAttribute("autostart", "true");
			}
			dict_sound.setAttribute("src", uri);
			dict_sound.setAttribute("src", uri);
			if (dict_sound.Play)
				dict_sound.Play();
		} else {
			let cmd = ":";
			if (options.get("dict-audioplayer").value)
				cmd = options.get("dict-audioplayer").value;
			ex.silent("!" + cmd + " '" + uri + "' &"); // uri 要解析特殊字符
			// ex.silent("!" + cmd + " " + uri + " 0>&1 2>&1 1>/dev/null"); // uri 要解析特殊字符
		}
	},

	_clear: function() {
		dactyl.echo("", commandline.FORCE_SINGLELINE);
	},

	_eolToSpace: function(str) {
		return str.replace(/\n/g, " | ").replace(/\s+/g, " ");
	},

	_popup: function(ret/*, url*/) {
		let notify = Components.classes['@mozilla.org/alerts-service;1'].getService(Components.interfaces.nsIAlertsService)
		let title = ret["key"];
		if (ret["pron"])
			title += ": [" + ret["pron"] + "]";
		notify.showAlertNotification(null, title, ret["def"], false, '', null);
		// https://developer.mozilla.org/en/Using_popup_notifications
		// check firefox version, enable on firefox 4.0 or above.
		// PopupNotifications.show(gBrowser.selectedBrowser, "dict-popup",
			// str,
			// null, [> anchor ID <]
			// {
				// label: "查看详细解释",
				// accessKey: "D",
				// callback: function() {
					// dactyl.open(url, {background:false, where:dactyl.NEW_TAB});
				// }
			// },
			// null  [> secondary action <]
		// );
	},

	// http://stackoverflow.com/questions/2808368/converting-html-entities-to-unicode-character-in-javascript
	_html_entity_decode: function(str) {
		var elem = util.xmlToDom(<html:div xmlns:html={XHTML}></html:div>, content.document);
		let str_decode = str;
		try {
			elem.innerHTML = str;
			str_decode = elem.textContent;
			str_decode = str_decode.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
		} catch (e) {
			str_decode = str_decode.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
		} finally {
			return str_decode;
		}
	},

	_selection: function() {
		// check focused frame first
		let focusedSel = buffer.focusedFrame.getSelection().toString().trim() || "";
		if (focusedSel != '')
			return focusedSel;
		// now the main window
		let sel = content.window.getSelection().toString().trim() || "";
		if (sel != "")
			return sel;
		let frames = content.parent.frames;
		let i = 0;
		// loop frames
		while ( i < frames.length) {
			var selection = frames[i].getSelection();
			if (selection)
				sel = selection.toString().trim();
			if (sel != "")
				return sel;
			i += 1;
		}
		return sel;
	},

	_nl2br: function(str) {
		return str.replace(/\n/g, "<br/>");
	}
};

if (!dict.isWin()) {
	options.add(["dict-audioplayer", "dicp"],
		"External audio player.",
		"string",
		"mplayer",
		{
			validator: function() true,
			completer: function(context) [
				["mplayer", "mplayer"],
				["mpg321 -o alsa", "mpg321"],
				["mpg123", "mpg123"]
			]
		}
	);
}

options.add(["dict-hasaudio", "dich"],
	"Audio support.",
	"boolean",
	dict.isWin() ? false : true
);

options.add(["dict-simple", "dics"],
	"Simple Output",
	"boolean",
	true
);

options.add(["dict-engine", "dice"],
	"Dict engine",
	"string",
	"dict_cn",
	{
		completer: function(context) [
			["dict_cn", "Dict.cn 海词"],
			["google", "Google Translate"]
		]
	}
);

function dblclick(event) {
	if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) { // FIXME: contenteditable=true
		return false;
	}
	// let keyword = content.window.getSelection().toString().trim();
	let keyword = dict._selection();
	let re = /^[^_\s]+$/; // ao

	if (event.detail == 2 && keyword.length && re.test(keyword))
		ex.dict();
	else {
		if (options.get("dict-simple").value)
			dict._clear(); // TODO
		else
			if (mow.visible) events.feedkeys("<Space>");
	}
}

options.add(["dict-dblclick", "dicd"],
	"Use Double Click",
	"boolean",
	false,
	{
		setter: function(value) {
			if (value) {
				gBrowser.addEventListener("click", dblclick, false);
			} else {
				gBrowser.removeEventListener("click", dblclick, false);
			}
			return value;
		}
	}
);

options.add(["dict-langpair", "dicl"],
	"This argument supplies the optional source language and required destination language, separated by a properly escaped vertical bar (|).",
	"string",
	"en|zh-CN",
	{
		completer: function(context) google.optsCompleter(context)
	}
);

group.commands.add(["di[ct]", "dic"],
	"Dict Lookup",
	dict.init,
	{
		argCount: "*",
		// http://stackoverflow.com/questions/1203074/firefox-extension-multiple-xmlhttprequest-calls-per-page/1203155#1203155
		// http://code.google.com/p/dactyl/issues/detail?id=514#c2
		completer: function (context, args) dict.suggest(dict.makeRequest(context, args), context),
		bang: true, // TODO
		// options: [
			// update({}, dict.opts())
		// ]
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

dactyl.execute("map -modes=n -builtin -silent <Esc> :<CR><Esc><Esc>");

// dict! dict.cn 的模糊查询　或者是反转google的搜索设定 或者是返回全部的词典信息 ret["complex"]
// 返回查询的页面链接，最好可点击
// * http://dict.cn/ws.php?utf8=true&q=%E4%BD%A0%E5%A5%BD rel tags
// FORCE_SINGLELINE | APPEND_MESSAGES
// 使用mozilla notification box?
// * clear previous active request
// cache or history
// - sound is broken out? linux/winxp/win7 okay
// auto completion doesn't work when you've never open dict.cn web page. --cookie
// * support dblclick?
// www.zdic.net support?
// 当为汉字时，使用www.zdic.net的自动补全和解释
