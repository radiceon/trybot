(function() {
    "use strict";
    var a = this;
    var b = a.bot;
    var c = a.logger.create("Friends");

    var VPS = "https://grepoplus.duckdns.org";

    // Cache anti-boucle pour la rÃ©solution player_name des villages IA via town_info
    // PartagÃ© avec herald.js via b.herald._playerResolvePending pour Ã©viter les doublons
    var _playerResolvePending = {};

    // Cache anti-spam notifications : clÃ© = "nomAmi_heureArrivÃ©e"
    // Evite les doublons quand WS + poll arrivent quasi-simultanÃ©ment avec la mÃªme attaque
    var _notifiedFriendAttackKeys = {};

    // Monde = sous-domaine hostname : fr180.grepolis.com -> "fr180"
    function getWorld() {
        return window.location.hostname.split(".")[0];
    }

    function getMyId()   { return String(Game.player_id); }
    function getMyName() {
        try {
            var m = MM.getModels();
            return m.Player[Object.keys(m.Player)[0]].getName();
        } catch(e) { return Game.player_name || ""; }
    }

    // â”€â”€ Appel VPS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    // â”€â”€ Signature HMAC bot â€” uniquement pour /friends/poll (anti-scraper) â”€â”€â”€â”€â”€â”€
    function getBotAuthHeaders(playerId) {
        try {
            var secret = (typeof window._grepoSecret !== "undefined") ? window._grepoSecret : "";
            var ts     = String(Math.floor(Date.now() / 1000));
            var pid    = String(playerId || getMyId());
            var sig    = (typeof window._grepoHmac === "function") ? window._grepoHmac(secret, pid + ":" + ts) : "";
            return { "x-bot-sig": sig, "x-bot-ts": ts, "x-bot-pid": pid };
        } catch(e) { return {}; }
    }

    function vpsGet(path, params, cb) {
        var url = VPS + path + "?" + $.param(params);
        // Envoyer les headers auth uniquement sur /friends/poll (seule route protÃ©gÃ©e)
        var extraHeaders = (path === "/friends/poll") ? getBotAuthHeaders(params && params.player_id) : {};
        $.ajax({ url: url, method: "GET", timeout: 30000,
            headers: extraHeaders,
            success: function(r) { if (typeof cb === "function") cb(null, r); },
            error:   function(x) {
                var resp = x.responseJSON || {};
                var msg  = resp.error || resp.message || a.t("Erreur rÃ©seau") + " (" + (x.status || "?") + ")";
                if (typeof cb === "function") cb({ error: msg });
            }
        });
    }

    function vpsPost(path, data, cb) {
        $.ajax({ url: VPS + path, method: "POST", contentType: "application/json",
            data: JSON.stringify(data), timeout: 30000,
            success: function(r) { if (typeof cb === "function") cb(null, r); },
            error:   function(x) {
                var resp = x.responseJSON || {};
                var msg  = resp.error || resp.message || a.t("Erreur rÃ©seau") + " (" + (x.status || "?") + ")";
                if (typeof cb === "function") cb({ error: msg });
            }
        });
    }


    // â”€â”€ Helpers WS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    // Envoie un message via WS ; si le WS est fermÃ©, tombe sur le callback HTTP fourni
    function wsSend(payload, httpFallback) {
        var ws = null;
        try { ws = (typeof a !== "undefined" && a.ctx && a.ctx._premiumWS) || null; } catch(e) {}
        if (!ws) { try { ws = window._grepoCtx && window._grepoCtx._premiumWS; } catch(e) {} }
        if (ws && ws.readyState === 1) {
            try { ws.send(JSON.stringify(payload)); return true; } catch(e) {}
        }
        if (typeof httpFallback === "function") httpFallback();
        return false;
    }

    // Envoie via WS et appelle cb(null, rÃ©ponse) via l'Ã©vÃ©nement WS_REPLY,
    // ou tombe sur HTTP si le WS est absent.
    // Pour les actions avec rÃ©ponse (load, request, accept, reject, setPrefs) :
    // le serveur rÃ©pond avec { type: "WS_REPLY", reqId, data }
    var _wsCallbacks = {};
    function wsCall(payload, httpFallback, cb) {
        var reqId = Math.random().toString(36).slice(2);
        payload._reqId = reqId;
        if (typeof cb === "function") _wsCallbacks[reqId] = cb;
        var sent = wsSend(payload, null);
        if (!sent && typeof httpFallback === "function") {
            delete _wsCallbacks[reqId];
            httpFallback(cb);
        }
    }

    // â”€â”€ API publique â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    b.friends = {

        // Charger la liste d'amis â€” WS en prioritÃ©, fallback HTTP
        load: function(cb) {
            function httpLoad(callback) {
                vpsGet("/friends/list", {
                    player_id:   getMyId(),
                    player_name: getMyName(),
                    world:       getWorld()
                }, function(err, r) {
                    if (err) { c("error", a.t("Erreur chargement amis: {0}"), err.error || err.message || JSON.stringify(err)).msg(10); return; }
                    b.friends._list = r.friends || [];
                    c("debug", a.t("Amis chargÃ©s: {0}"), b.friends._list.length);
                    // Traiter les notifications ami reÃ§ues hors ligne (FRIEND_REMOVED, FRIEND_REQUEST, FRIEND_ACCEPTED)
                    _processPendingFriendNotifs(r.pendingFriendNotifs);
                    if (typeof callback === "function") callback(null, { friends: b.friends._list });
                });
            }
            wsCall(
                { type: "FRIENDS_LIST_REQUEST", player_id: getMyId(), player_name: getMyName(), world: getWorld() },
                httpLoad,
                function(err, r) {
                    if (err) { c("error", a.t("Erreur chargement amis: {0}"), err.error || err.message || JSON.stringify(err)).msg(10); return; }
                    b.friends._list = (r && r.friends) || [];
                    c("debug", a.t("Amis chargÃ©s: {0}"), b.friends._list.length);
                    if (typeof cb === "function") cb(b.friends._list);
                }
            );
        },

        // Envoyer une demande d'ami â€” WS en prioritÃ©, fallback HTTP
        request: function(targetName, cb) {
            wsCall(
                { type: "FRIEND_REQUEST_ACTION", action: "request", player_id: getMyId(), player_name: getMyName(), world: getWorld(), target_name: targetName },
                function(callback) {
                    vpsPost("/friends/request", { player_id: getMyId(), player_name: getMyName(), world: getWorld(), target_name: targetName },
                        function(err, r) { if (typeof callback === "function") callback(err, r); });
                },
                cb
            );
        },

        // Accepter une demande â€” WS en prioritÃ©, fallback HTTP
        accept: function(friendKey, cb) {
            var parts = String(friendKey).split(":");
            var payload = { player_id: getMyId(), player_name: getMyName(), world: getWorld(), friend_id: parts[0], friend_world: parts[1] || getWorld() };
            function onSuccess() {
                // Mise Ã  jour immÃ©diate du cache local : pending_received â†’ accepted
                var f = (b.friends._list || []).find(function(x) { return x.key === friendKey; });
                if (f) f.status = "accepted";
                b.friends.load(); // sync serveur en arriÃ¨re-plan
            }
            wsCall(
                Object.assign({ type: "FRIEND_REQUEST_ACTION", action: "accept" }, payload),
                function(callback) {
                    vpsPost("/friends/accept", payload, function(err, r) {
                        if (typeof callback === "function") callback(err, r);
                        if (!err) onSuccess();
                    });
                },
                function(err, r) {
                    if (typeof cb === "function") cb(err, r);
                    if (!err) onSuccess();
                }
            );
        },

        // Refuser / supprimer un ami â€” WS en prioritÃ©, fallback HTTP
        reject: function(friendKey, cb) {
            var parts = String(friendKey).split(":");
            var payload = { player_id: getMyId(), world: getWorld(), friend_id: parts[0], friend_world: parts[1] || getWorld() };
            function onSuccess() {
                // Retrait immÃ©diat du cache local pour une UI instantanÃ©e
                b.friends._list = (b.friends._list || []).filter(function(f) { return f.key !== friendKey; });
                b.friends.load(); // sync serveur en arriÃ¨re-plan
            }
            wsCall(
                Object.assign({ type: "FRIEND_REQUEST_ACTION", action: "reject" }, payload),
                function(callback) {
                    vpsPost("/friends/reject", payload, function(err, r) {
                        if (typeof callback === "function") callback(err, r);
                        if (!err) onSuccess();
                    });
                },
                function(err, r) {
                    if (typeof cb === "function") cb(err, r);
                    if (!err) onSuccess();
                }
            );
        },

        // Mettre Ã  jour les prÃ©fÃ©rences de partage â€” WS en prioritÃ©, fallback HTTP
        setPrefs: function(friendKey, shareAttacks, shareOrders, shareTroops, cb) {
            var payload = { player_id: getMyId(), world: getWorld(), friend_key: friendKey, share_attacks: shareAttacks, share_orders: shareOrders, share_troops: shareTroops };
            function applyLocal() {
                var f = (b.friends._list || []).find(function(x) { return x.key === friendKey; });
                if (f) { f.share_attacks = shareAttacks; f.share_orders = shareOrders; f.share_troops = shareTroops; }
            }
            wsCall(
                Object.assign({ type: "FRIEND_PREFS_ACTION" }, payload),
                function(callback) {
                    vpsPost("/friends/share-prefs", payload, function(err, r) {
                        if (typeof callback === "function") callback(err, r);
                        if (!err) applyLocal();
                    });
                },
                function(err, r) {
                    if (typeof cb === "function") cb(err, r);
                    if (!err) applyLocal();
                }
            );
        },

        // Partager ses attaques et/ou ordres
        // Canal principal : WebSocket (temps rÃ©el, zÃ©ro latence)
        // Fallback : POST HTTP si le WS n'est pas disponible
        share: function(attacks, orders, advisors, dismissed, troops, wall_kills, premiumModules, isAdmin) {
            var payload = { type: "SHARE_DATA", player_id: getMyId(), world: getWorld() };
            if (attacks      !== undefined) payload.attacks      = attacks;
            if (orders       !== undefined) payload.orders       = orders;
            if (advisors     !== undefined) payload.advisors     = advisors;
            if (dismissed    !== undefined) payload.dismissed    = dismissed;
            if (troops       !== undefined) payload.troops       = troops;
            if (wall_kills   !== undefined) payload.wall_kills   = wall_kills;
            if (premiumModules !== undefined) payload.premiumModules = premiumModules;
            if (isAdmin        !== undefined) payload.isAdmin        = isAdmin;

            // Essai via WebSocket
            var ws = (typeof a !== "undefined" && a.ctx && a.ctx._premiumWS) || null;
            // CompatibilitÃ© : chercher aussi sur window.grepoCtx ou bot parent
            if (!ws) {
                try { ws = window._grepoCtx && window._grepoCtx._premiumWS; } catch(e) {}
            }
            if (ws && ws.readyState === 1) {
                try {
                    ws.send(JSON.stringify(payload));
                    return; // envoyÃ© via WS, pas de fallback nÃ©cessaire
                } catch(e) {}
            }
            // Fallback HTTP (WS absent ou fermÃ©)
            var httpPayload = Object.assign({}, payload);
            delete httpPayload.type;
            vpsPost("/friends/share", httpPayload, function(err) {
                if (err) c("debug", a.t("Erreur share: {0}"), err.error);
            });
        },

        // RÃ©cupÃ©rer les donnÃ©es partagÃ©es des amis + ses propres ordres sauvegardÃ©s
        poll: function(cb) {
            vpsGet("/friends/poll", {
                player_id: getMyId(),
                world:     getWorld()
            }, function(err, r) {
                if (err) { c("debug", a.t("Erreur poll: {0}"), err.error); return; }
                if (typeof cb === "function") cb(r.result || [], r.own_orders || [], r.own_attacks || [], r.own_dismissed || {}, r.own_wall_kills || {});
            });
        },

        // Liste en cache local
        _list: [],

        // AppelÃ© depuis core.js â†’ ws.onmessage quand type === "WS_REPLY"
        _handleWsReply: function(msg) {
            var cb = _wsCallbacks[msg.reqId];
            if (cb) {
                delete _wsCallbacks[msg.reqId];
                cb(msg.error ? msg : null, msg.data || msg);
            }
        }
    };

    // Charger au dÃ©marrage
    b.friends.load();

    // â”€â”€ Heartbeat de cohÃ©rence toutes les 30 secondes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Les mises Ã  jour temps rÃ©el passent par WS (SHARE_DATA â†’ FRIEND_DATA).
    // Cet intervalle sert uniquement de filet de sÃ©curitÃ© si un paquet WS
    // Ã©tait perdu ou si la connexion vient d'Ãªtre rÃ©tablie.
    setInterval(function() {
        b.friends._pushShared();
    }, 30 * 1000);

    // MÃ©thode interne : collecte et pousse les donnÃ©es Ã  partager
    // Traite les notifications ami reÃ§ues hors ligne depuis /friends/list
    function _processPendingFriendNotifs(notifs) {
        if (!notifs || !notifs.length) return;
        notifs.forEach(function(notif) {
            try {
                if (b._premiumWsOnMessage) b._premiumWsOnMessage(JSON.stringify(notif));
            } catch(e) {}
        });
        // RafraÃ®chir les FriendsController Angular ouverts
        try {
            document.querySelectorAll('[ng-controller="FriendsController"]').forEach(function(el) {
                var sc = angular.element(el).scope();
                if (sc) sc.$evalAsync(function() {});
            });
        } catch(e) {}
    }

    // â”€â”€ Debounce : regroupe tous les appels rapprochÃ©s en un seul envoi â”€â”€â”€â”€â”€
    // Sans Ã§a, une rafale d'attaques ou d'ordres dÃ©clenche 10-15 POSTs en
    // quelques secondes â†’ 429 Too Many Requests sur le VPS (limite 30/min).
    // Le WS prend le relais quand il est connectÃ© ; le debounce protÃ¨ge le
    // fallback HTTP.
    var _pushSharedTimer = null;
    var _pushSharedRaw;
    b.friends._pushShared = function(immediate) {
        if (_pushSharedTimer) clearTimeout(_pushSharedTimer);
        if (immediate) {
            _pushSharedRaw();
            return;
        }
        _pushSharedTimer = setTimeout(function() {
            _pushSharedTimer = null;
            _pushSharedRaw();
        }, 2000);
    };

    // Forcer un push synchrone via sendBeacon au moment du refresh/fermeture
    // sendBeacon garantit l'envoi mÃªme si la page est en train de se fermer
    window.addEventListener("beforeunload", function() {
        var orders = [];
        if (b.commander && typeof b.commander.getOrders === "function") {
            var ACTIVE = ["wait", "start", "success"];
            b.commander.getOrders().forEach(function(cmd) {
                if (ACTIVE.indexOf(cmd.state) === -1) return;
                var s = cmd.serialize();
                if (!s || !s.opts) return;
                orders.push({
                    id:       s.id,
                    state:    s.state,
                    status:   s.status || "",
                    action:   s.action || "attack",
                    accuracy: s.accuracy || 0,
                    dodge:    s.dodge || 0,
                    spell:    s.spell,
                    spells:   s.spells || [],
                    hero:     s.hero,
                    opts:     s.opts
                });
            });
        }
        var payload = JSON.stringify({
            player_id: getMyId(),
            world:     getWorld(),
            orders:    orders
        });
        try {
            navigator.sendBeacon(VPS + "/friends/share-beacon", new Blob([payload], { type: "application/json" }));
        } catch(e) {}
    });

    _pushSharedRaw = function() {
        var attacks = null;
        var orders  = null;
        var ACTIVE_ATTACK_STATES  = ["waiting", "confirmed", "dodge_pending", "militia_pending"];
        var PERSIST_ATTACK_STATES = ["waiting", "confirmed", "dodge_pending", "militia_pending", "spam", "disappeared"];
        var ACTIVE_ORDER_STATES   = ["wait", "start", "success"];

        var hasFriendsWithAttacks = (b.friends._list || []).some(function(f) {
            return f.status === "accepted" && f.share_attacks;
        });

        // Collecter les attaques actives
        if (b.herald) {
            attacks = [];
            var now = Timestamp.server();
            angular.forEach(b.herald.town, function(townData) {
                angular.forEach(townData.attack, function(atk) {
                    if (atk.test === true) return;
                    if (atk.time <= now) return;
                    if (PERSIST_ATTACK_STATES.indexOf(atk.status) === -1) return;
                    // Enrichir player_name/id via WMap.mapData
                    var _wmapFrom = WMap.mapData.getTown(atk.from.id);
                    var _fromPName = atk.from.player_name || (_wmapFrom && _wmapFrom.player_name) || "";
                    var _fromPId   = atk.from.player_id   || (_wmapFrom && _wmapFrom.player_id)   || null;
                    // player_name de la ville dÃ©fendÃ©e (toujours le joueur lui-mÃªme)
                    var _toPName = Game.player_name || "";
                    var _toPId   = String(Game.player_id || "");
                    attacks.push({
                        id:        atk.id,
                        time:      atk.time,
                        cs:        atk.cs || false,
                        status:    atk.status,
                        dodge:     atk.dodge     || false,
                        dodgeType: atk.dodgeType || 'all',
                        militia:   atk.militia   || false,
                        spells:    atk.spells    || [],
                        // DonnÃ©es de dÃ©tection pour persistance du calcul % au refresh
                        _remainingAtDetection: atk._remainingAtDetection || null,
                        _distDurations:        atk._distDurations        || null,
                        distance:              atk.distance              || null,
                        _manualSentTs:         atk._manualSentTs         || null,
                        from: {
                            id:          atk.from.id,
                            name:        atk.from.name || "",
                            player_name: _fromPName,
                            player_id:   _fromPId !== null && _fromPId !== undefined ? _fromPId : null
                        },
                        to: {
                            id:          atk.to.id,
                            name:        atk.to.name || "",
                            player_name: _toPName,
                            player_id:   _toPId
                        }
                    });
                });
            });
        }

        // Collecter les ordres actifs â€” toujours pour sauvegarde VPS
        orders = [];
        if (b.commander && typeof b.commander.getOrders === "function") {
            var allOrders = b.commander.getOrders();
            allOrders.forEach(function(cmd) {
                if (ACTIVE_ORDER_STATES.indexOf(cmd.state) === -1) return;
                var s = cmd.serialize();
                if (!s || !s.opts) return;
                orders.push({
                    id:       s.id,
                    state:    s.state,
                    status:   s.status || "",
                    action:   s.action || "attack",
                    accuracy: s.accuracy || 0,
                    dodge:    s.dodge || 0,
                    spell:    s.spell,
                    spells:   s.spells || [],
                    hero:     s.hero,
                    opts:     s.opts
                });
            });
        } else {
        }

        // Ne pas partager les ordres de test (id commenÃ§ant par "demo-")
        if (b.commander && typeof b.commander.devMode === 'function' && b.commander.devMode()) {
            orders = orders.filter(function(o) { return !o.id || String(o.id).indexOf('demo-') !== 0; });
        }

        // Conseillers Grepolis actifs
        var advisors = {
            captain:   bot.checkPremium("captain"),
            commander: bot.checkPremium("commander"),
            curator:   bot.checkPremium("curator"),
            priest:    bot.checkPremium("priest"),
            trader:    bot.checkPremium("trader")
        };

        // Mettre Ã  jour le scope Angular du panneau settings si ouvert
        try {
            var _settingsEl = document.querySelector('.botSettings');
            if (_settingsEl) {
                var _scope = angular.element(_settingsEl).scope();
                if (_scope && _scope.data && _scope.data.premiumGrepolis) {
                    var _changed = Object.keys(advisors).some(function(k) {
                        return _scope.data.premiumGrepolis[k] !== advisors[k];
                    });
                    if (_changed) {
                        _scope.$evalAsync(function() {
                            _scope.data.premiumGrepolis.curator  = advisors.curator;
                            _scope.data.premiumGrepolis.captain  = advisors.captain;
                        });
                    }
                }
            }
        } catch(e) {}

        // Collecter les ids dismissÃ©s (attaques et ordres d'amis masquÃ©s)
        var dismissed = {};
        var _nowSec = Timestamp.server();
        if (b.herald && b.herald._dismissedAttacks) {
            Object.keys(b.herald._dismissedAttacks).forEach(function(id) {
                if (b.herald._dismissedAttacks[id] > _nowSec) dismissed[id] = b.herald._dismissedAttacks[id];
            });
        }
        if (b.commander && b.commander._dismissedOrders) {
            Object.keys(b.commander._dismissedOrders).forEach(function(id) {
                if (b.commander._dismissedOrders[id] > _nowSec) dismissed[id] = b.commander._dismissedOrders[id];
            });
        }

        // â”€â”€ Troupes : collecter si au moins un ami accepte le partage â”€â”€â”€â”€â”€â”€â”€â”€
        var troops = undefined;
        var _hasFriendsWithTroops = (b.friends._list || []).some(function(f) {
            return f.status === "accepted" && f.share_troops;
        });
        if (_hasFriendsWithTroops && b.troops && typeof b.troops.collect === "function") {
            try {
                var _collected = b.troops.collect();
                if (_collected && Object.keys(_collected).length) troops = _collected;
            } catch(e) {}
        }

        // â”€â”€ Modules premium et statut admin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        var premiumModules = {};
        try {
            if (b.premiumModules) {
                Object.keys(b.premiumModules).forEach(function(k) {
                    premiumModules[k] = { active: !!b.premiumModules[k] };
                });
            }
        } catch(e) {}
        var isAdmin = !!(b.isAdmin);

        b.friends.share(
            attacks !== null ? (attacks || []) : [],
            orders.length > 0 ? orders : [],
            advisors,
            Object.keys(dismissed).length > 0 ? dismissed : undefined,
            troops,
            undefined,
            Object.keys(premiumModules).length > 0 ? premiumModules : undefined,
            isAdmin || undefined
        );
    };

    // â”€â”€ Helper : rafraÃ®chit le scope du heraldController (mÃªme logique que _refreshHeraldScope dans herald.js) â”€â”€
    function _refreshHerald() {
        if (!b.herald || !b.herald.showAttacksEl) return;
        try {
            var scope = angular.element(b.herald.showAttacksEl[0]).scope();
            if (!scope) return;
            if (scope.$$phase || scope.$root.$$phase) {
                scope.refresh && scope.refresh();
            } else {
                scope.$apply(function() { scope.refresh && scope.refresh(); });
            }
        } catch(e) {}
    }

        // â”€â”€ Injection des donnÃ©es d'un ami dans le herald/commandant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    b.friends._injectFriendData = function(entry) {
        if (!entry) return;
        var fromName = entry.from_name || entry.name || a.t("un ami");
        var ACTIVE_ATTACK_STATES = ["waiting", "confirmed", "dodge_pending", "militia_pending"];
        var ACTIVE_ORDER_STATES  = ["wait", "start", "success", "cancelled_offline"];

        // â”€â”€ Conseillers â†’ mettre Ã  jour sur l'objet ami dans la liste â”€â”€â”€â”€
        if (entry.advisors !== undefined && b.friends._list) {
            var friendEntry = b.friends._list.find(function(f) {
                return f.name === fromName || f.key === (entry.from_key || entry.key);
            });
            if (friendEntry) {
                friendEntry.advisors = entry.advisors;
            }
        }

        if (entry.online !== undefined && b.friends._list) {
            var friendOnline = b.friends._list.find(function(f) {
                return f.name === fromName || f.key === (entry.from_key || entry.key);
            });
            if (friendOnline) {
                friendOnline.online = entry.online;
                if (entry.lastSeen !== undefined) friendOnline.lastSeen = entry.lastSeen;
            }
        }

        // â”€â”€ Modules premium + isAdmin â†’ mettre Ã  jour sur l'objet ami â”€â”€â”€â”€â”€â”€â”€â”€
        if ((entry.premiumModules !== undefined || entry.isAdmin !== undefined) && b.friends._list) {
            var friendMod = b.friends._list.find(function(f) {
                return f.name === fromName || f.key === (entry.from_key || entry.key);
            });
            if (friendMod) {
                if (entry.premiumModules !== undefined) friendMod.premiumModules = entry.premiumModules;
                if (entry.isAdmin        !== undefined) friendMod.isAdmin        = entry.isAdmin;
            }
            // Propager aussi dans les scopes Angular ouverts (s.friends est une copie de _list)
            try {
                document.querySelectorAll('[ng-controller="FriendsController"]').forEach(function(el) {
                    try {
                        var _sc = angular.element(el).scope();
                        if (!_sc || !_sc.friends) return;
                        var _updated = false;
                        _sc.friends.forEach(function(f) {
                            if (f.name === fromName || f.key === (entry.from_key || entry.key)) {
                                if (entry.premiumModules !== undefined) { f.premiumModules = entry.premiumModules; _updated = true; }
                                if (entry.isAdmin        !== undefined) { f.isAdmin        = entry.isAdmin;        _updated = true; }
                            }
                        });
                        if (_updated) _sc.$evalAsync(function() {});
                    } catch(e) {}
                });
            } catch(e) {}
        }



        // â”€â”€ Attaques â†’ synchroniser avec herald â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (entry.attacks !== undefined && b.herald) {
            var now = Timestamp.server();
            var newAttack = false;

            var FINAL_STATES_FRIEND = ["struck", "done", "finished", "cancelled", "spam", "disappeared"];

            var currentAttacks = (entry.attacks || []).filter(function(a) {
                // Ne jamais injecter une attaque dont l'heure d'impact est passÃ©e
                // (Ã©vite l'affichage d'attaques terminÃ©es au rechargement de page)
                if (a.time <= now) return false;
                // Les attaques terminÃ©es (spam/disappeared) ne sont injectÃ©es que si dÃ©jÃ  connues localement
                if (["spam", "disappeared"].indexOf(a.status) !== -1) {
                    var alreadyKnown = (b.herald.import_data || []).some(function(x) { return x.id === a.id; });
                    if (!alreadyKnown) return false;
                }
                return ACTIVE_ATTACK_STATES.indexOf(a.status) !== -1 || FINAL_STATES_FRIEND.indexOf(a.status) !== -1;
            }).map(function(a) {
                // Marquer comme frappÃ©e si l'heure est passÃ©e
                if (a.time <= now && ACTIVE_ATTACK_STATES.indexOf(a.status) !== -1) {
                    a.status = "struck";
                }
                return a;
            });
            var currentAtkIds = currentAttacks.map(function(a) { return a.id; });

            // Retirer les attaques de cet ami qui ne sont plus dans la liste reÃ§ue,
            // SAUF celles dÃ©jÃ  marquÃ©es terminÃ©es en local (restent jusqu'Ã  suppression manuelle)
            if (b.herald.import_data) {
                var _nowFilter = Timestamp.server();
                b.herald.import_data = b.herald.import_data.filter(function(x) {
                    if (x.owner !== fromName) return true;
                    // Toujours garder les attaques terminÃ©es localement â†’ suppression manuelle uniquement
                    if (FINAL_STATES_FRIEND.indexOf(x.status) !== -1) {
                        return true;
                    }
                    // Garder les attaques dont le temps est passÃ© mÃªme si encore en statut pending
                    // (le timer struck n'a pas encore tournÃ© â€” ne pas supprimer avant qu'il passe)
                    if (x.time <= _nowFilter) {
                        x.status = "struck"; // forcer struck immÃ©diatement
                        return true;
                    }
                    var keep = currentAtkIds.indexOf(x.id) !== -1;

                    return keep;
                });
            }

            // Ajouter les nouvelles
            currentAttacks.forEach(function(atk) {
                // Ignorer si l'utilisateur a masquÃ© cette attaque localement
                var _dismissed = b.herald._dismissedAttacks;
                var _now2 = Timestamp.server();
                if (_dismissed && _dismissed[atk.id] && _dismissed[atk.id] > _now2) return;

                var existingIdx = (b.herald.import_data || []).findIndex(function(x) { return x.id === atk.id; });
                if (existingIdx !== -1) {
                    var existing = b.herald.import_data[existingIdx];
                    // Mettre Ã  jour le statut (tous les Ã©tats terminaux, pas seulement "struck")
                    var FINAL_STATES = ["struck", "done", "finished", "cancelled"];
                    if (FINAL_STATES.indexOf(atk.status) !== -1 && existing.status !== atk.status) {
                        existing.status = atk.status;
                    } else if (atk.status && existing.status !== atk.status) {
                        existing.status = atk.status;
                    }
                    // Mettre Ã  jour dodge/militia si l'ami les a modifiÃ©s
                    if (atk.dodge     !== undefined) existing.dodge     = atk.dodge;
                    if (atk.dodgeType !== undefined) existing.dodgeType = atk.dodgeType;
                    if (atk.militia   !== undefined) existing.militia   = atk.militia;
                    // â”€â”€ BUGFIX : synchroniser les sorts choisis par l'ami â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    if (atk.spells !== undefined) existing.spells = atk.spells.slice();
                    if (atk.spell  !== undefined) existing.spell  = atk.spell;
                    // â”€â”€ BUGFIX : synchroniser le badge CS depuis l'ami â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    if (atk.cs        !== undefined) existing.cs        = atk.cs;
                    if (atk.deviation !== undefined) existing.deviation = atk.deviation;
                    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    // Mettre Ã  jour player_name si on l'a maintenant et reconstruire le lien
                    if (atk.from && atk.from.player_name && !existing.from.player_name) {
                        existing.from.player_name = atk.from.player_name;
                        existing.from.player_id   = atk.from.player_id;
                        var _fn2  = existing.from.name || String(existing.from.id);
                        var _fp2  = atk.from.player_name;
                        var _pid2 = atk.from.player_id || null;
                        var _pf2  = _pid2 ? btoa(JSON.stringify({ id: _pid2, name: _fp2 })) : null;
                        var _ph2  = _pf2 ? " href='#" + _pf2 + "'" : " href='#'";
                        var _pa2  = _pid2 ? " data-player-id='" + _pid2 + "'" : "";
                        var _ff2  = btoa(JSON.stringify({ id: existing.from.id, name: _fn2 }));
                        existing.from.link = "(<a class='gp_player_link'" + _ph2 + " data-player-name='" + _fp2 + "'" + _pa2 + " style='color:inherit;'>" + _fp2 + "</a>) <a class='gp_town_link' href='#" + _ff2 + "'>" + _fn2 + "</a>";
                    } else if (existing.from && existing.from.id && !existing.from.player_name
                               && !_playerResolvePending[existing.from.id]
                               && !(b.herald && b.herald._playerResolvePending && b.herald._playerResolvePending[existing.from.id])) {
                        // Pas de player_name â†’ appel async town_info
                        // Verrou anti-boucle : une seule tentative par ville (village IA = jamais de player_name)
                        _playerResolvePending[existing.from.id] = true;
                        (function(_existing) {
                            b.ajaxRequestGet('town_info', 'info', { id: _existing.from.id, town_id: b.lastTownId, nl_init: true }, function(bot, r) {
                                if (!r || !r.html) {
                                    // Erreur rÃ©seau â†’ libÃ©rer le verrou pour permettre un retry ultÃ©rieur
                                    delete _playerResolvePending[_existing.from.id];
                                    return;
                                }
                                var pidMatch   = r.html.match(/data-player="(\d+)"/);
                                var pnameMatch = r.html.match(/data-player_name="([^"]+)"/);
                                if (pidMatch && pnameMatch) {
                                    var pid   = parseInt(pidMatch[1]);
                                    var pname = pnameMatch[1].trim();
                                    _existing.from.player_name = pname;
                                    _existing.from.player_id   = pid;
                                    var _fn = _existing.from.name || String(_existing.from.id);
                                    var _pf = btoa(JSON.stringify({ id: pid, name: pname }));
                                    var _ff = btoa(JSON.stringify({ id: _existing.from.id, name: _fn }));
                                    _existing.from.link = "(<a class='gp_player_link' href='#" + _pf + "' data-player-name='" + pname + "' data-player-id='" + pid + "' style='color:inherit;'>" + pname + "</a>) <a class='gp_town_link' href='#" + _ff + "'>" + _fn + "</a>";
                                    _refreshHerald();
                                }
                                // Pas de pnameMatch â†’ village IA sans joueur,
                                // _playerResolvePending reste true â†’ plus aucun retry en boucle
                            });
                        })(existing);
                    }
                    return;
                }
                atk.owner  = fromName;
                atk.isOwn  = false;
                // Construire les liens en utilisant player_name reÃ§u si disponible
                if (!atk.from.link) {
                    var _fromName = atk.from.name || String(atk.from.id);
                    var _fromPlayer = atk.from.player_name || "";
                    var _fromLink;
                    if (_fromPlayer) {
                        var _fromFrag = btoa(JSON.stringify({ id: atk.from.id, name: _fromName }));
                        var _pId = atk.from.player_id || null;
                        var _pFrag = _pId ? btoa(JSON.stringify({ id: _pId, name: _fromPlayer })) : null;
                        var _pHref = _pFrag ? " href='#" + _pFrag + "'" : " href='#'";
                        var _pAttr = _pId ? " data-player-id='" + _pId + "'" : "";
                        _fromLink = "(<a class='gp_player_link'" + _pHref + " data-player-name='" + _fromPlayer + "'" + _pAttr + " style='color:inherit;'>" + _fromPlayer + "</a>) <a class='gp_town_link' href='#" + _fromFrag + "'>" + _fromName + "</a>";
                    } else {
                        // Pas de joueur connu = village IA â†’ texte brut, pas de lien cliquable
                        _fromLink = "<span>" + _fromName + "</span>";
                    }
                    atk.from.link = _fromLink;
                }
                if (!atk.to.link) {
                    var _toName = atk.to.name || String(atk.to.id);
                    var _toLink;
                    if (atk.to.player_name) {
                        var _toFrag = btoa(JSON.stringify({ id: atk.to.id, name: _toName }));
                        _toLink = "<a class='gp_town_link' href='#" + _toFrag + "'>" + _toName + "</a>";
                        var _toPId2 = atk.to.player_id || null;
                        var _toPAttr = _toPId2 ? " data-player-id='" + _toPId2 + "'" : "";
                        _toLink = _toLink + " (<a class='gp_player_link' href='#' data-player-name='" + atk.to.player_name + "'" + _toPAttr + " style='color:inherit;'>" + atk.to.player_name + "</a>)";
                    } else {
                        // Pas de joueur connu = village IA â†’ texte brut, pas de lien cliquable
                        _toLink = "<span>" + _toName + "</span>";
                    }
                    atk.to.link = _toLink;
                }
                if (!b.herald.import_data) b.herald.import_data = [];
                b.herald.import_data.push(atk);
                var _atkKey = fromName + "_" + atk.time;
                if (!_notifiedFriendAttackKeys[_atkKey]) {
                    newAttack = true;
                }
                // Timer prÃ©cis : marquer "struck" exactement Ã  l'heure d'arrivÃ©e
                (function(_atk) {
                    var _delay = (_atk.time - Timestamp.server()) * 1e3;
                    if (_delay <= 0) return; // dÃ©jÃ  passÃ©e, dÃ©jÃ  traitÃ©e plus haut
                    setTimeout(function() {
                        var _activeStatuses = ["waiting", "confirmed", "dodge_pending", "militia_pending"];
                        if (_activeStatuses.indexOf(_atk.status) !== -1) {
                            _atk.status = "struck";
                            _refreshHerald();
                        }
                    }, _delay);
                })(atk);
            });

            // RafraÃ®chir l'affichage Angular du herald
            _refreshHerald();

            if (newAttack && b.sett.herald_friend_notify !== false) {
                // Marquer toutes les attaques de cet envoi comme notifiÃ©es (clÃ© = nomAmi_heureArrivÃ©e)
                currentAttacks.forEach(function(atk) {
                    _notifiedFriendAttackKeys[fromName + "_" + atk.time] = true;
                });
                var fromId = (entry.from_key || entry.key || "").split(":")[0];
                var nameHtml = fromId
                    ? "<a class='gp_player_link' href='#' data-player-name='" + fromName + "' data-player-id='" + fromId + "' style='pointer-events:auto;color:#a0522d;'>" + fromName + "</a>"
                    : "<strong>" + fromName + "</strong>";
                a.ui.message(a.t("Attaque sur les citÃ©s de ") + nameHtml + " !", "ally", 20, "Friends"); // key "Attaque sur les citÃ©s de " already in i18n
            }
        }

        // â”€â”€ Ordres â†’ synchroniser avec commandant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (entry.orders !== undefined && b.commander) {
            var now = Timestamp.server();
            var GRACE_SECONDS = 10; // dÃ©lai aprÃ¨s heure de dÃ©part avant de marquer "dÃ©connectÃ©"

            // RÃ©cupÃ©rer les IDs dÃ©jÃ  connus AVANT le filtre
            var existingEntry = b.commander._friendOrders && b.commander._friendOrders[fromName];
            var existingList  = existingEntry ? (Array.isArray(existingEntry) ? existingEntry : (existingEntry.orders || [])) : [];
            var existingIds   = existingList.map(function(o) { return o.id; });

            var TERMINAL_STATES = ["success", "cancelled_offline"];

            var currentOrders = (entry.orders || []).filter(function(o) {
                if (ACTIVE_ORDER_STATES.indexOf(o.state) === -1) return false;
                // Ne pas rÃ©afficher un ordre que l'utilisateur a supprimÃ©
                // ClÃ© composite "friend_nomAmi_id_time" â€” on inclut opts.time pour rester
                // unique mÃªme si deux ordres partagent le mÃªme id (bug compteur cÃ´tÃ© ami)
                var _dis = b.commander._dismissedOrders;
                var _friendKey = "friend_" + fromName + "_" + o.id + "_" + (o.opts && o.opts.time ? o.opts.time : "");
                if (_dis && _dis[_friendKey] && _dis[_friendKey] > now) return false;
                // Heure de dÃ©part dÃ©passÃ©e et pas encore success â†’ marquer cancelled_offline
                var departAt = o.opts && o.opts.time && o.opts.duration
                    ? o.opts.time - o.opts.duration
                    : (o.opts && o.opts.time ? o.opts.time : 0);
                if (departAt > 0 && departAt < now && o.state !== "success") {
                    if ((now - departAt) > GRACE_SECONDS) {
                        o.state = "cancelled_offline";
                    }
                }
                return true;
            });
            var currentOrdIds = currentOrders.map(function(o) { return o.id; });

            // â”€â”€ FUSION : conserver les ordres terminaux dÃ©jÃ  connus localement
            // que l'ami a retirÃ©s de son push (autoremove aprÃ¨s success, etc.)
            // Sans Ã§a, l'ordre "success" disparaÃ®t dÃ¨s que l'ami le supprime cÃ´tÃ© lui.
            var preserved = existingList.filter(function(o) {
                if (currentOrdIds.indexOf(o.id) !== -1) return false; // dÃ©jÃ  dans le push
                var _dis = b.commander._dismissedOrders;
                var _friendKey = "friend_" + fromName + "_" + o.id + "_" + (o.opts && o.opts.time ? o.opts.time : "");
                if (_dis && _dis[_friendKey] && _dis[_friendKey] > now) return false; // masquÃ©
                return TERMINAL_STATES.indexOf(o.state) !== -1; // garder success + cancelled_offline
            });

            var mergedOrders = currentOrders.concat(preserved);

            // DÃ©tecter les nouveaux ordres actifs (wait/start uniquement)
            var newOrders = currentOrders.filter(function(o) {
                return TERMINAL_STATES.indexOf(o.state) === -1
                    && existingIds.indexOf(o.id) === -1;
            });

            // Stocker (fusion, pas remplacement brut)
            if (!b.commander._friendOrders) b.commander._friendOrders = {};
            var playerId = (entry.from_key || entry.key || "").split(":")[0];
            b.commander._friendOrders[fromName] = { orders: mergedOrders, playerId: playerId };

            // RafraÃ®chir si la fenÃªtre Commandant est ouverte
            var _cs = b.commander._ctrlScope;
            if (_cs && _cs.reload) {
                try { _cs.reload(); } catch(e) {}
            }

            // Notifier uniquement pour les vrais nouveaux ordres
            if (newOrders.length > 0 && b.sett.commander_friend_notify !== false) {
                var nameHtmlOrd = playerId
                    ? "<a class='gp_player_link' href='#' data-player-name='" + fromName + "' data-player-id='" + playerId + "' style='pointer-events:auto;color:#a0522d;'>" + fromName + "</a>"
                    : "<strong>" + fromName + "</strong>";
                a.ui.message(a.format(a.t("{0} a {1} nouvel/nouveaux ordre(s) de combat"), nameHtmlOrd, newOrders.length), "ally", 15, "Friends");
            }
        }

        // â”€â”€ Troupes â†’ mettre Ã  jour le cache (b.troops._cache) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        if (entry.troops !== undefined && b.troops && b.troops._cache !== undefined) {
            var troopsKey = entry.from_key || entry.key;
            if (troopsKey) {
                b.troops._cache[troopsKey] = { towns: entry.troops, ts: Date.now(), fromName: fromName };
                // RafraÃ®chir le panneau si ouvert
                $(".gfb-troops-town-panel[data-friend-key='" + troopsKey + "']").each(function() {
                    var townId = $(this).data("town-id");
                    if (b.troops && typeof b.troops._buildTownContent === "function") {
                        $(this).html(b.troops._buildTownContent(troopsKey, townId));
                    }
                });
            }
        }
    };

    // â”€â”€ Polling : donnÃ©es amis + restauration propres ordres â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function pollFriendsData() {
        b.friends.poll(function(results, ownOrders, ownAttacks, ownDismissed, ownWallKills) {
            // Restaurer les ids dismissÃ©s depuis le VPS
            if (ownDismissed && typeof ownDismissed === "object") {
                var _nowSec = Timestamp.server();
                // Attaques d'amis masquÃ©es
                if (!b.herald._dismissedAttacks) b.herald._dismissedAttacks = {};
                // Ordres d'amis masquÃ©s
                if (!b.commander._dismissedOrders) b.commander._dismissedOrders = {};
                Object.keys(ownDismissed).forEach(function(id) {
                    var expires = ownDismissed[id];
                    if (expires <= _nowSec) return; // expirÃ©
                    // Stocker dans les deux â€” on ne sait pas si c'est une attaque ou un ordre
                    b.herald._dismissedAttacks[id] = expires;
                    b.commander._dismissedOrders[id] = expires;
                });
            }
            // Restaurer ses propres ordres depuis le VPS
            if (b.commander) {
                var now = Timestamp.server();

                if (ownOrders && ownOrders.length) {
                    // Signature : ID serveur si disponible, sinon time+town+target+units
                    function _sig(opts, id) {
                        var units = (opts.units || []).map(function(u) { return u.id + ":" + u.count; }).sort().join(",");
                        var base = opts.time + "_" + (opts.town && opts.town.id) + "_" + (opts.target && opts.target.id) + "_" + units;
                        // On inclut l'id seulement s'il est fiable (non nul ET diffÃ©rent entre ordres)
                        // On prÃ©fÃ¨re la signature basÃ©e sur les donnÃ©es rÃ©elles pour Ã©viter
                        // les collisions quand deux ordres ont le mÃªme id (bug de compteur)
                        return base;
                    }

                    var existingSigs = b.commander.getOrders().map(function(cmd) {
                        var s = cmd.serialize();
                        if (!s || !s.opts) return "";
                        return _sig(s.opts, s.id);
                    });

                    ownOrders.forEach(function(o) {
                        if (!o.opts || !o.opts.time) return;
                        // Pour les ordres dÃ©jÃ  partis (start), on restaure si l'arrivÃ©e n'est pas encore passÃ©e
                        if (o.state === "start") {
                            if (o.opts.time <= now) return; // arrivÃ©e passÃ©e = inutile
                        } else {
                            // Pour les ordres en attente, vÃ©rifier que le dÃ©part n'est pas passÃ©
                            var departAt = o.opts.duration ? o.opts.time - o.opts.duration : o.opts.time;
                            if (departAt <= now) return;
                        }
                        var sig = _sig(o.opts, o.id);
                        if (existingSigs.indexOf(sig) !== -1) return;
                        var createOpts = Object.assign({}, o.opts, {
                            id:       o.id,
                            action:   o.action || (o.opts && o.opts.action),
                            accuracy: o.accuracy || 0,
                            dodge:    o.dodge || 0,
                            spell:    o.spell,
                            hero:     o.hero,
                            save:     false,
                            silent:   true,
                            loaded:   true,
                            state:    o.state  // prÃ©server l'Ã©tat (ex: "start")
                        });
                        b.commander.create(createOpts);
                        existingSigs.push(sig);
                    });
                }

                // Repousser l'Ã©tat actuel vers le VPS pour nettoyer les ordres expirÃ©s
                // DÃ©lai augmentÃ© Ã  10s pour laisser tous les ordres Ãªtre restaurÃ©s en mÃ©moire
                // avant d'envoyer la liste complÃ¨te au VPS
                setTimeout(function() {
                    if (b.friends && typeof b.friends._pushShared === "function") {
                        b.friends._pushShared();
                    }
                }, 10000);
            }

            // Restaurer les prÃ©fÃ©rences dodge/militia/spells depuis le VPS
            if (b.herald && ownAttacks && ownAttacks.length) {
                var _now = Timestamp.server();
                if (!b.herald._attackPrefs) b.herald._attackPrefs = {};
                ownAttacks.forEach(function(atk) {
                    if (!atk || !atk.id || !atk.time) return;
                    if (atk.time <= _now) return; // expirÃ©e
                    if (!atk.dodge && !atk.militia && (!atk.spells || !atk.spells.length)
                        && !atk._remainingAtDetection && !atk._distDurations && !atk._manualSentTs) return; // rien Ã  restaurer
                    // Stocker pour les attaques futures (inclut les donnÃ©es de dÃ©tection dÃ¨s le dÃ©part)
                    b.herald._attackPrefs[atk.id] = {
                        dodge:                 atk.dodge                 || false,
                        dodgeType:             atk.dodgeType             || 'all',
                        militia:               atk.militia               || false,
                        spells:                atk.spells                || [],
                        expires:               atk.time,
                        _remainingAtDetection: atk._remainingAtDetection || null,
                        _distDurations:        atk._distDurations        || null,
                        distance:              atk.distance              || null,
                        _manualSentTs:         atk._manualSentTs         || null
                    };
                    // Appliquer immÃ©diatement si l'attaque est dÃ©jÃ  dans b.herald.town
                    if (atk.to && atk.to.id && b.herald.town[atk.to.id]) {
                        var _existing = b.herald.town[atk.to.id].attack[atk.id];
                        if (_existing) {
                            _existing.dodge     = atk.dodge     || false;
                            _existing.dodgeType = atk.dodgeType || 'all';
                            _existing.militia   = atk.militia   || false;
                            if (atk.spells && atk.spells.length) _existing.spells = atk.spells.slice();
                            // Restaurer cs depuis le VPS
                            if (atk.cs        !== undefined) _existing.cs        = atk.cs;
                            if (atk.deviation !== undefined) _existing.deviation = atk.deviation;
                            // Restaurer les donnÃ©es de dÃ©tection (TOUJOURS depuis VPS, pas depuis boot)
                            if (atk._remainingAtDetection) {
                                _existing._remainingAtDetection = atk._remainingAtDetection;
                                delete _existing._bootLoaded;
                            }
                            if (atk._distDurations) {
                                _existing._distDurations = atk._distDurations;
                            }
                            if (atk.distance) {
                                _existing.distance = atk.distance;
                            }
                            if (atk._manualSentTs) {
                                _existing._manualSentTs   = atk._manualSentTs;
                                _existing._manualDetection = true;
                            }
                        }
                    }
                });
                // Nettoyer les prefs expirÃ©es
                Object.keys(b.herald._attackPrefs).forEach(function(id) {
                    if (b.herald._attackPrefs[id].expires <= _now) {
                        delete b.herald._attackPrefs[id];
                    }
                });
                // RafraÃ®chir l'affichage si fenÃªtre ouverte
                _refreshHerald();
            }

            // Restaurer les wall_kills depuis le VPS â†’ repeupler b.wall_kills._pending
            if (ownWallKills && typeof ownWallKills === "object" && Object.keys(ownWallKills).length > 0) {
                if (b.wall_kills && typeof b.wall_kills._restorePending === "function") {
                    b.wall_kills._restorePending(ownWallKills);
                }
            }

            // Injecter les donnÃ©es des amis
            if (!results || !results.length) return;
            var _nowInject = Timestamp.server();
            results.forEach(function(entry) {
                // Pour les amis offline, filtrer les ordres expirÃ©s avant d'injecter
                if (entry.online === false && entry.orders && entry.orders.length) {
                    var entryFiltered = Object.assign({}, entry);
                    entryFiltered.orders = entry.orders.filter(function(o) {
                        if (!o.opts || !o.opts.time) return false;
                        if (o.state === "start") return o.opts.time > _nowInject;
                        var departAt = o.opts.duration ? o.opts.time - o.opts.duration : o.opts.time;
                        return departAt > _nowInject;
                    });
                    b.friends._injectFriendData(entryFiltered);
                } else {
                    b.friends._injectFriendData(entry);
                }
            });

            // Mettre Ã  jour tous les scopes FriendsController (settings + fenÃªtre flottante)
            try {
                var _fcAll = document.querySelectorAll('[ng-controller="FriendsController"]');
                _fcAll.forEach(function(_fc) {
                    try {
                        var _fscope = angular.element(_fc).scope();
                        if (!_fscope || !_fscope.friends) return;
                        var _updated = false;
                        results.forEach(function(entry) {
                            var fromName = entry.from_name || entry.name;
                            _fscope.friends.forEach(function(f) {
                                if (f.name === fromName || f.key === (entry.from_key || entry.key)) {
                                    if (entry.advisors !== undefined && entry.advisors !== f.advisors) {
                                        f.advisors = entry.advisors;
                                        _updated = true;
                                    }
                                    if (entry.premiumModules !== undefined) {
                                        var _newPm = JSON.stringify(entry.premiumModules);
                                        if (_newPm !== JSON.stringify(f.premiumModules)) {
                                            f.premiumModules = entry.premiumModules;
                                            _updated = true;
                                        }
                                    }
                                    if (entry.online !== undefined && entry.online !== f.online) {
                                        f.online = entry.online;
                                        _updated = true;
                                    }
                                    if (entry.lastSeen !== undefined && entry.lastSeen !== f.lastSeen) {
                                        f.lastSeen = entry.lastSeen;
                                        _updated = true;
                                    }
                                    if (entry.isAdmin !== undefined && entry.isAdmin !== f.isAdmin) {
                                        f.isAdmin = entry.isAdmin;
                                        _updated = true;
                                    }
                                }
                            });
                        });
                        if (_updated) {
                            _fscope.$evalAsync(function() {});
                        }
                    } catch(e) {}
                });
            } catch(e) {}
        });
    }

    // Les donnÃ©es amis arrivent en temps rÃ©el via WS (type: FRIEND_DATA)
    // gÃ©rÃ© dans core.js â†’ connectPremiumWS â†’ ws.onmessage â†’ _injectFriendData()
    // pollFriendsData() est appelÃ© une seule fois au dÃ©marrage pour :
    //   - restaurer own_orders et own_attacks (ordres/attaques du joueur sauvegardÃ©s sur le VPS)
    //   - restaurer dismissed
    //   - snapshot initial des amis dÃ©jÃ  connectÃ©s
    pollFriendsData();
    // Poll de secours toutes les 5 minutes : si un ami est offline depuis longtemps,
    // son bot ne push plus rien via WS. Ce poll garantit qu'on re-fetch quand mÃªme
    // ses troupes (et autres donnÃ©es) depuis le serveur qui les conserve en mÃ©moire.
    setInterval(function() { pollFriendsData(); }, 5 * 60 * 1000);
    // Exposer pour appel externe (ex: ouverture fenÃªtre amis â€” force un refresh ponctuel)
    b.friends._poll = pollFriendsData;

    // Poll du statut online des amis toutes les 60s
    // PrÃ©fÃ¨re le WS (dÃ©jÃ  connectÃ©) â€” tombe sur HTTP seulement si WS absent
    setInterval(function() {
        if (!b.friends) return;
        var ws = null;
        try { ws = (typeof a !== "undefined" && a.ctx && a.ctx._premiumWS) || null; } catch(e) {}
        if (!ws) { try { ws = window._grepoCtx && window._grepoCtx._premiumWS; } catch(e) {} }
        if (ws && ws.readyState === 1) {
            // Mise Ã  jour via WS â€” le serveur pushera FRIEND_ONLINE_STATUS ou WS_REPLY
            try {
                var _myId   = String(Game.player_id);
                var _myName = "";
                try { var _m2 = MM.getModels(); _myName = _m2.Player[Object.keys(_m2.Player)[0]].getName(); } catch(e2) { _myName = Game.player_name || ""; }
                ws.send(JSON.stringify({ type: "FRIENDS_LIST_REQUEST", player_id: _myId, player_name: _myName, world: window.location.hostname.split(".")[0] }));
            } catch(e) {}
        } else {
            // Fallback HTTP uniquement si WS fermÃ©
            if (typeof b.friends.load === "function") b.friends.load();
        }
    }, 60 * 1000);

    // â”€â”€ Partage automatique toutes les 3 minutes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Pousse les attaques vers le VPS qui notifie les amis en temps rÃ©el via WS

    c("info", "Loaded"); window._gfbot_module_loaded && window._gfbot_module_loaded("Amis", true);

}).call(this);
