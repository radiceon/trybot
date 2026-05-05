(function(ctx) {
    "use strict";
    // â”€â”€ GrepoPlus i18n â€” charge le JSON de la langue depuis languages/{lang}.json â”€â”€
    // Fallback chain: langue choisie â†’ en â†’ clÃ© FR brute

    var LANG_FLAGS = {"fr": "ðŸ‡«ðŸ‡·", "en": "ðŸ‡¬ðŸ‡§", "de": "ðŸ‡©ðŸ‡ª", "es": "ðŸ‡ªðŸ‡¸", "it": "ðŸ‡®ðŸ‡¹", "pt": "ðŸ‡µðŸ‡¹", "nl": "ðŸ‡³ðŸ‡±", "pl": "ðŸ‡µðŸ‡±", "ru": "ðŸ‡·ðŸ‡º", "tr": "ðŸ‡¹ðŸ‡·", "cs": "ðŸ‡¨ðŸ‡¿", "hu": "ðŸ‡­ðŸ‡º", "ro": "ðŸ‡·ðŸ‡´", "sv": "ðŸ‡¸ðŸ‡ª", "nb": "ðŸ‡³ðŸ‡´", "da": "ðŸ‡©ðŸ‡°", "fi": "ðŸ‡«ðŸ‡®", "sk": "ðŸ‡¸ðŸ‡°", "hr": "ðŸ‡­ðŸ‡·", "el": "ðŸ‡¬ðŸ‡·", "uk": "ðŸ‡ºðŸ‡¦"};
    var LANG_NAMES = {"fr": "FranÃ§ais", "en": "English", "de": "Deutsch", "es": "EspaÃ±ol", "it": "Italiano", "pt": "PortuguÃªs", "nl": "Nederlands", "pl": "Polski", "ru": "Ð ÑƒÑÑÐºÐ¸Ð¹", "tr": "TÃ¼rkÃ§e", "cs": "ÄŒeÅ¡tina", "hu": "Magyar", "ro": "RomÃ¢nÄƒ", "sv": "Svenska", "nb": "Norsk", "da": "Dansk", "fi": "Suomi", "sk": "SlovenÄina", "hr": "Hrvatski", "el": "Î•Î»Î»Î·Î½Î¹ÎºÎ¬", "uk": "Ð£ÐºÑ€Ð°Ñ—Ð½ÑÑŒÐºÐ°"};
    // Noms des langues traduits dans chaque langue de l'interface
    var LANG_NAMES_LOCALIZED = {
        "fr": {"fr":"FranÃ§ais","en":"Anglais","de":"Allemand","es":"Espagnol","it":"Italien","pt":"Portugais","nl":"NÃ©erlandais","pl":"Polonais","ru":"Russe","tr":"Turc","cs":"TchÃ¨que","hu":"Hongrois","ro":"Roumain","sv":"SuÃ©dois","nb":"NorvÃ©gien","da":"Danois","fi":"Finnois","sk":"Slovaque","hr":"Croate","el":"Grec","uk":"Ukrainien"},
        "en": {"fr":"French","en":"English","de":"German","es":"Spanish","it":"Italian","pt":"Portuguese","nl":"Dutch","pl":"Polish","ru":"Russian","tr":"Turkish","cs":"Czech","hu":"Hungarian","ro":"Romanian","sv":"Swedish","nb":"Norwegian","da":"Danish","fi":"Finnish","sk":"Slovak","hr":"Croatian","el":"Greek","uk":"Ukrainian"},
        "de": {"fr":"FranzÃ¶sisch","en":"Englisch","de":"Deutsch","es":"Spanisch","it":"Italienisch","pt":"Portugiesisch","nl":"NiederlÃ¤ndisch","pl":"Polnisch","ru":"Russisch","tr":"TÃ¼rkisch","cs":"Tschechisch","hu":"Ungarisch","ro":"RumÃ¤nisch","sv":"Schwedisch","nb":"Norwegisch","da":"DÃ¤nisch","fi":"Finnisch","sk":"Slowakisch","hr":"Kroatisch","el":"Griechisch","uk":"Ukrainisch"},
        "es": {"fr":"FrancÃ©s","en":"InglÃ©s","de":"AlemÃ¡n","es":"EspaÃ±ol","it":"Italiano","pt":"PortuguÃ©s","nl":"NeerlandÃ©s","pl":"Polaco","ru":"Ruso","tr":"Turco","cs":"Checo","hu":"HÃºngaro","ro":"Rumano","sv":"Sueco","nb":"Noruego","da":"DanÃ©s","fi":"FinlandÃ©s","sk":"Eslovaco","hr":"Croata","el":"Griego","uk":"Ucraniano"},
        "it": {"fr":"Francese","en":"Inglese","de":"Tedesco","es":"Spagnolo","it":"Italiano","pt":"Portoghese","nl":"Olandese","pl":"Polacco","ru":"Russo","tr":"Turco","cs":"Ceco","hu":"Ungherese","ro":"Rumeno","sv":"Svedese","nb":"Norvegese","da":"Danese","fi":"Finlandese","sk":"Slovacco","hr":"Croato","el":"Greco","uk":"Ucraino"},
        "pt": {"fr":"FrancÃªs","en":"InglÃªs","de":"AlemÃ£o","es":"Espanhol","it":"Italiano","pt":"PortuguÃªs","nl":"HolandÃªs","pl":"PolonÃªs","ru":"Russo","tr":"Turco","cs":"Tcheco","hu":"HÃºngaro","ro":"Romeno","sv":"Sueco","nb":"NorueguÃªs","da":"DinamarquÃªs","fi":"FinlandÃªs","sk":"Eslovaco","hr":"Croata","el":"Grego","uk":"Ucraniano"},
        "nl": {"fr":"Frans","en":"Engels","de":"Duits","es":"Spaans","it":"Italiaans","pt":"Portugees","nl":"Nederlands","pl":"Pools","ru":"Russisch","tr":"Turks","cs":"Tsjechisch","hu":"Hongaars","ro":"Roemeens","sv":"Zweeds","nb":"Noors","da":"Deens","fi":"Fins","sk":"Slowaaks","hr":"Kroatisch","el":"Grieks","uk":"OekraÃ¯ens"},
        "pl": {"fr":"Francuski","en":"Angielski","de":"Niemiecki","es":"HiszpaÅ„ski","it":"WÅ‚oski","pt":"Portugalski","nl":"Niderlandzki","pl":"Polski","ru":"Rosyjski","tr":"Turecki","cs":"Czeski","hu":"WÄ™gierski","ro":"RumuÅ„ski","sv":"Szwedzki","nb":"Norweski","da":"DuÅ„ski","fi":"FiÅ„ski","sk":"SÅ‚owacki","hr":"Chorwacki","el":"Grecki","uk":"UkraiÅ„ski"},
        "ru": {"fr":"Ð¤Ñ€Ð°Ð½Ñ†ÑƒÐ·ÑÐºÐ¸Ð¹","en":"ÐÐ½Ð³Ð»Ð¸Ð¹ÑÐºÐ¸Ð¹","de":"ÐÐµÐ¼ÐµÑ†ÐºÐ¸Ð¹","es":"Ð˜ÑÐ¿Ð°Ð½ÑÐºÐ¸Ð¹","it":"Ð˜Ñ‚Ð°Ð»ÑŒÑÐ½ÑÐºÐ¸Ð¹","pt":"ÐŸÐ¾Ñ€Ñ‚ÑƒÐ³Ð°Ð»ÑŒÑÐºÐ¸Ð¹","nl":"ÐÐ¸Ð´ÐµÑ€Ð»Ð°Ð½Ð´ÑÐºÐ¸Ð¹","pl":"ÐŸÐ¾Ð»ÑŒÑÐºÐ¸Ð¹","ru":"Ð ÑƒÑÑÐºÐ¸Ð¹","tr":"Ð¢ÑƒÑ€ÐµÑ†ÐºÐ¸Ð¹","cs":"Ð§ÐµÑˆÑÐºÐ¸Ð¹","hu":"Ð’ÐµÐ½Ð³ÐµÑ€ÑÐºÐ¸Ð¹","ro":"Ð ÑƒÐ¼Ñ‹Ð½ÑÐºÐ¸Ð¹","sv":"Ð¨Ð²ÐµÐ´ÑÐºÐ¸Ð¹","nb":"ÐÐ¾Ñ€Ð²ÐµÐ¶ÑÐºÐ¸Ð¹","da":"Ð”Ð°Ñ‚ÑÐºÐ¸Ð¹","fi":"Ð¤Ð¸Ð½ÑÐºÐ¸Ð¹","sk":"Ð¡Ð»Ð¾Ð²Ð°Ñ†ÐºÐ¸Ð¹","hr":"Ð¥Ð¾Ñ€Ð²Ð°Ñ‚ÑÐºÐ¸Ð¹","el":"Ð“Ñ€ÐµÑ‡ÐµÑÐºÐ¸Ð¹","uk":"Ð£ÐºÑ€Ð°Ð¸Ð½ÑÐºÐ¸Ð¹"},
        "tr": {"fr":"FransÄ±zca","en":"Ä°ngilizce","de":"Almanca","es":"Ä°spanyolca","it":"Ä°talyanca","pt":"Portekizce","nl":"FlemenkÃ§e","pl":"LehÃ§e","ru":"RusÃ§a","tr":"TÃ¼rkÃ§e","cs":"Ã‡ekÃ§e","hu":"Macarca","ro":"Romence","sv":"Ä°sveÃ§Ã§e","nb":"NorveÃ§Ã§e","da":"Danimarkaca","fi":"Fince","sk":"SlovakÃ§a","hr":"HÄ±rvatÃ§a","el":"Yunanca","uk":"Ukraynaca"}
    };
    var LANG_CODES = {
        "fr":"fr","en":"gb","de":"de","es":"es","it":"it","pt":"pt",
        "nl":"nl","pl":"pl","ru":"ru","tr":"tr","cs":"cz","hu":"hu",
        "ro":"ro","sv":"se","nb":"no","da":"dk","fi":"fi","sk":"sk",
        "hr":"hr","el":"gr","uk":"ua"
    };
    var LANG_LIST = ["fr","en","de","es","it","pt","nl","pl","ru","tr","cs","hu","ro","sv","nb","da","fi","sk","hr","el","uk"];

    // URL de base du VPS
    var VPS_BASE = (ctx.vpsBase || "https://grepoplus.duckdns.org/bot");

    var _activeLang  = null;   // langue choisie manuellement
    var _loadedLangs = {};     // cache : { "en": { "Actif": "Active", ... } }
    var _pending     = {};     // callbacks en attente pendant le fetch

    // â”€â”€ Charger un JSON de langue (avec cache) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function _loadLang(lang, cb) {
        if (_loadedLangs[lang]) { cb(_loadedLangs[lang]); return; }
        // fr.json est chargÃ© comme les autres langues
        if (_pending[lang])     { _pending[lang].push(cb); return; }

        _pending[lang] = [cb];
        var url = VPS_BASE + "/modules/languages/" + lang + ".json?v=" + Math.floor(Date.now() / 60000);

        fetch(url)
            .then(function(r) { return r.ok ? r.json() : Promise.reject(r.status); })
            .then(function(data) {
                _loadedLangs[lang] = data;
                (_pending[lang] || []).forEach(function(fn) { fn(data); });
                delete _pending[lang];
            })
            .catch(function(err) {
                console.warn("[i18n] Impossible de charger " + lang + ".json :", err);
                _loadedLangs[lang] = {};
                (_pending[lang] || []).forEach(function(fn) { fn({}); });
                delete _pending[lang];
            });
    }

    // â”€â”€ Traduction synchrone (depuis le cache) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function t(str) {
        var lang = _currentLang();

        if (_loadedLangs[lang] && _loadedLangs[lang][str] !== undefined) return _loadedLangs[lang][str];
        if (_loadedLangs["en"] && _loadedLangs["en"][str]  !== undefined) return _loadedLangs["en"][str];
        return str;
    }

    // â”€â”€ DÃ©tecter la langue du navigateur â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function _currentLang() {
        if (_activeLang) return _activeLang;
        try {
            var nav = (navigator.language || "en").toLowerCase().split("-")[0];
            if (LANG_LIST.indexOf(nav) !== -1) return nav;
            if (nav === "no") return "nb";
        } catch(e) {}
        return "en";
    }

    // â”€â”€ Appliquer les traductions au DOM (attributs data-i18n) â”€â”€â”€â”€â”€â”€â”€â”€
    function applyTranslations(root) {
        if (!root) root = document;
        var list;
        list = root.querySelectorAll ? root.querySelectorAll("[data-i18n]") : [];
        for (var i = 0; i < list.length; i++) {
            var key = list[i].getAttribute("data-i18n");
            var val = t(key);
            if (list[i].children.length === 0) list[i].textContent = val;
            else list[i].innerHTML = val;
        }
        list = root.querySelectorAll ? root.querySelectorAll("[data-i18n-placeholder]") : [];
        for (var j = 0; j < list.length; j++) {
            list[j].placeholder = t(list[j].getAttribute("data-i18n-placeholder"));
        }
        list = root.querySelectorAll ? root.querySelectorAll("[data-i18n-title]") : [];
        for (var k = 0; k < list.length; k++) {
            list[k].title = t(list[k].getAttribute("data-i18n-title"));
        }
    }

    // â”€â”€ Changer de langue : charge le JSON puis rafraÃ®chit l'UI â”€â”€â”€â”€â”€â”€
    function setLang(lang, cb) {
        if (LANG_LIST.indexOf(lang) === -1) return;
        _activeLang = lang;

        // Notifier le serveur premium de la nouvelle langue (mise Ã  jour temps rÃ©el)
        try {
            var ws = ctx && ctx._premiumWS;
            if (ws && ws.readyState === 1) {
                // Utiliser Game.player_id directement (ctx.session n'est pas dÃ©fini)
                var playerId = (typeof Game !== "undefined" && Game.player_id) ? String(Game.player_id) : null;
                ws.send(JSON.stringify({
                    type: "identify",
                    player_id: playerId,
                    world: window.location.hostname.split(".")[0],
                    lang: lang
                }));
            }
        } catch(e) {}

        function _applyAndRefresh() {
            _refreshAngular(lang);
            var panels = document.querySelectorAll(".botSettings, .gfb-herald-window, .gfb-commander-window");
            for (var i = 0; i < panels.length; i++) applyTranslations(panels[i]);
            // Emettre un evenement pour notifier que la langue est prete
            try {
                var event = new CustomEvent("grepoplus:langReady", { detail: { lang: lang } });
                document.dispatchEvent(event);
            } catch(e) {}
            if (typeof cb === "function") cb();
        }

// fr charge aussi son json

        // Charger la langue ET le fallback EN en parallÃ¨le
        var needed = 0, done = 0;
        function onOne() { if (++done === needed) _applyAndRefresh(); }
        if (!_loadedLangs[lang])  { needed++; _loadLang(lang,  onOne); }
        if (!_loadedLangs["en"])  { needed++; _loadLang("en",  onOne); }
        if (needed === 0) _applyAndRefresh();
    }

    // â”€â”€ RafraÃ®chir les scopes Angular â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function _refreshAngular(lang) {
        try {
            var selectors = [".botSettings", ".gfb-herald-window", ".gfb-commander-window", "[ng-controller]"];
            var seen = [];
            selectors.forEach(function(sel) {
                var els = document.querySelectorAll(sel);
                for (var i = 0; i < els.length; i++) {
                    var el = els[i];
                    if (seen.indexOf(el) !== -1) continue;
                    seen.push(el);
                    try {
                        var scope = angular.element(el).scope();
                        if (!scope) continue;
                        var target = (scope.data !== undefined) ? scope.data : scope;
                        target._lang         = lang;
                        target.langCode      = LANG_CODES[lang] || "gb";
                        target.langCodeUpper = lang.toUpperCase();
                        if (scope.data !== undefined) scope.data.langPickerOpen = false;
                        if (scope.$$phase || scope.$root.$$phase) {
                            scope.$applyAsync();
                        } else {
                            scope.$apply();
                        }
                    } catch(e) {}
                }
            });
        } catch(e) {}
    }

    // â”€â”€ Init : prÃ©-charger la langue dÃ©tectÃ©e au dÃ©marrage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    (function init() {
        var lang = _currentLang();

        _loadLang(lang, function() {
            if (lang !== "en") _loadLang("en", function() {});
        });
    })();

    // â”€â”€ Flag picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function createFlagPicker(anchorEl) {
        var old = document.getElementById("gp-lang-picker");
        if (old) { old.remove(); return; }
        var picker = document.createElement("div");
        picker.id = "gp-lang-picker";
        picker.style.cssText = "position:absolute;z-index:999999;background:linear-gradient(160deg,#0d1117,#1a2332);border:1px solid rgba(201,168,76,0.4);border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.8);padding:8px;display:flex;flex-wrap:wrap;gap:4px;width:220px;bottom:calc(100% + 6px);right:0;";
        LANG_LIST.forEach(function(lang) {
            var btn = document.createElement("button");
            btn.style.cssText = "background:rgba(255,255,255,0.05);border:1px solid rgba(201,168,76,0.2);border-radius:5px;padding:4px 6px;cursor:pointer;font-size:14px;color:#d4c5a0;display:flex;align-items:center;gap:4px;font-family:Arial,sans-serif;font-size:9pt;white-space:nowrap;";
            btn.innerHTML = LANG_FLAGS[lang] + " " + LANG_NAMES[lang];
            btn.onclick = function(e) { e.stopPropagation(); setLang(lang, function() { picker.remove(); }); };
            picker.appendChild(btn);
        });
        var wrapper = document.createElement("div");
        wrapper.style.cssText = "position:relative;display:inline-block;";
        anchorEl.parentNode.insertBefore(wrapper, anchorEl);
        wrapper.appendChild(anchorEl);
        wrapper.appendChild(picker);
        setTimeout(function() {
            document.addEventListener("click", function _close() { picker.remove(); document.removeEventListener("click", _close); });
        }, 10);
    }

    function injectFlagButton(panelEl) {
        if (!panelEl || document.getElementById("gp-lang-btn")) return;
        var header = panelEl.querySelector(".bs-header, .bs-title, [class*=header]");
        if (!header) header = panelEl.firstElementChild;
        if (!header) return;
        var btn = document.createElement("button");
        btn.id = "gp-lang-btn";
        btn.style.cssText = "background:transparent;border:none;cursor:pointer;font-size:16px;padding:0 4px;line-height:1;opacity:0.85;transition:opacity 0.15s;vertical-align:middle;position:relative;";
        btn.title = LANG_NAMES[_currentLang()] || "Language";
        btn.textContent = LANG_FLAGS[_currentLang()] || "ðŸŒ";
        btn.onmouseenter = function() { this.style.opacity = "1"; };
        btn.onmouseleave = function() { this.style.opacity = "0.85"; };
        btn.onclick = function(e) { e.stopPropagation(); createFlagPicker(btn); };
        var rightArea = header.querySelector(".bs-header-right, .bs-actions");
        if (rightArea) rightArea.appendChild(btn);
        else header.appendChild(btn);
    }

    // â”€â”€ Expose API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    ctx.t              = t;
    // Alias pour les modules qui appellent b.t() (b = ctx.bot)
    if (ctx.bot) ctx.bot.t = t;
    // Exposer le cache de langues chargÃ©es pour que herald.js puisse vÃ©rifier
    // si le JSON est dÃ©jÃ  disponible avant d'afficher une notification
    window._grepoI18nCache = _loadedLangs;
    ctx.setLang        = setLang;
    ctx.detectLang     = _currentLang;
    ctx.applyI18n      = applyTranslations;
    ctx.injectFlagBtn  = injectFlagButton;
    ctx.langFlags      = LANG_FLAGS;
    ctx.langNames          = LANG_NAMES;
    ctx.langNamesLocalized = LANG_NAMES_LOCALIZED;
    ctx.langList       = LANG_LIST;

})(this);
