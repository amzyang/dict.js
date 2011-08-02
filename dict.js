"use strict";
XML.ignoreWhitespace = false;
XML.prettyPrinting = false;

/*
 * HTML Parser By John Resig (ejohn.org)
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * // or to get an XML string:
 * HTMLtoXML(htmlString);
 *
 * // or to get an XML DOM Document
 * HTMLtoDOM(htmlString);
 *
 * // or to inject into an existing document/DOM node
 * HTMLtoDOM(htmlString, document);
 * HTMLtoDOM(htmlString, document.body);
 *
 */

function PARSER(){

	// Regular Expressions for parsing tags and attributes
	var startTag = /^<(\w+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
		endTag = /^<\/(\w+)[^>]*>/,
		attr = /(\w+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;
		
	// Empty Elements - HTML 4.01
	var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

	// Block Elements - HTML 4.01
	var block = makeMap("address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

	// Inline Elements - HTML 4.01
	var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

	// Elements that you can, intentionally, leave open
	// (and which close themselves)
	var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

	// Attributes that have their values filled in disabled="disabled"
	var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

	// Special Elements (can contain anything)
	var special = makeMap("script,style");

	var HTMLParser = PARSER.HTMLParser = function( html, handler ) {
		var index, chars, match, stack = [], last = html;
		stack.last = function(){
			return PARSER[ PARSER.length - 1 ];
		};

		while ( html ) {
			chars = true;

			// Make sure we're not in a script or style element
			if ( !stack.last() || !special[ stack.last() ] ) {

				// Comment
				if ( html.indexOf("<!--") == 0 ) {
					index = html.indexOf("-->");
	
					if ( index >= 0 ) {
						if ( handler.comment )
							handler.comment( html.substring( 4, index ) );
						html = html.substring( index + 3 );
						chars = false;
					}
	
				// end tag
				} else if ( html.indexOf("</") == 0 ) {
					match = html.match( endTag );
	
					if ( match ) {
						html = html.substring( match[0].length );
						match[0].replace( endTag, parseEndTag );
						chars = false;
					}
	
				// start tag
				} else if ( html.indexOf("<") == 0 ) {
					match = html.match( startTag );
	
					if ( match ) {
						html = html.substring( match[0].length );
						match[0].replace( startTag, parseStartTag );
						chars = false;
					}
				}

				if ( chars ) {
					index = html.indexOf("<");
					
					var text = index < 0 ? html : html.substring( 0, index );
					html = index < 0 ? "" : html.substring( index );
					
					if ( handler.chars )
						handler.chars( text );
				}

			} else {
				html = html.replace(new RegExp("(.*)<\/" + stack.last() + "[^>]*>"), function(all, text){
					text = text.replace(/<!--(.*?)-->/g, "$1")
						.replace(/<!\[CDATA\[(.*?)]]>/g, "$1");

					if ( handler.chars )
						handler.chars( text );

					return "";
				});

				parseEndTag( "", stack.last() );
			}

			if ( html == last )
				throw "Parse Error: " + html;
			last = html;
		}
		
		// Clean up any remaining tags
		parseEndTag();

		function parseStartTag( tag, tagName, rest, unary ) {
			if ( block[ tagName ] ) {
				while ( stack.last() && inline[ stack.last() ] ) {
					parseEndTag( "", stack.last() );
				}
			}

			if ( closeSelf[ tagName ] && stack.last() == tagName ) {
				parseEndTag( "", tagName );
			}

			unary = empty[ tagName ] || !!unary;

			if ( !unary )
				stack.push( tagName );
			
			if ( handler.start ) {
				var attrs = [];
	
				rest.replace(attr, function(match, name) {
					var value = arguments[2] ? arguments[2] :
						arguments[3] ? arguments[3] :
						arguments[4] ? arguments[4] :
						fillAttrs[name] ? name : "";
					
					attrs.push({
						name: name,
						value: value,
						escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') //"
					});
				});
	
				if ( handler.start )
					handler.start( tagName, attrs, unary );
			}
		}

		function parseEndTag( tag, tagName ) {
			// If no tag name is provided, clean shop
			if ( !tagName )
				var pos = 0;
				
			// Find the closest opened tag of the same type
			else
				for ( var pos = stack.length - 1; pos >= 0; pos-- )
					if ( stack[ pos ] == tagName )
						break;
			
			if ( pos >= 0 ) {
				// Close all the open elements, up the stack
				for ( var i = stack.length - 1; i >= pos; i-- )
					if ( handler.end )
						handler.end( stack[ i ] );
				
				// Remove the open elements from the stack
				stack.length = pos;
			}
		}
	};
	
	PARSER.HTMLtoXML = function( html ) {
		var results = "";
		
		HTMLParser(html, {
			start: function( tag, attrs, unary ) {
				results += "<" + tag;
		
				for ( var i = 0; i < attrs.length; i++ )
					results += " " + attrs[i].name + '="' + attrs[i].escaped + '"';
		
				results += (unary ? "/" : "") + ">";
			},
			end: function( tag ) {
				results += "</" + tag + ">";
			},
			chars: function( text ) {
				results += text;
			},
			comment: function( text ) {
				results += "<!--" + text + "-->";
			}
		});
		
		return results;
	};
	
	PARSER.HTMLtoDOM = function( html, doc ) {
		// There can be only one of these elements
		var one = makeMap("html,head,body,title");
		
		// Enforce a structure for the document
		var structure = {
			link: "head",
			base: "head"
		};
	
		if ( !doc ) {
			if ( typeof DOMDocument != "undefined" )
				doc = new DOMDocument();
			else if ( typeof document != "undefined" && document.implementation && document.implementation.createDocument )
				doc = document.implementation.createDocument("", "", null);
			else if ( typeof ActiveX != "undefined" )
				doc = new ActiveXObject("Msxml.DOMDocument");
			
		} else
			doc = doc.ownerDocument ||
				doc.getOwnerDocument && doc.getOwnerDocument() ||
				doc;
		
		var elems = [],
			documentElement = doc.documentElement ||
				doc.getDocumentElement && doc.getDocumentElement();
				
		// If we're dealing with an empty document then we
		// need to pre-populate it with the HTML document structure
		if ( !documentElement && doc.createElement ) (function(){
			var html = doc.createElement("html");
			var head = doc.createElement("head");
			head.appendChild( doc.createElement("title") );
			html.appendChild( head );
			html.appendChild( doc.createElement("body") );
			doc.appendChild( html );
		})();
		
		// Find all the unique elements
		if ( doc.getElementsByTagName )
			for ( var i in one )
				one[ i ] = doc.getElementsByTagName( i )[0];
		
		// If we're working with a document, inject contents into
		// the body element
		var curParentNode = one.body;
		
		HTMLParser( html, {
			start: function( tagName, attrs, unary ) {
				// If it's a pre-built element, then we can ignore
				// its construction
				if ( one[ tagName ] ) {
					curParentNode = one[ tagName ];
					return;
				}
			
				var elem = doc.createElement( tagName );
				
				for ( var attr in attrs )
					elem.setAttribute( attrs[ attr ].name, attrs[ attr ].value );
				
				if ( structure[ tagName ] && typeof one[ structure[ tagName ] ] != "boolean" )
					one[ structure[ tagName ] ].appendChild( elem );
				
				else if ( curParentNode && curParentNode.appendChild )
					curParentNode.appendChild( elem );
					
				if ( !unary ) {
					elems.push( elem );
					curParentNode = elem;
				}
			},
			end: function( tag ) {
				elems.length -= 1;
				
				// Init the new parentNode
				curParentNode = elems[ elems.length - 1 ];
			},
			chars: function( text ) {
				curParentNode.appendChild( doc.createTextNode( text ) );
			},
			comment: function( text ) {
				// create comment node
			}
		});
		
		return doc;
	};

	function makeMap(str){
		var obj = {}, items = str.split(",");
		for ( var i = 0; i < items.length; i++ )
			obj[ items[i] ] = true;
		return obj;
	}
}
PARSER();

var STYLE = <style type="text/css">
<![CDATA[
body { white-space:normal; }
* {line-height:24px;}
th, dt { font-weight:bolder; }
dt { list-style-type: disc; }
dd { margin:0.1em 0 0.2em; }
.title { text-indent: 14px; }
.title > span { margin-left: 0.8em; }
p > span, li > a { margin-right: 1em; }
span > b { margin-right: 0.4em; }
.basic dt + span { margin-right: 0.4em; }
p,dd,dt,h1,h2,h3,h4,h5,h6,h7,li,td,th {white-space:normal; word-wrap: break-word;}
.dict_block>table {width:800px;}
/* youdao */
#dict_js_y p > span, #dict_js_y li > a {margin-right: 0;}
#dict_js_y .example-via a:nth-child(2) {display:none;}
#dict_js_y .video {
	position:relative;
}
#dict_js_y .video .play {
	display:inline-block;
	position:relative;
}
#dict_js_y .video .playicon {
	cursor: pointer;
	height: 30px;
	left: 50%;
	margin-left: -15px;
	margin-top: -15px;
	position: absolute;
	top: 50%;
	width: 30px;
}

#dict_js_z * {background-image:none;}
#dict_js_z .notice {clear:both;overflow:hidden;}
#dict_js_z .dicpy {font-weight: bolder;}
/*#dict_js_z .diczy {color: #000099;}*/
#dict_js_z .info{color:#999;font-size:14px;margin-right:5px;padding-left:10px;}
#dict_js_z .mut_jies{padding:10px 20px 20px 20px;font-size:14px;}
#dict_js_z .yf_all{padding:3px 4px 4px 4px;}
#dict_js_z .if_all{font-weight:bolder;padding:3px 4px 4px 6px;}
#dict_js_z .mut_lvs{font-weight:bolder;font-weight:bolder;}
#dict_js_z .mut_ol{margin:10px 6px 10px 35px;}
#dict_js_z .mut_ol li{list-style-position:outside;list-style-type:decimal;}
#dict_js_z .mut_ol .ty{font-weight:bolder;}
#dict_js_z .mut_ol .ty a{font-weight:bolder;}
#dict_js_z .mut_h3s{font-weight:bolder;font-weight:bolder;padding:10px 20px 0 15px;}
#dict_js_z .jiaru_s{margin:10px 0;text-align:center;}
#dict_js_z .more{margin:10px 10px 10px 15px;font-size:13px;}
#dict_js_z .mutti_pp{padding:10px;}
#dict_js_z .diczx1, #dict_js_z .diczx2,#dict_js_z .diczx3,#dict_js_z .diczx4 {background-color:#9999FF;color:#000;}
#dict_js_z #z_i_1,#z_i_2{font-size:16px;line-height:20px;}
#dict_js_z #z_i_1 a{color:#900;text-decoration:underline;}
#dict_js_z #zil2,#zir2{height:100px;}
#dict_js_z #ziip{height:30px;line-height:30px;}
#dict_js_z #zil2{margin:0;padding:0;background:url("http://www.zdic.net/images/z_100.gif") no-repeat center;height:100px;width:100px;}
#dict_js_z #pytab{text-align:right;}
#dict_js_z #ztdg{width:38px;text-align:left;}
#dict_js_z #jbs{text-indent:40px;background:url("http://www.zdic.net/images/z_i_jb.gif") no-repeat;margin:2px 0 5px 0;}
#dict_js_z #bs{text-indent:40px;background:url("http://www.zdic.net/images/z_i_bs.gif") no-repeat;margin:2px 0 5px 0;}
#dict_js_z #fbs{text-indent:40px;background:url("http://www.zdic.net/images/z_i_fb.gif") no-repeat;margin:5px 0 5px 0;}
#dict_js_z #bis{text-indent:40px;background:url("http://www.zdic.net/images/z_i_bis.gif") no-repeat;margin:5px 0 5px 0;}
#dict_js_z #jt{text-indent:40px;background:url("http://www.zdic.net/images/z_i_jt.gif") no-repeat;margin:5px 15px 2px 0;float:left;}
#dict_js_z #ft{text-indent:40px;background:url("http://www.zdic.net/images/z_i_ft.gif") no-repeat;margin:5px 0 2px 0;float:left;}
#dict_js_z #uinfo{text-indent:40px;background:url("http://www.zdic.net/images/z_i_bm.gif") no-repeat;margin:0 15px 0 0;float: left;}
#dict_js_z #wb{text-indent:40px;background:url("http://www.zdic.net/images/z_i_wb.gif") no-repeat;margin:0 15px 0 0;float: left;}
#dict_js_z #cj{text-indent:40px;background:url("http://www.zdic.net/images/z_i_cj.gif") no-repeat;margin:0 15px 0 0;float: left;}
#dict_js_z #zm{text-indent:40px;background:url("http://www.zdic.net/images/z_i_zm.gif") no-repeat;margin:0 15px 0 0;float: left;}
#dict_js_z #fc{text-indent:40px;background:url("http://www.zdic.net/images/z_i_fc.gif") no-repeat;margin:0 15px 0 0;float: left;}
]]>
</style>;

var DICT_LANGUAGE = window.navigator.language;

var tr = {
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
		17: "Source language and destination language",
		18: "Examples",
		19: "Not found: ",
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
		40: "Open result in new tab!",
		41: "Han Dian",
		42: "Wikipedia"
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
		40: "在新标签页中打开结果！",
		41: "汉典",
		42: "维基百科"
	}
};

function T(i) {
	if (DICT_LANGUAGE == "zh-CN")
		return tr["zh-CN"][i];
	return tr["en-US"][i];
}

if (document.getElementById("dict-frame")) // workaround for :rehash
	document.getElementById('main-window').removeChild(document.getElementById('dict-frame'));

let wikipedia = {
	name: T(42),
	keyword: "",
	args: {lang:''},
	logo: "", // TODO: dynamic
	favicon: "", // TODO: dynamic
	init: function(keyword, args) {
		var req = new XMLHttpRequest();
		dict.req = req;
		req.open("GET", "");

	},

	href: function(params) {
		let keyword = encodeURIComponent(params["keyword"]);
		let site = params["sites"] || options["dict-Langpair"]["w"] || options.get("dict-langpair").defaultValue["w"];
		return "http://"+site+".wikipedia.org/wiki/"+keyword;

	},

	process: function(text) {

	},

	_full: function(arg) {

	},

	_simple: function(arg) {

	},

	generate: function(context, args) {

	}
};

let zdic = {
	name: T(41),
	keyword: "",
	logo: "http://www.zdic.net/images/logo.gif",
	favicon: "http://www.zdic.net/favicon.ico",
	init: function(keyword, args) {
		zdic.keyword = keyword;
		let type = args["-l"] || options["dict-langpair"]["z"] || options.get("dict-langpair").defaultValue["z"];
		let pairs = [
			["lb_a", "hp"],
			["lb_b", "mh"],
			["lb_c", "mh"],
			["tp", "tp1"],
			["q", keyword]
		];
		let tp = type.slice(0, 1);
		let lb = type.slice(1);
		if (tp >=2)
			pairs[tp - 2] = [pairs[tp - 2][0], lb];
		pairs[3] = ["tp", "tp" + tp];
		let pieces = [];
		pairs.forEach(function (pair) {
			pieces.push(pair.join("="));
		});

		var req = new XMLHttpRequest();
		dict.req = req;
		req.open("POST", "http://www.zdic.net/sousuo/", true);
		req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		req.onreadystatechange = function (ev) {
			dict.zdic(req);
		};
		req.send(pieces.join("&"));
		return req;
	},

	href: function (params) {
		// return "http://zdic.net/search?c=3&q=" + encodeURIComponent(params["keyword"]);
		let keyword = encodeURIComponent(params["keyword"]);
		let type = params["type"] || options["dict-langpair"]["z"] || options.get("dict-langpair").defaultValue["z"];
		let pairs = [
			["lb_a", "hp"],
			["lb_b", "mh"],
			["lb_c", "mh"],
			["tp", "tp1"],
			["q", keyword]
		];
		let tp = type.slice(0, 1);
		let lb = type.slice(1);
		if (tp >=2)
			pairs[tp - 2] = [pairs[tp - 2][0], lb];
		pairs[3] = ["tp", "tp" + tp];
		let pieces = [];
		pairs.forEach(function (pair) {
			pieces.push(pair.join("="));
		});
		return "http://www.zdic.net/sousuo/?"+pieces.join("&");
	},

	process: function(text) {
		let ret = {
			notfound: false,
			ok: true,
			pron: false,
			def: false,
			simple: false,
			full: false,
			audio: false
		};
		
		// 移除隐藏的网站宣传
		let html = text;
		let style_pattern = /<style type="text\/css">[\s\S]*(zdct[0-9]+)[\s\S]*<\/style>/i;
		let classname = (style_pattern.test(text) && text.match(style_pattern)[1]) || false;
		if (classname) {
			let clearpattern = RegExp("<p class=\""+classname+"\">.*?<\\\/p>", "ig");
			html = text.replace(clearpattern, "");
		}
		html = zdic._strip_html_tag(html);

		let document = dict.htmlToDom(html);
		let body = document.body;
		dict.resolveRelative(body, "http://www.zdic.net/");

		// 移除添加到备忘录, 网友讨论
		var rems = body.querySelectorAll(".badd,.bwladd,#wy,.secpan,.gdym,.annu_div,.ga,ga+div");
		if (rems) {
			Array.slice(rems).forEach(function (i) {
				i.parentNode.removeChild(i);
			});
		}
		// TODO: 移除 comments, stylesheets, objects, javascripts
		var nodes = body.getElementsByTagName("*");
		Array.slice(nodes).forEach(function(node) {
			if (node && node.nodeType == Node.COMMENT_NODE || node.nodeName == "SCRIPT" || node.nodeName == "STYLE" || node.nodeName == "LINK" || node.nodeName == "IFRAME") {
				node.parentNode.removeChild(node);
			}
		});

		var _ret = zdic._simple(body);
		ret["keyword"] = _ret["word"];
		ret["audio"] = _ret["audio"] ? _ret["audio"] : ret["audio"];
		ret["pron"] = _ret["pron"] ? _ret["pron"] : ret["pron"];
		ret["def"] = _ret["def"] ? _ret["def"] : ret["def"];
		ret["notfound"] = !ret["def"];
		ret["simple"] = ret["def"].replace(/\n|\r/g, " ").replace(/\s\s+/g, " ");
		ret["full"] = zdic._full(body);
		return ret;
	},

	_full: function(body) {
		var full = {title: "", sub: {}};
		var simp = zdic._simple(body);
		var keyword_url = zdic.href({keyword: simp["word"]});
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

		var explain = body.querySelectorAll("div#wrapper div#container div#content");
		if (explain[0])
			full["sub"][T(8)] = new XML("<div xmlns=\""+XHTML+"\">"+PARSER.HTMLtoXML(zdic._htmlPre(explain[0].innerHTML))+"</div>");
		return full;
	},

	_simple: function(body) {
		var simp = {};
		simp["word"] = decodeURIComponent(zdic.keyword);
		simp["pron"] = false; // TODO
		simp["audio"] = false; // TODO
		var def = body.querySelectorAll("#content");
		simp["def"] = def[0].textContent.trim();
		return simp;
	},

	_strip_html_tag: function(str) {
		return youdao._strip_html_tag(str).replace("&eacute;", "&#233;"); // TODO
	},

	_htmlPre: function(str) {
		return youdao._htmlPre(str);
	},

	generate: function(context, args) { // TODO 检查"日"字, <li><a href="/zd/zi3/ZdicF0ZdicA8Zdic96ZdicB9.htm" class="usual">　<img src="http://www.zdic.net/zd/3s/285B9.gif" width="20"  height="20"> <span class='ef'>rì</span></a></li>
		let type = args["-l"] || options["dict-langpair"]["z"] || options.get("dict-langpair").defaultValue["z"];
		let pairs = [
			["lb", "hp"],
			["tp", "tp1"],
			["q", encodeURIComponent(args[0])]
		];
		let tp = type.slice(0, 1);
		let lb = type.slice(1);
		if (tp >=2)
			pairs[0] = [pairs[0][0], lb];
		pairs[1] = ["tp", "tp" + tp];
		let pieces = [];
		pairs.forEach(function (pair) {
				pieces.push(pair.join("="));
		});

		var req = new XMLHttpRequest();
		dict.suggestReq = req;
		req.open("GET",
			"http://www.zdic.net/sousuo/ac/?"+pieces.join("&")
		);
		req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		req.setRequestHeader("Referer", "http://www.zdic.net/cy/ch/ZdicE9Zdic94ZdicA610728.htm");
		req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		req.setRequestHeader("X-Prototype-Version", "1.5.0");
		var suggestions = [];
		req.onreadystatechange = function () {
			if (req.readyState == 4) {
				if (req.status == 200) {
					var body = dict.htmlToDom("<head></head><body>"+req.responseText+"</body>").body;
					var lis = body.querySelectorAll(".accy li");
					if (lis) {
						Array.slice(lis).forEach(function (li) {
								var r = {};
								var href = li.getElementsByTagName("a")[0];
								var span = href.getElementsByTagName("span")[0];
								if (span) {
									r["e"] = span.textContent.trim();
									href.removeChild(span);
								}
								r["url"] = href.getAttribute("href");
								r["g"] = href.textContent.trim();
								r["e"] = r["e"] || r["g"];
								suggestions.push(r); // trim blank chars
						});
					}
					if (suggestions.length == 0 && args[0].trim().length > 0) // TODO
						context.completions = [{url:zdic.href({keyword:args[0], type:args["-l"]}), g:args[0], e:"自动补全查询结束, 无返回结果"}];
					else
						context.completions = suggestions;
				} else {
					var p = document.getElementById("statusbar-display");
					p.label = "自动补全失败, 返回值: "+req.status;
					if (dict._errortimeoutid) {
						window.clearTimeout(dict._errortimeoutid);
						delete dict._errortimeoutid;
					}
					dict._errortimeoutid = window.setTimeout(function() {
						p.label = "";
						delete dict._errortimeoutid;
					}, 400);
				}
			}
		};
		req.send(null);

	}

};

let youdao = {
	name: T(35),
	keyword: "",
	logo: "http://shared.ydstatic.com/r/1.0/p/dict-logo-s.png",
	favicon: "http://shared.ydstatic.com/images/favicon.ico",
	init: function(keyword, args) {
		youdao.keyword = keyword;
		var req = new XMLHttpRequest();
		dict.req = req;
		req.open("GET", youdao.href({keyword: decodeURIComponent(keyword), le: args["-l"]}));
		req.onreadystatechange = function (ev) {
			dict.youdao(req);
		};
		req.send(null);
		return req;
	},
	href: function (params) {
		let keyword = encodeURIComponent(params["keyword"]);
		let le = params["le"] || options["dict-langpair"]["y"] || options.get("dict-langpair").defaultValue["y"];
		return "http://dict.youdao.com/search?q=" +
				keyword + "&le=" + le + "&tab=chn";
	},
	html: "",
	process: function(text) {
		var html = youdao._strip_html_tag(text);
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
		var doc = dict.htmlToDom(html);
		dict.resolveRelative(doc, "http://dict.youdao.com/");
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
		return ret;
	},

	_full: function (document) {
		var full = {title: "", sub: {}};
		var simp = youdao._simple(document);
		var keyword_url = youdao.href({keyword: simp["word"], le: dict.args["-l"]});
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

		var def = document.querySelectorAll("#etcTrans>ul, #cjTrans #basicToggle, #ckTrans #basicToggle, #cfTrans #basicToggle");
		if (def[0])
			full["sub"][T(8)] = new XML("<ul>"+youdao._htmlPre(def[0].innerHTML)+"</ul>");

		var ph = document.querySelectorAll("#wordGroup");
		if (ph[0])
			full["sub"][T(9)] = new XML("<div>"+youdao._htmlPre(ph[0].innerHTML)+"</div>");

		var syn = document.querySelectorAll("#Synonyms");
		if (syn[0])
			full["sub"][T(10)] = new XML("<div>"+youdao._htmlPre(syn[0].innerHTML)+"</div>");


		var ex = document.querySelectorAll("#examples");
		if (ex[0])
			full["sub"][T(18)] = new XML("<div>"+youdao._htmlPre(ex[0].innerHTML)+"</div>");

		var mor = document.querySelectorAll("#etcTrans p");
		if (mor[0])
			full["sub"][T(13)] = new XML("<p>"+youdao._htmlPre(mor[0].innerHTML)+"</p>");

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
			simp["audio"] = "http://dict.youdao.com/dictvoice?audio=" + encodeURIComponent(datarel) + "&le=" + (dict.args["-l"] || options["dict-langpair"]["y"] || options.get("dict-langpair").defaultValue["y"]);
		}
		var def = document.querySelectorAll("#etcTrans>ul, #cjTrans #basicToggle, #ckTrans #basicToggle, #cfTrans #basicToggle")[0];
		simp["def"] = def ? def.textContent.trim().replace(/\n\s+/g, " | ") : false;
		return simp;
	},

	_strip_html_tag: function(str) {
		var start = str.indexOf("<head");
		if (start == -1)
			start = str.indexOf("<HEAD");
		var end = str.indexOf("</html>");
		if (end == -1)
			end = str.indexOf("</HTML>");
		return str.slice(start, end);
	},
	_htmlPre: function (str) {
		return str.replace(/&nbsp;/g, "&#160;").replace(/<\?(.*?)\?>/g,"").replace(/<br>/gi, "<br/>").replace(/<(img|input) +(.+?)>/gi, "<\$1 \$2/>").replace(/<a +(.+?)>/gi, "<a \$1 highlight=\"URL\">");
	},

	generate: function(context, args) {
		var req = new XMLHttpRequest();
		dict.suggestReq = req;
		req.open("GET",
			"http://dsuggest.ydstatic.com/suggest/suggest.s?query=" + encodeURIComponent(args[0])
		);
		var suggestions = [];
		req.onreadystatechange = function () {
			if (req.readyState == 4) {
				if (req.status == 200) {
					var text = unescape(req.responseText);
					var result_arr = text.match(/this.txtBox.value=.+?">/g) || [];
					result_arr = result_arr.map(function(str) {
							return str.replace(/^this.txtBox.value=/, "").replace(/">$/, "");
					});
					result_arr.forEach(function(word) {
							let r = {};
							r["g"] = word;
							r["e"] = word;
							r["url"] = youdao.href({keyword: word, le: args["-l"]});
							suggestions.push(r);
					});
					if (suggestions.length == 0 && args[0].trim().length > 0) // TODO
						context.completions = [{url:youdao.href({keyword:args[0], le:args["-l"]}), g:args[0], e:"自动补全查询结束, 无返回结果"}];
					else
						context.completions = suggestions;
				} else {
					var p = document.getElementById("statusbar-display");
					p.label = "自动补全失败, 返回值: "+req.status;
					if (dict._errortimeoutid) {
						window.clearTimeout(dict._errortimeoutid);
						delete dict._errortimeoutid;
					}
					dict._errortimeoutid = window.setTimeout(function() {
						p.label = "";
						delete dict._errortimeoutid;
					}, 400);
				}
			}
		};
		req.send(null);
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
		let keyword = encodeURIComponent(params['keyword']);
		return QQ_PREFIX + keyword;
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
				if (typeof item === "string") {
					let dt = new XML("<dt><span>"+item+"</span></dt>");
					des += <><dl>{dt}</dl></>;
				} else {
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
				}
			});
			full["sub"][T(8)] = <div class="basic">{des}</div>;
		}

		if (t.ph) { // Related phrases
			let ph = <></>;
			t.ph.forEach(function(item) {
				let href = qq.href({"keyword": item["phs"]});
				let phs = new XML(item["phs"]);
				ph += <><li><a href={href} highlight="URL">{phs}</a> {item["phd"]}</li></>;
			});
			full["sub"][T(9)] = <ol>{ph}</ol>;
		}

		if (t.syn) { // Synonyms
			let syn = <></>;
			t.syn.forEach(function(item) {
				let syn_item = <></>;
				item.c.forEach(function(single) {
					let href = qq.href({"keyword": single});
					syn_item += <><a href={href} highlight="URL">{single}</a> </>;
				});
				syn += <>{syn_item}</>;
			});
			full["sub"][T(12)] = <p>{T(10)}{syn}</p>;
		}
		if (t.ant) { // Antonyms
			let ant = <></>;
			t.ant.forEach(function(item) {
				let ant_item = <></>;
				item.c.forEach(function(single) {
					let href = qq.href({"keyword": single});
					ant_item += <><a href={href} highlight="URL">{single}</a> </>;
				});
				ant += <>{ant_item}</>;
			});
			if (full["sub"][T(12)])
				full["sub"][T(12)] += <p>{T(11)}{ant}</p>;
			else
				full["sub"][T(12)] = <p>{T(11)}{ant}</p>;
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
					if (typeof(item) !== "string") {
						if (item["p"])
							_ret["def"].push(item["p"] + " " + item["d"]);
						else
							_ret["def"].push(item["d"]);
					} else {
						_ret["def"].push(item);
					}
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

	generate: function(context, args) {
		var req = new XMLHttpRequest();
		dict.suggestReq = req;
		req.open("GET",
			"http://dict.qq.com/sug?" + encodeURIComponent(args[0])
		);
		req.setRequestHeader("Referer", "http://dict.qq.com/");
		var suggestions = [];
		req.onreadystatechange = function () {
			if (req.readyState == 4) {
				if (req.status == 200) {
					var text = req.responseText.trim();
					var result_arr = text.split("\n");
					result_arr.forEach(function(line) {
							if (line.trim().length == 0)
								return false;
							let pair = line.split("\t");
							let r = {};
							r["g"] = pair[0].trim();
							r["e"] = pair[1].trim();
							r["url"] = qq.href({"keyword": pair[0].trim()});
							suggestions.push(r);
					});
					if (suggestions.length == 0 && args[0].trim().length > 0)
						context.completions = [{url:qq.href({keyword:args[0]}), g:args[0], e:"自动补全查询结束, 无返回结果"}];
					else
						context.completions = suggestions;
				} else {
					var p = document.getElementById("statusbar-display");
					p.label = "自动补全失败, 返回值: "+req.status;
					if (dict._errortimeoutid) {
						window.clearTimeout(dict._errortimeoutid);
						delete dict._errortimeoutid;
					}
					dict._errortimeoutid = window.setTimeout(function() {
						p.label = "";
						delete dict._errortimeoutid;
					}, 400);
				}
			}
		};
		req.send(null);
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
		let langpair = args["-l"] || options["dict-langpair"]["g"] || options.get("dict-langpair").defaultValue["g"];
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
		req.onreadystatechange = function(ev) {
			dict.google(req);
		};
		req.send(formData);
		return req;
	},
	href: false, // todo
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
		let keyword = encodeURIComponent(params["keyword"]);
		return DICT_CN_PREFIX + keyword;
	},

	process: function(text) { // FIXME: kiss
		let ret = {
			notfound: false,
			ok: true,
			pron: false,
			def: false,
			simple: false,
			full: false,
			audio: false
		};
		var parser = new DOMParser();
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

	generate: function(context, args) {
		var req = new XMLHttpRequest();
		dict.suggestReq = req;
		req.open("POST",
			"http://dict.cn/ajax/suggestion.php"
		);
		var suggestions = [];
		req.onreadystatechange = function () {
			if (req.readyState == 4) {
				if (req.status == 200) {
					var result_arr = JSON.parse(req.responseText);
					result_arr["s"].forEach(function (r) {
							r["e"] = dict._html_entity_decode(r["e"].trim());
							r["url"] = "http://dict.cn/" + encodeURIComponent(r["g"].trim());
							r["g"] = r["g"].trim();
							suggestions.push(r); // trim blank chars
					});
					if (suggestions.length == 0 && args[0].trim().length > 0) // TODO
						context.completions = [{url:dict_cn.href({keyword:args[0]}), g:args[0], e:"自动补全查询结束, 无返回结果"}];
					else
						context.completions = suggestions;
				} else {
					if (req.status == 404) {
						// 辞海的自动补全需要 cookie
						// 因此我们对dict.cn请求一次
						var xhr = new XMLHttpRequest();
						xhr.open("GET", "http://dict.cn");
						xhr.send(null);
					}
					var p = document.getElementById("statusbar-display");
					p.label = "自动补全失败, 返回值: "+req.status;
					if (dict._errortimeoutid) {
						window.clearTimeout(dict._errortimeoutid);
						delete dict._errortimeoutid;
					}
					dict._errortimeoutid = window.setTimeout(function() {
						p.label = "";
						delete dict._errortimeoutid;
					}, 400);
				}
			}
		};
		var formData = new FormData();
		formData.append("q", args[0]);
		formData.append("s", "d");
		req.send(formData);
	},
}

let dict = {
	engines: {"d" : dict_cn, "g" : google, "q": qq, "y": youdao, "z": zdic},
	history: storage.newMap("dict.js", {store: true}),
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
			if (self.timeoutid) {
				window.clearTimeout(self.timeoutid);
				delete self.timeoutid;
			}
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

		// show progressing
		var self = this;
		var p = document.getElementById('statusbar-display');
		req.addEventListener('loadstart', function(evt) {
			if (self._suggesttimeoutid) {
				window.clearTimeout(self._suggesttimeoutid);
				delete self._suggesttimeoutid;
			}
			self._suggesttimeoutid = window.setTimeout(function() {
					p.label = "自动补全中...";
					self._suggestintervalid = window.setInterval(function() {p.label = "自动补全中...";}, 400);
					delete self._suggesttimeoutid;
				},
				400);
		},
		false);
		["load", "error", "abort"].forEach(function(st) { // loadend
			req.addEventListener(st, function(evt) {
				if (self._suggesttimeoutid) {
					window.clearTimeout(self._suggesttimeoutid);
					delete self._suggesttimeoutid;
				} else {
					p.label = "";
					window.clearInterval(self._suggestintervalid);
					delete self._suggestintervalid;
				}
			},
			false);
		});
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
		if (dict.suggestReq)
			dict.suggestReq.abort(); // clear suggest request
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
		let engine = dict._route();
		let lp = args["-l"] || options["dict-langpair"][engine] || options.get("dict-langpair").defaultValue[engine] || "";
		if (keyword.length == 0) {
			commandline.input(T(4), function(keyword) {
					var keyword = keyword.trim();
					dict.keyword = keyword;
					if (args["-t"])
						return dactyl.open(dict.engine.href({keyword:decodeURIComponent(dict.keyword), le: args["-l"], type: args["-l"]}), {background:false, where:dactyl.NEW_TAB});
					let key = dict.generateKey(keyword, engine);
					if (lp)
						key = dict.generateKey(keyword, engine, lp);
					let ret = dict.getCache(key);
					if (ret)
						dict.process(ret);
					else {
						dict.cacheKey = key;
						dict.engine.init(dict.keyword, args);
					}
				},
				{
					completer: function (context/*, args*/) { // todo
						dict.suggest(context, [commandline.command]); // this != dict
					}
				}
			);
		} else {
			dict.keyword = keyword;
			if (args["-t"])
				return dactyl.open(dict.engine.href({keyword:decodeURIComponent(dict.keyword), le: args["-l"], type: args["-l"]}), {background:false, where:dactyl.NEW_TAB});
			let key = dict.generateKey(keyword, engine);
			if (lp)
				key = dict.generateKey(keyword, engine, lp);
			let ret = dict.getCache(key);
			if (ret)
				dict.process(ret);
			else {
				dict.cacheKey = key;
				dict.engine.init(dict.keyword, args);
			}
		}
	},

	getCache: function (key) {
		let all = dict.history.get("index");
		if (!all)
			return false;
		let index = all.indexOf(key);
		return dict.history.get(index);
	},

	storeCache: function(ret) {
		let all = dict.history.get("index");
		if (!all) {
			dict.history.set("index", [dict.cacheKey]);
			dict.history.set(0, ret);
		} else {
			dict.history.set(all.length, ret);
			var newAll = all.concat([dict.cacheKey]);
			dict.history.set("index", newAll);
		}
	},

	process: function(ret) {
		// audio
		if (ret["audio"])
			dict._play(ret["audio"]);
		else {
			if (/^[\u0001-\u00ff']+$/.test(decodeURIComponent(dict.keyword))) { // 0-255, 全半角标点?
				// var uri = "http://translate.google.com/translate_tts?q=" + dict.keyword; // FIXME: 当keyword过长时，应该分词
				// http://dict.youdao.com/dictvoice?audio=you_are_welcome&le=en
				var uri = "http://dict.youdao.com/dictvoice?audio=" + dict.keyword; // TODO: support langpair
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
					dactyl.echo(<>{STYLE}<div class="dict_block" id={"dict_js_"+(dict.args["-e"] || options["dict-engine"] || options.get("dict-engine").defaultValue)}>{list}</div></>, commandline.FORCE_MULTILINE);
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
			if (req.status == 200) {
				ret = dict_cn.process(req.responseText);
				dict.storeCache(ret);
				dict.process(ret);
			} else
				dict.error(req.status);
			req.onreadystatechange = function() {};
		}
	},

	qq: function(req) {
		if (req.readyState == 4) {
			let ret = {};
			if (req.status == 200) {
				ret = qq.process(req.responseText);
				dict.storeCache(ret);
				dict.process(ret);
			} else
				dict.error(req.status);
			req.onreadystatechange = function() {};
		}
	},

	youdao: function (req) {
		if (req.readyState == 4) {
			let ret = {};
			if (req.status == 200) {
				ret = youdao.process(req.responseText);
				dict.storeCache(ret);
				dict.process(ret);
			} else
				dict.error(req.status);
			req.onreadystatechange = function() {};
		}
	},

	google: function(req) {
		if (req.readyState == 4) {
			if (req.status == 200) {
				let g = JSON.parse(req.responseText);
				let t = g.responseData.translatedText.replace(/\n$/, "").split("\n");
				let show = options.get("dict-show").value || options.get("dict-show").defaultValue;
				if (dict.args["-o"])
					show = dict.args["-o"];
				// tts
				if (/^[\u0001-\u00ff']+$/.test(decodeURIComponent(dict.keyword))) { // 0-255
					var uri = "http://dict.youdao.com/dictvoice?audio=" + dict.keyword; // TODO: support langpair
					dict._play(uri);
				}
				switch (show) {
					case "s":
					// if (t.length > 1 && !mow.visible)
						// dactyl.echo("\n");
					let output = <></>;
					for (let [i, v] in  Iterator(t)) {
						output += <><p style="margin:0;padding:5px 10px;width:800px;white-space:normal;text-indent:2em;line-height:24px;">{v}</p></>;
					}
					if (t.length == 1 && t[0].length <= 40)
						dactyl.echo(output, commandline.FORCE_SINGLELINE);
					else
						dactyl.echo(output);
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
					dactyl.execute('style chrome://* .popup-notification-icon[popupid="dict-popup"] { background:transparent url("'+dict.engine.logo+'") no-repeat left top;background-size:contain contain;}');
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
			} else
				dict.error(req.status);
			req.onreadystatechange = function() {};
		}
	},

	zdic: function(req) {
		if (req.readyState == 4) {
			let ret = {};
			if (req.status == 200) {
				ret = zdic.process(req.responseText);
				dict.storeCache(ret);
				dict.process(ret);
			} else
				dict.error(req.status);
			req.onreadystatechange = function() {};
		}
	},

	suggest: function(context, args) {
		let engine = dict.engines[dict._route(args)];

		var url = function(item, text)
		<a xmlns:dactyl={NS} identifier={item.id || ""} dactyl:command={item.command || ""}
		href={item.item.url} highlight="URL">{text || ""}</a>;

		// context.waitingForTab = true;
		context.title = [T(14) + " - " + engine.name,T(15)];
		context.keys = {"text":"g", "description":"e"};
		context.filterFunc = null;
		context.process[1] = url;
		let dash_e = args["-e"] || options.get("dict-engine").value || options.get("dict-engine").defaultValue;
		let dash_l = "1024"; // 没实际用处,降低 context.key 意外相等的可能性
		if ("yz".indexOf(dash_e) + 1)
			dash_l += args["-l"] || options["dict-langpair"][dash_e] || options.get("dict-langpair").defaultValue[dash_e];
		context.key = encodeURIComponent(dash_e+dash_l+args[0].trim()); // TODO
		if (!engine.generate)
			engine = dict_cn;
		if (context.itemCache[context.key] && context.itemCache[context.key].length == 0)
			context.regenerate = true;
		context.generate = function () engine.generate(context, args);

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

	generateKey: function () { // keyword, engine, langpair
		return JSON.stringify(arguments);
	},

	optsCompleter: function(context, extra) {
		context.quote = ["", util.identity, ""];
		context.compare = null;
		let youdao_completions = [
			['eng', T(36)],
			['fr', T(37)],
			['ko', T(38)],
			['jap', T(39)]
		];
		let zdic_completions = [
			["1hp", '条目 - 请直接输入汉字或词语进行查询，支持拼音查询，例：“han”;“han4”;“han yu”;“han4 yu3”'],
			["2hp", "字典 - 汉字或拼音 - 康 => 康 | xing => 星,形,醒幸"],
			["2bis", "字典 - 笔顺    - 12345 =>李,札,权,杨"],
			["2wb86", "字典 - 五笔86编码 - iwz => 举,兴"],
			["2cj", "字典 - 仓颉编码 - aa => 昌,晶"],
			["2fc", "字典 - 四角号码 - 1010 => 三,丕,二,互"],
			["2uno", "字典 - unicode - 4e0 => 一,丁,七"],
			["3mh", "词典 - 模糊搜索 中? => 中文,中秋节,中华人民共和国"],
			["3jq", "词典 - 精确搜索 中? => 中庸,中学,中央"],
			["4mh", "成语 - 模糊搜索 ?月 => 月朗星稀 月下老人"],
			["4jq", "成语 - 精确搜索 ?一?二 => 一石二鸟 独一无二"]
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
		switch (extra.key) {
			case 'y':
			context.fork("youdao_le", 0, this, function(context) {
					context.title = [T(16) + " - " + T(35), T(1)];
					context.completions = youdao_completions;
			});
			break;

			case 'd':
			case 'q':
			context.completions = [];
			break;

			case 'g':
			context.fork("dict_langpairs", 0, this, function (context) {
					context.title = [T(16) + " - " + T(34), T(1)];
					context.completions = dict.langpairs;
			});
			break;

			case 'z':
			context.fork("zdic_type", 0, this, function (context) {
					context.title = [T(16) + " - " + T(41), T(1)];
					context.completions = zdic_completions;
			});
			break;

			default :
			context.fork("youdao_le", 0, this, function(context) {
					context.title = [T(16) + " - " + T(35), T(1)];
					context.completions = youdao_completions;
			});
			context.fork("zdic_type", 0, this, function (context) {
					context.title = [T(16) + " - " + T(41), T(1)];
					context.completions = zdic_completions;
			});
			context.fork("dict_langpairs", 0, this, function (context) {
					context.title = [T(16) + " - " + T(34), T(1)];
					context.completions = dict.langpairs;
			});
			context.completions = [];
			break;
		}
	},

	error: function (code) {

	},

	_route: function (/*args*/) {
		let args = arguments[0] || dict.args;
		let lang = args["-l"] || "";
		let engine = args["-e"] || options["dict-engine"] || options.get("dict-engine").defaultValue;
		switch (lang) {
			case "jap":
			case "eng":
			case "fr":
			case "ko":
			engine = "y"; // youdao
			break;

			case "1hp":
			case "2hp":
			case "2bis":
			case "2wb86":
			case "2cj":
			case "2fc":
			case "2uno":
			case "3mh":
			case "3jq":
			case "4mh":
			case "4jq":
			engine = "z";
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
				if (!dict_sound.Play) {
					dict_sound.setAttribute("autostart", "true");
					dict_sound.setAttribute("hidden", "false"); // dirty hack, tell me why.
				}
			}
			dict_sound.setAttribute("src", uri);
			dict_sound.setAttribute("src", uri);
			if (dict_sound.Play)
				dict_sound.Play();
		} else {
			var value= "http://www.strangecube.com/audioplay/online/audioplay.swf?file="+encodeURIComponent(uri)+"&auto=yes&sendstop=yes&repeat=1&buttondir=http://www.strangecube.com/audioplay/online/alpha_buttons/negative&bgcolor=0xffffff&mode=playstop"
			var dict_sound = document.getElementById("dict-sound");
			if (!dict_sound) {
				var sound = util.xmlToDom(<embed id="dict-sound" src={value} quality="high" wmode="transparent" width="0" height="0" align="" hidden="true" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" xmlns={XHTML}/>, document);
				var addonbar = document.getElementById("addon-bar"); // FIXME: firefox 3.6 support
				addonbar.appendChild(sound);
			} else {
				dict_sound.setAttribute("src", value);
			}
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
	},

	_tidy: function(node) { // remove comments, scripts, inline styles, stylesheets, unused properties
	},

	htmlToDom: function(html) {
		var frame = document.getElementById("dict-frame");
		if (!frame) {
			// create frame
			frame = document.createElement("iframe"); // iframe ( or browser on older Firefox)
			frame.setAttribute("id", "dict-frame");
			frame.setAttribute("name", "dict-frame");
			frame.setAttribute("collapsed", "true");
			document.getElementById("main-window").appendChild(frame);

			// set restrictions as needed
			frame.webNavigation.allowAuth          = false;
			frame.webNavigation.allowImages        = false;
			frame.webNavigation.allowJavascript    = false;
			frame.webNavigation.allowMetaRedirects = true;
			frame.webNavigation.allowPlugins       = false;
			frame.webNavigation.allowSubframes     = false;
		}
		frame.contentDocument.documentElement.innerHTML = html;
		return frame.contentDocument;
	},

	resolveRelative: function(node, prefix) {
		var pattern = /^(https?|ftps?|file):\/\//;
		var links = node.getElementsByTagName("a");
		for (var i = links.length - 1; i >= 0; i--) {
			var link = links[i];
			var href = link.getAttribute("href");
			if (!pattern.test(href))
				link.setAttribute("href", prefix+href);
			link.setAttribute("target", "_blank");
		}
		var imgs = node.getElementsByTagName("img");
		for (var i = imgs.length - 1; i >= 0; i--) {
			var img = imgs[i];
			var src = img.getAttribute("src");
			if (!pattern.test(src))
				img.setAttribute("src", prefix+src);
		}
	}
};

// check whether windows media player plugin exists.
options.add(["dict-hasaudio", "dich"],
	T(21),
	"boolean",
	false
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
			["y", T(35)],
			["z", T(41)]
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
	"stringmap",
	"g:en|zh-CN,y:eng,z:1hp",
	{
		completer: function(context, extra) {

			if (extra.value == null)
				return [
					["y", T(35)],
					["g", T(34)],
					["z", T(41)]
				].filter(function (e) !Set.has(extra.values, e[0]));
			else
				dict.optsCompleter(context, extra);
		},
		validator: function(value) {
			return true;
		}
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
			var all = dict.history.get("index");
			if (all) {
				context.fork("words_history", 0, this, function (context) {
					var completions = [];
					let e = dict._route(args);
					let lp = args["-l"] || options["dict-langpair"][e] || options.get("dict-langpair").defaultValue[e] || "";
					all.forEach(function (i, index) {
						var _args = JSON.parse(i);
						if (e !== _args[1])
							return false;
						let _lp = _args[2] || "";
						if (lp !== _lp)
							return false;
						var desc = dict.history.get(index).simple;
						if (!desc)
							return false;
						completions.push([_args[0], desc]);
					});
					context.title = ["Words from history!"];
					context.completions = completions;
				});
			}
		
			if (args.length >= 1 && args[0] !== "-" && args[0].length > 0)
				dict.suggest(context, args);

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
					["y", T(35)],
					["z", T(41)]
				]
			},
			{
				names: ["-l"],
				description: T(17),
				type: CommandOption.STRING,
				completer: function(context, args) dict.optsCompleter(context,{key:args["-e"] || ""})
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
	},
	true
);

Array.slice("dgqyz").forEach(function(char) {
		let extra_options = [];
		if ("gyz".indexOf(char) + 1) {
			extra_options = [
				{
					names: ["-l"],
					description: T(17),
					type: CommandOption.STRING,
					completer: function(context, args) {
						args["-e"] = char;
						dict.optsCompleter(context,{key:char});
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
					var all = dict.history.get("index");
					if (all) {
						context.fork("words_history", 0, this, function (context) {
								var completions = [];
								let e = args["-e"];
								let lp = args["-l"] || options["dict-langpair"][e] || options.get("dict-langpair").defaultValue[e] || "";
								all.forEach(function (i, index) {
										var _args = JSON.parse(i);
										if (e !== _args[1])
											return false;
										let _lp = _args[2] || "";
										if (lp !== _lp)
											return false;
										var desc = dict.history.get(index).simple;
										if (!desc)
											return false;
										completions.push([_args[0], desc]);
								});
								context.title = ["Words from history!"];
								context.completions = completions;
						});
					}

					if (args.length >= 1 && args[0] !== "-" && args[0].length > 0)
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
			},
			true
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

      <p lang="en-US">Dict.js is an online dictionary plugin for pentadactyl. It supports <link topic="http://dict.qq.com/">QQ</link>, <link topic="http://dict.youdao.com/">Youdao</link>, <link topic="http://dict.cn/">Dict.cn</link>, <link topic="http://www.zdic.net/">Han Dian</link> and <link topic="http://translate.google.com/">Google Translate</link>.</p>
      <p lang="zh-CN">Pentadactyl 的词典插件。dict.js 目前支持 <link topic="http://dict.qq.com/">QQ词典</link>，<link topic="http://dict.youdao.com/">网易有道在线词典</link>，<link topic="http://dict.cn/">海词</link>, <link topic="http://www.zdic.net/">汉典</link> 和 <link topic="http://translate.google.com/">谷歌翻译</link>。</p>

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
					<dt>z</dt>      <dd><link topic="http://www.zdic.net">Han Dian</link></dd>
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
				<dt>z</dt>      <dd><link topic="http://www.zdic.net">汉典</link></dd>
			</dl>
			<p>dict.js 默认使用海词。</p>
        </description>
      </item>

      <item lang="en-US">
        <tags>'dich' 'dict-hasaudio'</tags>
        <spec>'dict-hasaudio' 'dich'</spec>
        <type>boolean</type>
        <default>false</default>
        <description>
			  <p>Enable or disable sound support.</p>
			  <warning>dict.js use Windows Media Player plugin on Microsoft Windows platform and Adobe Flash Player for others. If you have any sound issues, read this first: <link topic="http://support.mozilla.com/en-US/kb/Using%20the%20Windows%20Media%20Player%20plugin%20with%20Firefox">Using the Windows Media Player plugin with Firefox</link></warning>
        </description>
      </item>
      <item lang="zh-CN">
        <tags>'dich' 'dict-hasaudio'</tags>
        <spec>'dict-hasaudio' 'dich'</spec>
        <type>boolean</type>
        <default>false</default>
        <description>
			<p>开启或者关闭声音。</p>
			<warning>在 Windows 平台下，dict.js 使用 Windows Media Player 插件来进行声音输出,其它平台使用 Adobe Flash Player。如果出现了声音方面的问题，请参考：<link topic="http://support.mozilla.com/zh-CN/kb/%E5%9C%A8%20Firefox%20%E4%B8%AD%E4%BD%BF%E7%94%A8%20Windows%20Media%20Player%20%E6%8F%92%E4%BB%B6">在 Firefox 中使用 Windows Media Player 插件</link></warning>
        </description>
      </item>

      <item lang="en-US">
        <tags>'dicl' 'dict-langpair'</tags>
        <spec>'dict-langpair' 'dicl'</spec>
        <type>stringmap</type>
        <default>g:en|zh-CN,y:eng,z:1hp</default>
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
        <type>stringmap</type>
        <default>g:en|zh-CN,y:eng,z:1hp</default>
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
				  <dt>-t</dt>      <dd>open result on new tab</dd>
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
				  <dt>-t</dt>      <dd>在新标签页打开翻译页面</dd>
			  </dl>
		  </description>
	  </item>

	  <item lang="en-US">
		  <tags>:dict-shortcut</tags>
		  <strut/>
		  <spec>dict.js shortcuts</spec>
		  <description>
			  <p>dict.js use <k name="A-d"/> and <k name="A-S-d"/> to translate word(s) from mouse selection or clipboard.</p>
			  <note>Translate word(s) from clipboard does not support Microsoft Windows.</note>
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
// - sound is broken out? linux/winxp/win7 are okay
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
// * dict-langpair -> stringmap
// use bytes instead of length
// use soundManager and xul iframe?
