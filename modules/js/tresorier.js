// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  Module TrÃ©sorier â€” Ã‰change automatique de ressources contre de l'or
//
//  Logique calquÃ©e sur goldbot.py :
//    1. Cycle complet par ville : pour chaque ressource â†’ requestOffer â†’ confirmOffer
//    2. Pas de dÃ©lai entre les ressources d'une mÃªme ville
//    3. Sleep 20-40s entre chaque cycle complet
//    4. gold: 100 fixe dans requestOffer (le serveur ajuste)
//    5. rate_changed â†’ reconfirme directement avec le nouvel offer
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
(function() {
    "use strict";
    var ctx = this;
    var bot = ctx.bot;
    var log = ctx.logger.create("Treasurer");

    var CYCLE_DELAY_MIN  = 5 * 1000;
    var CYCLE_DELAY_MAX  = 10 * 1000;
    var RES_TYPES        = ["wood", "stone", "iron"];

    function randDelay(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    function isCaptchaActive() {
        try { if (window.BotCheckWindowFactory && BotCheckWindowFactory.isBotCheckActive()) return true; } catch(e) {}
        try { if (window.RecaptchaWindowFactory && RecaptchaWindowFactory.isCaptchaWindowOpened()) return true; } catch(e) {}
        if ($("#captcha_window").length > 0) return true;
        if ($("#recaptcha_window").length > 0) return true;
        if ($("#hcaptcha_window").length > 0) return true;
        if ($("#captcha_curtain").length > 0) return true;
        return false;
    }

    function removeCaptchaNotif() {
        $("#ba26faef5msgs > div").filter(function() {
            return $(this).find(".text").text().toLowerCase().indexOf("captcha") !== -1;
        }).remove();
    }

    function updateTownDisplay(townName) {
        setTimeout(function() {
            try {
                var elem = document.querySelector('[data-tresorier-town-display]');
                if (elem) { elem.textContent = townName || ''; elem.style.display = townName ? 'inline' : 'none'; }
            } catch(e) {}
        }, 0);
    }

    // Lock indÃ©pendant du trÃ©sorier â€” n'interfÃ¨re pas avec le farm
    var _requestLocked = false;

    function directPost(townId, modelUrl, actionName, args, successCallback, errorCallback) {
        try {
            if (_requestLocked) {
                if (errorCallback) errorCallback({ error: "request_locked" });
                return;
            }
            _requestLocked = true;
            var payload = "json=" + encodeURIComponent(JSON.stringify({
                "model_url": modelUrl,
                "action_name": actionName,
                "arguments": args,
                "town_id": townId
            }));
            var apiUrl = "/game/frontend_bridge?town_id=" + townId + "&action=execute&h=" + Game.csrfToken;
            $.post(apiUrl, payload, function(responseData) {
                _requestLocked = false;
                try {
                    var json = responseData.json || responseData;
                    // Transmettre les notifications au jeu comme le ferait GPAjax
                    if (json.notifications && json.notifications.length > 0) {
                        try { NotificationLoader.recvNotifyData({ notifications: json.notifications }, false); } catch(e) {}
                    }
                    if (json.error) { if (errorCallback) errorCallback(json); return; }
                    if (successCallback) successCallback(json);
                } catch(e) { if (errorCallback) errorCallback({ error: "Parse error: " + e.message }); }
            }).fail(function(jqXHR, textStatus, errorThrown) {
                _requestLocked = false;
                if (errorCallback) errorCallback({ error: "HTTP " + textStatus + ": " + errorThrown });
            });
        } catch(e) {
            _requestLocked = false;
            if (errorCallback) errorCallback({ error: "Exception: " + e.message });
        }
    }

    bot.tresorier = {
        active: false,
        timer:  null,
        _captchaTownId: null,   // ville actuellement affichÃ©e dans la notif captcha
        _captchaActive: false,       // captcha global actif ou non
        _captchaSeenThisCycle: false, // au moins une ville a eu captcha_required+gold>0 ce cycle

        _showCaptchaNotif: function(townId) {
            if (this._captchaTownId === townId) return; // dÃ©jÃ  affichÃ© pour cette ville
            removeCaptchaNotif();
            this._captchaTownId = townId;
            this._captchaActive = true;
            log("warning", bot.t("â¸ï¸ TrÃ©sorier â€” captcha requis sur [town]{0}[/town], veuillez le saisir dans l'onglet Commerce"), townId).msg(0);
        },

        _clearCaptchaNotif: function() {
            this._captchaTownId = null;
            this._captchaActive = false;
            removeCaptchaNotif();
        },

        start: function() {
            if (this.active) return;
            if (!(bot.premiumModules && bot.premiumModules["tresorier"] === true)) {
                log("error", bot.t("Module non inclus dans votre licence")).msg(10);
                return;
            }
            log("info", "DÃ©marrage du module TrÃ©sorier");
            this.active = true;
            var self = this;
            self._cycle(function() { self._schedule(); });
        },

        stop: function() {
            if (!this.active) return;
            log("info", "ArrÃªt du module TrÃ©sorier");
            this.active = false;
            if (this.timer) { clearTimeout(this.timer); this.timer = null; }
            updateTownDisplay(null);
        },

        _schedule: function() {
            var self = this;
            if (!this.active) return;
            var delay = randDelay(CYCLE_DELAY_MIN, CYCLE_DELAY_MAX);
            log("debug", "Prochain cycle dans {0}s", Math.round(delay / 1000));
            this.timer = setTimeout(function() {
                if (!self.active) return;
                try { self._cycle(function() { self._schedule(); }); }
                catch(e) { log("error", "Erreur cycle: {0}", e.message); self._schedule(); }
            }, delay);
        },

        _cityConfig: function(tid) {
            var s   = bot.sett || {};
            var cst = (bot.custom && bot.custom.get) ? bot.custom.get(tid) : {};
            if (cst.tresorier_enabled === "disabled") return null;

            var resOn;
            if (cst.tresorier_res_mode === "custom") {
                resOn = { wood: !!cst.tresorier_res_wood, stone: !!cst.tresorier_res_stone, iron: !!cst.tresorier_res_iron };
            } else {
                resOn = { wood: !!s.tresorier_res_wood, stone: !!s.tresorier_res_stone, iron: !!s.tresorier_res_iron };
            }

            function resolveMin(cityVal, globalKey) {
                if (cityVal !== null && cityVal !== undefined && cityVal !== "") {
                    var cv = parseInt(cityVal, 10);
                    return (!isNaN(cv) && cv >= 0) ? cv : 0;
                }
                return Math.max(0, parseInt(s[globalKey], 10) || 0);
            }

            return {
                resOn: resOn,
                resMin: {
                    wood:  resolveMin(cst.tresorier_min_wood,  "tresorier_min_wood"),
                    stone: resolveMin(cst.tresorier_min_stone, "tresorier_min_stone"),
                    iron:  resolveMin(cst.tresorier_min_iron,  "tresorier_min_iron")
                },
                notify: s.tresorier_notify !== false
            };
        },

        _cycle: function(onDone) {
            var self = this;
            var towns;
            try { towns = ITowns.getTowns(); } catch(e) {
                log("error", "Impossible de rÃ©cupÃ©rer les villes: {0}", e.message);
                if (onDone) onDone(); return;
            }
            var townIds = Object.keys(towns);
            log("debug", "Cycle: {0} ville(s)", townIds.length);
            self._captchaSeenThisCycle = false; // reset Ã  chaque cycle

            var townIndex = 0;
            function nextTown() {
                if (!self.active || townIndex >= townIds.length) {
                    // Fin du cycle : si aucune ville n'a eu captcha+gold>0, on clear la notif
                    if (self._captchaActive && !self._captchaSeenThisCycle) { self._clearCaptchaNotif(); }
                    if (onDone) onDone(); return;
                }
                var tid = townIds[townIndex++];
                var cfg = self._cityConfig(tid);
                if (!cfg) { nextTown(); return; }

                var town;
                try { town = ITowns.getTown(tid); } catch(e) { nextTown(); return; }
                if (!town) { nextTown(); return; }
                try { if (town.hasConqueror && town.hasConqueror()) { nextTown(); return; } } catch(e) {}

                updateTownDisplay(town.getName ? town.getName() : tid);

                var res;
                try { res = town.resources(); } catch(e) { nextTown(); return; }

                // Skip si aucune ressource activÃ©e n'a un surplus > 0
                var hasSurplus = RES_TYPES.some(function(r) {
                    return cfg.resOn[r] && (res[r] || 0) - cfg.resMin[r] >= 1;
                });
                if (!hasSurplus) { log("debug", "[town]{0}[/town] â€” pas de surplus suffisant, skip", tid); nextTown(); return; }

                // Traite toutes les ressources sans dÃ©lai entre elles (comme le Python)
                self._tradeTown(tid, RES_TYPES.slice(), cfg, nextTown);
            }
            nextTown();
        },

        _tradeTown: function(townId, resQueue, cfg, onDone) {
            var self = this;
            if (!self.active || !resQueue.length) { if (onDone) onDone(); return; }

            var rType = resQueue.shift();
            if (!cfg.resOn[rType]) { self._tradeTown(townId, resQueue, cfg, onDone); return; }

            var res;
            try { res = ITowns.getTown(townId).resources(); } catch(e) { self._tradeTown(townId, resQueue, cfg, onDone); return; }
            var surplus = (res[rType] || 0) - cfg.resMin[rType];
            if (surplus < 1) {
                log("debug", "[town]{0}[/town] {1} â€” surplus insuffisant ({2}), skip", townId, rType, surplus);
                self._tradeTown(townId, resQueue, cfg, onDone);
                return;
            }

            // QuantitÃ© = min(surplus, capacitÃ© marchande)
            var cap;
            try { cap = ITowns.getTown(townId).getAvailableTradeCapacity(); } catch(e) { self._tradeTown(townId, resQueue, cfg, onDone); return; }
            if (!cap || cap < 1) {
                log("debug", "[town]{0}[/town] {1} â€” capacitÃ© marchande Ã©puisÃ©e, skip", townId, rType);
                self._tradeTown(townId, resQueue, cfg, onDone);
                return;
            }

            var args = { type: "sell", gold: 999 };
            args[rType] = Math.min(Math.floor(surplus), cap);
            log("info", "[town]{0}[/town] requestOffer {1}={2}", townId, rType, args[rType]);

            directPost(parseInt(townId, 10), "PremiumExchange", "requestOffer", args,
                function(json) {
                    // DÃ©tection via captcha_required dans la rÃ©ponse JSON (plus fiable que isCaptchaActive)
                    if (json.offer && json.offer.captcha_required === true) {
                        var _captchaGold = parseInt((json.offer && json.offer.gold) || 0, 10);
                        if (_captchaGold > 0) {
                            // Offre gold > 0 â†’ affiche ou met Ã  jour la notif avec cette ville
                            self._captchaSeenThisCycle = true;
                            self._showCaptchaNotif(townId);
                        }
                        self._tradeTown(townId, resQueue, cfg, onDone);
                        return;
                    }
                    // captcha_required false ou absent â†’ cette ville est OK, libÃ¨re si c'Ã©tait elle
                    if (self._captchaTownId === townId) { self._clearCaptchaNotif(); }
                    var offer = json.offer || {};
                    var goldAmount = parseInt(offer.gold, 10) || 0;
                    var resAmount  = parseInt(offer.resource_amount, 10) || 0;
                    var mac        = json.mac;
                    if (goldAmount < 1 || resAmount < 1 || !mac) {
                        log("info", "[town]{0}[/town] {1} â€” offre invalide (gold={2}), skip", townId, rType, goldAmount);
                        self._tradeTown(townId, resQueue, cfg, onDone);
                        return;
                    }
                    log("info", "[town]{0}[/town] {1} â€” {2} res -> {3} or, confirmation...", townId, rType, resAmount, goldAmount);
                    self._confirmOffer(townId, rType, resAmount, goldAmount, mac, cfg, resQueue, onDone, 0);
                },
                function(errData) {
                    var errMsg = errData.error || "unknown";
                    if (typeof errMsg === "string" && errMsg.toLowerCase().indexOf("captcha") !== -1) {
                        self._showCaptchaNotif(townId);
                        self._tradeTown(townId, resQueue, cfg, onDone);
                    } else if (typeof errMsg === "string" && errMsg.toLowerCase().indexOf("droit de commercer") !== -1) {
                        log("error", bot.t("TrÃ©sorier dÃ©sactivÃ© â€” l'Ã‰change d'or nÃ©cessite au moins 2 villes.")).msg(10);
                        self.stop();
                    } else if (errMsg === "request_locked") {
                        log("debug", "[town]{0}[/town] {1} â€” request locked, retry dans 2s", townId, rType);
                        setTimeout(function() { if (self.active) self._tradeTown(townId, [rType].concat(resQueue), cfg, onDone); }, 2000);
                    } else {
                        log("error", "[town]{0}[/town] requestOffer {1} erreur: {2}", townId, rType, errMsg);
                        self._tradeTown(townId, resQueue, cfg, onDone);
                    }
                }
            );
        },

        _confirmOffer: function(townId, rType, resAmount, goldAmount, mac, cfg, resQueue, onDone, retryCount) {
            var self = this;
            var args = { type: "sell", gold: goldAmount, mac: mac, offer_source: "main" };
            args[rType] = resAmount;
            log("info", "[town]{0}[/town] confirmOffer {1}={2} pour {3} or", townId, rType, resAmount, goldAmount);

            directPost(parseInt(townId, 10), "PremiumExchange", "confirmOffer", args,
                function(json) {
                    if (json.result === "success") {
                        var s = bot.sett || {};
                        s.tresorier_stats_offers = (s.tresorier_stats_offers || 0) + 1;
                        s.tresorier_stats_gold   = (s.tresorier_stats_gold   || 0) + goldAmount;
                        try {
                            var _ws = (bot._ctx && bot._ctx._premiumWS) || (window._grepoCtx && window._grepoCtx._premiumWS);
                            if (_ws && _ws.readyState === 1) { _ws.send(JSON.stringify({ type: "STATS_UPDATE", stat: "tresorier", tresorier_stats_offers: s.tresorier_stats_offers, tresorier_stats_gold: s.tresorier_stats_gold })); }
                        } catch(e) {}
                        try {
                            var scope = angular.element(document.querySelector(".botSettings")).scope();
                            if (scope && scope.data && scope.data.s) { scope.data.s.tresorier_stats_offers = s.tresorier_stats_offers; scope.data.s.tresorier_stats_gold = s.tresorier_stats_gold; scope.$apply(); }
                        } catch(e) {}
                        if (cfg.notify) { log("info", bot.t("ðŸ’° [town]{0}[/town] â€” {1} {2} â†’ {3} or âœ…"), townId, resAmount, rType, goldAmount).msg(10); }
                        self._tradeTown(townId, resQueue, cfg, onDone);

                    } else if (json.result === "rate_changed" && retryCount < 3) {
                        // Comme le Python : reconfirme directement avec le nouvel offer
                        var newOffer = json.offer || {};
                        var newGold  = parseInt(newOffer.gold, 10) || 0;
                        var newRes   = parseInt(newOffer.resource_amount, 10) || 0;
                        var newMac   = json.mac || mac;
                        log("info", "[town]{0}[/town] {1} â€” rate_changed, retry {2}/3", townId, rType, retryCount + 1);
                        if (newGold >= 1 && newRes >= 1 && newMac) {
                            self._confirmOffer(townId, rType, newRes, newGold, newMac, cfg, resQueue, onDone, retryCount + 1);
                        } else {
                            self._tradeTown(townId, resQueue, cfg, onDone);
                        }
                    } else {
                        log("info", "[town]{0}[/town] confirmOffer {1} â€” result: {2}, skip", townId, rType, JSON.stringify(json.result));
                        self._tradeTown(townId, resQueue, cfg, onDone);
                    }
                },
                function(errData) {
                    var errMsg = errData.error || "unknown";
                    if (typeof errMsg === "string" && errMsg.toLowerCase().indexOf("captcha") !== -1) {
                        self._showCaptchaNotif(townId);
                        self._tradeTown(townId, resQueue, cfg, onDone);
                    } else {
                        log("error", "[town]{0}[/town] confirmOffer {1} erreur: {2}", townId, rType, errMsg);
                        self._tradeTown(townId, resQueue, cfg, onDone);
                    }
                }
            );
        },

    };

    window._gfbot_module_loaded && window._gfbot_module_loaded("TrÃ©sorier", true);

}).call(this);
