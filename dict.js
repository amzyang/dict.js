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

const DICT_LANGUAGE = window.navigator.language;

const tr = {
	"en-US": {
		1:  "Description",
		2:  "From ",
		3:  " to ",
		4:  "Lookup: ",
		5:  "Details",
		6:  "In Progressing...",
		7:  "Google Translate: ",
		8:  "Define",
		9:  "Related phrases",
		10: "Synonyms: ",
		11: "Antonyms: ",
		12: "Thesaurus",
		13: "Inflected",
		14: "Original Text",
		15: "Translation",
		16: "Langpair",
		17: "Source language and destination language, separated by a properly escaped vertical bar (|)",
		18: "Examples",
		19: "Not found: ",
		20: "External audio player",
		21: "Audio support",
		22: "Simple output",
		23: "Dictionary engine",
		24: "Dict.cn",
		25: "QQ Dictionary",
		26: "Show result",
		27: "Statusline",
		28: "Alert",
		29: "Desktop notification",
		30: "Enable double click",
		31: "Dict lookup",
		32: "View translation for mouse selection or clipboard (*nix only)",
		33: "View details for mouse selection or clipboard (*nix only)",
		34: "Google Translate",
		35: "Youdao Dictionary",
		36: "Chinese ↔ English",
		37: "Chinese ↔ French",
		38: "Chinese ↔ Korean",
		39: "Chinese ↔ Japanese",
		40: "Open result in new tab!"
	},
	"zh-CN": {
		1:  "描述",
		2:  "从 ",
		3:  " 到 ",
		4:  "查找：",
		5:  "详情",
		6:  "查询进行中...",
		7:  "谷歌翻译：",
		8:  "解释",
		9:  "相关词组",
		10: "同近义词：",
		11: "反义词：",
		12: "同反义词",
		13: "词形变化",
		14: "原文",
		15: "翻译",
		16: "语言对",
		17: "来源语言和目标语言",
		18: "例句",
		19: "未找到：",
		20: "外部音频播放程序",
		21: "支持声音",
		22: "简洁输出",
		23: "词典引擎",
		24: "海词",
		25: "QQ 词典",
		26: "显示结果方式",
		27: "状态栏",
		28: "提醒",
		29: "桌面通知",
		30: "双击取词",
		31: "词典查找",
		32: "查看选区或者剪贴板（非视窗平台）的翻译",
		33: "查看选区或者剪贴板（非视窗平台）的翻译详情",
		34: "谷歌翻译",
		35: "有道词典",
		36: "汉英互译",
		37: "汉法互译",
		38: "汉韩互译",
		39: "汉日互译",
		40: "在新标签页中打开结果！"
	}
};

function T(i) {
	if (DICT_LANGUAGE == "zh-CN")
		return tr["zh-CN"][i];
	return tr["en-US"][i];
}

if (document.getElementById("youdao-frame")) // workaround for :rehash
	document.getElementById('main-window').removeChild(document.getElementById('youdao-frame'));
let youdao = {
	name: T(35),
	keyword: "",
	logo: "http://shared.ydstatic.com/r/1.0/p/dict-logo-s.png",
	favicon: "http://shared.ydstatic.com/images/favicon.ico",
	init: function(keyword, args) {
		youdao.keyword = keyword;
		var req = new XMLHttpRequest();
		dict.req = req;
		req.open("GET", youdao.href({keyword: keyword, le: args["-l"] || "eng"}));
		req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
		req.onreadystatechange = function (ev) {
			dict.youdao(req);
		};
		req.send(null);
		return req;
	},
	href: function (params) {
		let keyword = encodeURIComponent(decodeURIComponent(params["keyword"]));
		let le = params["le"] || "eng"; // TODO
		let uri = "http://dict.youdao.com/search?q=" +
				  keyword + "&le=" + le + "&tab=chn";
		return uri;
	},
	html: "",
	process: function(req) {
		var frame = document.getElementById("youdao-frame");
		youdao.html = youdao._strip_html_tag(req.responseText);
		var ret = {
			notfound: false,
			ok: true,
			pron: false,
			def: false,
			simple: false,
			full: false,
			text: false,
			audio: false
		};
		if (!frame) {
			// create frame
			frame = document.createElement("iframe"); // iframe ( or browser on older Firefox)
			frame.setAttribute("id", "youdao-frame");
			frame.setAttribute("name", "youdao-frame");
			frame.setAttribute("collapsed", "true");
			document.getElementById("main-window").appendChild(frame);

			// set restrictions as needed
			frame.webNavigation.allowAuth          = false;
			frame.webNavigation.allowImages        = false;
			frame.webNavigation.allowJavascript    = false;
			frame.webNavigation.allowMetaRedirects = true;
			frame.webNavigation.allowPlugins       = false;
			frame.webNavigation.allowSubframes     = false;

			// listen for load/domcontentloaded
			frame.addEventListener("load", function (event) {
					var doc = event.originalTarget;
					doc.documentElement.innerHTML = youdao.html;
					youdao._resolveRelative(doc);
					var _ret = youdao._simple(doc);
					ret["keyword"] = _ret["word"];
					ret["audio"] = _ret["audio"] ? _ret["audio"] : ret["audio"];
					ret["pron"] = _ret["pron"] ? _ret["pron"] : ret["pron"];
					ret["def"] = _ret["def"] ? _ret["def"] : ret["def"];
					ret["notfound"] = !ret["def"];
					if (ret["pron"])
						ret["simple"] = ret["keyword"] + " [" + ret["pron"] + "] " + ret["def"];
					else
						ret["simple"] = ret["keyword"] + " " + ret["def"];
					ret["full"] = youdao._full(doc);
					dict.process(ret);
					req.onreadystatechange = function () {};
				},
				true
			);
		}
		frame.contentDocument.location.href = "about:blank";
	},

	_full: function (document) {
		var full = {title: "", sub: {}};
		var simp = youdao._simple(document);
		var keyword_url = youdao.href({keyword: simp["word"], le: dict.args["-l"] || "eng"});
		if (simp["pron"]) {
			full["title"] = <p class="title">
			<a href={keyword_url} target="_new" highlight="URL">{simp["word"]}</a>
				<span>[{simp["pron"]}]</span>
			</p>;
		} else {
			full["title"] = <p class="title">
				<a href={keyword_url} target="_blank" highlight="URL">{simp["word"]}</a>
			</p>;
		}

		// var results = document.querySelectorAll("#results");
		// if (results[0])
			// full["sub"]["Results"] = new XML("<ul>"+youdao._xmlPre(results[0].innerHTML)+"</ul>");
		// return full;

		var def = document.querySelectorAll("#etcTrans>ul, #cjTrans #basicToggle, #ckTrans #basicToggle, #cfTrans #basicToggle");
		if (def[0])
			full["sub"][T(8)] = new XML("<ul>"+youdao._xmlPre(def[0].innerHTML)+"</ul>");

		var ph = document.querySelectorAll("#wordGroup");
		if (ph[0])
			full["sub"][T(9)] = new XML("<div>"+youdao._xmlPre(ph[0].innerHTML)+"</div>");

		var syn = document.querySelectorAll("#Synonyms");
		if (syn[0])
			full["sub"][T(10)] = new XML("<div>"+youdao._xmlPre(syn[0].innerHTML)+"</div>");


		var ex = document.querySelectorAll("#examples");
		if (ex[0])
			full["sub"][T(18)] = new XML("<div>"+youdao._xmlPre(ex[0].innerHTML)+"</div>");

		var mor = document.querySelectorAll("#etcTrans p");
		if (mor[0])
			full["sub"][T(13)] = new XML("<p>"+youdao._xmlPre(mor[0].innerHTML)+"</p>");

		return full;
	},

	_simple: function (document) {
		var pron = document.querySelectorAll("#results .phonetic")[0];
		var simp = {};
		simp["word"] = decodeURIComponent(youdao.keyword);
		simp["pron"] = pron ? pron.textContent.trim().replace(/^\[|\]$/g, "") : false;
		var audio = document.querySelectorAll("#results .phonetic+a")[0];
		simp["audio"] = false;
		if (audio) {
			let datarel = audio.getAttribute("data-rel");
			simp["audio"] = "http://dict.youdao.com/dictvoice?audio=" + encodeURIComponent(datarel);
		}
		var def = document.querySelectorAll("#etcTrans>ul, #cjTrans #basicToggle, #ckTrans #basicToggle, #cfTrans #basicToggle")[0];
		simp["def"] = def ? def.textContent.trim().replace(/\n\s+/g, " | ") : false;
		return simp;
	},

	_strip_html_tag: function(str) {
		var start = str.indexOf("<head");
		var end = str.indexOf("</html>");
		return str.slice(start, end);
	},
	_xmlPre: function (str) {
		return str.replace(/&nbsp;/g, "&#160;").replace(/<\?(.*?)\?>/g,"").replace(/<br>/gi, "<br/>").replace(/<(img|input) +(.+?)>/gi, "<\$1 \$2/>").replace(/<a +(.+?)>/gi, "<a \$1 highlight=\"URL\">");
	},
	_resolveRelative: function (document) {
		var pattern = /^https?:\/\//;
		for (var i = document.links.length - 1; i >= 0; i--) {
			var link = document.links[i];
			var href = link.getAttribute("href");
			if (!pattern.test(href))
				link.setAttribute("href", "http://dict.youdao.com/"+href);
			link.setAttribute("target", "_blank");
		}
	},
	makeRequest: function(context, args) {
		var url = function(item, text)
		<a xmlns:dactyl={NS} identifier={item.id || ""} dactyl:command={item.command || ""}
		href={item.item.url} highlight="URL">{text || ""}</a>;
		// context.waitingForTab = true;
		context.title = [T(14) + " - " + T(35), T(15)];
		context.keys = {"text":"g", "description":"e"};
		context.filterFunc = null;
		context.process[1] = url;
		context.key = encodeURIComponent(args[0]);
		context.__args = args;
		if (args.length == 0) {
		} else {
			var req = new XMLHttpRequest();
			dict.suggestReq = req;
			req.open("GET",
				"http://dsuggest.ydstatic.com/suggest/suggest.s?query=" + args[0]
			);
			req.send(null);
			req.onreadystatechange = function () {
				youdao.suggest(req, context);
			}
			return req;
		}
	},

	suggest: function(req, context) {
		if (req.readyState == 4) {
			if (req.status == 200) {
				var text = unescape(req.responseText);
				var result_arr = text.match(/this.txtBox.value=.+?">/g);
				result_arr = result_arr.map(function(str) {
						return str.replace(/^this.txtBox.value=/, "").replace(/">$/, "");
				});
				let suggestions = [];
				result_arr.forEach(function(word) {
						let r = {};
						r["g"] = word;
						r["e"] = word;
						r["url"] = youdao.href({keyword: word, le: context.__args["-l"] || options["dict-langpair"] || "eng"});
						suggestions.push(r);
				});
				context.completions = suggestions;
			} else {
			}
			req.onreadystatechange = function() {};
		}
	},
};

let qq = {
	name: T(25),
	keyword: "",
	logo: "http://im-img.qq.com/inc/images/new_header2/logo.gif",
	favicon: "http://dict.qq.com/favicon.ico",
	init: function(keyword, args) {
		var req = new XMLHttpRequest();
		dict.req = req;
		req.open("GET", "http://dict.qq.com/dict?f=web&q="+keyword, true);
		req.setRequestHeader("Referer", "http://dict.qq.com/");
		req.send(null);
		req.onreadystatechange = function(ev) {
			dict.qq(req);
		};
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
			<a href={keyword_url} target="_new" highlight="URL">{_simple["word"]}</a>
				<span>[{_simple["pron"]}]</span>
			</p>;
		} else {
			full["title"] = <p class="title">
				<a href={keyword_url} target="_blank" highlight="URL">{_simple["word"]}</a>
			</p>;
		}
		if (t.des) { // Define
			let des = <></>;
			let gsen = [];
			if (t.sen)
				gsen = t.sen;
			t.des.forEach(function(item) {
				if (item["p"]) {
					let pos = item["p"];
					let sen = qq._digIntoSen(pos, gsen);
					let dt = new XML("<dt><span>"+item["p"]+"</span><span>"+item["d"]+"</span></dt>");
					let dds = <></>;
					if (sen) {
						sen.s.forEach(function(single) {
								let es = single["es"];
								let cs = single["cs"];
								dds += new XML("<dd>"+es+"</dd>");
								dds += new XML("<dd>"+cs+"</dd>");
						});
					}
					des += <><dl>{dt}{dds}</dl></>;
				} else {
					let dt = new XML("<dt><span>"+item["d"]+"</span></dt>");
					des += <><dl>{dt}</dl></>;
				}
			});
			full["sub"][T(8)] = <div class="basic">{des}</div>;
		}

		if (t.ph) { // Related phrases
			let ph = <></>;
			t.ph.forEach(function(item) {
				let href = qq.href({"keyword": item["phs"]});
				let phs = new XML(item["phs"]);
				ph += <><li><a href={href} highlight="URL">{phs}</a><span>{item["phd"]}</span></li></>;
			});
			full["sub"][T(9)] = <ol>{ph}</ol>;
		}

		if (t.syn) { // Synonyms
			let syn = <></>;
			t.syn.forEach(function(item) {
				let syn_item = <></>;
				item.c.forEach(function(single) {
					let href = qq.href({"keyword": single});
					syn_item += <><span><a href={href} highlight="URL">{single}</a></span></>;
				});
				syn += <>{syn_item}</>;
			});
			full["sub"][T(12)] = <p><span>{T(10)}</span>{syn}</p>;
		}
		if (t.ant) { // Antonyms
			let ant = <></>;
			t.ant.forEach(function(item) {
				let ant_item = <></>;
				item.c.forEach(function(single) {
					let href = qq.href({"keyword": single});
					ant_item += <><span><a href={href} highlight="URL">{single}</a></span></>;
				});
				ant += <>{ant_item}</>;
			});
			if (full["sub"][T(12)])
				full["sub"][T(12)] += <p><span>{T(11)}</span>{ant}</p>;
			else
				full["sub"][T(12)] = <p><span>{T(11)}</span>{ant}</p>;
		}
		if (t.mor) { // Inflected
			let mor = <></>;
			t.mor.forEach(function(item) {
				let href = qq.href({"keyword": item["m"]});
				mor += <><span><b>{item["c"]}</b><a href={href} highlight="URL">{item["m"]}</a></span></>;
			});
			full["sub"][T(13)] = <p>{mor}</p>;
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
					if (item["p"])
						_ret["def"].push(item["p"] + " " + item["d"]);
					else
						_ret["def"].push(item["d"]);
			});
			_ret["def"] = dict._html_entity_decode(_ret["def"].join(" | "));
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
		// context.waitingForTab = true;
		context.title = [T(14) + " - " + T(25), T(15)];
		context.keys = {"text":"g", "description":"e"};
		context.filterFunc = null;
		context.process[1] = url;
		context.key = encodeURIComponent(args[0]);
		if (args.length == 0) {
		} else {
			var req = new XMLHttpRequest();
			dict.suggestReq = req;
			req.open("GET",
				"http://dict.qq.com/sug?" + args[0]
			);
			req.setRequestHeader("Referer", "http://dict.qq.com/");
			req.send(null);
			req.onreadystatechange = function () {
				qq.suggest(req, context);
			}
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
						r["url"] = qq.href({"keyword": pair[0].trim()});
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
	name: T(34),
	favicon: "http://translate.google.com/favicon.ico",
	logo: "http://www.gstatic.com/translate/intl/en/logo.png",
	keyword: "",
	url: "https://ajax.googleapis.com/ajax/services/language/translate",
	init: function(keyword, args) {
		// let langpair = options.get("dict-langpair").value;
		// if (args["-l"])
			// langpair=args["-l"];
		let langpair = args["-l"] || options["dict-langpair"];
		var formData = new FormData();
		formData.append("v", "1.0");
		formData.append("q", decodeURIComponent(keyword));
		formData.append("langpair", langpair); // en|zh_CN
		// formData.append("key", "YOUR KEY HERE");
		formData.append("userip", google._randomIp());
		formData.append("format", "text"); // 
		var req = new XMLHttpRequest();
		dict.req = req;
		req.open("POST", google.url, true);
		req.send(formData);
		req.onreadystatechange = function(ev) {
			dict.google(req);
		};
		return req;
	},
	opts: function() {
		return {
			names: ["-langpair", "-la"],
			description: T(17),
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
	name: T(24),
	keyword: "",
	url: "",
	template: "",
	favicon: "http://dict.cn/favicon.ico",
	logo: "http://dict.cn/imgs/logo_b.png",
	init: function(keyword, args) {
		var req = new XMLHttpRequest();
		dict.req = req;
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
		return req;
	},

	href: function (params) {
		const DICT_CN_PREFIX = "http://dict.cn/";
		let keyword = params["keyword"];
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
			ret["full"]["sub"][T(8)] = <div>{piece}</div>;

			// origTrans
			var sentelems = xml.getElementsByTagName("sent");
			if (sentelems.length) {
				var origTrans = [];
				let oT = <></>;
				for (var i = 0; i < sentelems.length; i++) {
					let org = sentelems[i].firstChild.textContent
					let trans = sentelems[i].lastChild.textContent;
					let dt = new XML("<dt>"+org+"</dt>");
					let dd = new XML("<dd>"+trans+"</dd>");
					oT += <>{dt}{dd}</>;

					origTrans.push([org, trans]);
				}
				ret["full"]["sub"][T(18)] = <dl>{oT}</dl>;
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
				ret["full"]["sub"][T(9)] = rs;
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
		// context.waitingForTab = true;
		context.title = [T(14) + " - " + T(24),T(15)];
		context.keys = {"text":"g", "description":"e"};
		context.filterFunc = null;
		context.process[1] = url;
		context.key = encodeURIComponent(args[0]);
		if (args.length == 0) {
		} else {
			var req = new XMLHttpRequest();
			dict.suggestReq = req;
			req.open("POST",
				"http://dict.cn/ajax/suggestion.php"
			);
			req.onreadystatechange = function () {
				dict_cn.suggest(req, context);
			}
			// req.send(null);
			var formData = new FormData();
			formData.append("q", args[0]);
			formData.append("s", "d");
			req.send(formData);
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
						r["url"] = "http://dict.cn/" + encodeURIComponent(r["g"].trim());
						r["g"] = r["g"].trim();
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
	engines: {"d" : dict_cn, "g" : google, "q": qq, "y": youdao},
	languages: [
		["af", "Afrikaans"],
		["sq", "Albanian"],
		["am", "Amharic"],
		["ar", "Arabic"],
		["hy", "Armenian"],
		["az", "Azerbaijani"],
		["eu", "Basque"],
		["be", "Belarusian"],
		["bn", "Bengali"],
		["bh", "Bihari"],
		["br", "Breton"],
		["bg", "Bulgarian"],
		["my", "Burmese"],
		["ca", "Catalan"],
		["chr", "Cherokee"],
		["zh", "Chinese"],
		["zh-CN", "Chinese Simplified"],
		["zh-TW", "Chinese Traditional"],
		["co", "Corsican"],
		["hr", "Croatian"],
		["cs", "Czech"],
		["da", "Danish"],
		["dv", "Dhivehi"],
		["nl", "Dutch"],
		["en", "English"],
		["eo", "Esperanto"],
		["et", "Estonian"],
		["fo", "Faroese"],
		["tl", "Filipino"],
		["fi", "Finnish"],
		["fr", "French"],
		["fy", "Frisian"],
		["gl", "Galician"],
		["ka", "Georgian"],
		["de", "German"],
		["el", "Greek"],
		["gu", "Gujarati"],
		["ht", "Haitian Creole"],
		["iw", "Hebrew"],
		["hi", "Hindi"],
		["hu", "Hungarian"],
		["is", "Icelandic"],
		["id", "Indonesian"],
		["iu", "Inuktitut"],
		["ga", "Irish"],
		["it", "Italian"],
		["ja", "Japanese"],
		["jw", "Javanese"],
		["kn", "Kannada"],
		["kk", "Kazakh"],
		["km", "Khmer"],
		["ko", "Korean"],
		["ku", "Kurdish"],
		["ky", "Kyrgyz"],
		["lo", "Lao"],
		["la", "Latin"],
		["lv", "Latvian"],
		["lt", "Lithuanian"],
		["lb", "Luxembourgish"],
		["mk", "Macedonian"],
		["ms", "Malay"],
		["ml", "Malayalam"],
		["mt", "Maltese"],
		["mi", "Maori"],
		["mr", "Marathi"],
		["mn", "Mongolian"],
		["ne", "Nepali"],
		["no", "Norwegian"],
		["oc", "Occitan"],
		["or", "Oriya"],
		["ps", "Pashto"],
		["fa", "Persian"],
		["pl", "Polish"],
		["pt", "Portuguese"],
		["pt-PT", "Portuguese Portugal"],
		["pa", "Ppnjabi"],
		["qu", "Qpechua"],
		["ro", "Rpmanian"],
		["ru", "Rpssian"],
		["sa", "Sanskrit"],
		["gd", "Scots Gaelic"],
		["sr", "Serbian"],
		["sd", "Sindhi"],
		["si", "Sinhalese"],
		["sk", "Slovak"],
		["sl", "Slovenian"],
		["es", "Spanish"],
		["su", "Sundanese"],
		["sw", "Swahili"],
		["sv", "Swedish"],
		["syr", "Syriac"],
		["tg", "Tajik"],
		["ta", "Tamil"],
		["tt", "Tatar"],
		["te", "Telugu"],
		["th", "Thai"],
		["bo", "Tibetan"],
		["to", "Tonga"],
		["tr", "Turkish"],
		["uk", "Ukrainian"],
		["ur", "Urdu"],
		["uz", "Uzbek"],
		["ug", "Uighur"],
		["vi", "Vietnamese"],
		["cy", "Welsh"],
		["yi", "Yiddish"],
		["yo", "Yoruba"],
		["", "Unknown"]
	],
	get req() dict._req || null,
	set req(req) {
		if (dict.req)
			dict.req.abort();
		dict._req = req;

		// show progressing
		var self = this;
		var p = document.getElementById('statusbar-display');
		req.addEventListener('loadstart', function(evt) {
			self.timeoutid = window.setTimeout(function() {
					p.label = T(6);
					self.intervalid = window.setInterval(function() {p.label = T(6);}, 400);
					delete self.timeoutid;
				},
				400);
		},
		false);
		["load", "error", "abort"].forEach(function(st) { // loadend
			req.addEventListener(st, function(evt) {
				if (self.timeoutid) {
					window.clearTimeout(self.timeoutid);
					delete self.timeoutid;
				} else {
					p.label = "";
					window.clearInterval(self.intervalid);
					delete self.intervalid;
				}
			},
			false);
		});
	},
	get langpairs() dict._langpairs || false,
	set langpairs(langpairs) {
		dict._langpairs = langpairs;
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

	get engine() dict.engines[dict._route(dict.args)],
	args: {},
	init: function(args) {
		dict.args = args;
		let keyword = args[0] || "";
		keyword = keyword.trim();
		if (keyword.length == 0) {
			// keyword = content.window.getSelection().toString() || "";
			if (util.OS.isWindows)
				keyword = dict._selection() || "";
			else
				keyword = dict._selection() || dactyl.clipboardRead() || "";
		}
		keyword = keyword.trim();
		if (keyword.length == 0) {
			commandline.input(T(4), function(keyword) {
					dict.keyword = keyword.trim();
					if (args["-t"])
						return dactyl.open(dict.engine.href({keyword:dict.keyword, le: args["-l"] || "eng"}), {background:false, where:dactyl.NEW_TAB});
					dict.engine.init(dict.keyword, args);
				},
				{
					completer: function (context) {
						dict.suggest(context, [commandline.command]); // this != dict
					}
				}
			);
		} else {
			dict.keyword = keyword;
			if (args["-t"])
				return dactyl.open(dict.engine.href({keyword:dict.keyword, le: args["-l"] || "eng"}), {background:false, where:dactyl.NEW_TAB});
			dict.engine.init(dict.keyword, args);
		}
	},

	process: function(ret) {
		// audio
		if (ret["audio"])
			dict._play(ret["audio"]);
		else {
			if (/^[\u0001-\u00ff]+$/.test(decodeURIComponent(dict.keyword))) { // 0-255
				var uri = "http://translate.google.com/translate_tts?q=" + dict.keyword; // FIXME: 当keyword过长时，应该分词
				dict._play(uri);
			}
		}

		if (ret["notfound"]) {
			dactyl.echo(T(19) + decodeURIComponent(dict.keyword), commandline.FORCE_SINGLELINE);
			dict.timeout = dactyl.timeout(dict._clear, 3000);
		} else {
			var show = options.get("dict-show").value;
			if (dict.args["-o"])
				show = dict.args["-o"];
			switch ( show ) {
				case "s" :
				var invert = options.get("dict-simple").value;
				if (dict.args.bang)
					invert = !invert;
				if (invert) {
					dactyl.echomsg(ret["simple"], 0, commandline.FORCE_SINGLELINE);
					dict.timeout = dactyl.timeout(dict._clear, 15000); // TODO: clickable, styling
				} else {
					var list = template.table(ret["full"]["title"], ret["full"]["sub"]);
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

	youdao: function (req) {
		if (req.readyState == 4) {
			if (req.status == 200) {
				youdao.process(req);
			} else
				dict.error(req.status);
		}
	},

	google: function(req) {
		if (req.readyState == 4) {
			if (req.status == 200) {
				let g = JSON.parse(req.responseText);
				let t = g.responseData.translatedText.replace(/\n$/, "").split("\n");
				let show = options.get("dict-show").value;
				if (dict.args["-o"])
					show = dict.args["-o"];
				switch (show) {
					case "s":
					if (t.length > 1 && !mow.visible)
						dactyl.echo("\n");
					for (let [i, v] in  Iterator(t))
						dactyl.echo(v);
					if (!mow.visible)
						dict.timeout = dactyl.timeout(dict._clear, 15000);
					break;

					case "a":
					PopupNotifications.show(gBrowser.selectedBrowser, "dict-popup",
						g.responseData.translatedText,
						"dict-popup-anchor", /* anchor ID */
						{
							label: T(5),
							accessKey: "S",
							callback: function() {
								dactyl.open("http://translate.google.com/", {background:false, where:dactyl.NEW_TAB});
							}
						},
						null,  /* secondary action */
						{
							timeout: Date.now() + 15000
						}
					);
					dactyl.execute('style chrome://* .popup-notification-icon[popupid="dict-popup"] { background:transparent url("'+dict.engine.logo+'") no-repeat left 50%;}');
					break;

					case "n":
					let notify = Components.classes['@mozilla.org/alerts-service;1'].getService(Components.interfaces.nsIAlertsService)
					let listener = {
						observe: function(subject, topic, data) {
							if (topic == "alertclickcallback")
								dactyl.open(data, {background:true, where:dactyl.NEW_TAB});
						}
					}
					let title = T(34);
					notify.showAlertNotification(dict.engine.favicon, title, g.responseData.translatedText, true, 'http://translate.google.com/', listener, "dict-js-popup");
					break;

					default:
					break;
				}
			}
			req.onreadystatechange = function() {};
		}
	},

	suggest: function(context, args) {
		let engine = dict.engines[dict._route(args)];
		if (engine.suggest) {
			engine.suggest(engine.makeRequest(context, args), context);
		} else {
			dict_cn.suggest(dict_cn.makeRequest(context, args), context);
		}
		
		/*context.fork("words_buffer", 0, this, function (context) {
				 var keyword = args.join(" ").trim();
				 if (keyword.length < 3)
					 return;
				 var words = content.document.body.textContent.split(/\:|\"|\[|\]|\.|,|\s|\t|\n/).filter(function(i) {
						 return i.length >= 3 && /^[\-\.a-zA-Z]+$/.test(i);
				 }).map(function(i) {
						 return i.toLowerCase().replace(/^\.|\.$/g, "");
				 }).filter(function(i, index, allwords) {
						 return (allwords.indexOf(i) == index) && (i.indexOf(keyword.toLowerCase()) > -1);
				 });
				 var completions = [];
				 words.forEach(function(r) {
						 completions.push([r]);
				 });
				 context.title = ["Words from current buffer!"];
				 context.completions = completions;
		});*/
	},

	opts: function () {
		if (dict.engine.hasOwnProperty('opts'))
			return dict.engine.opts() || undefined;
		return undefined;
	},

	optsCompleter: function(context, args) {
		context.quote = ["", util.identity, ""];
		let youdao_completions = [
			['eng', T(36)],
			['fr', T(37)],
			['ko', T(38)],
			['jap', T(39)]
		];
		if (!dict.langpairs) {
			let cpt = [];
			for (let [, [abbr, lang]] in Iterator(dict.languages)) {
				for (let [, [inabbr, inlang]] in Iterator(dict.languages)) {
					if (inabbr == "")
						continue;
					if (abbr == inabbr)
						continue;
					cpt.push([abbr+"|"+inabbr, T(2) + lang + T(3) + inlang]);
				}
			}
			dict.langpairs = cpt;
		}
		if (args["-e"]) {
			switch (args["-e"]) {
				case 'y':
				context.fork("youdao_le", 0, this, function(context) {
						context.title = [T(16) + " - " + T(35), T(1)];
						context.completions = youdao_completions;
						context.compare = null;
				});
				break;

				case 'd':
				case 'q':
				context.completions = [];
				break;

				case 'g':
				context.fork("dict_langpairs", 0, this, function (context) {
						context.title = [T(16) + " - " + T(34), T(1)];
						context.compare = null;
						context.completions = dict.langpairs;
				});
				break;

				default :
				context.completions = [];
				break;
			}
		} else {
			context.fork("youdao_le", 0, this, function(context) {
					context.title = [T(16) + " - " + T(35), T(1)];
					context.completions = youdao_completions;
					context.compare = null;
			});
			context.fork("dict_langpairs", 0, this, function (context) {
					context.title = [T(16) + " - " + T(34), T(1)];
					context.compare = null;
					context.completions = dict.langpairs;
			});
		}
	},

	error: function (code) {

	},

	_route: function (args) {
		let keyword = args[0] || "";
		let lang = args["-l"] || "";
		let engine = args["-e"] || options["dict-engine"];
		switch (lang) {
			case "jap":
			case "eng":
			case "fr":
			case "ko":
			engine = "y"; // youdao
			break;

			case "":
			break;

			default:
			engine = "g";
			break;
		}
		return engine;
	},

	_play: function(uri) {
		if (!options["dict-hasaudio"])
			return false;
		if (util.OS.isWindows) {
			var dict_sound = document.getElementById("dict-sound");
			if (!dict_sound) {
				var sound = util.xmlToDom(<embed id="dict-sound" src="" autostart="false" type="application/x-mplayer2" hidden="true" height="0" width="0" enablejavascript="true" xmlns={XHTML}/>, document);
				var addonbar = document.getElementById("addon-bar"); // FIXME: firefox 3.6 support
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
			var cmd = ":";
			if (options.get("dict-audioplayer").value)
				cmd = options.get("dict-audioplayer").value;
			ex.silent("!" + cmd + " '" + uri + "' &"); // uri 要解析特殊字符
			// ex.silent("!" + cmd + " " + uri + " 0>&1 2>&1 1>/dev/null"); // uri 要解析特殊字符
		}
	},

	_clear: function() { // TODO: more tests
		dactyl.echo("", commandline.FORCE_SINGLELINE);
	},

	_eolToSpace: function(str) {
		return str.replace(/\n/g, " | ").replace(/\s+/g, " ");
	},

	_pipelineToBr: function(str) {
		return str.replace(/\s\|\s/g, "\n");
	},

	_notification: function(ret/*, url*/) {
		// https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsIAlertsService
		let notify = Components.classes['@mozilla.org/alerts-service;1'].getService(Components.interfaces.nsIAlertsService)
		let listener = {
			observe: function(subject, topic, data) {
				if (topic == "alertclickcallback")
					dactyl.open(data, {background:true, where:dactyl.NEW_TAB});
			}
		}
		let title = ret["keyword"];
		if (ret["pron"])
			title += ": [" + ret["pron"] + "]";
		let def = dict._pipelineToBr(ret["def"]);
		notify.showAlertNotification(dict.engine.favicon, title, def, true, dict.engine.href({"keyword":ret["keyword"]}), listener, "dict-js-popup");
	},

	_alert: function(ret) {
		// https://developer.mozilla.org/en/Using_popup_notifications
		// check firefox version, enable on firefox 4.0 or above.
		PopupNotifications.show(gBrowser.selectedBrowser, "dict-popup",
			dict._pipelineToBr(ret["simple"]),
			"dict-popup-anchor", /* anchor ID */
			{
				label: T(5),
				accessKey: "S",
				callback: function() {
					dactyl.open(dict.engine.href({'keyword':ret['keyword']}), {background:false, where:dactyl.NEW_TAB});
				}
			},
			null,  /* secondary action */
			{
				timeout: Date.now() + 15000
			}
		);
		dactyl.execute('style chrome://* .popup-notification-icon[popupid="dict-popup"] { background:transparent url("'+dict.engine.logo+'") no-repeat left -8px;}');

	},

	// http://stackoverflow.com/questions/2808368/converting-html-entities-to-unicode-character-in-javascript
	_html_entity_decode: function(str) {
		var xml = new XML(dict._xmlPre(str));
		return xml.toString();
	},

	_xmlPre: function(str) {
		return str.replace(/&nbsp;/g, "&#160;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

if (!util.OS.isWindows) {
	options.add(["dict-audioplayer", "dicp"],
		T(20),
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
	T(21),
	"boolean",
	util.OS.isWindows ? false : true
);

options.add(["dict-simple", "dics"],
	T(22),
	"boolean",
	true
);

options.add(["dict-engine", "dice"],
	T(23),
	"string",
	"d",
	{
		completer: function(context) [
			["d", T(24)],
			["q", T(25)],
			["g", T(34)],
			["y", T(35)]
		]
	}
);

options.add(["dict-show", "dico"],
	T(26),
	"string",
	"s",
	{
		completer: function(context) [
			["s", T(27)],
			["a", T(28)],
			["n", T(29)]
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
	T(30),
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

options.add(["dict-langpair", "dicl"], // stringmap google:en|zh-CN,youdao:jap
	T(17),
	"string",
	"en|zh-CN",
	{
		completer: function(context, args) dict.optsCompleter(context, args)
	}
);

group.commands.add(["di[ct]", "dic"],
	T(31),
	dict.init,
	{
		argCount: "?", // TODO ?
		// http://stackoverflow.com/questions/1203074/firefox-extension-multiple-xmlhttprequest-calls-per-page/1203155#1203155
		// http://code.google.com/p/dactyl/issues/detail?id=514#c2
		bang: true, // TODO
		completer: function (context, args) {
			if (args.length >= 1 && args[0] !== "-")
				return dict.suggest(context, args);
		},
		literal: 0,
		options: [
			{
				names: ["-e"],
				description: T(23),
				type: CommandOption.STRING,
				completer: [
					["d", T(24)],
					["q", T(25)],
					["g", T(34)],
					["y", T(35)]
				]
			},
			{
				names: ["-l"],
				description: T(17),
				type: CommandOption.STRING,
				completer: function(context, args) dict.optsCompleter(context,args)
			},
			{
				names: ["-o"],
				description: T(26),
				type: CommandOption.STRING,
				completer: [
					["s", T(27)],
					["a", T(28)],
					["n", T(29)]
				]
			},
			{
				names: ["-t"],
				description: T(40),
				type: CommandOption.NOARG
			}
		]
	}
);

Array.slice("dgqy").forEach(function(char) {
		let extra_options = [];
		if (char === "g" || char === "y") {
			extra_options = [
				{
					names: ["-l"],
					description: T(17),
					type: CommandOption.STRING,
					completer: function(context, args) {
						args["-e"] = char;
						dict.optsCompleter(context,args);
					}
				}
			];
		}
		group.commands.add(["dict"+char, "di"+char],
			T(31) + " - " + dict.engines[char].name,
			function (args) {
				args["-e"] = char;
				dict.init(args);
			},
			{
				argCount: "?", // TODO ?
				// http://stackoverflow.com/questions/1203074/firefox-extension-multiple-xmlhttprequest-calls-per-page/1203155#1203155
				// http://code.google.com/p/dactyl/issues/detail?id=514#c2
				bang: true, // TODO
				completer: function (context, args) {
					args["-e"] = char;
					if (args.length >= 1 && args[0] !== "-")
						return dict.suggest(context, args);
				},
				literal: 0,
				options: extra_options.concat([
					{
						names: ["-o"],
						description: T(26),
						type: CommandOption.STRING,
						completer: [
							["s", T(27)],
							["a", T(28)],
							["n", T(29)]
						]
					},
					{
						names: ["-t"],
						description: T(40),
						type: CommandOption.NOARG
					}
				])
			}
		);
});

dactyl.execute("map -modes=n,v -description='"+T(32)+"' -builtin -silent <A-d> :dict<CR>");
dactyl.execute("map -modes=n,v -description='"+T(33)+"' -builtin -silent <A-S-d> :dict!<CR>");

var INFO =
<plugin name="dict.js" version="0.9.9"
    href="https://github.com/grassofhust/dict.js"
    summary= "Dict.js - an online dictionary"
    xmlns={NS}>
	<info lang="zh-CN" summary="Dict.js - 在线词典"/>
    <author email="frederick.zou@gmail.com">Yang Zou</author>
    <license href="http://opensource.org/licenses/mit-license.php">MIT</license>
    <project name="Pentadactyl" minVersion="1.0"/>

      <p lang="en-US">Dict.js is an online dictionary plugin for pentadactyl. It supports <link topic="http://dict.qq.com/">QQ</link>, <link topic="http://dict.youdao.com/">Youdao</link>, <link topic="http://dict.cn/">Dict.cn</link> and <link topic="http://translate.google.com/">Google Translate</link>.</p>
      <p lang="zh-CN">Pentadactyl 的词典插件。dict.js 目前支持 <link topic="http://dict.qq.com/">QQ词典</link>，<link topic="http://dict.youdao.com/">网易有道在线词典</link>，<link topic="http://dict.cn/">海词</link>，<link topic="http://translate.google.com/">谷歌翻译</link>。</p>

      <item lang="en-US">
        <tags>'dica' 'dict-audioplayer'</tags>
        <spec>'dict-audioplayer' 'dica'</spec>
        <type>string</type>
        <default>mplayer</default>
        <description>
			<p>
			  Dict.js use external player to play sounds, this option only workable when you are on non Microsoft Windows Platform.
			  </p>
			  <warning>When you are on Windows Platform, dict.js use Windows Media Player plugin. If you have any sound issues, read this first: <link topic="http://support.mozilla.com/en-US/kb/Using%20the%20Windows%20Media%20Player%20plugin%20with%20Firefox">Using the Windows Media Player plugin with Firefox</link></warning>
        </description>
      </item>
      <item lang="zh-CN">
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

      <item lang="en-US">
        <tags>'dicd' 'dict-dblclick'</tags>
        <spec>'dict-dblclick' 'dicd'</spec>
        <type>boolean</type>
        <default>false</default>
        <description>
          <p>Double click to Automatic translate.</p>
        </description>
      </item>
      <item lang="zh-CN">
        <tags>'dicd' 'dict-dblclick'</tags>
        <spec>'dict-dblclick' 'dicd'</spec>
        <type>boolean</type>
        <default>false</default>
        <description>
          <p>
          双击选定单词时，自动翻译被选定的文字。
          </p>
        </description>
      </item>

      <item lang="en-US">
        <tags>'dice' 'dict-engine'</tags>
        <spec>'dict-engine' 'dice'</spec>
        <type>string</type>
        <default>d</default>
        <description>
			  <p>Sites that dict.js supports:  </p>
			  <dl dt="width: 6em;">
					<dt>d</dt>      <dd><link topic="http://dict.cn/">Dict.cn</link></dd>
					<dt>g</dt>      <dd><link topic="http://translate.google.com">Google Translate</link></dd>
					<dt>q</dt>      <dd><link topic="http://qq.dict.com">QQ</link></dd>
					<dt>y</dt>      <dd><link topic="http://dict.youdao.com">Youdao</link></dd>
				</dl>
			<p>dict.js use Dict.cn by default now.</p>
        </description>
      </item>
      <item lang="zh-CN">
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
				<dt>y</dt>      <dd><link topic="http://dict.youdao.com">网易有道在线词典</link></dd>
			</dl>
			<p>dict.js 默认使用海词。</p>
        </description>
      </item>

      <item lang="en-US">
        <tags>'dich' 'dict-hasaudio'</tags>
        <spec>'dict-hasaudio' 'dich'</spec>
        <type>boolean</type>
        <default>true</default>
        <description>
			  <p>Enable or disable sound support</p>
			  <warning>Sound support was disabled on Windows Platform by default.</warning>
        </description>
      </item>
      <item lang="zh-CN">
        <tags>'dich' 'dict-hasaudio'</tags>
        <spec>'dict-hasaudio' 'dich'</spec>
        <type>boolean</type>
        <default>true</default>
        <description>
			<p>开启或者关闭声音。</p>
			<warning>在 Windows 平台下，默认关闭声音输出。</warning>
        </description>
      </item>

      <item lang="en-US">
        <tags>'dicl' 'dict-langpair'</tags>
        <spec>'dict-langpair' 'dicl'</spec>
        <type>string</type>
        <default>en|zh-CN</default>
        <description>
			<p>This argument supplies the optional source language and required destination language. In order to translate from English to Spanish, specify a value of langpair=en|es.</p>

			<p>To use the auto-detect source feature, leave off the source language and only specify the vertical bar followed by the destination langauge as in: langpair=|es.</p>

			<p><link topic="http://code.google.com/apis/language/translate/v1/getting_started.html#translatableLanguages">List of translatable languages</link></p>
			<warning>The Google Translate API has been officially deprecated as of May 26, 2011. Due to the substantial economic burden caused by extensive abuse, the number of requests you may make per day will be limited and the API will be shut off completely on December 1, 2011.</warning>
			<dl dt="width: 8em;">
				<dt>jap</dt>      <dd>Chinese ↔ Japanese&#160;&#160;&#160;&#160;Youdao</dd>
				<dt>eng</dt>      <dd>Chinese ↔ English&#160;&#160;&#160;&#160;&#160;&#160;&#160;Youdao</dd>
				<dt>ko</dt>      <dd>Chinese ↔ Korean&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;Youdao</dd>
				<dt>fr</dt>      <dd>Chinese ↔ French&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;Youdao</dd>
				<dt>en|zh-CN</dt>      <dd>From English to Simplified Chinese&#160;&#160;&#160;&#160;&#160;&#160;Google Translate</dd>
				<dt>...|...</dt>      <dd>From ... to ...&#160;&#160;&#160;&#160;&#160;&#160;Google Translate</dd>
			</dl>
        </description>
      </item>
      <item lang="zh-CN">
        <tags>'dicl' 'dict-langpair'</tags>
        <spec>'dict-langpair' 'dicl'</spec>
        <type>string</type>
        <default>en|zh-CN</default>
        <description>
			<p>使用谷歌翻译时，从哪种来源语言翻译到指定的目标语言。比如 <str>en|zh-CN</str>，表明从英文翻译到简体中文。</p>
			<note>来源语言可以省略，例如当设置<o>dicl</o>为<str>|zh-CN</str>时，表明从任何语言翻译至简体中文。</note>
			<p><link topic="http://code.google.com/apis/language/translate/v1/getting_started.html#translatableLanguages">谷歌翻译所支持的语言及其对应的缩写。</link></p>
			<dl dt="width: 8em;">
				<dt>jap</dt>      <dd>汉日互译&#160;&#160;&#160;&#160;&#160;网易有道</dd>
				<dt>eng</dt>      <dd>汉英互译&#160;&#160;&#160;&#160;&#160;网易有道</dd>
				<dt>ko</dt>      <dd>汉韩互译&#160;&#160;&#160;&#160;&#160;网易有道</dd>
				<dt>fr</dt>      <dd>汉法互译&#160;&#160;&#160;&#160;&#160;网易有道</dd>
				<dt>en|zh-CN</dt>      <dd>从 英文 到 简体中文&#160;&#160;&#160;&#160;&#160;谷歌翻译</dd>
				<dt>...|...</dt>      <dd>从 ... 到 ...&#160;&#160;&#160;&#160;&#160;谷歌翻译</dd>
			</dl>
        </description>
      </item>

      <item lang="en-US">
        <tags>'dico' 'dict-show'</tags>
        <spec>'dict-show' 'dico'</spec>
        <type>string</type>
        <default>'s'</default>
        <description>
			<p>Methods to show result: </p>
			<dl dt="width: 6em;">
				<dt>a</dt>      <dd>Alert</dd>
				<dt>n</dt>      <dd>Desktop notification</dd>
				<dt>s</dt>      <dd>Pentadactyl statusline</dd>
			</dl>
        </description>
      </item>
      <item lang="zh-CN">
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

      <item lang="en-US">
		  <tags>'dics' 'dict-simple'</tags>
		  <spec>'dics' 'dics'</spec>
		  <type>boolean</type>
		  <default>true</default>
		  <description>
			  <p>Simple output</p>
			  <note>This option only workable when you "set <o>dico=s</o>".</note>
		  </description>
      </item>
      <item lang="zh-CN">
		  <tags>'dics' 'dict-simple'</tags>
		  <spec>'dics' 'dics'</spec>
		  <type>boolean</type>
		  <default>true</default>
		  <description>
			  <p>是否输出单词的详细信息，默认为简洁形式。</p>
			  <note>目前只有当翻译结果输出到状态栏时有效。Firefox 通知窗口、桌面通知均以简洁形式输出。</note>
		  </description>
      </item>

	  <item lang="en-US">
		  <spec>:dict [action] ...</spec>
		  <tags>:dict :di</tags>
		  <description>
			  <p>
			  Get translation for specified word(s)
			  </p>
		  </description>
		  <strut/>
	  </item>
	  <item lang="zh-CN">
		  <spec>:dict [action] ...</spec>
		  <tags>:dict :di</tags>
		  <description>
			  <p>
			  翻译单词或者句子，如果输入的翻译内容为空，将会首先尝试翻译当前页面被选中的文字，其次是剪贴板中的内容，如果这些都为空，则会提供一个输入框来输入想要翻译的内容。
			  </p>
			  <note><em>只在非视窗平台下支持翻译剪贴板中的内容！下面有提到剪贴板的地方也遵循这个规则。</em></note>
		  </description>
		  <strut/>
	  </item>

	  <item lang="en-US">
		  <tags>:dict! :di!</tags>
		  <strut/>
		  <spec>:dict!</spec>
		  <description>
			  <p>Translate words，reverse <o>dics</o> option now.</p>
		  </description>
	  </item>
	  <item lang="zh-CN">
		  <tags>:dict! :di!</tags>
		  <strut/>
		  <spec>:dict!</spec>
		  <description>
			  <p>翻译单词或者句子，此时反转<o>dics</o>的设置。</p>
		  </description>
	  </item>

	  <item lang="en-US">
		  <tags>:dict-options</tags>
		  <strut/>
		  <spec>dict.js commandline options</spec>
		  <description>
			  <p>
			  <ex>:dict</ex> <ex>:dict!</ex> commandline options：
			  </p>
			  <dl dt="width: 6em;">
				  <dt>-e</dt>      <dd>specified dictionary engine <note><o>dice</o></note></dd>
				  <dt>-l</dt>      <dd>specified langpair <note><o>dicl</o></note></dd>
				  <dt>-o</dt>      <dd>specified method to show result <note><o>dico</o></note></dd>
			  </dl>
		  </description>
	  </item>
	  <item lang="zh-CN">
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

	  <item lang="en-US">
		  <tags>:dict-shortcut</tags>
		  <strut/>
		  <spec>dict.js shortcuts</spec>
		  <description>
			  <p>dict.js use <k name="A-d"/> and <k name="A-S-d"/> to translate word(s) from mouse selection or clipboard.</p>
			  <note>Translate word(s) from clipboard does not support on Microsoft Windows.</note>
		  </description>
	  </item>
	  <item lang="zh-CN">
		  <tags>:dict-shortcut</tags>
		  <strut/>
		  <spec>dict.js 快捷键</spec>
		  <description>
			  <p>dict.js 默认使用<k name="A-d"/>和<k name="A-S-d"/>来快速翻译当前选区或者是剪贴板中的内容。如果选区和剪贴板都为空，则会提供一个输入框。</p>
		  </description>
	  </item>

	  <item lang="en-US">
		  <tags><![CDATA[<A-d>]]></tags>
		  <spec><![CDATA[<A-d>]]></spec>
		  <description>
			  <p>View translation for mouse selection or clipboard.</p>
			  <note>Translate word(s) from clipboard does not support on Microsoft Windows.</note>
		  </description>
	  </item>
	  <item lang="zh-CN">
		  <tags><![CDATA[<A-d>]]></tags>
		  <spec><![CDATA[<A-d>]]></spec>
		  <description>
			  <p>翻译当前选区或者是剪贴板中的内容。</p>
		  </description>
	  </item>

	  <item lang="en-US">
		  <tags><![CDATA[<A-S-d>]]></tags>
		  <spec><![CDATA[<A-S-d>]]></spec>
		  <description>
			  <p>View details for mouse selection or clipboard, shortcut for <ex>:dict!&lt;Return&gt;</ex>。</p>
			  <note>Translate word(s) from clipboard does not support on Microsoft Windows.</note>
		  </description>
	  </item>
	  <item lang="zh-CN">
		  <tags><![CDATA[<A-S-d>]]></tags>
		  <spec><![CDATA[<A-S-d>]]></spec>
		  <description>
			  <p>翻译当前选区或者是剪贴板中的内容，实际效果等同于调用<ex>:dict!&lt;Return&gt;</ex>。</p>
		  </description>
	  </item>

	  <item lang="en-US">
		  <tags>dict-show-progress</tags>
		  <spec>dict-show-progress</spec>
		  <description>
			  <p>When you have a very long queue, or your network was not that good, dict.js can show a queue progress.Added the code below to your pentadactyl config.</p>
			  <code>style chrome://browser/content/browser.xul statuspanel#statusbar-display &#123; display:block; visibility: visible }</code>
		  </description>
	  </item>
	  <item lang="zh-CN">
		  <tags>dict-show-progress</tags>
		  <spec>dict-show-progress</spec>
		  <description>
			  <p>当查询很慢，或者你的网络很糟糕时，dict.js会显示查询状态，但你需要用如下代码来显示状态信息：</p>
			  <code>style chrome://browser/content/browser.xul statuspanel#statusbar-display &#123; display:block; visibility: visible }</code>
			  <p>将上面的代码添加到你的pentadactyl配置文件中去即可。</p>
		  </description>
	  </item>
</plugin>;

// dict! dict.cn 的模糊查询　或者是反转google的搜索设定 或者是返回全部的词典信息 ret["full"]
// 返回查询的页面链接，最好可点击
// https://developer.mozilla.org/en/XUL/label#s-text-link
// dactyl.echo(<label class="text-link" xmlns={XUL} href="http://dict.cn/hello" value="hello"/>);
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
// automatic select proper engine
// x translate.google.cn -- doesn't workable, need more test.
// * literal
// 检测命令行参数是否有效，比如 :di -e xxxx
// Unicode Ranges
// history and auto completion from history
// dict-langpair -> stringmap
// use bytes instead of length
