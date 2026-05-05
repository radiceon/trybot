
(function(ctx) {
    "use strict";
    var bot = ctx.bot,
        box = $("body");
    var hideTooltips = function() {
        var tip = document.getElementById('gp-tooltip-tip');
        if (tip) tip.style.display = 'none';
    };
    // â”€â”€ Helper partagÃ© par tous les controllers : Ã©vite l'erreur $rootScope:inprog â”€â”€
    function safeApply(scope, fn) {
        if (scope.$$phase || scope.$root.$$phase) {
            scope.$applyAsync(fn);
        } else {
            scope.$apply(fn);
        }
    }
    if (bot.settingsDlg) {
        bot.settingsDlg.remove();
        bot.settingsDlg = null;
        return;
    }
    if (box.length < 1) return;
    var html = bot.templates.settings;
    bot.settingsDlg = $(html);
    if (bot.custom)
        for (var id in ITowns.getTowns()) bot.custom.get(id);;
    // â”€â”€ Injecter les settings VPS dans bot.sett AVANT l'initialisation du scope â”€â”€
    var _openWorld = (function() {
        try { return window.location.hostname.split(".")[0]; } catch(e) { return "unknown"; }
    })();

    // 1. Globals â†’ bot.sett (VPS Ã©crase tout, pas de merge partiel)
    if (bot._vpsGlobals && typeof bot._vpsGlobals === "object") {
        var _vg = bot._vpsGlobals, _vgk = Object.keys(_vg);
        for (var _vi = 0; _vi < _vgk.length; _vi++) bot.sett[_vgk[_vi]] = _vg[_vgk[_vi]];
    }

    // 2. Customs du world courant â†’ bot.custom (villes existantes uniquement)
    if (bot._vpsWorlds && bot._vpsWorlds[_openWorld] && bot._vpsWorlds[_openWorld].customs && bot.custom) {
        var _vpsCust = bot._vpsWorlds[_openWorld].customs;
        var _existingTowns = Object.keys(ITowns.getTowns ? ITowns.getTowns() : {}).map(String);
        Object.keys(_vpsCust).forEach(function(townId) {
            if (_existingTowns.indexOf(String(townId)) === -1) return;
            var cur = bot.custom.get(townId);
            Object.assign(cur, _vpsCust[townId]);
        });
    }

    // 3. Queue â†’ injectÃ©e exclusivement par checkLicense (core.js) depuis le VPS

    bot.sett.commander_share_orders_ids = bot.sett.commander_share_orders_ids || "";
    bot.sett.herald_share_attacks_ids = bot.sett.herald_share_attacks_ids || "";
    bot.sett.foreman_slots = String(bot.sett.foreman_slots || 2);
    bot.sett.recruiter_slots_barracks = String(bot.sett.recruiter_slots_barracks || 2);
    bot.sett.recruiter_slots_docks    = String(bot.sett.recruiter_slots_docks    || 2);
    if (bot.sett.herald_friend_notify    === undefined || bot.sett.herald_friend_notify    === null) bot.sett.herald_friend_notify    = true;
    if (bot.sett.commander_friend_notify === undefined || bot.sett.commander_friend_notify === null) bot.sett.commander_friend_notify = true;
    bot.ngApp.controller("settingsController", function($scope) {
        var t = ctx.t || function(s) { return s; }; // Fix: t() doit Ãªtre accessible dans le contrÃ´leur
        // Expose bot et premiumModules directement sur le scope Angular
        $scope.bot = bot;
        if (!bot.premiumModules) bot.premiumModules = { farm: false, recruiter: false, foreman: false, trader: false, wonder: false, tresorier: false };
        $scope.premiumModules = bot.premiumModules;
        function buildCustoms() {
            if (!bot.custom) return [];
            return Object.keys(bot.custom.items).map(function(x) {
                var value = Object.assign({}, bot.custom.items[x]);
                var _t = ITowns.getTown(x);
                value.attr = {
                    townId: x,
                    townName: (_t && _t.name) ? _t.name : ctx.towns.name(x),
                    townLink: ctx.towns.link(x),
                    isOwnTown: !!_t
                };
                value.attr.isTradeFilter = !value.attr.isOwnTown && (value.autotrade == "disabled");
                return value;
            });
        }
        var customs = buildCustoms();
        var SHOP_BASE = "https://grepoplus.duckdns.org/shop";

        // RÃ©cupÃ¨re le player_id et le player_name courant
        var currentPlayerId   = Game.player_id;
        var currentPlayerName = "";
        try {
            var models = MM.getModels();
            var firstKey = Object.keys(models.Player)[0];
            currentPlayerId   = models.Player[firstKey].getId();
            currentPlayerName = models.Player[firstKey].getName ? models.Player[firstKey].getName() : "";
        } catch(e) {}

        // DÃ©tection devise par langue navigateur (ex: en-US â†’ $, fr-FR â†’ â‚¬)
        var _navLang    = (navigator.language || navigator.userLanguage || "fr").toLowerCase();
        var _baseLang   = _navLang.split("-")[0]; // "en-US" â†’ "en", "fr-FR" â†’ "fr"
        var _region     = (_navLang.split("-")[1] || "").toUpperCase(); // "en-US" â†’ "US"

        // Pays de la zone euro (codes ISO 3166-1 alpha-2)
        var _euroCountries = [
            "FR","DE","IT","ES","PT","NL","BE","GR","AT","FI",
            "SK","SI","LV","LT","EE","MT","LU","CY","IE","HR"
        ];
        // Langues dont le code = pays zone euro (sans region explicite)
        var _euroLangCodes = ["fr","de","it","es","pt","nl","el","fi","sk","sl","lv","lt","et","mt","hr"];
        var USE_EURO =
            _euroCountries.indexOf(_region) !== -1 ||
            (_region === "" && _euroLangCodes.indexOf(_baseLang) !== -1);
        var CURRENCY_SYMBOL = USE_EURO ? "â‚¬" : "$";

        // Taux EUR â†’ USD par dÃ©faut, mis Ã  jour en async depuis l'API
        var EUR_TO_USD  = null; // null = pas encore chargÃ©
        var _shopScope  = null; // rÃ©fÃ©rence scope Angular pour rafraÃ®chir aprÃ¨s fetch du taux

        function _buildShopModules(rate) {
            // Si rate null (fetch Ã©chouÃ©) â†’ on affiche en euros mÃªme pour les non-euro
            function conv(p) { return (USE_EURO || rate === null) ? p : (parseFloat(p) * rate).toFixed(2); }
            return SHOP_MODULES_EUR.map(function(m) {
                return Object.assign({}, m, { price: conv(m.price) });
            });
        }

        function _applyRate(rate) {
            EUR_TO_USD = rate;
            if (!_shopScope) return;
            _shopScope.data.shopModules = _buildShopModules(rate).map(function(m) {
                return Object.assign({}, m, { active: !!(bot.premiumModules && bot.premiumModules[m.id] === true) });
            });
            _shopScope.data.allPrice      = (USE_EURO || rate === null) ? "19.99" : (19.99 * rate).toFixed(2);
            _shopScope.data.allPriceFull  = (USE_EURO || rate === null) ? "30.95" : (30.95 * rate).toFixed(2);
            _shopScope.data.tresorierPrice = (USE_EURO || rate === null) ? "29.99" : (29.99 * rate).toFixed(2);
            if (!USE_EURO && rate !== null) { _shopScope.data.currencySymbol = "$"; }
            try { safeApply(_shopScope); } catch(e) {}
        }

        // RÃ©cupÃ©ration du taux depuis le VPS (mis Ã  jour toutes les heures cÃ´tÃ© serveur)
        if (!USE_EURO) {
            fetch("https://grepoplus.duckdns.org/shop/eur-usd-rate")
                .then(function(r) { return r.json(); })
                .then(function(j) { if (j && j.rate) _applyRate(j.rate); })
                .catch(function() {}); // silencieux â€” si Ã©chec, on reste en EUR (voir conv)
        }

        function toDisplayPrice(eurPrice) {
            return USE_EURO ? eurPrice : (parseFloat(eurPrice) * EUR_TO_USD).toFixed(2);
        }

        // Modules premium â€” triÃ©s par prix croissant (moins cher en haut, plus cher en bas)
        // Utilise des clÃ©s de traduction pour permettre le changement de langue dynamique
        var SHOP_MODULES_EUR_KEYS = [
            { id: "wonder",    labelKey: "Merveille",    emoji: "ðŸ›ï¸", price: "2.99", descKey: "Gestion automatique des merveilles" },
            { id: "recruiter", labelKey: "Recruteur",    emoji: "ðŸ¹",  price: "4.99", descKey: "Recrutement automatique de troupes" },
            { id: "foreman",   labelKey: "Constructeur", emoji: "ðŸ”¨",  price: "4.99", descKey: "Construction automatique de bÃ¢timents" },
            { id: "farm",      labelKey: "Collecteur",   emoji: "ðŸŒ¾",  price: "8.99", descKey: "Collecte automatique dans les villages" },
            { id: "trader",    labelKey: "Marchand",     emoji: '<img src="https://grepoplus.duckdns.org/bot/img/trader_icon.png" style="width:1em;height:1em;vertical-align:text-bottom;margin-right:4px;">',  price: "8.99", descKey: "Commerce automatique entre villes" }
        ];
        function getShopModulesEur() {
            return SHOP_MODULES_EUR_KEYS.map(function(m) {
                return { id: m.id, label: t(m.labelKey), emoji: m.emoji, price: m.price, desc: t(m.descKey) };
            });
        }
        var SHOP_MODULES_EUR = getShopModulesEur();
        var SHOP_MODULES = _buildShopModules(EUR_TO_USD);
        var ALL_PRICE      = toDisplayPrice("19.99");
        var ALL_PRICE_FULL = toDisplayPrice("30.95");
        var CURRENCY_SYM   = CURRENCY_SYMBOL;

        $scope.devMode = !!(bot.sett && bot.sett.dev_mode);
        $scope.isLocked = function(moduleId) {
            var pm = ($scope.data && $scope.data.premiumModules) || bot.premiumModules || {};
            return pm[moduleId] !== true;
        };

        window._gp_devmode = !!$scope.devMode;
        // Fonction globale pour ouvrir le panel sur l'onglet shop
        window._gp_openShop = function() {
            var s = angular.element(document.querySelector(".botSettings")).scope();
            if (s) { s.data.activeTab = "shop"; safeApply(s); }
        };
        // Lancer le tutoriel (depuis bouton SÃ©nat ou manuellement)
        $scope.launchTutorial = function() {
            // NE PAS fermer le menu â€” le tutoriel s'affiche par-dessus
            // RÃ©initialiser le flag pour permettre un replay
            if (bot.premiumData) bot.premiumData.tutorial_done = false;
            if (bot.tutorial && typeof bot.tutorial.start === "function") {
                bot.tutorial.start();
            }
        };
        $scope.$watch('data.s.dev_mode', function(v) {
            $scope.devMode = !!v;
            window._gp_devmode = !!v;
            bot.sett.dev_mode = !!v;
            // Forcer la mise Ã  jour des fenÃªtres Herald et Commander si ouvertes
            try {
                if (bot.herald && bot.herald._scope) bot.herald._scope.$digest();
            } catch(e) {}
            try {
                if (bot.commander && bot.commander._ctrlScope) bot.commander._ctrlScope.$digest();
            } catch(e) {}
        });



        // herald_auto_remove : appliquer immÃ©diatement Ã  la case Ã  cocher
        $scope.$watch('data.s.herald_auto_remove', function(v, old) {
            bot.sett.herald_auto_remove = !!v;
            if (!v || !bot.herald || v === old) return;
            var now = Timestamp.server();
            var doneStatuses = ['struck', 'spam', 'disappeared', 'deleted'];
            for (var tid in bot.herald.town) {
                var atks = bot.herald.town[tid].attack;
                var toDelete = [];
                for (var aid in atks) {
                    var a = atks[aid];
                    if (!a) continue;
                    if (a.time < now || doneStatuses.indexOf(a.status) !== -1) {
                        toDelete.push(aid);
                    }
                }
                toDelete.forEach(function(aid) { delete atks[aid]; });
            }
            // RafraÃ®chir le menu herald si ouvert
            if (bot.herald.showAttacksEl) {
                try {
                    var scope = angular.element(bot.herald.showAttacksEl[0]).scope();
                    if (scope) {
                        if (scope.$$phase || scope.$root.$$phase) scope.refresh();
                        else scope.$apply(function() { scope.refresh(); });
                    }
                } catch(e) {}
            }
        });

        // commander_autoremove : appliquer immÃ©diatement Ã  la case Ã  cocher
        $scope.$watch('data.s.commander_autoremove', function(v, old) {
            bot.sett.commander_autoremove = !!v;
            if (!v || !bot.commander || v === old) return;
            if (typeof bot.commander.getOrders !== 'function') return;
            var orders = bot.commander.getOrders();
            for (var i = orders.length - 1; i >= 0; i--) {
                if (orders[i] && (orders[i].state === 'success' || orders[i].state === 'delete')) {
                    orders.splice(i, 1);
                }
            }
            if (bot.commander._ctrlScope) {
                var cs = bot.commander._ctrlScope;
                try {
                    if (cs.$$phase || cs.$root.$$phase) cs.refresh && cs.refresh();
                    else safeApply(cs, function() { cs.refresh && cs.refresh(); });
                } catch(e) {}
            }
        });

        // â”€â”€ i18n : fonction de traduction accessible dans les templates Angular â”€â”€
        $scope.t = function(str) {
            return ctx.t ? ctx.t(str) : str;
        };
        // â”€â”€ i18n : forcer le re-render du shop quand le JSON de langue est chargÃ© â”€â”€
        document.addEventListener('grepoplus:langReady', function() {
            try { if (_shopScope) safeApply(_shopScope); } catch(e) {}
        });
        // â”€â”€ FrÃ©quence Collecteur : restart immÃ©diat si le module tourne â”€â”€
        $scope.$watch('data.s.farm_time', function(v, old) {
            if (v === old) return;
            bot.sett.farm_time = v;
            var mod = bot._farmModule || bot.farm;
            if (mod && mod.active && typeof mod.stop === 'function' && typeof mod.start === 'function') {
                mod.stop();
                setTimeout(function() { mod.start(); }, 200);
            }
        });

        // â”€â”€ FrÃ©quence Marchand : reset du block pour relance immÃ©diate â”€â”€
        $scope.$watch('data.s.trader_refresh_interval', function(v, old) {
            if (v === old) return;
            bot.sett.trader_refresh_interval = v;
            if (bot.trader && bot.trader.active) {
                try { ctx.block('merchant', 0); } catch(e) {}
            }
        });

        // â”€â”€ Intervalle Merveille : stop/start pour relance immÃ©diate â”€â”€
        $scope.$watch('data.s.wonder_interval', function(v, old) {
            if (v === old) return;
            bot.sett.wonder_interval = v;
            if (bot.wonder && bot.wonder.active && typeof bot.wonder.stop === 'function' && typeof bot.wonder.start === 'function') {
                bot.wonder.stop();
                setTimeout(function() { bot.wonder.start(); }, 200);
            }
        });

        // â”€â”€ i18n : donnÃ©es de langue pour le scope â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        var _LANG_LIST_FULL = ["fr","en","de","es","it","pt","nl","pl","ru","tr","cs","hu","ro","sv","nb","da","fi","sk","hr","el","uk"];
        var _langList  = (ctx.langList && ctx.langList.length > 2) ? ctx.langList : _LANG_LIST_FULL;
        var _langNames = ctx.langNames || {"fr":"FranÃ§ais","en":"English","de":"Deutsch","es":"EspaÃ±ol","it":"Italiano","pt":"PortuguÃªs","nl":"Nederlands","pl":"Polski","ru":"Ð ÑƒÑÑÐºÐ¸Ð¹","tr":"TÃ¼rkÃ§e","cs":"ÄŒeÅ¡tina","hu":"Magyar","ro":"RomÃ¢nÄƒ","sv":"Svenska","nb":"Norsk","da":"Dansk","fi":"Suomi","sk":"SlovenÄina","hr":"Hrvatski","el":"Î•Î»Î»Î·Î½Î¹ÎºÎ¬","uk":"Ð£ÐºÑ€Ð°Ñ—Ð½ÑÑŒÐºÐ°"};
        var _langNamesLocalized = ctx.langNamesLocalized || {};
        var _currentLang = ctx.detectLang ? ctx.detectLang() : "en";
        function _getLocalLangNames(lang) {
            return _langNamesLocalized[lang] || _langNames;
        }
        var _langCodes = {
            "fr":"fr","en":"gb","de":"de","es":"es","it":"it","pt":"pt",
            "nl":"nl","pl":"pl","ru":"ru","tr":"tr","cs":"cz","hu":"hu",
            "ro":"ro","sv":"se","nb":"no","da":"dk","fi":"fi","sk":"sk",
            "hr":"hr","el":"gr","uk":"ua"
        };

        // â”€â”€ Helper : Ã©vite l erreur $rootScope:inprog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // (dÃ©fini au niveau module â€” accessible depuis tous les controllers)

        $scope.data = {
            s: Object.assign({}, bot.sett),
            premiumModules: bot.premiumModules,
            premiumGrepolis: {
                curator: bot.checkPremium("curator"),
                captain: bot.checkPremium("captain")
            },
            townUnderSiege: (function() {
                try { var t = ITowns.getTown(Game.townId); return !!(t && t.hasConqueror && t.hasConqueror()); } catch(e) { return false; }
            })(),
            premiumExpiry: bot.premiumExpiry || {},

            customs: customs,
            options: [],
            bugReport: { description: "", bugs: [] },
            tradeFilter: "",
                wonderFilter: "",
            farmFilter: "",
            heraldFilter: "",
            tresorierFilter: "",
            id: 350437,
            password: "Kc7n4KQs",
            spoilerHeraldSound: false,
            activeTab: 1,
            notifHistory: bot._notifHistory || [],
            notifBadge: 0,
            heraldOwnCount: 0,
            heraldAllyCount: 0,
            commanderOwnCount: 0,
            commanderAllyCount: 0,
            playerId:   currentPlayerId,
            isAdmin:    !!(bot.isAdmin),
            trialUsed:  !!(bot.premiumData && bot.premiumData.trial),
            trialOpen:  false,
            trialLoading: false,
            trialMsg:   "",
            trialMsgOk: true,
            adminPlayerId: String(currentPlayerId),
            adminTab:   "stats",
            adminStats: null,
            adminPlayers: null,
            adminLoading: false,
            adminMsg:   "",
            adminMsgOk: true,
            adminAddForm: { player_id: "", modules: [], days: 30 },
            adminSearchQ: "",
            allPrice:   ALL_PRICE,
            allPriceFull: ALL_PRICE_FULL,
            tresorierPrice: (USE_EURO ? "29.99" : (29.99 * (EUR_TO_USD || 1)).toFixed(2)),
            currencySymbol: CURRENCY_SYM,
            hasAll:     !!(bot.premiumModules && Object.keys(bot.premiumModules).length > 0 &&
                           Object.keys(bot.premiumModules).every(function(k){ return bot.premiumModules[k]; })),
            _lang:       _currentLang,
            langList:    _langList,
            langNames:   _langNames,
            localLangNames: _getLocalLangNames(_currentLang),
            langCodes:   _langCodes,
            langCode:    _langCodes[_currentLang] || "gb",
            langCodeUpper: _currentLang.toUpperCase(),
            langPickerOpen: false,
            shopStatus: "",
            shopStatusOk: true,
            shopModules: SHOP_MODULES.map(function(m) {
                return Object.assign({}, m, {
                    active: !!(bot.premiumModules && bot.premiumModules[m.id] === true)
                });
            }),
            // Mode rÃ©duit â€” non sauvegardÃ©, rÃ©initialisÃ© Ã  chaque chargement
            compactMode: false
        };
        _shopScope = $scope; // permet la mise Ã  jour async du taux de change

        // Mode rÃ©duit â€” bascule la classe CSS sur le panel
        // AppelÃ© soit par la checkbox (data.compactMode dÃ©jÃ  mis Ã  jour par ng-model),
        // soit par le bouton restore (qui passe forceOff=true pour forcer la sortie).
        $scope.toggleCompactMode = function(forceOff) {
            if (forceOff) $scope.data.compactMode = false;
            var el = document.querySelector('.botSettings');
            if (!el) return;
            if ($scope.data.compactMode) {
                el.classList.add('gp-compact-mode');
            } else {
                el.classList.remove('gp-compact-mode');
            }
        };


        // â”€â”€ Modules triÃ©s : dÃ©bloquÃ©s en premier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Utilise des clÃ©s de traduction pour permettre le changement de langue dynamique
        var MODULE_DEFS_KEYS = [
            { id: 'docent',    labelKey: 'Chercheur',     icon: '<img src="https://gpfr.innogamescdn.com/images/game/res/research_points.png" style="width:18px;height:18px;vertical-align:middle;">', premium: false },
            { id: 'sorciere',  labelKey: 'SorciÃ¨re',      icon: '<img src="https://grepoplus.duckdns.org/bot/img/sorciere_icon.png" style="width:1em;height:1em;vertical-align:text-bottom;margin-right:4px;">', premium: false },
            { id: 'farm',      labelKey: 'Collecteur',   icon: 'ðŸŒ¾', premium: true  },
            { id: 'trader',    labelKey: 'Marchand',      icon: '<img src="https://grepoplus.duckdns.org/bot/img/trader_icon.png" style="width:1em;height:1em;vertical-align:text-bottom;margin-right:4px;">', premium: true  },
            { id: 'foreman',   labelKey: 'Constructeur',  icon: 'ðŸ”¨', premium: true  },
            { id: 'recruiter', labelKey: 'Recruteur',     icon: 'ðŸ¹', premium: true  },
            { id: 'wonder',    labelKey: 'Merveille',     icon: 'ðŸ›ï¸', premium: true  },
            { id: 'tresorier', labelKey: 'TrÃ©sorier',     icon: 'ðŸ’°', premium: true  }
        ];

        function buildSortedModules() {
            return MODULE_DEFS_KEYS.map(function(m) {
                return { id: m.id, label: t(m.labelKey), icon: m.icon, premium: m.premium };
            });
        }

        // Forcer farm_time : convertir en string et valider (300 par defaut)

        var _validFarmTimes = ['disabled','300','1200','5400','14400'];
        $scope.data.s.farm_time = String($scope.data.s.farm_time || 'disabled');
        if (_validFarmTimes.indexOf($scope.data.s.farm_time) === -1) {
            $scope.data.s.farm_time = '300';
        }
        // Forcer farm_stopafter en string (0 = Jamais par defaut)
        $scope.data.s.farm_stopafter = String($scope.data.s.farm_stopafter !== undefined ? $scope.data.s.farm_stopafter : '0');
        // Forcer les parametres marchÃ© en string pour les selects
        $scope.data.s.farm_market_pct  = String($scope.data.s.farm_market_pct  || '1');
        $scope.data.s.farm_market_cap  = String($scope.data.s.farm_market_cap  || '1000');
        $scope.data.s.farm_market_rate = String($scope.data.s.farm_market_rate || '1');

        // â”€â”€ Sauvegarde temps rÃ©el vers le VPS (debounce 1.5s) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // RÃ©cupÃ©rer le world courant (ex: "fr106", "en108"...)
        var _currentWorld = (function() {
            try { return window.location.hostname.split(".")[0]; } catch(e) { return "unknown"; }
        })();

        var _playerId = (function() {
            try {
                var _m = MM.getModels();
                return String(_m.Player[Object.keys(_m.Player)[0]].getId());
            } catch(e) { return String(Game.player_id); }
        })();

        // Sauvegarde les settings GLOBAUX (bot.sett) vers le VPS â€” debounce 500ms
        var _settSaveTimer = null;
        var _saveIndicatorTimer = null;
        function _showSaveIndicator() {
            try {
                var s = angular.element(document.querySelector(".botSettings")).scope();
                if (!s) return;
                clearTimeout(_saveIndicatorTimer);
                safeApply(s, function() { s.data.saveIndicator = true; });
                _saveIndicatorTimer = setTimeout(function() {
                    try { safeApply(s, function() { s.data.saveIndicator = false; }); } catch(e) {}
                }, 1000);
            } catch(e) {}
        }
        function saveGlobalsToVPS() {
            clearTimeout(_settSaveTimer);
            _settSaveTimer = setTimeout(function() {
                var payload = { player_id: _playerId, type: "globals", settings: bot.sett };
                var _ws = null;
                try { _ws = (typeof bot !== "undefined" && bot._ctx && bot._ctx._premiumWS) || null; } catch(e) {}
                if (!_ws) { try { _ws = window._grepoCtx && window._grepoCtx._premiumWS; } catch(e) {} }
                if (_ws && _ws.readyState === 1) {
                    try { _ws.send(JSON.stringify(Object.assign({}, payload, { type: "SETTINGS_SAVE", save_type: payload.type }))); _showSaveIndicator(); return; } catch(e) {}
                }
                // Fallback HTTP
                fetch("https://grepoplus.duckdns.org/premium/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }).then(function() { _showSaveIndicator(); }).catch(function() {});
            }, 500);
        }

        // Sauvegarde les customs d'UNE ville â€” WS en prioritÃ©, fallback HTTP â€” debounce 500ms
        var _customSaveTimers = {};
        function saveCustomToVPS(townId, customData) {
            clearTimeout(_customSaveTimers[townId]);
            _customSaveTimers[townId] = setTimeout(function() {
                var payload = { player_id: _playerId, type: "custom", world: _currentWorld, town_id: String(townId), settings: customData };
                var _ws = null;
                try { _ws = (typeof bot !== "undefined" && bot._ctx && bot._ctx._premiumWS) || null; } catch(e) {}
                if (!_ws) { try { _ws = window._grepoCtx && window._grepoCtx._premiumWS; } catch(e) {} }
                if (_ws && _ws.readyState === 1) {
                    try { _ws.send(JSON.stringify(Object.assign({}, payload, { type: "SETTINGS_SAVE", save_type: payload.type }))); _showSaveIndicator(); return; } catch(e) {}
                }
                // Fallback HTTP
                fetch("https://grepoplus.duckdns.org/premium/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }).then(function() { _showSaveIndicator(); }).catch(function() {});
            }, 500);
        }

        // Sauvegarde la queue complÃ¨te â€” WS en prioritÃ©, fallback HTTP â€” debounce 800ms
        var _queueSaveTimer = null;
        function saveQueueToVPS() {
            clearTimeout(_queueSaveTimer);
            _queueSaveTimer = setTimeout(function() {
                var FIELDS = {
                    foreman:   ["id","module","item","town","type","fixed","repeat","gold"],
                    recruiter: ["id","module","item","town","type","count","fixed","repeat","gold","usePower"],
                    docent:    ["id","module","item","town","fixed","gold"],
                    sorciere:  ["id","module","item","town","fixed","repeat","gold","targetTownId","targetTownName"],
                    trader:    ["id","module","item","town","to","toName","fixed","repeat","wood","stone","iron","isLocal","isPlayer"]
                };
                var items = (bot.queue ? bot.queue.items : []).filter(function(i) {
                    return !i.isDeleted && !i.isRunning && FIELDS[i.module];
                }).map(function(i) {
                    var fields = FIELDS[i.module];
                    var clean = {};
                    // Toujours inclure les champs clÃ©s
                    ["id","module","item","town"].forEach(function(k) { if (i[k] !== undefined) clean[k] = i[k]; });
                    // Inclure les champs optionnels seulement s'ils ont une valeur utile
                    fields.forEach(function(k) {
                        if (["id","module","item","town"].indexOf(k) !== -1) return;
                        if (i[k] !== undefined && i[k] !== null && i[k] !== false && i[k] !== 0 && i[k] !== "") clean[k] = i[k];
                    });
                    return clean;
                });
                var payload = { player_id: _playerId, type: "queue", settings: items };
                var _ws = null;
                try { _ws = (typeof bot !== "undefined" && bot._ctx && bot._ctx._premiumWS) || null; } catch(e) {}
                if (!_ws) { try { _ws = window._grepoCtx && window._grepoCtx._premiumWS; } catch(e) {} }
                if (_ws && _ws.readyState === 1) {
                    try { _ws.send(JSON.stringify(Object.assign({}, payload, { type: "SETTINGS_SAVE", save_type: "queue" }))); _showSaveIndicator(); return; } catch(e) {}
                }
                fetch("https://grepoplus.duckdns.org/premium/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }).then(function() { _showSaveIndicator(); }).catch(function() {});
            }, 800);
        }

        // Expose saveQueueToVPS sur bot pour que queue.js puisse l'appeler
        bot.saveQueueToVPS = saveQueueToVPS;

        // â”€â”€ Watch globals (data.s) â€” posÃ© APRÃˆS toutes les normalisations â”€â”€
        // l'ouverture (normalisations + 2Ã¨me $digest du watch premiumModules inclus)
        var _settingsReady = false;
        setTimeout(function() { _settingsReady = true; }, 1200);

        // Expose pause/resume pour core.js (injection VPS si panel dÃ©jÃ  ouvert)
        $scope._pauseSettWatch  = function() { _settingsReady = false; };
        $scope._resumeSettWatch = function() { setTimeout(function() { _settingsReady = true; }, 50); };

        // â”€â”€ Watch _lang â€” force re-render of {{t('...')}} on language change â”€â”€
        $scope.$watch("data._lang", function(newLang, oldLang) {
            if (newLang === oldLang) return;
            // Angular re-evaluates all {{t('...')}} expressions automatically
            // because t() reads _activeLang which was updated by ctx.setLang()
            
            // Reconstruire les tableaux de navigation et modules avec les nouvelles traductions
            if (typeof buildSortedNav === 'function') buildSortedNav();
            if (typeof buildSortedModules === 'function') $scope.sortedModules = buildSortedModules();
            // Reconstruire les modules du shop
            if (typeof getShopModulesEur === 'function') {
                SHOP_MODULES_EUR = getShopModulesEur();
                SHOP_MODULES = _buildShopModules(EUR_TO_USD);
                $scope.data.shopModules = SHOP_MODULES.map(function(m) {
                    return Object.assign({}, m, {
                        active: !!(bot.premiumModules && bot.premiumModules[m.id] === true)
                    });
                });
            }
        });

                $scope.$watch("data.s", function(newVal, oldVal) {
            if (!_settingsReady) return; // encore en phase d'init, on ignore
            // Propager dans bot.sett
            Object.keys(newVal).forEach(function(k) {
                bot.sett[k] = newVal[k];
            });
            saveGlobalsToVPS();
        }, true);

        // â”€â”€ Watch customs (data.customs) â€” par ville, par world â”€â”€
        var _customsReady = false;
        setTimeout(function() { _customsReady = true; }, 1200);

        // Expose pause/resume pour core.js (injection VPS si panel dÃ©jÃ  ouvert)
        $scope._pauseCustomWatch  = function() { _customsReady = false; };
        $scope._resumeCustomWatch = function() { setTimeout(function() { _customsReady = true; }, 50); };

        $scope.$watch("data.customs", function(newVal, oldVal) {
            if (!_customsReady || !newVal || !bot.custom) return;
            newVal.forEach(function(item) {
                var townId = item.attr && item.attr.townId;
                if (!townId) return;
                var current = bot.custom.get(townId);
                var changed = false;
                var diff = {};
                Object.keys(item).forEach(function(k) {
                    if (k === "$$hashKey" || k === "attr") return;
                    if (item[k] !== current[k]) {
                        current[k] = item[k];
                        changed = true;
                    }
                    diff[k] = item[k];
                });
                if (changed) saveCustomToVPS(townId, diff);
            });
        }, true);

        $scope.sortedModules = buildSortedModules();

        // Onglets nav triÃ©s : dÃ©bloquÃ©s en premier
        // Utilise des clÃ©s de traduction pour permettre le changement de langue dynamique
        var NAV1_DEFS_KEYS = [
            { tab: "modules", icon: '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4KICA8cG9seWdvbiBwb2ludHM9IjUwLDggMTAsMzIgOTAsMzIiIGZpbGw9IiNlMDMwMzAiLz4KICA8cmVjdCB4PSIxMCIgeT0iMzIiIHdpZHRoPSI4MCIgaGVpZ2h0PSI1IiBmaWxsPSIjYzlhODRjIi8+CiAgPHJlY3QgeD0iMTQiIHk9IjM3IiB3aWR0aD0iMTAiIGhlaWdodD0iNDQiIGZpbGw9IiNmMGU4ZDgiLz4KICA8cmVjdCB4PSIzMCIgeT0iMzciIHdpZHRoPSIxMCIgaGVpZ2h0PSI0NCIgZmlsbD0iI2YwZThkOCIvPgogIDxyZWN0IHg9IjUwIiB5PSIzNyIgd2lkdGg9IjEwIiBoZWlnaHQ9IjQ0IiBmaWxsPSIjZjBlOGQ4Ii8+CiAgPHJlY3QgeD0iNzAiIHk9IjM3IiB3aWR0aD0iMTAiIGhlaWdodD0iNDQiIGZpbGw9IiNmMGU4ZDgiLz4KICA8cmVjdCB4PSIyMiIgeT0iMzciIHdpZHRoPSIzIiBoZWlnaHQ9IjQ0IiBmaWxsPSIjYjhhODg4Ii8+CiAgPHJlY3QgeD0iMzgiIHk9IjM3IiB3aWR0aD0iMyIgaGVpZ2h0PSI0NCIgZmlsbD0iI2I4YTg4OCIvPgogIDxyZWN0IHg9IjU4IiB5PSIzNyIgd2lkdGg9IjMiIGhlaWdodD0iNDQiIGZpbGw9IiNiOGE4ODgiLz4KICA8cmVjdCB4PSI3OCIgeT0iMzciIHdpZHRoPSIzIiBoZWlnaHQ9IjQ0IiBmaWxsPSIjYjhhODg4Ii8+CiAgPHJlY3QgeD0iMTAiIHk9IjgxIiB3aWR0aD0iODAiIGhlaWdodD0iNSIgZmlsbD0iI2M5YTg0YyIvPgogIDxyZWN0IHg9IjgiIHk9Ijg2IiB3aWR0aD0iODQiIGhlaWdodD0iNiIgZmlsbD0iI2YwZThkOCIvPgo8L3N2Zz4=" width="18" height="18" style="vertical-align:middle;display:block;">', labelKey: 'SÃ©nat',     locked: null },
            { tab: "herald",  icon: 'âš”ï¸', labelKey: 'HÃ©raut',      locked: null },
            { tab: 2,         icon: 'ðŸš©', labelKey: 'Commandant',  locked: null },
            { tab: 12, icon: '<img src="https://gpfr.innogamescdn.com/images/game/res/research_points.png" style="width:18px;height:18px;vertical-align:middle;">', labelKey: 'Chercheur', locked: null }
        ];
        var NAV2A_DEFS_KEYS = [
            { tab: 'sorciere', icon: '<img src="https://grepoplus.duckdns.org/bot/img/sorciere_icon.png" style="width:1em;height:1em;vertical-align:text-bottom;margin-right:4px;">', labelKey: 'SorciÃ¨re', locked: null },
            { tab: "farm",    icon: 'ðŸŒ¾', labelKey: 'Collecteur',  locked: 'farm' },
            { tab: 6,  icon: '<img src="https://grepoplus.duckdns.org/bot/img/trader_icon.png" style="width:1em;height:1em;vertical-align:text-bottom;margin-right:4px;">', labelKey: 'Marchand',     locked: 'trader' },
            { tab: 10, icon: 'ðŸ”¨', labelKey: 'Constructeur', locked: 'foreman' },
            { tab: 11, icon: 'ðŸ¹', labelKey: 'Recruteur',    locked: 'recruiter' },
            { tab: 7,  icon: 'ðŸ›ï¸', labelKey: 'Merveille',    locked: 'wonder' },
            { tab: "tresorier", icon: 'ðŸ’°', labelKey: 'TrÃ©sorier',   locked: 'tresorier' },
            { tab: "shop", icon: 'ðŸ›’', labelKey: 'Shop', locked: null, shop: true },
            { tab: "admin", icon: 'âš™ï¸', labelKey: 'Admin', locked: null, adminOnly: true }
        ];
        var NAV2B_DEFS_KEYS = [];

        function translateNavDefs(defs) {
            return defs.map(function(n) {
                return { tab: n.tab, icon: n.icon, label: t(n.labelKey), locked: n.locked, shop: n.shop, adminOnly: n.adminOnly };
            });
        }

        function padTo4(arr) {
            // Filtrer l'onglet admin si pas admin, et shop si admin
            var r = arr.filter(function(n) {
                if (n.adminOnly) return !!(bot.isAdmin);
                if (n.shop) return !(bot.isAdmin);
                return true;
            });
            var i = 0;
            while (r.length % 4 !== 0) {
                r.push({ tab: null, icon: '', label: '', locked: null, _coming: true, _idx: i++ });
            }
            return r;
        }
        function buildSortedNav() {
            $scope.sortedNav1  = translateNavDefs(NAV1_DEFS_KEYS);
            $scope.sortedNav2a = padTo4(translateNavDefs(NAV2A_DEFS_KEYS));
            $scope.sortedNav2b = translateNavDefs(NAV2B_DEFS_KEYS);
        }
        $scope.buildSortedNav = buildSortedNav;
        buildSortedNav();

        // Ecouter l'evenement langReady pour reconstruire les tableaux apres chargement de la langue
        document.addEventListener("grepoplus:langReady", function(e) {
            safeApply($scope, function() {
                buildSortedNav();
                $scope.sortedModules = buildSortedModules();
                // Reconstruire les modules du shop
                SHOP_MODULES_EUR = getShopModulesEur();
                SHOP_MODULES = _buildShopModules(EUR_TO_USD);
                $scope.data.shopModules = SHOP_MODULES.map(function(m) {
                    return Object.assign({}, m, {
                        active: !!(bot.premiumModules && bot.premiumModules[m.id] === true)
                    });
                });
            });
        });

        // Au demarrage, appeler setLang pour s'assurer que les traductions sont chargees
        // et reconstruire les tableaux avec la bonne langue
        if (ctx.setLang && $scope.data._lang) {
            ctx.setLang($scope.data._lang);
        }

        // Mettre Ã  jour les customs en temps rÃ©el quand un nom de ville change
        // Re-enregistrement systÃ©matique Ã  chaque ouverture du panel pour Ã©viter les closures mortes
        var _townNameHandler = function() {
            setTimeout(function() {
                try {
                    var _s = angular.element(document.querySelector(".botSettings")).scope();
                    if (_s && _s.data) safeApply(_s, function() { _s.data.customs = buildCustoms(); });
                } catch(e) {}
            }, 150);
        };
        try {
            var _mmTowns = MM.getModels().Town;
            Object.keys(_mmTowns).forEach(function(id) {
                _mmTowns[id].off('change:name', _townNameHandler).on('change:name', _townNameHandler);
            });
            try {
                MM.getCollections().Town.on('add', function(model) {
                    model.off('change:name', _townNameHandler).on('change:name', _townNameHandler);
                });
            } catch(e) {}
        } catch(e) {}

        // Surveiller changement de ville pour mettre Ã  jour l'alerte siÃ¨ge
        var _lastSiegeTownId = null;
        setInterval(function() {
            try {
                var _t = ITowns.getTown(Game.townId);
                var _siege = !!(_t && _t.hasConqueror && _t.hasConqueror());
                if ($scope.data.townUnderSiege !== _siege) {
                    safeApply($scope, function() { $scope.data.townUnderSiege = _siege; });
                }
            } catch(e) {}
        }, 3000);

        // Recherche Pillage (booty) â€” citÃ© active (menu global)
        try {
            var _town = ITowns.getTown(Game.townId);
            $scope.hasBooty = _town && typeof _town.researches === 'function' && _town.researches().get('booty') === true;
        } catch(e) { $scope.hasBooty = false; }

        // Recherche Pillage (booty) â€” par citÃ© (menu par citÃ©)
        $scope.townHasBooty = function(townId) {
            try {
                var t = ITowns.getTown(townId);
                return t && typeof t.researches === 'function' && t.researches().get('booty') === true;
            } catch(e) { return false; }
        };

        // Surveillance en temps rÃ©el â€” mise Ã  jour si la recherche Pillage change
        $scope.$watch(function() {
            try {
                var t = ITowns.getTown(Game.townId);
                return t && typeof t.researches === 'function' && t.researches().get('booty') === true;
            } catch(e) { return false; }
        }, function(newVal) {
            $scope.hasBooty = newVal;
        });

        // RÃ©agir quand premiumModules change (aprÃ¨s achat)
        $scope.$watch(function() {
            return bot.premiumModules;
        }, function(newVal) {
            if (newVal) {
                // Suspendre la sauvegarde pendant les normalisations
                // pour ne pas Ã©craser les rÃ©glages utilisateur (checkboxes) avec les valeurs par dÃ©faut
                var _wasReady = _settingsReady;
                _settingsReady = false;

                // Forcer farm_time : convertir en string et valider (300 par defaut)
                var _validFarmTimes = ['disabled','300','1200','5400','14400'];
                $scope.data.s.farm_time = String($scope.data.s.farm_time || 'disabled');
                if (_validFarmTimes.indexOf($scope.data.s.farm_time) === -1) {
                    $scope.data.s.farm_time = '300';
                }
                // Forcer farm_stopafter en string (0 = Jamais par defaut)
                $scope.data.s.farm_stopafter = String($scope.data.s.farm_stopafter !== undefined ? $scope.data.s.farm_stopafter : '0');
                // Forcer les parametres marchÃ© en string pour les selects
                $scope.data.s.farm_market_pct  = String($scope.data.s.farm_market_pct  || '1');
                $scope.data.s.farm_market_cap  = String($scope.data.s.farm_market_cap  || '1000');
                $scope.data.s.farm_market_rate = String($scope.data.s.farm_market_rate || '1');

                $scope.sortedModules = buildSortedModules();
                $scope.data.premiumModules = newVal;
                buildSortedNav();

                // RÃ©activer la sauvegarde aprÃ¨s le digest Angular (les normalisations ne doivent pas sauvegarder)
                setTimeout(function() { _settingsReady = _wasReady; }, 100);
            }
        }, true);

        // URL d'achat avec player_id + player_name + langue
        $scope.shopUrl = function(moduleId) {
            var cur  = USE_EURO ? "EUR" : "USD";
            var lang = (navigator.language || "fr").split("-")[0].toLowerCase();
            return SHOP_BASE + "?module=" + moduleId
                + "&player_id="   + currentPlayerId
                + "&player_name=" + encodeURIComponent(currentPlayerName)
                + "&currency="    + cur
                + "&lang="        + lang;
        };

        // Offrir un module Ã  un ami
        $scope.data.giftOpen  = null;
        $scope.data.giftName  = {};
        $scope.data.giftError = {};

        $scope.openGift = function(moduleId) {
            $scope.data.giftOpen  = ($scope.data.giftOpen === moduleId) ? null : moduleId;
            $scope.data.giftError[moduleId] = null;
        };

        $scope.sendGift = function(moduleId) {
            var name = ($scope.data.giftName[moduleId] || "").trim();
            if (!name) { $scope.data.giftError[moduleId] = "Entrez un pseudo."; return; }
            $scope.data.giftError[moduleId] = null;
            // RÃ©soudre le pseudo en player_id via le VPS
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "https://grepoplus.duckdns.org/shop/resolve-player?name=" + encodeURIComponent(name) + "&module=" + encodeURIComponent(moduleId), true);
            xhr.onload = function() {
                try {
                    var r = JSON.parse(xhr.responseText);
                    if (r.status === "ok" && r.id) {
                        var cur  = USE_EURO ? "EUR" : "USD";
                        var lang = (navigator.language || "fr").split("-")[0].toLowerCase();
                        var url = SHOP_BASE + "?module=" + moduleId + "&player_id=" + currentPlayerId + "&player_name=" + encodeURIComponent(currentPlayerName) + "&gift_to_id=" + r.id + "&gift_to_name=" + encodeURIComponent(r.name) + "&currency=" + cur + "&lang=" + lang;
                        window.open(url, "_blank");
                        safeApply($scope, function() { $scope.data.giftOpen = null; });
                    } else {
                        var msg = r.error === "already_active"
                            ? (r.name + " " + t("a dÃ©jÃ  ce module actif."))
                            : t("Joueur introuvable â€” ce joueur doit s'Ãªtre connectÃ© au moins une fois avec le bot.");
                        safeApply($scope, function() { $scope.data.giftError[moduleId] = msg; });
                    }
                } catch(e) {
                    safeApply($scope, function() { $scope.data.giftError[moduleId] = "Erreur serveur."; });
                }
            };
            xhr.onerror = function() {
                safeApply($scope, function() { $scope.data.giftError[moduleId] = "Impossible de joindre le serveur."; });
            };
            xhr.send();
        };

        // Gestion abonnement
        $scope.manageSubscription = function(moduleId) {
            window.open(SHOP_BASE + "/manage?module=" + moduleId + "&player_id=" + currentPlayerId, "_blank");
        };
		$scope.claimTrial = function() {
			// Fermer immÃ©diatement l'affichage de l'essai
			if (bot.premiumData) bot.premiumData.trial = true;
			$scope.data.trialUsed = true;
			$scope.data.trialOpen = false;
			// Envoyer la requÃªte en arriÃ¨re-plan (sans loading, sans bloquer l'UI)
			var body = { player_id: String(currentPlayerId), modules: ["farm", "foreman"], days: 0, hours: 12, trial: true };
			wsAdmin(Object.assign({ type: "ADMIN_ACTION", action: "trial" }, body), function(err, r, useHttp) {
				if (useHttp) {
					$.ajax({ url: ADMIN_API + "/admin/api/trial", method: "POST", headers: adminHeaders(), data: JSON.stringify(body) });
				}
			});
		};
        $scope.moduleActive = {
            farm: !!(bot.farm && bot.farm.active),
            commander: !!(bot.commander && bot.commander.visible),
            herald: !!(bot.herald && bot.herald.active),
            queue: !!(bot.queue && bot.queue.active),
            docent: !!(bot.docent && bot.docent.active),
            sorciere: !!(bot.sorciere && bot.sorciere.active),
            trader: !!(bot.trader && bot.trader.active),
            foreman: !!(bot.foreman && bot.foreman.active),
            recruiter: !!(bot.recruiter && bot.recruiter.active),
            wonder: !!(bot.wonder && bot.wonder.active),
            tresorier: !!(bot.tresorier && bot.tresorier.active)
        };
        $scope.toggleModule = function(name) {
            var b = bot;
            var isActive = $scope.moduleActive[name];
            var startStop = {
                farm: b.farm,
                foreman: b.foreman,
                recruiter: b.recruiter,
                docent: b.docent,
                sorciere: b.sorciere,
                wonder: b.wonder,
                queue: b.queue
            };
            if (name === "herald" && b.herald) {
                if (isActive) {
                    b.herald.stop();
                } else {
                    b.herald.start();
                }
                $scope.moduleActive[name] = !isActive;
                return;
            }
            if (name === "commander" && b.commander) {
                if (isActive) {
                    b.commander.hide();
                } else {
                    b.commander.show();
                }
                $scope.moduleActive[name] = !isActive;
                return;
            }
            if (name === "tresorier") {
                if (!isActive && !(b.premiumModules && b.premiumModules["tresorier"] === true)) {
                    ctx.logger.create("TrÃ©sorier")("error", "Module non inclus dans votre licence").msg(10);
                    return;
                }

                if (b.tresorier) {
                    if (isActive) {
                        if (typeof b.tresorier.stop === "function") b.tresorier.stop();
                    } else {
                        if (typeof b.tresorier.start === "function") b.tresorier.start();
                    }
                }
                $scope.moduleActive[name] = !isActive;
                return;
            }
            if (name === "trader" && b.trader) {
                if (isActive) {
                    b.trader.stop();
                } else {
                    if (b.premiumModules && b.premiumModules["trader"] === false) {
                        ctx.logger.create("Marchand")("error", "Module non inclus dans votre licence").msg(10);
                        return;
                    }
                    b.trader.start();
                }
                $scope.moduleActive[name] = !isActive;
                return;
            }
            if (name === "queue" && b.queue) {
                if (isActive) {
                    b.queue.stop();
                } else {
                    b.queue.start();
                }
                $scope.moduleActive[name] = !isActive;
                return;
            }
            // Pour le farm, utilise _farmModule qui est le vrai module (bot.farm est Ã©crasÃ© par l'API)
            var mod = (name === "farm" && b._farmModule) ? b._farmModule : startStop[name];
            if (!mod) return;
            if (isActive) {
                if (typeof mod.stop === "function") mod.stop();
            } else {
                // VÃ©rifie la licence GrepoPlus avant de dÃ©marrer
                if (b.premiumModules && b.premiumModules[name] === false) {
                    var moduleLabels = { farm: "Collecteur", recruiter: "Recruteur", foreman: "Constructeur", wonder: "Wonder-Bot" };
                    ctx.logger.create(moduleLabels[name] || name)("error", "Module non inclus dans votre licence").msg(10);
                    return;
                }
                if (typeof mod.start === "function") mod.start();
                if (name === "foreman" || name === "recruiter") {
                    setTimeout(function() {
                        try {
                            var types = name === "foreman" ? ["main"] : ["barracks", "docks"];
                            types.forEach(function(type) {
                                var wins = GPWindowMgr && GPWindowMgr.getAll ? GPWindowMgr.getAll() : [];
                                wins.forEach(function(w) {
                                    if (w && w.getType && w.getType() === type) {
                                        if (name === "foreman" && bot.foreman) bot.foreman.inject(w);
                                        else if (name === "recruiter" && bot.recruiter) bot.recruiter.inject(w);
                                    }
                                });
                            });
                        } catch (e) {}
                    }, 200);
                }
            }
            $scope.moduleActive[name] = !isActive;
        };
        $scope.openHerald = function() {
            if (bot.herald && typeof bot.herald.showAttacks === "function") {
                bot.herald.showAttacks();
            }
        };

        $scope.openFriends = function() {
            if (bot._friendsWindowEl) {
                bot.windows.close("friends");
                bot._friendsWindowEl = null;
                return;
            }
            var e = $(bot.templates.friends);
            e.draggable({ cancel: ".scrollbox, input, button, textarea, select" });
            angular.bootstrap(e, ["bot"]);
            bot.windows.open("friends", e);
            e.css({ position: "absolute", left: "450px", top: "200px" });
            bot._friendsWindowEl = e;
            // Affichage immÃ©diat depuis le cache local (zÃ©ro latence)
            setTimeout(function() {
                try {
                    var _fc = e[0].querySelector('[ng-controller="FriendsController"]') || e[0];
                    var sc = angular.element(_fc).scope();
                    if (sc && bot.friends && bot.friends._list && bot.friends._list.length) {
                        sc.$evalAsync(function() {
                            sc.friends = bot.friends._list.filter(function(f) { return f.status === "accepted"; });
                            sc.pending = bot.friends._list.filter(function(f) { return f.status === "pending_received"; });
                            sc.sent    = bot.friends._list.filter(function(f) { return f.status === "pending_sent"; });
                        });
                    }
                } catch(ex) {}
                // Refresh WS en arriÃ¨re-plan pour mettre Ã  jour online/modules
                if (bot.friends && typeof bot.friends._poll === "function") {
                    bot.friends._poll();
                }
            }, 80);
        };

        $scope.openCommander = function() {
            if (bot.commander) {
                if (bot.commander.visible) bot.commander.hide();
                else bot.commander.show();
            }
        };

        // â”€â”€ Pastilles Herald / Commander dans le header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function _refreshHeaderBadges() {
            var _ownH = 0, _allyH = 0;
            if (bot.herald) {
                var _now = Timestamp.server();
                for (var _tid in (bot.herald.town || {})) {
                    var _fatk = bot.herald.town[_tid].attack;
                    for (var _aid in _fatk) {
                        var _fa = _fatk[_aid];
                        if (_fa && _fa.time > _now && _fa.status !== "struck" && _fa.status !== "spam" && _fa.status !== "deleted" && _fa.status !== "disappeared") {
                            _ownH++;
                        }
                    }
                }
                var _imp = bot.herald.import_data || [];
                for (var _ji = 0; _ji < _imp.length; _ji++) {
                    var _i = _imp[_ji];
                    if (_i && _i.time > _now && (_i.status === "waiting" || _i.status === "confirmed")) {
                        _allyH++;
                    }
                }
            }
            var _ownC = 0, _allyC = 0;
            if (bot.commander && typeof bot.commander.getOrders === "function") {
                bot.commander.getOrders().forEach(function(cmd) {
                    if (cmd.state === "delete" || cmd.state === "success") return;
                    if (cmd.dodge && cmd.dodge > 0) return;
                    _ownC++;
                });
                if (bot.commander._friendOrders) {
                    var _nowC = Timestamp.server();
                    Object.keys(bot.commander._friendOrders).forEach(function(name) {
                        var entry = bot.commander._friendOrders[name];
                        var ordList = Array.isArray(entry) ? entry : (entry.orders || []);
                        ordList.forEach(function(o) {
                            if (o.state === "delete" || o.state === "success") return;
                            var arrivalAt = o.opts && o.opts.time ? o.opts.time : 0;
                            var departAt  = (arrivalAt && o.opts && o.opts.duration) ? arrivalAt - o.opts.duration : arrivalAt;
                            if (departAt > 0 && (_nowC - departAt) > 10 && o.state !== "success") return;
                            _allyC++;
                        });
                    });
                }
            }
            $scope.data.heraldOwnCount     = _ownH;
            $scope.data.heraldAllyCount    = _allyH;
            $scope.data.commanderOwnCount  = _ownC;
            $scope.data.commanderAllyCount = _allyC;
        }
        _refreshHeaderBadges();
        setInterval(function() {
            try {
                if (!$scope || !$scope.data) return;
                _refreshHeaderBadges();
                if (!$scope.$$phase && !$scope.$root.$$phase) $scope.$digest();
            } catch(e) {}
        }, 3000);

        $scope.openNotifHistory = function() {
            // Toggle : fermer si dÃ©jÃ  ouvert
            if (bot._notifWindowEl) {
                bot.windows.close("notif");
                bot._notifWindowEl = null;
                return;
            }
            // Compiler dans le scope Angular existant â€” ng-controller="notifController" gÃ¨re son propre scope
            var injector = angular.element(document.querySelector(".botSettings")).injector();
            var $compile  = injector.get("$compile");
            var tpl = bot.templates.notif;
            var e = $compile($(tpl))($scope);
            e.draggable({ cancel: ".scrollbox" });
            bot.windows.open("notif", e);
            e.css({ position: "absolute", left: "450px", top: "160px" });
            bot._notifWindowEl = e;
            // Remettre le badge Ã  0 Ã  l'ouverture
            $scope.data.notifBadge = 0;
        };

        $scope.toggleNotifPanel = function($event) {
            if ($event) $event.stopPropagation();
            $scope.data.notifPanelOpen = !$scope.data.notifPanelOpen;
            if ($scope.data.notifPanelOpen) {
                // Sync depuis bot._notifHistory au moment de l'ouverture
                $scope.data.notifHistory = bot._notifHistory || [];
                // Remettre le badge Ã  0
                $scope.data.notifBadge = 0;
                if (bot._notifScopeRef) bot._notifScopeRef.data.notifBadge = 0;
                // Fermer au prochain clic hors du panneau (sauf clics sur liens ville/joueur)
                var closeHandler = function(evt) {
                    if ($(evt.target).closest('.gp_town_link, .gp_player_link').length) return;
                    $scope.$evalAsync(function() { $scope.data.notifPanelOpen = false; });
                    $(document).off('click', closeHandler);
                };
                setTimeout(function() { $(document).on('click', closeHandler); }, 10);
            }
        };

        $scope.clearNotifHistory = function() {
            bot._notifHistory = [];
            $scope.data.notifHistory = [];
            $scope.data.notifBadge = 0;
        };

        // Gestion des clics sur les liens ville/joueur dans le panneau historique
        $scope.handleNotifClick = function($event) {
            var $target = $($event.target).closest(".gp_town_link, .gp_player_link");
            if (!$target.length) return;
            $event.preventDefault();
            $event.stopPropagation();

            if ($target.hasClass("gp_town_link")) {
                var href = $target.attr("href") || "";
                var fragment = href.replace(/^#/, "");
                if (!fragment) return;
                try {
                    var townData = JSON.parse(atob(fragment));
                    var townId = townData.id;
                    if (!townId) return;
                    var existingWnd = GPWindowMgr.getAllOpen && GPWindowMgr.getAllOpen().find(function(w) { return w.getType() == 6; });
                    if (existingWnd) {
                        existingWnd.reloadContent({ town_id: townId });
                    } else {
                        var $tmp = $("<a class='gp_town_link' href='#" + fragment + "'></a>").appendTo("body");
                        $tmp[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window, clientX: $event.clientX, clientY: $event.clientY }));
                        setTimeout(function() { $tmp.remove(); }, 100);
                    }
                } catch(ex) {
                    // Fragment natif Grepolis
                    try {
                        var $tmp2 = $("<a class='gp_town_link' href='#" + fragment + "'></a>").appendTo("body");
                        $tmp2[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window, clientX: $event.clientX, clientY: $event.clientY }));
                        setTimeout(function() { $tmp2.remove(); }, 100);
                    } catch(ex2) {}
                }

            } else if ($target.hasClass("gp_player_link")) {
                var pName = $target.attr("data-player-name");
                var pId   = parseInt($target.attr("data-player-id")) || null;
                if (!pName && !pId) return;
                try {
                    if (!pId) {
                        var models = MM.getModels();
                        if (models && models.Player) {
                            $.each(models.Player, function(id, p) {
                                if (p.getName && p.getName() === pName) { pId = parseInt(id); return false; }
                            });
                        }
                    }
                    var existingWnd2 = GPWindowMgr.getAllOpen && GPWindowMgr.getAllOpen().find(function(w) { return w.getType() == 18; });
                    if (pId) {
                        if (existingWnd2) {
                            existingWnd2.reloadContent({ player_id: pId });
                        } else {
                            var frag2 = btoa(JSON.stringify({ name: pName || "", id: pId }));
                            var $tmp3 = $("<a class='gp_player_link' href='#" + frag2 + "'></a>").appendTo("body");
                            $tmp3[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window, clientX: $event.clientX, clientY: $event.clientY }));
                            setTimeout(function() { $tmp3.remove(); }, 100);
                        }
                    } else if (existingWnd2) {
                        existingWnd2.reloadContent({ player_name: pName });
                    }
                } catch(ex) {}
            }
        };

        // Synchroniser l'historique et le badge depuis bot._notifHistory
        bot._notifScopeRef = $scope;


        $scope.close = function() {
            if (bot.settingsDlg) {
                bot.settingsDlg.remove();
                bot.settingsDlg = null;
            }
        };
        $scope.tradeSelectAll = function(type) {
            $scope.data.customs.forEach(function(x) {
                if (x.attr.isTradeFilter || (!x.attr.isOwnTown && (type == "provider"))) return;
                x.autotrade = type;
            });
        };
        $scope.tradeFilter = function(filter) {
            var filter = filter.toLowerCase();
            return function(item) {
                if (item.attr.isTradeFilter) return false;
                if (filter.length == 0) return true;
                return item.attr.townName.toLowerCase().indexOf(filter) != -1;
            };
        };
        $scope.wonderFilter = function(filter) {
            var filter = (filter || "").toLowerCase();
            return function(item) {
                if (!item.attr.isOwnTown) return false;
                if (filter.length == 0) return true;
                return item.attr.townName.toLowerCase().indexOf(filter) != -1;
            };
        };
        $scope.farmFilter = function(filter) {
            var filter = (filter || "").toLowerCase();
            return function(item) {
                if (!item.attr.isOwnTown) return false;
                if (filter.length == 0) return true;
                return item.attr.townName.toLowerCase().indexOf(filter) != -1;
            };
        };
        $scope.heraldFilter = function(filter) {
            var filter = (filter || "").toLowerCase();
            return function(item) {
                if (!item.attr.isOwnTown) return false;
                if (filter.length == 0) return true;
                return item.attr.townName.toLowerCase().indexOf(filter) != -1;
            };
        };
        $scope.tresorierFilter = function(filter) {
            var filter = (filter || "").toLowerCase();
            return function(item) {
                if (!item.attr.isOwnTown) return false;
                if (filter.length == 0) return true;
                return item.attr.townName.toLowerCase().indexOf(filter) != -1;
            };
        };
        $scope.filterOtherTowns = function(currentItem) {
            return function(t) {
                return t.attr.townId !== currentItem.attr.townId;
            };
        };

        // â”€â”€ Admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        // â”€â”€ Helper WS pour les actions admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function wsAdmin(payload, cb) {
            var _ws = null;
            try { _ws = (typeof bot !== "undefined" && bot._ctx && bot._ctx._premiumWS) || null; } catch(e) {}
            if (!_ws) { try { _ws = window._grepoCtx && window._grepoCtx._premiumWS; } catch(e) {} }
            var reqId = Math.random().toString(36).slice(2);
            payload._reqId = reqId;
            payload["x-admin-player-id"] = String(currentPlayerId);
            if (_ws && _ws.readyState === 1) {
                try {
                    // Stocker callback en attente de WS_REPLY
                    if (!window._gp_wsAdminCbs) window._gp_wsAdminCbs = {};
                    window._gp_wsAdminCbs[reqId] = cb;
                    _ws.send(JSON.stringify(payload));
                    return;
                } catch(e) {}
            }
            // Fallback : null â†’ l'appelant fait l'HTTP lui-mÃªme
            if (typeof cb === "function") cb(null, null, true); // true = useHttp
        }

        var ADMIN_API = "https://grepoplus.duckdns.org";

        function adminHeaders() {
            return { "Content-Type": "application/json", "x-admin-player-id": String(currentPlayerId) };
        }

        $scope.adminLoad = function() {
            if ($scope.data.adminTab === "stats") $scope.adminLoadStats();
            else if ($scope.data.adminTab === "players") $scope.adminLoadPlayers();
        };

        $scope.adminLoadStats = function() {
            $scope.data.adminLoading = true;
            $scope.data.adminMsg = "";
            wsAdmin({ type: "ADMIN_ACTION", action: "stats" }, function(err, r, useHttp) {
                if (useHttp) {
                    $.ajax({ url: ADMIN_API + "/admin/api/stats", method: "GET", headers: adminHeaders(),
                        success: function(r2) { $scope.data.adminStats = r2; $scope.data.adminLoading = false; safeApply($scope); },
                        error:   function()   { $scope.data.adminMsg = t("Erreur chargement stats"); $scope.data.adminMsgOk = false; $scope.data.adminLoading = false; safeApply($scope); }
                    });
                    return;
                }
                if (err) { $scope.data.adminMsg = t("Erreur chargement stats"); $scope.data.adminMsgOk = false; $scope.data.adminLoading = false; safeApply($scope); return; }
                $scope.data.adminStats = r; $scope.data.adminLoading = false; safeApply($scope);
            });
        };

        $scope.adminLoadPlayers = function() {
            $scope.data.adminLoading = true;
            $scope.data.adminMsg = "";
            wsAdmin({ type: "ADMIN_ACTION", action: "players" }, function(err, r, useHttp) {
                if (useHttp) {
                    $.ajax({ url: ADMIN_API + "/admin/api/players", method: "GET", headers: adminHeaders(),
                        success: function(r2) { $scope.data.adminPlayers = r2.players; $scope.data.adminLoading = false; safeApply($scope); },
                        error:   function()   { $scope.data.adminMsg = t("Erreur chargement joueurs"); $scope.data.adminMsgOk = false; $scope.data.adminLoading = false; safeApply($scope); }
                    });
                    return;
                }
                if (err) { $scope.data.adminMsg = t("Erreur chargement joueurs"); $scope.data.adminMsgOk = false; $scope.data.adminLoading = false; safeApply($scope); return; }
                $scope.data.adminPlayers = r && r.players; $scope.data.adminLoading = false; safeApply($scope);
            });
        };

        $scope.adminAdd = function() {
            var f = $scope.data.adminAddForm;
            if (!f.player_id || !f.modules || !f.modules.length) { $scope.data.adminMsg = "ID joueur et au moins un module requis"; $scope.data.adminMsgOk = false; return; }
            $scope.data.adminLoading = true;
            var body = { player_id: f.player_id, modules: f.modules, days: f.days || 30 };
            wsAdmin(Object.assign({ type: "ADMIN_ACTION", action: "add" }, body), function(err, r, useHttp) {
                if (useHttp) {
                    $.ajax({ url: ADMIN_API + "/admin/api/add", method: "POST", headers: adminHeaders(), data: JSON.stringify(body),
                        success: function() { $scope.data.adminMsg = "âœ… Joueur " + f.player_id + " mis Ã  jour"; $scope.data.adminMsgOk = true; $scope.data.adminAddForm = { player_id: "", modules: [], days: 30 }; $scope.data.adminLoading = false; safeApply($scope); $scope.adminLoadPlayers(); },
                        error:   function() { $scope.data.adminMsg = "Erreur lors de l'ajout"; $scope.data.adminMsgOk = false; $scope.data.adminLoading = false; safeApply($scope); }
                    });
                    return;
                }
                if (err) { $scope.data.adminMsg = "Erreur lors de l'ajout"; $scope.data.adminMsgOk = false; $scope.data.adminLoading = false; safeApply($scope); return; }
                $scope.data.adminMsg = "âœ… Joueur " + f.player_id + " mis Ã  jour (" + f.modules.join(", ") + " â€” " + (f.days||30) + "j)";
                $scope.data.adminMsgOk = true; $scope.data.adminAddForm = { player_id: "", modules: [], days: 30 };
                $scope.data.adminLoading = false; safeApply($scope); $scope.adminLoadPlayers();
            });
        };

        $scope.adminRemoveMod = function(player_id, mod) {
            if (!confirm("Retirer le module \"" + mod + "\" de " + player_id + " ?")) return;
            var body = { player_id: player_id, module: mod };
            wsAdmin(Object.assign({ type: "ADMIN_ACTION", action: "remove" }, body), function(err, r, useHttp) {
                if (useHttp) { $.ajax({ url: ADMIN_API + "/admin/api/remove", method: "POST", headers: adminHeaders(), data: JSON.stringify(body), success: function() { $scope.adminLoadPlayers(); }, error: function() { alert("Erreur lors de la suppression"); } }); return; }
                if (err) { alert("Erreur lors de la suppression"); return; }
                $scope.adminLoadPlayers();
            });
        };

        $scope.adminRemovePlayer = function(player_id, name) {
            if (!confirm(t("Supprimer TOUS les modules de ") + player_id + (name ? " (" + name + ")" : "") + " ?")) return;
            var body = { player_id: player_id };
            wsAdmin(Object.assign({ type: "ADMIN_ACTION", action: "remove" }, body), function(err, r, useHttp) {
                if (useHttp) { $.ajax({ url: ADMIN_API + "/admin/api/remove", method: "POST", headers: adminHeaders(), data: JSON.stringify(body), success: function() { $scope.adminLoadPlayers(); }, error: function() { alert("Erreur lors de la suppression"); } }); return; }
                if (err) { alert("Erreur lors de la suppression"); return; }
                $scope.adminLoadPlayers();
            });
        };

        $scope.adminExtend = function(player_id, name, days) {
            if (!confirm("Prolonger " + player_id + (name ? " (" + name + ")" : "") + " de " + days + " jours ?")) return;
            var body = { player_id: player_id, days: days };
            wsAdmin(Object.assign({ type: "ADMIN_ACTION", action: "extend" }, body), function(err, r, useHttp) {
                if (useHttp) {
                    $.ajax({ url: ADMIN_API + "/admin/api/extend", method: "POST", headers: adminHeaders(), data: JSON.stringify(body),
                        success: function() { $scope.data.adminMsg = "âœ… " + (name||player_id) + " prolongÃ© de " + days + "j"; $scope.data.adminMsgOk = true; safeApply($scope); $scope.adminLoadPlayers(); },
                        error: function() { alert("Erreur lors de la prolongation"); }
                    });
                    return;
                }
                if (err) { alert("Erreur lors de la prolongation"); return; }
                $scope.data.adminMsg = "âœ… " + (name||player_id) + " prolongÃ© de " + days + "j";
                $scope.data.adminMsgOk = true; safeApply($scope); $scope.adminLoadPlayers();
            });
        };

        $scope.adminToggleMod = function(modId) {
            var mods = $scope.data.adminAddForm.modules;
            var idx = mods.indexOf(modId);
            if (idx === -1) mods.push(modId);
            else mods.splice(idx, 1);
        };

        $scope.adminModSelected = function(modId) {
            return $scope.data.adminAddForm.modules.indexOf(modId) !== -1;
        };

        $scope.adminFmtDate = function(iso) {
            if (!iso) return "â€”";
            try {
                var d = new Date(iso);
                return ("0"+d.getDate()).slice(-2) + "/" + ("0"+(d.getMonth()+1)).slice(-2) + "/" + d.getFullYear();
            } catch(e) { return iso; }
        };

        $scope.adminDaysLeft = function(iso) {
            if (!iso) return null;
            var diff = Math.ceil((new Date(iso) - new Date()) / 86400000);
            return diff;
        };

        // Retourne le count total pour une langue (totalLangCounts en prioritÃ©, sinon connectedLangCounts)
        $scope.adminLangCount = function(lang) {
            if (!$scope.data.adminStats) return 0;
            var t = $scope.data.adminStats.totalLangCounts;
            var c = $scope.data.adminStats.connectedLangCounts;
            var vt = (t && t[lang]) ? t[lang] : 0;
            var vc = (c && c[lang]) ? c[lang] : 0;
            return vt || vc;
        };

        // Cache du rÃ©sultat pour Ã©viter le recalcul Ã  chaque digest (infdig)
        $scope.data.adminFilteredList = [];

        function rebuildAdminFilteredList() {
            if (!$scope.data.adminPlayers) { $scope.data.adminFilteredList = []; return; }
            var q = ($scope.data.adminSearchQ || "").toLowerCase();
            var raw = q
                ? $scope.data.adminPlayers.filter(function(p) {
                    return (p.name||"").toLowerCase().indexOf(q) !== -1 || String(p.id).indexOf(q) !== -1;
                })
                : $scope.data.adminPlayers.slice();

            var byId = {};
            raw.forEach(function(p) {
                var key = String(p.id || "?");
                if (!byId[key]) {
                    byId[key] = {
                        id:        p.id,
                        name:      p.name || "?",
                        isAdmin:   !!p.isAdmin,
                        hasActive: false,
                        accounts:  []
                    };
                }
                if (p.name) byId[key].name = p.name;
                byId[key].accounts.push({ id: p.id, modules: p.modules || [], tutorial_done: p.tutorial_done });
                if (p.isAdmin)   byId[key].isAdmin   = true;
                if (p.hasActive) byId[key].hasActive = true;
            });

            var list = Object.values(byId);
            list.sort(function(a, b) {
                if (a.isAdmin && !b.isAdmin) return -1;
                if (!a.isAdmin && b.isAdmin) return 1;
                if (a.hasActive && !b.hasActive) return -1;
                if (!a.hasActive && b.hasActive) return 1;
                return (a.name || "").localeCompare(b.name || "");
            });
            $scope.data.adminFilteredList = list;
        }

        $scope.$watch("data.adminPlayers", rebuildAdminFilteredList);
        $scope.$watch("data.adminSearchQ", rebuildAdminFilteredList);

        // Charger les stats au premier affichage de l'onglet admin
        $scope.$watch("data.activeTab", function(tab) {
            if (tab === "admin" && $scope.data.isAdmin && !$scope.data.adminStats) {
                $scope.adminLoadStats();
            }
            // RafraÃ®chir trialUsed Ã  l'ouverture du shop pour Ã©viter la race condition
            if (tab === "shop") {
                $scope.data.trialUsed = !!(bot.premiumData && bot.premiumData.trial);
            }
        });

        // â”€â”€ i18n : sÃ©lection de langue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        $scope.toggleLangPicker = function(e) {
            if (e) { e.stopPropagation(); e.preventDefault(); }
            $scope.data.langPickerOpen = !$scope.data.langPickerOpen;
        };

        $scope.selectLang = function(lang) {
            $scope.data.langPickerOpen = false;
            $scope.data.langCode       = _langCodes[lang] || "gb";
            $scope.data.langCodeUpper  = lang.toUpperCase();
            $scope.data._lang          = lang;
            $scope.data.localLangNames = _getLocalLangNames(lang);
            if (ctx.setLang) ctx.setLang(lang);
            // Reconstruire les tableaux de navigation et modules avec les nouvelles traductions
            buildSortedNav();
            $scope.sortedModules = buildSortedModules();
            // Reconstruire les modules du shop
            SHOP_MODULES_EUR = getShopModulesEur();
            SHOP_MODULES = _buildShopModules(EUR_TO_USD);
            $scope.data.shopModules = SHOP_MODULES.map(function(m) {
                return Object.assign({}, m, {
                    active: !!(bot.premiumModules && bot.premiumModules[m.id] === true)
                });
            });
        };

        // Fermer le picker si clic en dehors du panel
        $(document).on('click.langpicker', function(e) {
            if ($scope.data.langPickerOpen) {
                var wrapper = document.querySelector('.gp-lang-wrapper');
                if (wrapper && !wrapper.contains(e.target)) {
                    safeApply($scope, function() { $scope.data.langPickerOpen = false; });
                }
            }
        });
        // Nettoyer au destroy du scope
        $scope.$on('$destroy', function() { $(document).off('click.langpicker'); });

        $scope.save = function() {
            // Sauvegarde automatique temps rÃ©el â€” ce bouton n'est plus utilisÃ©.
        };
        $scope.play = function(melody) {
        };
        $scope.bugUrl = function(bug) {
            return ctx.format("#", ctx.session.key, bug.id);
        };
        $scope.bugReport = function() {
            var params = {
                version: bot.version,
                description: $scope.data.bugReport.description,
                settings: bot.sett,
                customs: (bot.custom ? bot.custom.items : {}),
                log: ctx.logger.buffer().join("\n")
            };
            bot.request("bug:report", params, function(data) {
                ctx.log("info", "Ticket #{0} created", data.result.id).msg(10);
                safeApply($scope, function() {
                    $scope.data.bugReport.bugs.push({
                        id: data.result.id,
                        isClosed: false
                    });
                    $scope.data.bugReport.description = "";
                });
            });
        };
    });
    bot.ngApp.controller("ForemanSettingsController", ["$scope", function(s) {
        s.t = function(str) { return ctx.t ? ctx.t(str) : str; };
        s._lang = ctx.detectLang ? ctx.detectLang() : 'fr';

        s.item = {
            fixed: false,
            repeat: false,
            item: null
        };
        Object.defineProperty(s, 'queue', { get: function() { return bot.queue ? bot.queue.items : []; }, enumerable: true, configurable: true });
        s.buildings = [];
        s.buildingsMap = {};
        angular.forEach(GameData.buildings, function(b, id) {
            if (!b.special && id != "place") {
                var e = { id: id, name: b.name, desc: b.description || "" };
                s.buildings.push(e);
                s.buildingsMap[id] = e;
            }
        });
        s.filterQueue = function() {
            return function(q) {
                return q.module === "foreman" && q.town == Game.townId && !q.isDeleted;
            };
        };
        s.buildingName = function(id) {
            return GameData.buildings[id] ? GameData.buildings[id].name : id;
        };
        s.add = function() {
            if (!s.item.item) return;
            var e = {
                item: s.item.item,
                town: Game.townId,
                type: "main",
                fixed: !!s.item.fixed,
                repeat: !!s.item.repeat,
                gold: 0
            };
            bot.request("foreman:add", e, function(b) {
                safeApply(s, function() {
                    bot.queue.items.push(b.result);
                    if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                });
            });
        };
        s.remove = function(q) {
            hideTooltips();
            if (bot.queue) {
                bot.queue.deleteOrder(q);
                s.$evalAsync(function() {
                    var idx = bot.queue.items.indexOf(q);
                    if (idx !== -1) bot.queue.items.splice(idx, 1);
                    if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                });
            }
        };
    }]);

    bot.ngApp.controller("RecruiterSettingsController", ["$scope", function(s) {
        s.t = function(str) { return ctx.t ? ctx.t(str) : str; };
        s._lang = ctx.detectLang ? ctx.detectLang() : 'fr';

        s.item = {
            type: "barracks",
            item: null,
            count: 1,
            repeat: false,
            fixed: false,
            usePower: false
        };
        Object.defineProperty(s, 'queue', { get: function() { return bot.queue ? bot.queue.items : []; }, enumerable: true, configurable: true });

        // Pre-build unit lists once to avoid ng-repeat infinite digest
        function buildUnitList(type) {
            var units = [];
            var town = ITowns.getTown(Game.townId);
            var god = (town && town.god) ? town.god() : null;
            angular.forEach(GameData.units, function(u, id) {
                if (type === "docks") {
                    if (u.is_naval && (!u.god_id || u.god_id === god || u.god_id === "all")) {
                        units.push({ item: id, name: u.name, desc: u.description || "" });
                    }
                } else {
                    if (!u.is_naval && id !== 'militia' && (!u.god_id || u.god_id === god || u.god_id === "all")) {
                        units.push({ item: id, name: u.name, desc: u.description || "" });
                    }
                }
            });
            return units;
        }
        s.unitsBarracks = buildUnitList("barracks");
        s.unitsDocks    = buildUnitList("docks");
        // Map idâ†’entry pour la file d'attente
        s.unitsMap = {};
        s.unitsBarracks.forEach(function(u) { s.unitsMap[u.item] = u; });
        s.unitsDocks.forEach(function(u)    { s.unitsMap[u.item] = u; });

        function rebuildUnitLists() {
            s.unitsBarracks = buildUnitList("barracks");
            s.unitsDocks    = buildUnitList("docks");
            s.unitsMap = {};
            s.unitsBarracks.forEach(function(u) { s.unitsMap[u.item] = u; });
            s.unitsDocks.forEach(function(u)    { s.unitsMap[u.item] = u; });
        }

        // Reconstruire si le dieu ou la ville change
        s.$watch(function() {
            var town = ITowns.getTown(Game.townId);
            return (town && town.god ? town.god() : null) + ':' + Game.townId;
        }, function() {
            rebuildUnitLists();
        });

        s.currentUnits = function() {
            return s.item.type === "docks" ? s.unitsDocks : s.unitsBarracks;
        };

        s.filterQueue = function() {
            return function(q) {
                return q.module === "recruiter" && q.town == Game.townId && !q.isDeleted;
            };
        };

        s.add = function() {
            if (!s.item.item || !(s.item.count > 0)) return;
            var e = {
                item: s.item.item,
                count: parseInt(s.item.count, 10),
                town: Game.townId,
                type: s.item.type,
                usePower: s.item.usePower,
                repeat: s.item.repeat,
                fixed: !!s.item.fixed,
                gold: 0
            };
            bot.request("recruiter:add", e, function(b) {
                safeApply(s, function() {
                    bot.queue.items.push(b.result);
                    if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                });
            });
        };

        s.remove = function(q) {
            hideTooltips();
            if (bot.queue) {
                bot.queue.deleteOrder(q);
                s.$evalAsync(function() {
                    var idx = bot.queue.items.indexOf(q);
                    if (idx !== -1) bot.queue.items.splice(idx, 1);
                    if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                });
            }
        };
    }]);


    bot.ngApp.controller("DocentSettingsController", ["$scope", function(s) {
        s.t = function(str) { return ctx.t ? ctx.t(str) : str; };
        s._lang = ctx.detectLang ? ctx.detectLang() : 'fr';

        s.item = { item: null, fixed: false };
        Object.defineProperty(s, 'queue', { get: function() { return bot.queue ? bot.queue.items : []; }, enumerable: true, configurable: true });
        s.researches = [];
        s.researchesMap = {};
        angular.forEach(GameData.researches, function(r, id) {
            var e = { id: id, name: r.name, desc: r.description || "" };
            s.researches.push(e);
            s.researchesMap[id] = e;
        });
        s.filterQueue = function() {
            return function(q) {
                return q.module === "docent" && q.town == Game.townId && !q.isDeleted;
            };
        };
        s.add = function() {
            if (!s.item.item) return;
            var e = {
                item: s.item.item,
                module: "docent",
                town: Game.townId,
                fixed: !!s.item.fixed,
                gold: 0
            };
            bot.request("docent:add", e, function(b) {
                safeApply(s, function() { bot.queue.items.push(b.result); if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS(); });
            });
        };
        s.remove = function(q) {
            hideTooltips();
            if (bot.queue) {
                bot.queue.deleteOrder(q);
                s.$evalAsync(function() {
                    var idx = bot.queue.items.indexOf(q);
                    if (idx !== -1) bot.queue.items.splice(idx, 1);
                    if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                });
            }
        };
        s.researchName = function(id) {
            return GameData.researches[id] ? GameData.researches[id].name : id;
        };
    }]);

    bot.ngApp.controller("SorciereSettingsController", ["$scope", function(s) {
        s.t = function(str) { return ctx.t ? ctx.t(str) : str; };
        s._lang = ctx.detectLang ? ctx.detectLang() : 'fr';

        s.powers = [];
        s.powersMap = {};
        angular.forEach(GameData.powers, function(p, id) {
            // Garder uniquement les sorts lancables sur une ville (god_id + favor + target_town)
            if (!p.god_id || !p.favor || p.favor <= 0) return;
            if (!p.targets || p.targets.indexOf('target_town') === -1) return;
            var e = { id: id, name: p.name, desc: p.description || '', favor: p.favor || 0, god_id: p.god_id || '' };
            s.powers.push(e);
            s.powersMap[id] = e;
        });

        Object.defineProperty(s, 'queue', { get: function() { return bot.queue ? bot.queue.items : []; }, enumerable: true, configurable: true });
        s.item = { item: null, fixed: false, repeat: false };
        s.townSearch = '';
        s.townResults = [];
        s.selectedTown = null;
        s._searchTimer = null;

        s.searchTown = function() {
            var q = s.townSearch.trim();
            // Si le texte correspond exactement Ã  la ville sÃ©lectionnÃ©e, ne pas re-chercher
            if (s.selectedTown && q === s.selectedTown.name) return;
            // DÃ©sÃ©lectionner si on modifie le texte aprÃ¨s sÃ©lection
            if (s.selectedTown && q !== s.selectedTown.name) s.selectedTown = null;
            if (q.length < 1) { s.townResults = []; return; }
            clearTimeout(s._searchTimer);
            s._searchTimer = setTimeout(function() {
                var ts = Date.now();
                var url = '/autocomplete?q=' + encodeURIComponent(q) + '&limit=20&timestamp=' + ts + '&what=game_town&_=' + ts;
                $.get(url, function(data) {
                    safeApply(s, function() {
                        // L'API Grepolis retourne du texte brut : "id|nom|joueur\nid|nom|joueur\n..."
                        var results = [];
                        if (typeof data === 'string') {
                            data.split('\n').forEach(function(line) {
                                line = line.trim();
                                if (!line) return;
                                var parts = line.split('|');
                                if (parts.length >= 2) {
                                    results.push({ id: parts[0], name: parts[1], player: parts[2] || '' });
                                }
                            });
                        } else {
                            // Fallback JSON
                            var arr = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
                            arr.forEach(function(r) {
                                if (typeof r === 'string') { results.push({ id: r, name: r }); return; }
                                var id   = (r.value !== undefined) ? r.value : (r.id || '');
                                var name = (r.label !== undefined) ? r.label : (r.name || String(id));
                                results.push({ id: id, name: name });
                            });
                        }
                        s.townResults = results;
                    });
                }).fail(function() { safeApply(s, function() { s.townResults = []; }); });
            }, 150);
        };

        s.selectTown = function(t) {
            s.selectedTown = t;
            s.townSearch = t.name;
            s.townResults = [];
        };

        s.onInputBlur = function() {
            // DÃ©lai pour laisser le ng-mousedown des items se dÃ©clencher avant de fermer
            setTimeout(function() {
                safeApply(s, function() {
                    s.townResults = [];
                    // Si aucune ville sÃ©lectionnÃ©e, vider le champ
                    if (!s.selectedTown) s.townSearch = '';
                });
            }, 200);
        };

        s.clearTown = function() { s.selectedTown = null; s.townSearch = ''; s.townResults = []; };

        s.filterQueue = function() {
            return function(q) { return q.module === 'sorciere' && q.town == Game.townId && !q.isDeleted; };
        };

        s.add = function() {
            if (!s.item.item || !s.selectedTown) return;
            var e = {
                item: s.item.item,
                module: 'sorciere',
                town: Game.townId,
                targetTownId: s.selectedTown.id,
                targetTownName: s.selectedTown.name,
                fixed: !!s.item.fixed,
                repeat: !!s.item.repeat,
                gold: 0
            };
            bot.request('sorciere:add', e, function(b) {
                safeApply(s, function() { bot.queue.items.push(b.result); if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS(); });
            });
        };

        s.remove = function(q) {
            hideTooltips();
            if (bot.queue) {
                bot.queue.deleteOrder(q);
                s.$evalAsync(function() {
                    var idx = bot.queue.items.indexOf(q);
                    if (idx !== -1) bot.queue.items.splice(idx, 1);
                    if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                });
            }
        };

        s.powerName = function(id) { return GameData.powers[id] ? GameData.powers[id].name : id; };
        s.powerFavor = function(id) { return GameData.powers[id] ? (GameData.powers[id].favor || 0) : 0; };
        s.hasEnoughFavor = function(id) {
            var p = GameData.powers[id];
            if (!p) return false;
            var _gods = bot.models && bot.models.PlayerGods && bot.models.PlayerGods[Game.player_id];
            var _favor = _gods ? _gods.getCurrentFavorForGods() : {};
            return (_favor[p.god_id] || 0) >= (p.favor || 0);
        };

        // Recap des dieux avec leur faveur actuelle (dieux prÃ©sents dans les sorts filtrÃ©s)
        (function() {
            var _gods = bot.models && bot.models.PlayerGods && bot.models.PlayerGods[Game.player_id];
            var _favor = _gods ? _gods.getCurrentFavorForGods() : {};
            var seen = {}, result = [];
            s.powers.forEach(function(p) {
                if (p.god_id && !seen[p.god_id]) {
                    seen[p.god_id] = true;
                    var _gdata = GameData.gods && GameData.gods[p.god_id];
                    var _gname = _gdata ? _gdata.name : p.god_id;
                    var _f = Math.floor(_favor[p.god_id] || 0);
                    // Tooltip identique au commander : nom + topic du dieu
                    var _tt = ('<strong>' + _gname + '</strong>' + (_gdata && _gdata.topic ? '<br><span style=&quot;color:#a09070;font-size:10px;&quot;>' + _gdata.topic + '</span>' : '')).replace(/"/g, '&quot;');
                    result.push({ id: p.god_id, name: _gname, favor: _f, tooltip: _tt });
                }
            });
            s.godsRecap = result;
        })();

        // Enrichir les sorts avec tooltip HTML (nom + description + faveur) identique au commander
        s.powers.forEach(function(p) {
            var _desc = GameData.powers[p.id] ? (GameData.powers[p.id].description || '') : '';
            p.tooltip = ('<strong>' + p.name + '</strong>' + (_desc ? '<br><span style=&quot;color:#a09070;font-size:10px;&quot;>' + _desc + '</span>' : '') + '<br><span style=&quot;color:#c9a84c;font-size:10px;&quot;>Faveur : ' + p.favor + '</span>').replace(/"/g, '&quot;');
        });
    }]);

    bot.ngApp.controller("TraderQueueSettingsController", ["$scope", function(s) {
        s.t = function(str) { return ctx.t ? ctx.t(str) : str; };
        s._lang = ctx.detectLang ? ctx.detectLang() : 'fr';

        // Build list of all own towns â€” tableau stable mis Ã  jour en place pour Ã©viter l'infdig Angular
        function _buildOwnTowns() {
            var allTowns = ITowns.getTowns();
            var fresh = Object.keys(allTowns).map(function(id) {
                var t = allTowns[id];
                return { id: parseInt(id, 10), name: t.name || ("CitÃ© " + id) };
            });
            // Mise Ã  jour en place : on ne remplace jamais le tableau, on modifie son contenu
            s.ownTowns.length = 0;
            for (var i = 0; i < fresh.length; i++) s.ownTowns.push(fresh[i]);
        }
        s.ownTowns = [];
        _buildOwnTowns();

        // Mettre Ã  jour ownTowns quand un nom de ville change (selects du trader)
        var _traderNameHandler = function() {
            setTimeout(function() {
                try { safeApply(s, function() { _buildOwnTowns(); }); } catch(e) {}
            }, 150);
        };
        try {
            var _traderTowns = MM.getModels().Town;
            Object.keys(_traderTowns).forEach(function(id) {
                _traderTowns[id].off('change:name', _traderNameHandler).on('change:name', _traderNameHandler);
            });
            try {
                MM.getCollections().Town.on('add', function(model) {
                    model.off('change:name', _traderNameHandler).on('change:name', _traderNameHandler);
                });
            } catch(e) {}
        } catch(e) {}

        s.$on("$destroy", function() {
            try {
                var _t2 = MM.getModels().Town;
                Object.keys(_t2).forEach(function(id) {
                    _t2[id].off('change:name', _traderNameHandler);
                });
            } catch(e) {}
        });
        s.newOrder = { from: Game.townId, to: "", wood: 0, stone: 0, iron: 0, fixed: false, repeat: false };
        Object.defineProperty(s, 'queue', { get: function() { return bot.queue ? bot.queue.items : []; }, enumerable: true, configurable: true });
        s.filterQueue = function() {
            return function(q) {
                return q.module === "trader" && !q.isDeleted;
            };
        };
        s.destTowns = function() {
            return s.ownTowns.filter(function(t) { return t.id != parseInt(s.newOrder.from, 10); });
        };
        s.add = function() {
            var fromId = parseInt(s.newOrder.from, 10);
            var toId   = parseInt(s.newOrder.to,   10);
            if (!(toId > 0) || !(fromId > 0) || fromId === toId) return;
            var wood  = isNaN(s.newOrder.wood)  ? 0 : parseInt(s.newOrder.wood,  10);
            var stone = isNaN(s.newOrder.stone) ? 0 : parseInt(s.newOrder.stone, 10);
            var iron  = isNaN(s.newOrder.iron)  ? 0 : parseInt(s.newOrder.iron,  10);
            var total = wood + stone + iron;
            if (total < 100) {
                s.errorMsg = s.t("Le total des ressources doit Ãªtre au moins 100.");
                return;
            }
            s.errorMsg = null;
            var e = {
                module: "trader", item: "trade",
                town: fromId, to: toId,
                wood: wood, stone: stone, iron: iron,
                isLocal: true, isPlayer: true, fixed: !!s.newOrder.fixed, repeat: !!s.newOrder.repeat
            };
            e.id = e.module + "_" + e.town + "_" + e.to + "_" + Date.now();
            safeApply(s, function() {
                bot.queue.items.push(e);
                if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
            });
            s.newOrder.to = ""; s.newOrder.wood = 0; s.newOrder.stone = 0; s.newOrder.iron = 0;
        };
        s.remove = function(q) { hideTooltips(); if (bot.queue) {
                bot.queue.deleteOrder(q);
                s.$evalAsync(function() {
                    var idx = bot.queue.items.indexOf(q);
                    if (idx !== -1) bot.queue.items.splice(idx, 1);
                    if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                });
            } };
        s.townName = function(id) {
            var t = s.ownTowns.filter(function(x){ return x.id == id; })[0];
            return t ? t.name : id;
        };
    }]);
    bot.ngApp.filter("friendDate", function() {
        var _t = ctx.t || function(s) { return s; };
        return function(isoStr) {
            if (!isoStr) return _t("inconnue");
            try {
                var d = new Date(isoStr);
                var now = new Date();
                var diffMs = now - d;
                var diffMin = Math.floor(diffMs / 60000);
                var diffH = Math.floor(diffMin / 60);
                var diffD = Math.floor(diffH / 24);
                if (diffMin < 2)  return _t("Ã  l'instant");
                if (diffMin < 60) return _t("il y a {0} min").replace("{0}", diffMin);
                if (diffH < 24)   return _t("il y a {0}h").replace("{0}", diffH);
                if (diffD < 2)    return _t("hier");
                if (diffD < 7)    return _t("il y a {0} jours").replace("{0}", diffD);
                // Format date courte
                var dd = String(d.getDate()).padStart(2,"0");
                var mm = String(d.getMonth()+1).padStart(2,"0");
                var yy = d.getFullYear();
                var hh = String(d.getHours()).padStart(2,"0");
                var mn = String(d.getMinutes()).padStart(2,"0");
                return _t("le {0} Ã  {1}").replace("{0}", dd + "/" + mm + "/" + yy).replace("{1}", hh + "h" + mn);
            } catch(e) { return isoStr; }
        };
    });

    bot.ngApp.controller("FriendsController", ["$scope", function(s) {
        var t = ctx.t || function(s) { return s; }; // Fix: bare t() dans accept()
        s.t = function(str) { return ctx.t ? ctx.t(str) : str; };
        s._lang = ctx.detectLang ? ctx.detectLang() : 'fr';

        s.friends   = [];
        s.pending   = []; // demandes reÃ§ues en attente
        s.sent      = []; // demandes envoyÃ©es en attente
        s.search    = "";
        s.searching = false;
        s.premiumModDefs = [
            {id:'farm',     label:t('Collecteur'),   icon:'ðŸŒ¾'},
            {id:'trader',   label:t('Marchand'),     icon:'<img src="https://grepoplus.duckdns.org/bot/img/trader_icon.png" style="width:1em;height:1em;vertical-align:text-bottom;margin-right:4px;">'},
            {id:'foreman',  label:t('Constructeur'), icon:'ðŸ”¨'},
            {id:'recruiter',label:t('Recruteur'),    icon:'ðŸ¹'},
            {id:'wonder',   label:t('Merveille'),    icon:'ðŸ›ï¸'},
            {id:'tresorier',label:t('TrÃ©sorier'),    icon:'ðŸ’°'}
        ];
        s.closeWindow = function() {
            if (bot._friendsWindowEl) {
                bot.windows.close("friends");
                bot._friendsWindowEl = null;
            }
        };
        s.msg       = null;
        s.msgType   = "ok";

        function showMsg(text, type) {
            s.msg     = text;
            s.msgType = type || "ok";
            setTimeout(function() { try { safeApply(s, function() { s.msg = null; }); } catch(e) {} }, 4000);
        }

		function refresh() {
			if (!bot.friends) return;
			bot.friends.load(function(list) {
				s.$evalAsync(function() {
					s.friends = list.filter(function(f) { return f.status === "accepted"; });
					s.pending = list.filter(function(f) { return f.status === "pending_received"; });
					s.sent    = list.filter(function(f) { return f.status === "pending_sent"; });
				});
			});
			// Forcer un poll immÃ©diat pour avoir les modules et lastSeen Ã  jour
			if (typeof bot.friends._poll === "function") bot.friends._poll();
		}

        function refreshFromCache() {
            if (!bot.friends || !bot.friends._list) return;
            s.$evalAsync(function() {
                s.friends = bot.friends._list.filter(function(f) { return f.status === "accepted"; });
                s.pending = bot.friends._list.filter(function(f) { return f.status === "pending_received"; });
                s.sent    = bot.friends._list.filter(function(f) { return f.status === "pending_sent"; });
            });
        }

        s.sendRequest = function() {
            var name = (s.search || "").trim();
            if (!name) return;
            s.searching = true;
            bot.friends.request(name, function(err, r) {
                s.$evalAsync(function() {
                    s.searching = false;
                    if (err || (r && r.status === "error")) showMsg("âŒ " + ((err && err.error) || (r && r.error) || "Erreur"), "error");
                    else     { showMsg(t("âœ… Demande envoyÃ©e Ã ") + " " + name, "ok"); s.search = ""; refresh(); }
                });
            });
        };

        s.accept = function(f) {
            bot.friends.accept(f.key, function(err) {
                if (!err) {
                    showMsg("âœ… " + f.name + " " + t("ajoutÃ© !"));
                    refreshFromCache(); // affichage immÃ©diat depuis le cache mis Ã  jour
                    refresh();         // sync serveur en arriÃ¨re-plan
                    // Poll immÃ©diat pour charger les modules/conseillers du nouvel ami
                    setTimeout(function() {
                        if (bot.friends && typeof bot.friends._poll === "function") bot.friends._poll();
                    }, 500);
                }
                else showMsg("âŒ " + (err.error || "Erreur"), "error");
            });
        };

        s.reject = function(f) {
            bot.friends.reject(f.key, function(err) {
                if (!err) {
                    refreshFromCache();
                    refresh();
                }
            });
        };

        s.remove = function(f) {
            if (!f._confirmDelete) {
                f._confirmDelete = true;
                // Reset auto aprÃ¨s 3 secondes si pas confirmÃ©
                setTimeout(function() {
                    s.$evalAsync(function() { f._confirmDelete = false; });
                }, 3000);
                return;
            }
            bot.friends.reject(f.key, function(err) {
                if (!err) {
                    showMsg(t("âœ… Ami supprimÃ©"));
                    refreshFromCache(); // affichage immÃ©diat depuis le cache mis Ã  jour
                    refresh();         // sync serveur en arriÃ¨re-plan
                }
            });
        };

        s.openProfile = function(f) {
            var pId   = parseInt(f.id) || null;
            var pName = f.name || "";
            if (!pId && !pName) return;
            try {
                var existingWnd = GPWindowMgr.getAllOpen && GPWindowMgr.getAllOpen().find(function(w) { return w.getType() == 18; });
                if (pId) {
                    if (existingWnd) {
                        existingWnd.reloadContent({ player_id: pId });
                    } else {
                        var fragment = btoa(JSON.stringify({ name: pName, id: pId }));
                        var $tmp = $("<a class='gp_player_link' href='#" + fragment + "'></a>").appendTo("body");
                        $tmp[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
                        setTimeout(function() { $tmp.remove(); }, 100);
                    }
                } else if (existingWnd) {
                    existingWnd.reloadContent({ player_name: pName });
                }
            } catch(ex) { }
        };

        s.togglePref = function(f, type) {
            var sa = (type === "attacks") ? !f.share_attacks : !!f.share_attacks;
            var so = (type === "orders")  ? !f.share_orders  : !!f.share_orders;
            var st = (type === "troops")  ? !f.share_troops  : !!f.share_troops;
            var key = f.key || (f.id + ":" + (f.world || ""));
            bot.friends.setPrefs(key, sa, so, st, function(err) {
                if (err) { showMsg("âŒ " + (err.error || "Erreur"), "error"); return; }
                s.$evalAsync(function() {
                    if (type === "attacks") f.share_attacks = sa;
                    if (type === "orders")  f.share_orders  = so;
                    if (type === "troops")  {
                        f.share_troops = st;
                        // Push immÃ©diat des troupes quand on active le partage
                        if (st && bot.troops && typeof bot.troops.push === "function") {
                            bot.troops.push();
                        }
                    }
                });
            });
        };

        // Notification temps rÃ©el via WebSocket premium
        var _origWs = bot._premiumWsOnMessage;
        bot._premiumWsOnMessage = function(msg) {
            if (_origWs) _origWs(msg);
            try {
                var d = JSON.parse(msg);
                if (d.type === "FRIEND_REQUEST" || d.type === "FRIEND_ACCEPTED" || d.type === "FRIEND_REMOVED") {
                    refresh();
                }
            } catch(e) {}
        };

        refresh();
    }]);

    bot.ngApp.controller("WonderSettingsController", ["$scope", function(s) {
        s.t = function(str) { return ctx.t ? ctx.t(str) : str; };
        s._lang = ctx.detectLang ? ctx.detectLang() : 'fr';

        s.getCoords = function() {
            var x = bot.sett.wonder_x,
                y = bot.sett.wonder_y;
            if (x && y && (Number(x) + Number(y)) > 0) return s.t("Actuel : X:{0} Y:{1}").replace("{0}", x).replace("{1}", y);
            return s.t("Non sÃ©lectionnÃ©e");
        };
        s.openWonders = function() {
            s.wonderOpenError = false;
            var opened = false;
            try {
                var btn = $(".wonders_building_wrapper, .wonder_icon, [class*=wonder]").first();
                if (btn.length > 0) { btn.click(); opened = true; }
            } catch (e) {}
            if (!opened) try {
                GPWindowMgr.open(GPWindowMgr.TYPE_WONDERS);
                opened = true;
            } catch (e) {}
            if (!opened) try {
                var type = GPWindowMgr.TYPE_WONDERS || "wonders";
                var info = GPWindowMgr.getTypeInfo(type);
                if (info && info.open) info.open();
                else GPWindowMgr.open(type, Game.townId);
                opened = true;
            } catch (e) {}
            if (!opened) s.$evalAsync(function() { s.wonderOpenError = true; });
        };
    }]);
    angular.bootstrap(bot.settingsDlg, ["bot"]);
    box.append(bot.settingsDlg);
    // â”€â”€ Drag natif JS â€” compatible CSS zoom (jQuery UI ne gÃ¨re pas le zoom) â”€â”€
    (function() {
        var el    = bot.settingsDlg[0];
        var CANCEL = '.scrollbox, .subscribe, input, textarea, select, button, a';
        var dragging = false, startMouseX, startMouseY, startElLeft, startElTop;

        function getZoom() {
            return parseFloat(window.getComputedStyle(el).zoom) || 1;
        }

        el.addEventListener('mousedown', function(e) {
            if ($(e.target).closest(CANCEL).length) return;
            if (e.button !== 0) return;
            dragging    = true;
            var z       = getZoom();
            startMouseX = e.clientX / z;
            startMouseY = e.clientY / z;
            startElLeft = parseInt(el.style.left, 10) || el.offsetLeft;
            startElTop  = parseInt(el.style.top,  10) || el.offsetTop;
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!dragging) return;
            var z = getZoom();
            el.style.left = (startElLeft + e.clientX / z - startMouseX) + 'px';
            el.style.top  = (startElTop  + e.clientY / z - startMouseY) + 'px';
        });

        document.addEventListener('mouseup', function() { dragging = false; });
    })();

    // â”€â”€ Fallback assets : si une image Grepolis est indisponible, bascule sur le VPS â”€â”€
    (function() {
        // URL de base du VPS pour les assets de fallback
        // Modifiez cette URL si votre VPS change d'adresse
        var VPS_ASSETS = 'https://grepoplus.duckdns.org/bot/assets';

        // URLs Grepolis connues â†’ chemin local VPS
        var ASSET_MAP = {
            // Ressources statiques
            '/images/game/res/wood.png':             VPS_ASSETS + '/res/wood.png',
            '/images/game/res/stone.png':            VPS_ASSETS + '/res/stone.png',
            '/images/game/res/iron.png':             VPS_ASSETS + '/res/iron.png',
            '/images/game/res/pop.png':              VPS_ASSETS + '/res/pop.png',
            '/images/game/res/research_points.png':  VPS_ASSETS + '/res/research_points.png',
            '/images/game/res/time.png':             VPS_ASSETS + '/res/time.png',
            '/images/game/res/favor.png':            VPS_ASSETS + '/res/favor.png',
            // Sprites autogÃ©nÃ©rÃ©s (avec hash â€” fallback sur version sans hash)
            'unit_info_30x30':   VPS_ASSETS + '/autogenerated/unit_info/unit_info_30x30.png',
            'units_info_sprite': VPS_ASSETS + '/autogenerated/unit_info/unit_info_30x30.png',
            'units_228x165':     VPS_ASSETS + '/autogenerated/units/units_228x165.png',
            'resources_size30':  VPS_ASSETS + '/autogenerated/resources/resources_size30.png',
            // Portraits conseillers
            'advisors/advisors_40x40': VPS_ASSETS + '/autogenerated/advisors/advisors_40x40.jpg',
            // IcÃ´ne or
            'feature_icons_14x14': VPS_ASSETS + '/premium_features/feature_icons_14x14.png',
            // Dieux
            'gods/gods_default_62x62':           VPS_ASSETS + '/autogenerated/gods/gods_default_62x62.png',
            'gods/christmas/gods_christmas':      VPS_ASSETS + '/autogenerated/gods/christmas/gods_christmas_default_62x62.png',
            'gods/halloween/gods_halloween':      VPS_ASSETS + '/autogenerated/gods/halloween/gods_halloween_default_62x62.png',
            // Sorts (powers)
            'powers/powers_16x16_part2':          VPS_ASSETS + '/autogenerated/powers/powers_16x16_part2.png',
            'powers/powers_16x16':                VPS_ASSETS + '/autogenerated/powers/powers_16x16.png',
            'powers/numbers_2':                   VPS_ASSETS + '/autogenerated/powers/numbers_2.82.png',
            // Layout dieux inactifs
            'layout/favor_gods_inactive_2':       VPS_ASSETS + '/layout/favor_gods_inactive_2.134_jp.png',
            'layout/favor_gods_inactive_elvenar': VPS_ASSETS + '/layout/favor_gods_inactive_elvenar.png'
        };

        // Intercepter les erreurs de chargement d'images Grepolis (<img> uniquement)
        document.addEventListener('error', function(e) {
            var el = e.target;
            if (el.tagName !== 'IMG') return;
            var src = el.src || '';
            if (!src.includes('innogamescdn')) return;

            // Chercher un fallback dans la map
            var fallback = null;
            for (var key in ASSET_MAP) {
                if (src.includes(key)) { fallback = ASSET_MAP[key]; break; }
            }
            if (!fallback) return;

            console.warn('[GrepoPlusBot] Asset indisponible, fallback VPS:', src.substring(0, 80));
            el.src = fallback;
        }, true); // capture phase pour attraper les erreurs avant qu'elles se propagent

        // â”€â”€ resolveSprite : teste l'URL CDN et retourne le fallback VPS si indisponible â”€â”€
        // UtilisÃ© pour les background-image (DIVs) qui ne dÃ©clenchent pas l'Ã©vÃ©nement error.
        // cdnUrl    : URL Grepolis Ã  tester en prioritÃ©
        // fallbackUrl : URL VPS Ã  utiliser si le CDN Ã©choue
        // callback  : function(url) appelÃ©e avec l'URL rÃ©solue (CDN ou VPS)
        window._grepoBotResolveSprite = function(cdnUrl, fallbackUrl, callback) {
            var img = new Image();
            img.onload  = function() { callback(cdnUrl); };
            img.onerror = function() {
                console.warn('[GrepoPlusBot] Sprite CDN indisponible, fallback VPS:', cdnUrl.substring(0, 80));
                callback(fallbackUrl);
            };
            img.src = cdnUrl;
        };
    })();

    // Tooltip flottant â€” reproduit exactement l'infobulle officielle Grepolis
    (function() {
        if (document.getElementById('gp-tooltip-tip')) return;
        var _t = (typeof ctx !== 'undefined' && ctx.t) ? ctx.t : function(s) { return s; };

        // â”€â”€ Sprite URLs Grepolis (rÃ©cupÃ©rÃ©es depuis les CSS du jeu) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // UNIT_INFO_SPRITE : CDN en prioritÃ©, VPS en fallback si le hash a changÃ©
        var UNIT_INFO_SPRITE = 'https://gpfr.innogamescdn.com/images/game/autogenerated/unit_info/unit_info_30x30_2921e48.png';
        var UNIT_PORTRAIT_SPRITE = null; // rÃ©cupÃ©rÃ© dynamiquement
        if (typeof window._grepoBotResolveSprite === 'function') {
            window._grepoBotResolveSprite(
                UNIT_INFO_SPRITE,
                'https://grepoplus.duckdns.org/bot/assets/autogenerated/unit_info/unit_info_30x30.png',
                function(url) { UNIT_INFO_SPRITE = url; }
            );
        }

        // Positions sprite unit_info30x30 (identiques aux CSS Grepolis)
        var INFO_POS = {
            att_hack:             '0px -30px',
            att_pierce:           '-30px -30px',
            att_distance:         '-30px 0px',
            def_hack:             '-30px -60px',
            def_pierce:           '-60px -60px',
            def_distance:         '0px -60px',
            speed:                '-60px -120px',
            booty:                '-60px 0px',
            colonization:         '-60px -30px',
            flying:               '-90px 0px',
            function_def:         '-90px -30px',
            function_off:         '-90px -60px',
            hero_icon:            '0px -90px',
            mythological_ground:  '-30px -90px',
            mythological_naval:   '-60px -90px',
            passive:              '-90px -90px',
            regular_ground:       '-120px 0px',
            regular_naval:        '-120px -30px',
            self_destruct:        '-120px -60px',
            ship_attack:          '-120px -90px',
            ship_capacity:        '0px -120px',
            ship_defense:         '-30px -120px',
            wall_destruct:        '-90px -120px',
            ship_attack:          '-120px -90px',
            ship_defense:         '-30px -120px'
        };

        // Positions sprite 228x165 unitÃ©s (rÃ©cupÃ©rÃ©es depuis les CSS du jeu)
        var UNIT_PORTRAIT_POS = {
            militia:           '-912px -495px',
            sword:             '-1140px 0px',
            slinger:           '-684px -825px',
            archer:            '0px 0px',
            hoplite:           '-228px -660px',
            rider:             '-456px -165px',
            chariot:           '-456px -330px',
            catapult:          '-456px 0px',
            minotaur:          '-912px -660px',
            manticore:         '-912px -165px',
            zyklop:            '-228px -495px',
            harpy:             '0px -660px',
            medusa:            '-912px -330px',
            centaur:           '0px -330px',
            pegasus:           '0px -825px',
            cerberus:          '-228px -330px',
            fury:              '-684px 0px',
            griffin:           '-684px -495px',
            calydonian_boar:   '-228px -165px',
            godsent:           '-684px -330px',
            big_transporter:   '-1140px -165px',
            bireme:            '-228px 0px',
            attack_ship:       '-456px -495px',
            demolition_ship:   '0px -165px',
            small_transporter: '-1140px -330px',
            trireme:           '-1140px -495px',
            colonize_ship:     '0px -495px',
            sea_monster:       '-456px -660px',
            satyr:             '-228px -825px',
            siren:             '-456px -825px',
            spartoi:           '-912px -825px',
            ladon:             '-684px -660px'
        };

        // RÃ©cupÃ¨re l'URL du sprite portrait depuis les CSS Grepolis au runtime
        function getPortraitSpriteUrl() {
            if (UNIT_PORTRAIT_SPRITE) return UNIT_PORTRAIT_SPRITE;
            try {
                var sheets = Array.from(document.styleSheets);
                for (var i = 0; i < sheets.length; i++) {
                    try {
                        var rules = Array.from(sheets[i].cssRules || []);
                        for (var j = 0; j < rules.length; j++) {
                            var r = rules[j];
                            if (r.selectorText === '.unit_icon228x165' && r.style && r.style.backgroundImage) {
                                var m = r.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
                                if (m) { UNIT_PORTRAIT_SPRITE = m[1]; return m[1]; }
                            }
                        }
                    } catch(e2) {}
                }
            } catch(e) {}
            // Fallback hardcodÃ© â€” rÃ©solu via VPS si le CDN est indisponible
            var _fallbackPortrait = 'https://gpfr.innogamescdn.com/images/game/autogenerated/units/228x165/units_228x165_1400b80.png';
            if (typeof window._grepoBotResolveSprite === 'function') {
                window._grepoBotResolveSprite(
                    _fallbackPortrait,
                    'https://grepoplus.duckdns.org/bot/assets/autogenerated/units/units_228x165.png',
                    function(url) { UNIT_PORTRAIT_SPRITE = url; }
                );
            }
            return _fallbackPortrait;
        }

        // â”€â”€ Infobulle container â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        var tip = document.createElement('div');
        tip.id = 'gp-tooltip-tip';
        tip.style.cssText = [
            'position:fixed',
            'z-index:1000001',
            'width:260px',
            'pointer-events:none',
            'display:none',
            'box-sizing:border-box',
            'font-family:Lato,Arial,sans-serif',
            'font-size:11px',
            'color:#d4c5a0',
            'border-radius:10px',
            'overflow:hidden',
            'background:linear-gradient(160deg,#0d1117 0%,#151c26 60%,#1a2332 100%)',
            'border:1px solid rgba(201,168,76,0.35)',
            'border-top:2px solid #c9a84c',
            'box-shadow:0 8px 40px rgba(0,0,0,0.85),0 0 0 1px rgba(201,168,76,0.07),inset 0 1px 0 rgba(201,168,76,0.08)',
            'padding:10px 16px'
        ].join(';') + ';';
        document.body.appendChild(tip);

        // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ï¿½ï¿½ï¿½â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function formatTime(seconds) {
            if (!seconds) return null;
            var h = Math.floor(seconds / 3600);
            var m = Math.floor((seconds % 3600) / 60);
            var s = seconds % 60;
            if (h > 0) return h + 'h ' + (m > 0 ? m + 'm' : '');
            if (m > 0) return m + 'm ' + (s > 0 ? s + 's' : '');
            return s + 's';
        }

        function getCurrentTown() {
            try { return ITowns.getTown(Game.townId); } catch(e) { return null; }
        }

        // IcÃ´ne stat via sprite unit_info30x30 officiel
        function statIcon(key) {
            var pos = INFO_POS[key];
            if (!pos) return '';
            return '<div style="' +
                'width:30px;height:30px;flex-shrink:0;' +
                'background-image:url(' + UNIT_INFO_SPRITE + ');' +
                'background-position:' + pos + ';' +
                'background-repeat:no-repeat;' +
                'display:inline-block;' +
            '"></div>';
        }

        // Ligne stat Ã  2 colonnes (comme le jeu : icone+valeur | icone+valeur)
        function statLi(key, val) {
            if (val === undefined || val === null || val === '' || val === 0) return '';
            var icon = statIcon(key);
            if (!icon) {
                // Fallback emoji pour speed, population, favor
                var emojis = { speed: 'ðŸ’¨', population: 'ðŸ‘¤', favor: 'âœ¨', build_time: 'â±' };
                icon = '<span style="width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">' + (emojis[key] || 'â€¢') + '</span>';
            }
            return '<li style="display:flex;align-items:center;gap:2px;padding:0;">' + icon + '<span style="font-weight:bold;color:#f0d080;font-size:12px;">' + val + '</span></li>';
        }

        // â”€â”€ Titre bande dorÃ©e (comme header Grepolis) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function headerHTML(name) {
            return '<div style="' +
                'background:linear-gradient(135deg,#1e2d42 0%,#162030 100%);' +
                'border-bottom:1px solid rgba(201,168,76,0.4);' +
                'padding:4px 8px;' +
                'font-weight:bold;font-size:12px;' +
                'color:#f0d080;text-shadow:0 1px 8px rgba(201,168,76,0.4);' +
                'text-align:center;' +
            '">' + name + '</div>';
        }

        // â”€â”€ Portrait unitÃ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function portraitHTML(id) {
            var pos = UNIT_PORTRAIT_POS[id];
            if (!pos) return '';
            var spriteUrl = getPortraitSpriteUrl();
            // sprite 228x165 affichÃ© en pleine taille dans une zone clippÃ©e
            return '<div style="' +
                'width:100%;height:120px;' +
                'overflow:hidden;position:relative;' +
                'background:linear-gradient(to bottom,#0a0f18,#0d1117);' +
            '">' +
                '<div style="' +
                    'position:absolute;top:50%;left:50%;' +
                    'transform:translate(-50%,-50%);' +
                    'width:228px;height:165px;' +
                    'background-image:url(' + spriteUrl + ');' +
                    'background-position:' + pos + ';' +
                    'background-repeat:no-repeat;' +
                '"></div>' +
                // Fondu bas pour transition douce
                '<div style="position:absolute;bottom:0;left:0;right:0;height:40px;background:linear-gradient(transparent,#0d1117);"></div>' +
            '</div>';
        }

        // â”€â”€ Ressources (bois/pierre/fer) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function resHTML(wood, stone, iron) {
            if (!wood && !stone && !iron) return '';
            var BASE = 'https://gpfr.innogamescdn.com/images/game/res/';
            function resItem(src, val, color) {
                if (!val) return '';
                return '<span style="display:inline-flex;align-items:center;gap:2px;margin-right:6px;">' +
                    '<img src="' + BASE + src + '" style="width:16px;height:16px;">' +
                    '<span style="color:' + color + ';font-weight:bold;font-size:11px;">' + val + '</span>' +
                '</span>';
            }
            return '<div style="' +
                'background:rgba(0,0,0,0.25);border-top:1px solid rgba(201,168,76,0.2);' +
                'padding:4px 6px;display:flex;align-items:center;' +
            '">' +
                resItem('wood.png',  wood,  '#8fba5a') +
                resItem('stone.png', stone, '#c8c8c8') +
                resItem('iron.png',  iron,  '#c8a84c') +
            '</div>';
        }

        // â”€â”€ Description â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function descHTML(text) {
            if (!text) return '';
            return '<div style="' +
                'background:rgba(13,17,23,0.6);' +
                'border-top:1px solid rgba(201,168,76,0.2);' +
                'padding:5px 7px;' +
                'font-size:10px;color:#a09070;line-height:1.5;' +
            '">' + text + '</div>';
        }

        // â”€â”€ grille stats 2 colonnes (exactement comme l'infobulle jeu) â”€â”€â”€â”€â”€â”€â”€
        function statsGridHTML(items) {
            // items = [{key, val}, ...]
            var html = '<ul style="' +
                'display:grid;grid-template-columns:1fr 1fr;' +
                'gap:0;margin:0;padding:4px 2px;list-style:none;' +
                'background:#0d1117;border-top:1px solid rgba(201,168,76,0.15);' +
            '">';
            items.forEach(function(it) { html += statLi(it.key, it.val); });
            html += '</ul>';
            return html;
        }

        // â”€â”€ Ligne simple (pour bÃ¢timents/recherches sans portrait) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        function simpleRow(label, val) {
            if (val === undefined || val === null || val === '' || val === 0) return '';
            return '<div style="display:flex;justify-content:space-between;padding:2px 6px;border-bottom:1px solid rgba(200,140,0,0.2);">' +
                '<span style="color:#a09070;">' + label + '</span>' +
                '<span style="color:#fff;font-weight:bold;">' + val + '</span>' +
            '</div>';
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // UNIT TOOLTIP â€” reproduit exactement l'infobulle caserne/port Grepolis
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        function unitTooltip(id) {
            try {
                var u = GameData.units[id];
                if (!u) return '';
                var r = u.resources || {};

                var html = '';
                // 1. Titre dorÃ©
                html += headerHTML(u.name);
                // 2. Portrait
                html += portraitHTML(id);
                // 3. Grille stats 2 colonnes (ordre identique au jeu)
                var stats = [];
                if (u.is_naval) {
                    // UnitÃ©s navales â€” combat ou transport selon les valeurs
                    if (u.attack)   stats.push({ key: 'ship_attack',   val: u.attack });
                    if (u.defense)  stats.push({ key: 'ship_defense',  val: u.defense });
                    if (u.speed)    stats.push({ key: 'speed',         val: u.speed });
                    if (u.capacity) stats.push({ key: 'ship_capacity', val: u.capacity });
                    if (u.booty)    stats.push({ key: 'booty',     val: u.booty });
                } else {
                    // UnitÃ©s terrestres : att / def_hack / speed / def_pierce / booty / def_distance
                    if (u.attack)       stats.push({ key: 'att_hack',     val: u.attack });
                    if (u.def_hack)     stats.push({ key: 'def_hack',     val: u.def_hack });
                    if (u.speed)        stats.push({ key: 'speed',        val: u.speed });
                    if (u.def_pierce)   stats.push({ key: 'def_pierce',   val: u.def_pierce });
                    if (u.booty)        stats.push({ key: 'booty',        val: u.booty });
                    if (u.def_distance) stats.push({ key: 'def_distance', val: u.def_distance });
                }
                if (stats.length)   html += statsGridHTML(stats);

                // 4. Population (ligne pleine comme le jeu "1 par unitÃ©")
                if (u.population) {
                    html += '<div style="background:#0d1117;padding:3px 6px;display:flex;align-items:center;gap:4px;border-top:1px solid rgba(201,168,76,0.2);">' +
                        '<img src="https://gpfr.innogamescdn.com/images/game/res/pop.png" style="width:20px;height:20px;">' +
                        '<span style="color:#fff;font-weight:bold;font-size:11px;">' + u.population + ' par unitÃ©</span>' +
                    '</div>';
                }

                // 5. Ressources
                html += resHTML(r.wood, r.stone, r.iron);

                // 6. Description fond clair
                html += descHTML(u.description);

                return html;
            } catch(e) { return id; }
        }



        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // BUILDING TOOLTIP
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        function buildingTooltip(id) {
            try {
                var b = GameData.buildings[id];
                if (!b) return '';
                var html = headerHTML(b.name);
                html += descHTML(b.description);
                return html;
            } catch(e) { return id; }
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // RESEARCH TOOLTIP
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        function researchTooltip(id) {
            try {
                var r = GameData.researches[id];
                if (!r) return '';
                var res2 = r.resources || {};
                var html = headerHTML(r.name);
                html += '<div style="padding:4px 6px;background:#0d1117;">';
                if (r.research_points) html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 6px;border-bottom:1px solid rgba(200,140,0,0.2);">' +
                    '<span style="color:#f5dfa0;display:flex;align-items:center;gap:4px;">' +
                    '<img src="https://gpfr.innogamescdn.com/images/game/res/research_points.png" style="width:16px;height:16px;">' +
                    'Points rech.</span>' +
                    '<span style="color:#fff;font-weight:bold;">' + r.research_points + '</span>' +
                '</div>';
                if (r.required_time)   html += simpleRow('â± DurÃ©e', formatTime(r.required_time));
                html += '</div>';
                html += resHTML(res2.wood, res2.stone, res2.iron);
                html += descHTML(r.description);
                return html;
            } catch(e) { return id; }
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // BONUS TOOLTIP â€” pour les icÃ´nes de bonus vitesse (recherches, bÃ¢timents, sorts)
        // UtilisÃ© dans le panel Info du Herald pour les bonus de vitesse ennemis
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        function bonusTooltip(id, type) {
            try {
                var src = null;
                // Lire le texte depuis GameData selon le type d'icÃ´ne
                if (type === 'research' && GameData.researches && GameData.researches[id]) {
                    src = GameData.researches[id];
                } else if (type === 'building' && GameData.buildings && GameData.buildings[id]) {
                    src = GameData.buildings[id];
                } else if (GameData.powers && GameData.powers[id]) {
                    src = GameData.powers[id];
                }
                if (!src) {
                    // Fallback: libellÃ©s hardcodÃ©s pour les bonus de vitesse courants
                    var BONUS_FALLBACK = {
                        unit_movement_boost: { name: _t('Vitesse des unitÃ©s'), desc: _t('Sort divin qui accÃ©lÃ¨re le dÃ©placement des unitÃ©s de 30%.') },
                        meteorology:         { name: _t('MÃ©tÃ©orologie'),       desc: _t('RÃ©duit le temps de trajet des troupes terrestres de 10%.') },
                        cartography:         { name: _t('Cartographie'),       desc: _t('RÃ©duit le temps de trajet des troupes terrestres de 10%.') },
                        set_sail:            { name: _t('Voiles dÃ©ployÃ©es'),   desc: _t('RÃ©duit le temps de trajet des navires de 10%.') },
                        lighthouse:          { name: _t('Phare'),              desc: _t('RÃ©duit le temps de trajet des navires de 10%.') }
                    };
                    src = BONUS_FALLBACK[id];
                }
                if (!src) return id;
                var name = src.name || src.title || id;
                var desc = src.description || src.desc || '';
                var html = headerHTML(name);
                html += descHTML(desc);
                return html;
            } catch(e) { return id; }
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // SHOW / POSITION / HIDE
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        function showTip(html, anchorRect) {
            if (!html) return;
            tip.innerHTML = html;
            tip.style.display = 'block';
            var vw = window.innerWidth, vh = window.innerHeight;
            var tw = 260, th = tip.offsetHeight;
            var left = anchorRect.left + anchorRect.width / 2 - tw / 2;
            left = Math.max(8, Math.min(left, vw - tw - 8));
            var top = (anchorRect.top - th - 10 >= 8) ? anchorRect.top - th - 6 : anchorRect.bottom + 6;
            top = Math.max(8, Math.min(top, vh - th - 8));
            tip.style.left = left + 'px';
            tip.style.top  = top  + 'px';
        }

        document.addEventListener('mouseover', function(e) {
            // .bs-help
            var el = e.target.closest ? e.target.closest('.bs-help') : null;
            if (el) {
                var src = el.querySelector('.bs-tooltip');
                if (src) { showTip(src.innerHTML, el.getBoundingClientRect()); return; }
            }
            // [data-unit-id]
            var du = e.target.closest ? e.target.closest('[data-unit-id]') : null;
            if (du) { showTip(unitTooltip(du.getAttribute('data-unit-id')), du.getBoundingClientRect()); return; }
            // [data-building-id]
            var db = e.target.closest ? e.target.closest('[data-building-id]') : null;
            if (db) { showTip(buildingTooltip(db.getAttribute('data-building-id')), db.getBoundingClientRect()); return; }
            // [data-research-id]
            var dr = e.target.closest ? e.target.closest('[data-research-id]') : null;
            if (dr) { showTip(researchTooltip(dr.getAttribute('data-research-id')), dr.getBoundingClientRect()); return; }
            // [data-bonus-id] â€” icÃ´nes bonus vitesse (panel Info Herald)
            var dbo = e.target.closest ? e.target.closest('[data-bonus-id]') : null;
            if (dbo) { showTip(bonusTooltip(dbo.getAttribute('data-bonus-id'), dbo.getAttribute('data-bonus-type') || 'power'), dbo.getBoundingClientRect()); return; }
            // [data-module-id] â€” modules premium GFBot
            var dm = e.target.closest ? e.target.closest('[data-module-id]') : null;
            if (dm) {
                var moduleId = dm.getAttribute('data-module-id');
                var isActive = dm.getAttribute('data-module-active') === 'true';
                var expiresAt = dm.getAttribute('data-module-expires') || '';
                var MODULE_META = {
                    farm:      { name: _t('Collecteur'),   emoji: 'ðŸŒ¾', desc: _t('Collecte automatiquement les ressources dans les villages alentours.') },
                    trader:    { name: _t('Marchand'),     emoji: '<img src="https://grepoplus.duckdns.org/bot/img/trader_icon.png" style="width:1em;height:1em;vertical-align:text-bottom;margin-right:4px;">', desc: _t('Automatise les echanges commerciaux entre villes.') },
                    foreman:   { name: _t('Constructeur'), emoji: 'ðŸ”¨', desc: _t('Gere automatiquement la file de construction des batiments.') },
                    recruiter: { name: _t('Recruteur'),    emoji: 'ðŸ¹', desc: _t('Automatise le recrutement des unites militaires.') },
                    wonder:    { name: _t('Merveille'),    emoji: 'ðŸ›ï¸', desc: _t('Gere les offrandes automatiques pour la merveille du monde.') },
                    tresorier: { name: _t('TrÃ©sorier'),    emoji: 'ðŸ’°', desc: _t('Vend automatiquement vos ressources contre de l\'or via le marche premium.') }
                };
                var meta = MODULE_META[moduleId];
                if (meta) {
                    var mHtml = headerHTML(meta.name);
                    mHtml += '<div style="display:flex;gap:10px;padding:8px 10px;">';
                    mHtml += '<div style="font-size:32px;flex-shrink:0;line-height:1;width:40px;text-align:center;">' + meta.emoji + '</div>';
                    mHtml += '<div style="font-size:11px;line-height:1.6;color:#d4c5a0;">' + meta.desc + '</div>';
                    mHtml += '</div>';
                    mHtml += '<div style="padding:4px 10px 8px;border-top:1px solid rgba(201,168,76,0.2);">';
                    if (isActive) {
                        mHtml += '<span style="color:#4caf6e;font-weight:700;font-size:11px;">' + _t('âœ“ Actif') + '</span>';
                        if (expiresAt) mHtml += '<span style="color:rgba(201,168,76,0.5);font-size:10px;"> â€” ' + _t('expire le') + ' ' + expiresAt.substring(0,10).split('-').reverse().join('/') + '</span>';
                    } else {
                        mHtml += '<span style="color:#888;font-size:11px;">' + _t('âœ— Inactif') + '</span>';
                    }
                    mHtml += '</div>';
                    showTip(mHtml, dm.getBoundingClientRect());
                }
                return;
            }
            // [data-advisor-id] â€” texte officiel depuis GameData.texts
            var da = e.target.closest ? e.target.closest('[data-advisor-id]') : null;
            if (da) {
                var advisorId = da.getAttribute('data-advisor-id');
                var rect = da.getBoundingClientRect();
                try {
                    var info = GameData.texts[advisorId + '_info'];
                    if (info) {
                        var ADVISOR_META = {
                            curator:   { name: _t('Administrateur'), x: '-80px' },
                            captain:   { name: _t('Capitaine'),      x: '0px'   },
                            trader:    { name: _t('Marchand'),       x: '-160px' },
                            priest:    { name: _t('PrÃªtresse'),      x: '-120px' },
                            commander: { name: _t('Commandant'),     x: '-40px'  }
                        };
                        var meta  = ADVISOR_META[advisorId] || { name: advisorId, x: '0px' };
                        var hint  = GameData.texts[advisorId + '_hint'] || '';
                        var _advisorCdnUrl = 'https://gpfr.innogamescdn.com/images/game/autogenerated/advisors/advisors_40x40.jpg';
                        var _advisorVpsUrl = 'https://grepoplus.duckdns.org/bot/assets/autogenerated/advisors/advisors_40x40.jpg';
                        var _advisorSprite = _advisorCdnUrl;
                        if (typeof window._grepoBotResolveSprite === 'function') {
                            window._grepoBotResolveSprite(_advisorCdnUrl, _advisorVpsUrl, function(url) { _advisorSprite = url; });
                        }
                        var portrait = '<div style="width:40px;height:40px;flex-shrink:0;border-radius:4px;background-image:url(' + _advisorSprite + ');background-position:' + meta.x + ' 0px;background-size:200px 40px;"></div>';
                        var html = headerHTML(meta.name);
                        html += '<div style="display:flex;gap:8px;padding:8px 10px;">';
                        html += '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;">' + portrait;
                        var goldMatch = hint.match(/([0-9]+)\s*or/i);
                        var goldCost = goldMatch ? goldMatch[1] : null;
                        var _goldCdnUrl = 'https://gpfr.innogamescdn.com/images/game/premium_features/feature_icons_14x14.png';
                        var _goldVpsUrl = 'https://grepoplus.duckdns.org/bot/assets/premium_features/feature_icons_14x14.png';
                        var _goldUrl    = _goldCdnUrl;
                        if (typeof window._grepoBotResolveSprite === 'function') {
                            window._grepoBotResolveSprite(_goldCdnUrl, _goldVpsUrl, function(url) { _goldUrl = url; });
                        }
                        var GOLD_ICON = '<div style="display:inline-block;width:13px;height:15px;vertical-align:middle;background:url(' + _goldUrl + ') 0px -14px no-repeat;"></div>';
                        if (goldCost) html += '<div style="font-size:10px;color:#f0d080;text-align:center;font-weight:700;display:flex;align-items:center;justify-content:center;gap:2px;">' + goldCost + GOLD_ICON + '</div>';
                        html += '</div>';
                        html += '<div style="font-size:11px;line-height:1.6;color:#d4c5a0;">' + info + '</div>';
                        html += '</div>';
                        showTip(html, rect);
                    }
                } catch(e2) {}
                return;
            }
            // [data-tooltip] fallback texte simple
            var dt = e.target.closest ? e.target.closest('[data-tooltip]') : null;
            if (dt) {
                var text = dt.getAttribute('data-tooltip');
                if (text) { showTip(text, dt.getBoundingClientRect()); }
            }
            // [data-tooltip-html] â€” rendu HTML (supporte <br> etc.)
            var dth = e.target.closest ? e.target.closest('[data-tooltip-html]') : null;
            if (dth) {
                var html = dth.getAttribute('data-tooltip-html');
                if (html) { showTip(html, dth.getBoundingClientRect()); }
            }
        });
        document.addEventListener('mouseout', function(e) {
            var el = e.target.closest ? e.target.closest('.bs-help, [data-tooltip], [data-tooltip-html], [data-unit-id], [data-building-id], [data-research-id], [data-bonus-id], [data-advisor-id], [data-module-id]') : null;
            if (el) tip.style.display = 'none';
        });
    })();

    // â”€â”€ ContrÃ´leur du panneau notifications flottant â”€â”€
    if (!bot._notifControllerRegistered) {
        bot._notifControllerRegistered = true;
        bot.ngApp.controller("notifController", ["$scope", function(s) {
            s.t = function(str) { return ctx.t ? ctx.t(str) : str; };
            s.data = { notifHistory: bot._notifHistory || [] };
            var _sync = setInterval(function() {
                try {
                    s.$evalAsync(function() { s.data.notifHistory = bot._notifHistory || []; });
                } catch(e) {}
            }, 1000);
            s.close = function() {
                clearInterval(_sync);
                if (bot._notifWindowEl) { bot.windows.close("notif"); bot._notifWindowEl = null; }
            };
            s.clearHistory = function() {
                bot._notifHistory = [];
                s.data.notifHistory = [];
                if (bot._notifScopeRef) { bot._notifScopeRef.data.notifBadge = 0; bot._notifScopeRef.data.notifHistory = []; }
            };
        }]);
    }

    // â”€â”€ Template notif inline (fallback si pas fourni par le serveur) â”€â”€
    if (!bot.templates.notif) {
        bot.templates.notif = '<div class="window" ng-controller="notifController">'
            + '<div class="header"><div class="actions"></div><div class="caption">{{t(\'ðŸ”” Historique des notifications\')}}</div>'
            + '<div class="controls"><div class="control close" ng-click="close()" title="{{t(\'Fermer\')}}"></div></div></div>'
            + '<div style="padding:8px 10px;border-bottom:1px solid rgba(201,168,76,0.15);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">'
            + '<span style="font-size:8pt;color:#7a6e5a;">{{data.notifHistory.length}} {{t(\'notification(s)\')}}</span>'
            + '<button ng-click="clearHistory()" ng-show="data.notifHistory.length > 0" style="background:rgba(192,57,43,0.15);border:1px solid rgba(192,57,43,0.3);border-radius:4px;color:#e07070;font-size:8pt;padding:3px 10px;cursor:pointer;"'
            + ' onmouseover="this.style.background=\'rgba(192,57,43,0.28)\'" onmouseout="this.style.background=\'rgba(192,57,43,0.15)\'">'
            + '{{t(\'Tout effacer\')}}</button></div>'
            + '<style>.gp-notif-scrollbox::-webkit-scrollbar{width:4px!important}.gp-notif-scrollbox::-webkit-scrollbar-track{background:transparent!important}.gp-notif-scrollbox::-webkit-scrollbar-thumb{background:#8a6a1a!important;border-radius:2px!important}.gp-notif-scrollbox::-webkit-scrollbar-thumb:hover{background:#c9a84c!important}</style>'
            + '<div class="scrollbox gp-notif-scrollbox" style="flex:1;overflow-y:auto;padding:0;scrollbar-width:thin;scrollbar-color:#8a6a1a transparent;background:transparent;">'
            + '<div ng-if="!data.notifHistory||data.notifHistory.length===0" style="color:#7a6e5a;text-align:center;padding:40px 0;font-style:italic;font-size:9pt;">{{t(\'Aucune notification\')}}</div>'
            + '<div ng-repeat="n in data.notifHistory|orderBy:\'ts\':true" style="border-bottom:1px solid rgba(201,168,76,0.08);padding:7px 14px;display:flex;align-items:flex-start;gap:8px;">'
            + '<span style="font-size:13px;flex-shrink:0;margin-top:1px;">{{n.icon||\'ðŸ””\'}}</span>'
            + '<div style="flex:1;min-width:0;">'
            + '<div ng-show="n.module" style="font-size:7pt;color:#c9a84c;font-weight:bold;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.5px;">{{n.module}}</div>'
            + '<div style="font-size:8.5pt;color:#d4c5a0;word-break:break-word;" ng-bind-html="n.html || n.msg || t(\'(message vide)\') | unsafe"></div>'
            + '<div ng-show="n.ts" style="font-size:7pt;color:#5a5040;margin-top:2px;">{{n.ts|date:\'HH:mm:ss\'}}</div></div></div>'
            + '</div></div>';
    }

    // Position bas-gauche, au-dessus de la barre Grepolis
    // ORIGINAL : left=60px, top=winH-dlgH-250. Clamped pour petits Ã©crans.
    var dlg = bot.settingsDlg;
    var winW = $(window).width();
    var winH = $(window).height();
    var dlgH = dlg.outerHeight(true) || 600;
    var dlgW = dlg.outerWidth(true) || 380;

    var leftPx = Math.max(10, Math.min(60, winW - dlgW - 10));
    var topPx  = Math.max(10, Math.min(winH - dlgH - 250, winH - dlgH - 10));

    dlg.css({
        position: "absolute",
        left: leftPx + "px",
        top: topPx + "px"
    });
})(this);
