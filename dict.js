"use strict";
XML.ignoreWhitespace = false;
XML.prettyPrinting = false;

const STYLE = <style type="text/css">
<![CDATA[
body { line-height:22px; }
th, dt { font-weight:bolder; }
dt { list-style-type: disc; }
dd { margin:0.1em 0 0.2em; }
.title { text-indent: 14px; }
.title > span { margin-left: 0.8em; }
p > span, li > a { margin-right: 1em; }
span > b { margin-right: 0.4em; }
.basic dt + span { margin-right: 0.4em; }
]]>
</style>;

let qq = {
	keyword: "",
	favicon: "http://dict.qq.com/favicon.ico",
	init: function(keyword, args) {
		var req = new XMLHttpRequest();
		req.open("GET", "http://dict.qq.com/dict?f=web&q="+keyword, true);
		req.setRequestHeader("Referer", "http://dict.qq.com/");
		req.send(null);
		req.onreadystatechange = function(ev) {
			dict.qq(req);
		};
		dict.req = req;
		return req;
	},

	href: function (params) {
		const QQ_PREFIX = "http://dict.qq.com/dict?f=cloudmore&q=";
		let keyword = params['keyword'];
		if (decodeURIComponent(keyword) != keyword)
			return QQ_PREFIX + keyword;
		else
			return QQ_PREFIX + encodeURIComponent(keyword);
	},

	process: function(text) {
		let j = JSON.parse(text);
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
		if (j["local"]) {
			let _ret = qq._simple(j);
			ret["keyword"] = _ret["word"];
			ret["audio"] = _ret["audio"] ? _ret["audio"] : ret["audio"];
			ret["pron"] = _ret["pron"] ? _ret["pron"] : ret["pron"];
			ret["def"] = _ret["def"] ? _ret["def"] : ret["def"];
			if (ret["pron"])
				ret["simple"] = ret["keyword"] + " [" + ret["pron"] + "] " + ret["def"];
			else
				ret["simple"] = ret["keyword"] + " " + ret["def"];
			ret["full"] = qq._full(j);
		} else
			ret["notfound"] = true;
		return ret;
	},

	_full: function(e) {
		let local = e['local'];
		let t = local[0];
		let full = {title: "", sub: {}};
		let _simple = qq._simple(e);
		let keyword_url = qq.href({"keyword":_simple["word"]});
		if (_simple["pron"]) {
			full["title"] = <p class="title">
				<a href={keyword_url} target="_blank" highlight="URL">{_simple["word"]}</a>
				<span>[{_simple["pron"]}]</span>
			</p>;
		} else {
			full["title"] = <p class="title">
				<a href={keyword_url} target="_blank" highlight="URL">{_simple["word"]}</a>
			</p>;
		}
		if (t.des) {
			let des = <></>;
			let gsen = [];
			if (t.sen)
				gsen = t.sen;
			t.des.forEach(function(item) {
				if (item["p"]) {
					let pos = item["p"];
					let sen = qq._digIntoSen(pos, gsen);
					let dt = <dt><span>{item["p"]}</span><span>{item["d"]}</span></dt>;
					let dds = <></>;
					if (sen) {
						sen.s.forEach(function(single) {
								let es = dict._html_entity_decode(single["es"]);
								let cs = dict._html_entity_decode(single["cs"]);
								dds += <><dd>{es}</dd></>;
								dds += <><dd>{cs}</dd></>;
						});
					}
					des += <><dl>{dt}{dds}</dl></>;
				} else {
					let dt = <dt><span>{item["d"]}</span></dt>;
					des += <><dl>{dt}</dl></>;
				}
			});
			full["sub"]["基本解释"] = <div class="basic">{des}</div>;
		}

		if (t.ph) { // 相关词组
			let ph = <></>;
			t.ph.forEach(function(item) {
				let href = qq.href({"keyword": item["phs"]});
				let phs = dict._html_entity_decode(item["phs"]);
				ph += <><li><a href={href} highlight="URL">{phs}</a><span>{item["phd"]}</span></li></>;
			});
			full["sub"]["相关词组"] = <ol>{ph}</ol>;
		}

		if (t.syn) { // 同义词
			let syn = <></>;
			t.syn.forEach(function(item) {
				let syn_item = <></>;
				item.c.forEach(function(single) {
					let href = qq.href({"keyword": single});
					syn_item += <><span><a href={href} highlight="URL">{single}</a></span></>;
				});
				syn += <>{syn_item}</>;
			});
			full["sub"]["同反义词"] = <p><span>同义词：</span>{syn}</p>;
		}
		if (t.ant) { // 反义词
			let ant = <></>;
			t.ant.forEach(function(item) {
				let ant_item = <></>;
				item.c.forEach(function(single) {
					let href = qq.href({"keyword": single});
					ant_item += <><span><a href={href} highlight="URL">{single}</a></span></>;
				});
				ant += <>{ant_item}</>;
			});
			if (full["sub"]["同反义词"])
				full["sub"]["同反义词"] += <p><span>反义词：</span>{ant}</p>;
			else
				full["sub"]["同反义词"] = <p><span>反义词：</span>{ant}</p>;
		}
		if (t.mor) { // 词型变换
			let mor = <></>;
			t.mor.forEach(function(item) {
				let href = qq.href({"keyword": item["m"]});
				mor += <><span><b>{item["c"]}</b><a href={href} highlight="URL">{item["m"]}</a></span></>;
			});
			full["sub"]["词型变换"] = <p>{mor}</p>;
		}
		return full;
	},
	_simple: function(e) {
		let local = e["local"];
		let t = local[0];
		let _ret = {};
		_ret["word"] = t.word;
		if (t.sd)
			_ret["audio"] = qq._audioUri(t.sd);
		if (t.pho)
			_ret["pron"] = dict._html_entity_decode(t.pho.join(", "));
		if (t.des) {
			_ret["def"] = [];
			t.des.forEach(function(item) {
					_ret["def"].push(item["p"] + " " + item["d"]);
			});
			_ret["def"] = _ret["def"].join(" | ");
		}
		return _ret;
	},

	_audioUri: function(str) {
		let prefix = "http://speech.dict.qq.com/audio/";
		let uri = prefix + str[0] + "/" + str[1] + "/"  +str[2] + "/" + str + ".mp3";
		return uri;
	},

	_digIntoSen: function(pos, sen) {
		for (var i = 0; i < sen.length; i++) {
			if (sen[i]["p"] == pos)
				return sen[i];
		}
		return false;
	},

	makeRequest: function(context, args) {
		var url = function(item, text)
		<a xmlns:dactyl={NS} identifier={item.id || ""} dactyl:command={item.command || ""}
		href={item.item.url} highlight="URL">{text || ""}</a>;
		let guessOffset = function(string, opts) { // This was not so robust, be careful.
			var pieces = string.split(/\s+/g);
			if (pieces.length <= 1)
				return string.length;
			let start = 1;
			let finded = start;
			let idx = pieces[0].length;
			for (var i = start; i < pieces.length; i++) {
				if (opts.indexOf(pieces[i]) > -1) {
					idx = string.indexOf(pieces[i], idx) + pieces[i].length;
					i++;
					idx = string.indexOf(pieces[i], idx) + pieces[i].length;
				} else {
					break;
				}
			}
			return idx+1;
		};
		// context.waitingForTab = true;
		context.title = ["Original", "Translation"];
		context.keys = {"text":"g", "description":"e"};
		context.filterFunc = null;
		context.quote = ["", util.identity, ""];
		if (!context.commandline)
			context.offset=guessOffset(context.value, ["-l", "-e", "-o"]);
		context.process[1] = url;
		context.key = encodeURIComponent(args.join("_"));
		if (args.length == 0) {
		} else {
			var req = new XMLHttpRequest();
			req.open("GET",
				"http://dict.qq.com/sug?" + args.join(" ")
			);
			req.setRequestHeader("Referer", "http://dict.qq.com/");
			req.send(null);
			req.onreadystatechange = function () {
				qq.suggest(req, context);
			}
			dict.suggestReq = req;
			return req;
		}
	},

	suggest: function(req, context) {
		if (req.readyState == 4) {
			if (req.status == 200) {
				var text = req.responseText.trim();
				var result_arr = text.split("\n");
				let suggestions = [];
				result_arr.forEach(function(line) {
						let pair = line.split("\t");
						let r = {};
						r["g"] = pair[0].trim();
						r["e"] = pair[1].trim();
						r["url"] = qq.href({"keyword": r["g"]});
						suggestions.push(r);
				});
				context.completions = suggestions;
			} else {
			}
			req.onreadystatechange = function() {};
		}
	},

};

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
	favicon: "http://translate.google.com/favicon.ico",
	get langpair() google._langpair || false,
	set langpair(langpair) {
		dict._langpair = langpair;
	},
	keyword: "",
	url: "https://ajax.googleapis.com/ajax/services/language/translate",
	init: function(keyword, args) {
		let langpair = options.get('dict-langpair').value;
		if (args["-l"])
			langpair=args["-l"];
		var formData = new FormData();
		formData.append("v", "1.0");
		formData.append("q", decodeURIComponent(keyword));
		formData.append("langpair", langpair); // en|zh_CN
		// formData.append('key', 'YOUR KEY HERE');
		formData.append("userip", google._randomIp());
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
	optsCompleter: function(context, args) {
		context.quote = ["", util.identity, ""];
		context.title = ["Langpair", T(1)];
		if (google.langpair) {
			context.completions = google.langpair;
			return;
		}
		let cpt = [];
		for (let [, [abbr, lang]] in Iterator(google.languages)) {
			for (let [, [inabbr, inlang]] in Iterator(google.languages)) {
				if (inabbr == "")
					continue;
				if (abbr == inabbr)
					continue;
				cpt.push([abbr+"|"+inabbr, T(2) + lang + T(3) + inlang]);
			}
		}
		google.langpair = cpt;
		context.completions = cpt;
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
	},
	href: false,
	_randomIp: function() {
		let pieces = [];
		for (var i = 0; i < 4; i++)
			pieces.push(Math.floor(Math.random()*254)+1);
		return pieces.join(".");
	}
};

let dict_cn = {
	// http://dict.cn/tools.html
	keyword: "",
	url: "",
	template: "",
	favicon: "http://dict.cn/favicon.ico",
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

	href: function (params) {
		const DICT_CN_PREFIX = "http://dict.cn/";
		let keyword = params['keyword'];
		if (decodeURIComponent(keyword) != keyword)
			return DICT_CN_PREFIX + keyword;
		else
			return DICT_CN_PREFIX + encodeURIComponent(keyword);
	},

	process: function(text) { // FIXME: kiss
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
			ret["full"] = {title: "", sub: {}};

			// key
			var keyelem = xml.getElementsByTagName("key");
			ret["keyword"] = keyelem.length ? keyelem[0].textContent : false;
			// pron
			var pronelem = xml.getElementsByTagName("pron");
			ret["pron"] = pronelem.length ? pronelem[0].textContent : false;

			if (ret["pron"]) {
				ret["full"]["title"] = <p class="title">
					<a href={dict_cn.url} target="_blank" highlight="URL">{ret["keyword"]}</a>
					<span>[{ret["pron"]}]</span>
				</p>;
			} else {
				ret["full"]["title"] = <p class="title"><a href={dict_cn.url} target="_blank" highlight="URL">{ret["keyword"]}</a></p>;
			}

			// def
			ret["def"] = dict._html_entity_decode(def[0].textContent);
			let piece = <></>;
			let ps = ret["def"].trim().split("\n");
			for (let [i, v] in Iterator(ps))
				piece += <><span>{v}</span><br/></>;
			ret["full"]["sub"]["单词解释"] = <div>{piece}</div>;

			// origTrans
			var sentelems = xml.getElementsByTagName("sent");
			if (sentelems.length) {
				var origTrans = [];
				let oT = <></>;
				for (var i = 0; i < sentelems.length; i++) {
					let org = dict._html_entity_decode(dict._html_entity_decode(sentelems[i].firstChild.textContent)); // <em></em>
					let trans = dict._html_entity_decode(dict._html_entity_decode(sentelems[i].lastChild.textContent));
					let dt = <dt>{org}</dt>;
					let dd = <dd>{trans}</dd>;
					oT += <>{dt}{dd}</>;

					origTrans.push([org, trans]);
				}
				ret["full"]["sub"]["例句"] = <dl>{oT}</dl>;
				ret["origTrans"] = origTrans;
			} else
				ret["origTrans"] = false;

			// rel
			var rels = xml.getElementsByTagName("rel");
			if (rels.length) {
				ret["rels"] = [];
				let rs = <></>;
				for (var i = 0; i < rels.length; i++) {
					let url = "http://dict.cn/"+encodeURIComponent(rels[i].textContent);
					rs += <><span><a href={url} target="_blank" highlight="URL">{rels[i].textContent}</a></span></>;
					ret["rels"].push(rels[i].textContent);
				}
				ret["full"]["sub"]["相关单词"] = rs;
			} else
				ret["rels"] = false;

			// audio
			var audioelem = xml.getElementsByTagName("audio");
			ret["audio"] = audioelem.length ? audioelem[0].textContent : false;

			ret["simple"] = ret["keyword"] + ": ";
			if (ret["pron"])
				ret["simple"] += "["+ret["pron"] +"] ";
			ret["simple"] += dict._eolToSpace(ret["def"]);

		} else {
			ret["notfound"] = true;
		}
		return ret;
	},

	makeRequest:  function (context, args) {
		var url = function(item, text)
		<a xmlns:dactyl={NS} identifier={item.id || ""} dactyl:command={item.command || ""}
		href={item.item.url} highlight="URL">{text || ""}</a>;
		let guessOffset = function(string, opts) { // This was not so robust, be careful.
			var pieces = string.split(/\s+/g);
			if (pieces.length <= 1)
				return string.length;
			let start = 1;
			let finded = start;
			let idx = pieces[0].length;
			for (var i = start; i < pieces.length; i++) {
				if (opts.indexOf(pieces[i]) > -1) {
					idx = string.indexOf(pieces[i], idx) + pieces[i].length;
					i++;
					idx = string.indexOf(pieces[i], idx) + pieces[i].length;
				} else {
					break;
				}
			}
			return idx+1;
		};
		// context.waitingForTab = true;
		context.title = ["Original", "Translation"];
		context.keys = {"text":"g", "description":"e"};
		context.filterFunc = null;
		context.quote = ["", util.identity, ""];
		if (!context.commandline)
			context.offset=guessOffset(context.value, ["-l", "-e", "-o"]);
		context.process[1] = url;
		context.key = encodeURIComponent(args.join("_"));
		if (args.length == 0) {
		} else {
			var req = new XMLHttpRequest();
			req.open("POST",
				"http://dict.cn/ajax/suggestion.php"
			);
			req.onreadystatechange = function () {
				dict_cn.suggest(req, context);
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
			} else if (req.status == 404) {
				// 辞海的自动补全需要 cookie
				// 因此我们对dict.cn请求一次
				var xhr = new XMLHttpRequest();
				xhr.open("GET", "http://dict.cn");
				xhr.send(null);
			} else {
			}
			req.onreadystatechange = function() {};
		}
	},

}

let dict = {
	engines: {"d" : dict_cn, "q": qq, "g" : google},
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

	get engine() dict.engines[dict.args["-e"] || options.get("dict-engine").value],
	args: {},
	init: function(args) {
		dict.args = args;
		let keyword = args.join(" ") || "";
		keyword.trim();
		if (keyword.length == 0) {
			// keyword = content.window.getSelection().toString() || "";
			keyword = dict._selection() || dactyl.clipboardRead() || "";
		}
		keyword.trim();
		if (keyword.length == 0) {
			commandline.input(T(4), function(keyword) {
					dict.keyword = keyword;
					dict.engine.init(dict.keyword, args);
				},
				{
					completer: function (context) {
						context.commandline = true;
						dict.suggest(context, [commandline.command]); // this != dict
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
			dactyl.echo("未找到 " + decodeURIComponent(dict.keyword), commandline.FORCE_SINGLELINE); // TODO: i18n?
			dict.timeout = dactyl.timeout(dict._clear, 3000);
		} else {
			let show = options.get("dict-show").value;
			if (dict.args["-o"])
				show = dict.args["-o"];
			switch ( show ) {
				case "s" :
				let invert = options.get("dict-simple").value;
				if (dict.args.bang)
					invert = !invert;
				if (invert) {
					dactyl.echomsg(ret["simple"], 0, commandline.FORCE_SINGLELINE);
					dict.timeout = dactyl.timeout(dict._clear, 15000); // TODO: clickable, styling
				} else {
					let list = template.table(ret["full"]["title"], ret["full"]["sub"]);
					dactyl.echo(<>{STYLE}{list}</>, commandline.FORCE_MULTILINE);
					// dactyl.echomsg(ret["full"]); // commandline.FORCE_MULTILINE
				}
				break;

				case "a":
				dict._alert(ret);
				break;

				case "n":
				dict._notification(ret);
				break;

				default:
				break;
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

	qq: function(req) {
		if (req.readyState == 4) {
			let ret = {};
			if (req.status == 200)
				ret = qq.process(req.responseText);
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
				if (!mow.visible)
					dict.timeout = dactyl.timeout(dict._clear, 15000);
			}
			req.onreadystatechange = function() {};
		}
	},

	suggest: function(context, args) {
		let e = options.get("dict-engine").value;
		let engine = dict.engines[e];
		if (args["-e"]) {
			e = args["-e"];
			if (dict.engines[e])
				engine = dict.engines[e];
		}
		if (engine.suggest) {
			engine.suggest(engine.makeRequest(context, args), context);
		} else {
			dict_cn.suggest(dict_cn.makeRequest(context, args), context);
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

	_notification: function(ret/*, url*/) {
		let notify = Components.classes['@mozilla.org/alerts-service;1'].getService(Components.interfaces.nsIAlertsService)
		let title = ret["keyword"];
		if (ret["pron"])
			title += ": [" + ret["pron"] + "]";
		notify.showAlertNotification(null, title, ret["def"], false, '', null);
	},

	_alert: function(ret) {
		// https://developer.mozilla.org/en/Using_popup_notifications
		// check firefox version, enable on firefox 4.0 or above.
		PopupNotifications.show(gBrowser.selectedBrowser, "dict-popup",
			ret['simple'],
			null, /* anchor ID */
			{
				label: T(5),
				accessKey: "S",
				callback: function() {
					dactyl.open(dict.engine.href({'keyword':ret['keyword']}), {background:false, where:dactyl.NEW_TAB});
				}
			},
			null  /* secondary action */
		);
		dactyl.execute('style chrome://* .popup-notification-icon[popupid="dict-popup"] { list-style-image: url("'+dict.engine.favicon+'");}');

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
	},
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

// check whether windows media player plugin exists.
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
	"d",
	{
		completer: function(context) [
			["d", "Dict.cn 海词"],
			["q", "QQ词典"],
			["g", "Google Translate"]
		]
	}
);

options.add(["dict-show", "dico"],
	"Show Results",
	"string",
	"s",
	{
		completer: function(context) [
			["s", "Statusline"],
			["a", "Alert"],
			["n", "Desktop Notification"]
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
		completer: function(context, args) google.optsCompleter(context, args)
	}
);

group.commands.add(["di[ct]", "dic"],
	"Dict Lookup",
	dict.init,
	{
		argCount: "*",
		// http://stackoverflow.com/questions/1203074/firefox-extension-multiple-xmlhttprequest-calls-per-page/1203155#1203155
		// http://code.google.com/p/dactyl/issues/detail?id=514#c2
		completer: function (context, args) {
			if (args.length >= 1)
				return dict.suggest(context, args);
		},
		bang: true, // TODO
		options: [
			{
				names: ["-e"],
				description: "Dict engine",
				type: CommandOption.STRING,
				completer: [
					["d", "Dict.cn 海词"],
					["q", "QQ词典"],
					["g", "Google Translate"]
				]
			},
			{
				names: ["-l"],
				description: "This argument supplies the optional source language and required destination language, separated by a properly escaped vertical bar (|).",
				type: CommandOption.STRING,
				completer: function(context, args) google.optsCompleter(context,args)
			},
			{
				names: ["-o"],
				description: "Show Results",
				type: CommandOption.STRING,
				completer: [
					["s", "Statusline"],
					["a", "Alert"],
					["n", "Desktop Notification"]
				]
			},
		]
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

const DICT_LANGUAGE = window.navigator.language;

var tr = {
	'en-US': {
		1: "Description",
		2: "From ",
		3: "to ",
		4: "Lookup: ",
		5: "Details"
	},
	'zh-CN': {
		1: "描述",
		2: "从 ",
		3: "到 ",
		4: "查找：",
		5: "详情"
	}
};

function T(i) {
	return tr[DICT_LANGUAGE][i];
};

if (DICT_LANGUAGE == "zh-CN") {
var INFO =
<plugin name="dict.js" version="0.9.0"
    href="https://github.com/grassofhust/dict.js"
    summary="dict.js 在线词典"
    xmlns={NS}>
    <author email="frederick.zou@gmail.com">Yang Zou</author>
    <license href="http://opensource.org/licenses/mit-license.php">MIT</license>
    <project name="Pentadactyl" minVersion="1.0"/>
      <p>
	  Pentadactyl 的词典插件。dict.js 目前支持 QQ词典，海词，谷歌翻译。
      </p>

      <item>
        <tags>'dica' 'dict-audioplayer'</tags>
        <spec>'dict-audioplayer' 'dica'</spec>
        <type>string</type>
        <default>mplayer</default>
        <description>
        <p>
          dict.js 朗读单词或者句子时调用的外部音频播放器，该选项在非微软视窗平台下有效。
          </p>
		  <warning>在 Windows 平台下，dict.js 使用 Windows Media Player 插件来进行声音输出。如果出现了声音方面的问题，请参考：<link topic="http://support.mozilla.com/zh-CN/kb/%E5%9C%A8%20Firefox%20%E4%B8%AD%E4%BD%BF%E7%94%A8%20Windows%20Media%20Player%20%E6%8F%92%E4%BB%B6">在 Firefox 中使用 Windows Media Player 插件</link></warning>
        </description>
      </item>

      <item>
        <tags>'dicd' 'dict-dblclick'</tags>
        <spec>'dict-dblclick' 'dicd'</spec>
        <type>boolean</type>
        <default>false</default>
        <description>
          <p>
          使用双击选定单词时，翻译被选定的文字。
          </p>
        </description>
      </item>

      <item>
        <tags>'dice' 'dict-engine'</tags>
        <spec>'dict-engine' 'dice'</spec>
        <type>string</type>
        <default>d</default>
        <description>
		  <p>dict.js 当前支持的网站：</p>
        <dl dt="width: 6em;">
            <dt>d</dt>      <dd><link topic="http://dict.cn/">海词</link></dd>
            <dt>g</dt>      <dd><link topic="http://translate.google.com">谷歌翻译</link></dd>
            <dt>q</dt>      <dd><link topic="http://qq.dict.com">QQ词典</link></dd>
        </dl>
		<p>dict.js 默认使用海词。</p>
        </description>
      </item>

      <item>
        <tags>'dich' 'dict-hasaudio'</tags>
        <spec>'dict-hasaudio' 'dich'</spec>
        <type>boolean</type>
        <default>true</default>
        <description>
          <p>开启或者关闭声音。</p>
		  <warning>在 Windows 平台下，默认关闭声音输出。</warning>
        </description>
      </item>

      <item>
        <tags>'dicl' 'dict-langpair'</tags>
        <spec>'dict-langpair' 'dicl'</spec>
        <type>string</type>
        <default>en|zh-CN</default>
        <description>
		<p>使用谷歌翻译时，从哪种来源语言翻译到指定的目标语言。比如 <str>en|zh-CN</str>，表明从英文翻译到简体中文。</p>
		<note>来源语言可以省略，例如当设置<o>dicl</o>为<str>|zh-CN</str>时，表明从任何语言翻译至简体中文。</note>
		<p><link topic="http://code.google.com/apis/language/translate/v1/getting_started.html#translatableLanguages">谷歌翻译所支持的语言及其对应的缩写。</link></p>
        </description>
      </item>

      <item>
        <tags>'dico' 'dict-show'</tags>
        <spec>'dict-show' 'dico'</spec>
        <type>string</type>
        <default>'s'</default>
        <description>
		<p>翻译结果的输出形式：</p>
        <dl dt="width: 6em;">
            <dt>a</dt>      <dd>Firefox 通知窗口</dd>
            <dt>n</dt>      <dd>桌面通知</dd>
            <dt>s</dt>      <dd>Pentadactyl 状态栏</dd>
        </dl>
        </description>
      </item>

      <item>
        <tags>'dics' 'dict-simple'</tags>
        <spec>'dics' 'dics'</spec>
        <type>boolean</type>
        <default>true</default>
        <description>
		<p>是否输出单词的详细信息，默认为简洁形式。</p>
		<note>目前只有当翻译结果输出到状态栏时有效。Firefox 通知窗口、桌面通知均以简洁形式输出。</note>
        </description>
      </item>

	  <item>
	  <spec>:dict [action] ...</spec>
	  <tags>:dict :di</tags>
	  <description>
	  <p>
	  翻译单词或者句子，如果输入的翻译内容为空，将会首先尝试翻译当前页面被选中的文字，其次是剪贴板中的内容，如果这些都为空，则会提供一个输入框来输入想要翻译的内容。
	  </p>
	  </description>
	  <strut/>
	  </item>

	  <item>
	  <tags>:dict! :di!</tags>
	  <strut/>
	  <spec>:dict!</spec>
	  <description>
	  <p>
	  翻译单词或者句子，此时反转<o>dics</o>的设置。
	  </p>
	  </description>
	  </item>

	  <item>
	  <tags>:dict-options</tags>
	  <strut/>
	  <spec>dict.js 命令行选项</spec>
	  <description>
	  <p>
	  <ex>:dict</ex> <ex>:dict!</ex>支持的命令行选项：
	  </p>
        <dl dt="width: 6em;">
            <dt>-e</dt>      <dd>给定使用的翻译网站 <note><o>dice</o></note></dd>
            <dt>-l</dt>      <dd>谷歌翻译时的语言设置 <note><o>dicl</o></note></dd>
            <dt>-o</dt>      <dd>翻译结果的输出设置 <note><o>dico</o></note></dd>
        </dl>
	  </description>
	  </item>

	  <item>
	  <tags>:dict-shortcut</tags>
	  <strut/>
	  <spec>dict.js 快捷键</spec>
	  <description>
	  <p>dict.js 默认使用<k name="A-d"/>来快速翻译当前选区或者是剪贴板中的内容。如果选区和剪贴板都为空，则会提供一个输入框。</p>
	  </description>
	  </item>

	  <item>
		  <tags><![CDATA[<A-d>]]></tags>
		  <spec><![CDATA[<A-d>]]></spec>
		  <description>
			  <p>翻译当前选区或者是剪贴板中的内容。</p>
		  </description>
	  </item>

</plugin>;

} else {
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


}

// dict! dict.cn 的模糊查询　或者是反转google的搜索设定 或者是返回全部的词典信息 ret["full"]
// 返回查询的页面链接，最好可点击
// * http://dict.cn/ws.php?utf8=true&q=%E4%BD%A0%E5%A5%BD rel tags
// * FORCE_SINGLELINE | APPEND_MESSAGES
// * 使用mozilla notification box?
// * clear previous active request
// cache or history
// - sound is broken out? linux/winxp/win7 okay
// * auto completion doesn't work when you've never open dict.cn web page. --cookie
// * support dblclick?
// www.zdic.net support?
// 当为汉字时，使用www.zdic.net的自动补全和解释
