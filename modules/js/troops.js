(function() {
    "use strict";
    var a = this;
    var b = a.bot;
    var c = a.logger.create("Troops");
    var VPS = "https://grepoplus.duckdns.org";

    var HELMET = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMTY1Ij48c3R5bGU+Lmh7ZmlsbDojOEI2OTE0fS5oaHtmaWxsOiNDOUE4NEN9Lmhze2ZpbGw6IzVDNDIwOX0uaGR7ZmlsbDojM0QyQjA1fS5we2ZpbGw6IzhCMUExQX0ucGh7ZmlsbDojQzIzMDMwfTwvc3R5bGU+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwtOCkiPjxlbGxpcHNlIGN4PSIxMDAiIGN5PSIyOCIgcng9IjgiIHJ5PSIyMiIgY2xhc3M9InBoIiB0cmFuc2Zvcm09InJvdGF0ZSgtOCwxMDAsMjgpIi8+PGVsbGlwc2UgY3g9IjEwMCIgY3k9IjI2IiByeD0iNSIgcnk9IjIwIiBjbGFzcz0icCIgdHJhbnNmb3JtPSJyb3RhdGUoLTgsMTAwLDI2KSIvPjxwYXRoIGQ9Ik03MCAzOCBRMTAwIDEwIDEzMCAzOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQzIzMDMwIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTMwIDEwMCBRMjggNjggNDAgNTIgUTU1IDMwIDEwMCAyOCBRMTQ1IDMwIDE2MCA1MiBRMTcyIDY4IDE3MCAxMDBaIiBjbGFzcz0iaCIvPjxwYXRoIGQ9Ik01MCA5NSBRNDggNjggNTggNTQgUTcwIDM4IDEwMCAzNiBRMTMwIDM4IDEzOCA1MiBRMTQ2IDY0IDE0NCA5MFoiIGNsYXNzPSJoaCIgb3BhY2l0eT0iLjQiLz48cGF0aCBkPSJNMzAgMTAwIFEyOCAxMTUgMzUgMTI1IFE1MCAxNDAgMTAwIDE0MiBRMTUwIDE0MCAxNjUgMTI1IFExNzIgMTE1IDE3MCAxMDBaIiBjbGFzcz0iaHMiLz48cGF0aCBkPSJNMzAgMTAwIFEyMiAxMDggMjAgMTI1IFEyMiAxMzggMzUgMTQyIFE0MCAxMzggMzUgMTI1WiIgY2xhc3M9ImhzIi8+PHBhdGggZD0iTTE3MCAxMDAgUTE3OCAxMDggMTgwIDEyNSBRMTc4IDEzOCAxNjUgMTQyIFExNjAgMTM4IDE2NSAxMjVaIiBjbGFzcz0iaHMiLz48cmVjdCB4PSI5MyIgeT0iOTgiIHdpZHRoPSIxNCIgaGVpZ2h0PSIzMiIgcng9IjQiIGNsYXNzPSJoZCIvPjxyZWN0IHg9Ijk1IiB5PSIxMDAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIyOCIgcng9IjMiIGNsYXNzPSJocyIvPjxjaXJjbGUgY3g9IjU1IiBjeT0iNzAiIHI9IjQiIGNsYXNzPSJoZCIvPjxjaXJjbGUgY3g9IjU1IiBjeT0iNzAiIHI9IjIiIGNsYXNzPSJoaCIvPjxjaXJjbGUgY3g9IjE0NSIgY3k9IjcwIiByPSI0IiBjbGFzcz0iaGQiLz48Y2lyY2xlIGN4PSIxNDUiIGN5PSI3MCIgcj0iMiIgY2xhc3M9ImhoIi8+PHBhdGggZD0iTTMwIDEwMCBRMjggNjggNDAgNTIgUTU1IDMwIDEwMCAyOCBRMTQ1IDMwIDE2MCA1MiBRMTcyIDY4IDE3MCAxMDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0M5QTg0QyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTMwIDEwMCBRMjggMTE1IDM1IDEyNSBRNTAgMTQyIDEwMCAxNDQgUTE1NCAxNDIgMTY1IDEyNSBRMTcyIDExNSAxNzAgMTAwIiBmaWxsPSJub25lIiBzdHJva2U9IiM4QjY5MTQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PC9nPjwvc3ZnPg==";

    var BADGE_HTML =
        '<span style="display:inline-flex;align-items:center;vertical-align:middle;' +
        'font-family:Georgia,serif;font-size:7pt;font-weight:700;color:#c9a84c;' +
        'letter-spacing:1.5px;text-transform:uppercase;' +
        'background:linear-gradient(135deg,#0d1117,#1a2332);' +
        'border:1px solid rgba(201,168,76,0.35);border-radius:4px;padding:2px 7px;">' +
        'GrepoPlus</span>';

    function makeHeaderBadge(id) {
        return '<span' + (id ? ' id="' + id + '"' : '') + ' style="' +
            'display:inline-flex;align-items:center;vertical-align:middle;margin-left:8px;gap:4px;' +
            'font-family:Georgia,serif;font-size:7pt;font-weight:700;color:#c9a84c;' +
            'letter-spacing:1.5px;text-transform:uppercase;' +
            'background:linear-gradient(135deg,#0d1117,#1a2332);' +
            'border:1px solid rgba(201,168,76,0.35);border-radius:4px;padding:3px 7px 3px 5px;line-height:1;">' +
            '<img src="' + HELMET + '" style="width:14px;height:14px;display:block;" />' +
            '<span style="line-height:1;">GrepoPlus</span>' +
        '</span>';
    }

    function getWorld() { return window.location.hostname.split(".")[0]; }
    function getMyId()  { return String(Game.player_id); }

    // â”€â”€ Formatage date lastSeen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function formatLastSeen(isoStr) {
        var _t = ctx.t || function(s) { return s; };
        if (!isoStr) return null;
        try {
            var d = new Date(isoStr);
            var now = new Date();
            var diffMin = Math.floor((now - d) / 60000);
            var diffH   = Math.floor(diffMin / 60);
            var diffD   = Math.floor(diffH / 24);
            if (diffMin < 2)  return _t("Ã  l'instant");
            if (diffMin < 60) return _t("il y a {0} min").replace("{0}", diffMin);
            if (diffH < 24)   return _t("il y a {0}h").replace("{0}", diffH);
            if (diffD < 2)    return _t("hier");
            if (diffD < 7)    return _t("il y a {0} jours").replace("{0}", diffD);
            var dd = String(d.getDate()).padStart(2,"0");
            var mm = String(d.getMonth()+1).padStart(2,"0");
            var yy = d.getFullYear();
            return _t("le {0} Ã  {1}").replace("{0}", dd + "/" + mm + "/" + yy).replace("{1}", "");
        } catch(e) { return null; }
    }

    // â”€â”€ Collecte des troupes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function collectTroops() {
        var result = {};
        // PrÃ©-collecter les soutiens reÃ§us depuis MM.getModels().Units (toutes villes, pas seulement la ville active)
        var _supportByTown = {};
        try {
            var _mmUnits = MM.getModels && MM.getModels() && MM.getModels().Units;
            var _unitsCol = _mmUnits
                ? { models: Object.values(_mmUnits).map(function(m) { return { attributes: m.attributes || m }; }) }
                : (layout_main_controller && layout_main_controller.collections && layout_main_controller.collections.units);
            if (_unitsCol) {
                var _UNIT_KEYS = ['sword','slinger','archer','hoplite','rider','chariot','catapult',
                    'minotaur','manticore','zyklop','harpy','medusa','centaur','pegasus','cerberus',
                    'fury','griffin','calydonian_boar','satyr','spartoi','ladon','godsent',
                    'big_transporter','bireme','attack_ship','demolition_ship','small_transporter',
                    'trireme','colonize_ship','sea_monster','siren'];
                _unitsCol.models.forEach(function(m) {
                    var a = m.attributes;
                    // Soutien reÃ§u = unitÃ©s stationnÃ©es dans une ville qui n'est pas leur ville d'origine
                    if (!a || String(a.home_town_id) === String(a.current_town_id)) return;
                    var _ctid = String(a.current_town_id);
                    var _units = {};
                    _UNIT_KEYS.forEach(function(k) { if (a[k] > 0) _units[k] = a[k]; });
                    if (!Object.keys(_units).length) return;
                    // RÃ©soudre le player_name et player_id depuis WMap (comme herald.js)
                    var _playerName = '';
                    var _playerId   = null;
                    try {
                        var _wmapHome = WMap.mapData.getTown(a.home_town_id);
                        _playerName = (_wmapHome && _wmapHome.player_name) || '';
                        _playerId   = (_wmapHome && _wmapHome.player_id)   || null;
                    } catch(e) {}
                    if (!_supportByTown[_ctid]) _supportByTown[_ctid] = [];
                    _supportByTown[_ctid].push({
                        home_town_id:   String(a.home_town_id),
                        home_town_name: a.home_town_name || String(a.home_town_id),
                        player_name:    _playerName,
                        player_id:      _playerId,
                        units:          _units
                    });
                });
            }
        } catch(es) {}
        try {
            Object.values(ITowns.getTowns()).forEach(function(town) {
                try {
                    if (!town.isOwn) return;
                    var tid  = String(town.id);
                    var name = town.getName ? town.getName() : (town.name || tid);
                    var u    = town.units();
                    var raw  = (u && typeof u.toJSON === "function") ? u.toJSON() : u;
                    var units = {};
                    if (raw && typeof raw === "object") {
                        Object.keys(raw).forEach(function(k) { if (raw[k] > 0) units[k] = raw[k]; });
                    }
                    var god = (town.god && typeof town.god === "function") ? town.god() : null;
                    // HÃ©ros assignÃ© Ã  cette ville
                    var hero = null;
                    var heroLevel = null;
                    try {
                        var _heroes = layout_main_controller && layout_main_controller.collections && layout_main_controller.collections.player_heroes;
                        if (_heroes) {
                            _heroes.models.forEach(function(h) {
                                var ha = h.attributes;
                                if (ha.home_town_id == tid && ha.assignment_type === 'town' && !ha.cured_at) {
                                    hero = ha.type;
                                    heroLevel = ha.level || 1;
                                }
                            });
                        }
                    } catch(eh) {}
                    result[tid] = { name: name, units: units, god: god, hero: hero, heroLevel: heroLevel, support_received: _supportByTown[tid] || [] };
                } catch(e2) {}
            });
        } catch(e) { c("info", a.t("Erreur collecte: {0}"), e.message); }
        c("info", a.t("Troupes collectÃ©es: {0} ville(s)"), Object.keys(result).length);
        return result;
    }

    b.troops = {
        push: function() {
            var troops = collectTroops();
            if (!Object.keys(troops).length) { c("info", a.t("Aucune ville Ã  pousser")); return; }

            // Collecter les home_town_id sans player_name (WMap hors chunk)
            var _pending = [];
            Object.values(troops).forEach(function(town) {
                (town.support_received || []).forEach(function(sup) {
                    if (!sup.player_name && sup.home_town_id) {
                        _pending.push({ htid: sup.home_town_id });
                    }
                });
            });

            // Fonction qui effectue le push final
            function _doPush() {
                $.ajax({
                    url: VPS + "/friends/share", method: "POST", contentType: "application/json",
                    data: JSON.stringify({ player_id: getMyId(), world: getWorld(), troops: troops }),
                    timeout: 30000,
                    success: function() { c("info", a.t("Troupes pushÃ©es ({0} ville(s))"), Object.keys(troops).length); },
                    error:   function(x) { c("error", a.t("Erreur push: {0}"), (x.responseJSON || {}).error || "rÃ©seau"); }
                });
            }

            if (!_pending.length) { _doPush(); return; }

            // RÃ©soudre les pseudos manquants via AJAX avant de pusher
            var _done = 0;
            _pending.forEach(function(p) {
                try {
                    b.ajaxRequestGet('town_info', 'info', { id: p.htid, town_id: b.lastTownId, nl_init: true }, function(bot, r) {
                        if (r && r.html) {
                            var pidMatch   = r.html.match(/data-player="(\d+)"/);
                            var pnameMatch = r.html.match(/data-player_name="([^"]+)"/);
                            if (pnameMatch) {
                                var _pname = pnameMatch[1].trim();
                                var _pid   = pidMatch ? parseInt(pidMatch[1]) : null;
                                // Mettre Ã  jour dans troops
                                Object.values(troops).forEach(function(town) {
                                    (town.support_received || []).forEach(function(sup) {
                                        if (sup.home_town_id === String(p.htid) && !sup.player_name) {
                                            sup.player_name = _pname;
                                            if (_pid) sup.player_id = _pid;
                                        }
                                    });
                                });
                            }
                        }
                        _done++;
                        if (_done >= _pending.length) _doPush();
                    });
                } catch(e) {
                    _done++;
                    if (_done >= _pending.length) _doPush();
                }
            });
        },
        collect: function() { return collectTroops(); },
        _cache: {},
        _buildTownContent: function(friendKey, townId) { return buildTownContent(friendKey, townId); }
    };

    var UNIT_CAT = {
        militia:"land",sword:"land",slinger:"land",archer:"land",hoplite:"land",
        rider:"land",chariot:"land",catapult:"land",
        minotaur:"myth",manticore:"myth",zyklop:"myth",harpy:"myth",medusa:"myth",
        centaur:"myth",pegasus:"myth",cerberus:"myth",fury:"myth",griffin:"myth",
        calydonian_boar:"myth",satyr:"myth",spartoi:"myth",ladon:"myth",godsent:"myth",
        big_transporter:"naval",bireme:"naval",attack_ship:"naval",demolition_ship:"naval",
        small_transporter:"naval",trireme:"naval",colonize_ship:"naval",sea_monster:"myth",siren:"myth"
    };

    // â”€â”€ Contenu panneau troupes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function buildTownContent(friendKey, townId) {
        // Statut online/lastSeen depuis la liste d'amis
        var friendEntry = b.friends && b.friends._list
            ? b.friends._list.find(function(f) { return f.key === friendKey; })
            : null;
        var isOnline    = friendEntry ? !!friendEntry.online : false;
        var lastSeen    = friendEntry ? (friendEntry.lastSeen || null) : null;
        var lastSeenFmt = formatLastSeen(lastSeen);

        var cached = b.troops._cache[friendKey];
        if (!cached || !cached.towns) {
            return '<div style="padding:12px 8px;text-align:center;font-size:7.5pt;' +
                'color:rgba(201,168,76,0.5);line-height:1.8;">' +
                a.t('DonnÃ©es indisponibles.') + '<br>' +
                '<span style="font-size:7pt;color:rgba(201,168,76,0.35);">' +
                a.t('Cet ami doit partager ses troupes avec vous.') + '</span></div>';
        }
        var town = cached.towns[String(townId)];
        if (!town) return '<div style="padding:8px;text-align:center;font-size:7.5pt;color:rgba(201,168,76,0.4);">' + a.t('Ville introuvable.') + '</div>';
        var units = town.units || {};
        var uKeys = Object.keys(units).filter(function(k) { return units[k] > 0; });
        // Dieu vÃ©nÃ©rÃ© dans cette ville
        var townGod = town.god || null;
        var godHtml = '';
        if (townGod) {
            try {
                var _gdata = GameData.gods && GameData.gods[townGod];
                var _gname = (_gdata && _gdata.name) ? _gdata.name : (townGod.charAt(0).toUpperCase() + townGod.slice(1));
                var _gdesc = (_gdata && _gdata.description) ? _gdata.description : '';
                var _tooltipHtml = '<strong>' + _gname + '</strong>' + (_gdesc ? '<br><span style=\"color:rgba(201,168,76,0.6);font-size:10px;\">' + _gdesc + '</span>' : '');
                godHtml =
                    '<div data-tooltip-html="' + _tooltipHtml.replace(/"/g, '&quot;') + '" style="display:flex;align-items:center;gap:8px;cursor:help;">' +
                        '<div style="width:32px;height:32px;overflow:hidden;border-radius:50%;flex-shrink:0;background:rgba(0,0,0,0.3);border:1px solid rgba(201,168,76,0.3);">' +
                            '<div class="god_mini ' + townGod + '" style="width:62px;height:62px;transform:scale(0.516);transform-origin:top left;"></div>' +
                        '</div>' +
                        '<span style="font-size:8pt;color:rgba(201,168,76,0.85);font-weight:700;">' + _gname + '</span>' +
                    '</div>';
            } catch(e) {}
        }
        if (!uKeys.length) return '<div style="padding:8px;text-align:center;font-size:7.5pt;color:rgba(201,168,76,0.4);">' + a.t('Aucune troupe.') + '</div>';

        // Header : pastille statut + badge GrepoPlus
        var dotColor  = isOnline ? "#4caf6e" : "#666";
        var dotGlow   = isOnline ? "0 0 4px rgba(76,175,110,0.6)" : "none";
        var statusTxt = isOnline
            ? '<span style="color:#4caf6e;font-size:6.5pt;font-weight:700;">' + a.t('Mis Ã  jour rÃ©cemment') + '</span>'
            : '<span style="color:rgba(201,168,76,0.45);font-size:6.5pt;">' +
              (lastSeenFmt ? a.t('Mis Ã  jour') + ' ' + lastSeenFmt : a.t('Hors ligne')) + '</span>';

        // Header : titre + badge sur la mÃªme ligne, pastille statut dessous
        var html =
            // Ligne 1 : statut | titre | badge
            '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid rgba(201,168,76,0.2);">' +
                // Pastille + statut Ã  gauche
                '<div style="display:flex;align-items:center;gap:5px;">' +
                    '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;' +
                        'background:' + dotColor + ';box-shadow:' + dotGlow + ';"></span>' +
                    statusTxt +
                '</div>' +
                // Titre centrÃ© au milieu
                '<div style="display:flex;align-items:center;gap:6px;position:absolute;left:50%;transform:translateX(-50%);">' +
                    '<img src="' + HELMET + '" style="width:18px;height:18px;display:block;" />' +
                    '<span style="font-family:Georgia,serif;font-size:9pt;font-weight:700;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;">' + a.t('Troupes') + '</span>' +
                '</div>' +
                // Badge Ã  droite
                '<div>' + BADGE_HTML + '</div>' +
            '</div>';

        // Layout : terrestres Ã  gauche, naval Ã  droite, mythiques centrÃ©s en bas
        var landUnits  = uKeys.filter(function(k) { return UNIT_CAT[k] === "land"; });
        var navalUnits = uKeys.filter(function(k) { return UNIT_CAT[k] === "naval"; });
        var mythUnits  = uKeys.filter(function(k) { return UNIT_CAT[k] === "myth"; });

        function unitCards(arr) {
            var s = '';
            arr.forEach(function(uid) {
                s += '<div data-unit-id="' + uid + '" style="' +
                    'display:flex;flex-direction:column;align-items:center;cursor:help;' +
                    'background:rgba(0,0,0,0.4);border:1px solid rgba(201,168,76,0.18);' +
                    'border-radius:5px;padding:4px 5px;">' +
                    '<div class="unit_icon40x40 ' + uid + '" style="width:40px;height:40px;cursor:help;"></div>' +
                    '<span style="font-size:8pt;font-weight:700;color:#f0d080;margin-top:3px;">' + units[uid] + '</span>' +
                    '</div>';
            });
            return s;
        }

        function catLabel(emoji, txt, align) {
            return '<div style="font-size:6.5pt;font-weight:700;color:rgba(201,168,76,0.55);' +
                'text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;text-align:' + (align||'center') + ';">' + emoji + ' ' + txt + '</div>';
        }

        // Terrestres (gauche) + Naval (droite) â€” dieu centrÃ© en absolu entre les deux
        // Les titres sont toujours affichÃ©s, mÃªme si la catÃ©gorie est vide
        html += '<div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px;">';
        // Terrestres â€” toujours affichÃ©
        var landRows = '';
        for (var li = 0; li < landUnits.length; li += 4) {
            landRows += '<div style="display:flex;gap:4px;margin-bottom:4px;">' + unitCards(landUnits.slice(li, li+4)) + '</div>';
        }
        html += '<div style="flex:0 0 auto;">' +
            '<div style="text-align:center;font-size:6.5pt;font-weight:700;color:rgba(201,168,76,0.55);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">' + 'ðŸ—¡ï¸ ' + a.t('Terrestres') + '</div>' +
            landRows + '</div>';
        // HÃ©ros assignÃ© Ã  cette ville
        var heroHtml = '';
        var townHero = town.hero || null;
        if (townHero) {
            try {
                var _hdata = GameData.heroes && GameData.heroes[townHero];
                var _hname = (_hdata && _hdata.name) ? _hdata.name : (townHero.charAt(0).toUpperCase() + townHero.slice(1));
                var _hlevel = town.heroLevel || 1;
                // Calcul du bonus selon la formule du jeu : 100 * (value + level_mod * level)
                var _hbonusStr = '';
                if (_hdata && _hdata.description && _hdata.description_args) {
                    var _hdesc_rendered = _hdata.description;
                    Object.keys(_hdata.description_args).forEach(function(argKey) {
                        var arg = _hdata.description_args[argKey];
                        var val = arg.value;
                        if (arg.level_mod) val = parseFloat((100 * (val + arg.level_mod * _hlevel)).toFixed(2));
                        _hdesc_rendered = _hdesc_rendered.replace(new RegExp('%' + argKey + '%', 'g'), val + (arg.unit || ''));
                    });
                    _hbonusStr = _hdesc_rendered;
                }
                var _htooltip = '<strong>' + _hname + '</strong>' +
                    (_hbonusStr ? '<br><span style=\"color:rgba(201,168,76,0.6);font-size:10px;\">' + _hbonusStr + '</span>' : '');
                heroHtml =
                    '<div data-tooltip-html="' + _htooltip.replace(/"/g, '&quot;') + '" style="display:flex;align-items:center;gap:8px;cursor:help;">' +
                        '<div style="width:32px;height:32px;overflow:hidden;border-radius:50%;flex-shrink:0;background:rgba(0,0,0,0.3);border:1px solid rgba(201,168,76,0.3);display:flex;align-items:center;justify-content:center;">' +
                            '<div class="hero_icon hero25x25 ' + townHero + '" style="transform:scale(1.3);transform-origin:center;"></div>' +
                        '</div>' +
                        '<div style="display:flex;flex-direction:column;gap:1px;align-items:center;">' +
                            '<span style="font-size:8pt;color:rgba(201,168,76,0.85);font-weight:700;">' + _hname + '</span>' +
                            '<span style="font-size:7pt;color:rgba(201,168,76,0.5);">' + a.t('Niveau') + ' ' + _hlevel + '</span>' +
                        '</div>' +
                    '</div>';
            } catch(e) {}
        }
        // Dieu + HÃ©ros centrÃ©s en absolu dans la row (indÃ©pendant des colonnes)
        if (godHtml || heroHtml) {
            html += '<div style="position:absolute;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;pointer-events:none;">' +
            '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:auto;">' +
                (godHtml || '') +
                (heroHtml || '') +
            '</div></div>';
        }
        // Naval â€” toujours affichÃ©
        var navalRows = '';
        for (var ni = 0; ni < navalUnits.length; ni += 4) {
            navalRows += '<div style="display:flex;justify-content:flex-end;gap:4px;margin-bottom:4px;">' + unitCards(navalUnits.slice(ni, ni+4)) + '</div>';
        }
        html += '<div style="flex:0 0 auto;">' + catLabel('âš“', a.t('Naval')) +
            navalRows + '</div>';
        html += '</div>';

        // Mythiques â€” toujours affichÃ©
        html += '<div style="margin-top:4px;">' + catLabel('âœ¨', a.t('Mythiques')) +
            '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px;">' + unitCards(mythUnits) + '</div>' +
        '</div>';

        // â”€â”€ Soutiens reÃ§us â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        var _supports = town.support_received || [];
        if (_supports.length > 0) {
            html += '<div style="margin-top:10px;border-top:1px solid rgba(91,141,217,0.25);padding-top:8px;">';
            html += '<div style="font-size:6.5pt;font-weight:700;color:rgba(91,141,217,0.8);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:7px;">ðŸ›¡ï¸ ' + a.t('Soutiens reÃ§us') + ' <span style=\"color:rgba(91,141,217,0.5);font-weight:400;\">(' + _supports.length + ')</span></div>';
            html += '<div style="max-height:260px;overflow-y:auto;padding-right:4px;' +
                'scrollbar-width:thin;scrollbar-color:rgba(91,141,217,0.4) rgba(0,0,0,0.2);">';
            _supports.forEach(function(sup) {
                var _supUnits = sup.units || {};
                var _supKeys = Object.keys(_supUnits).filter(function(k) { return _supUnits[k] > 0; });
                if (!_supKeys.length) return;
                // Trier par catÃ©gorie : terrestre â†’ naval â†’ mythique
                var _supLand  = _supKeys.filter(function(k) { return UNIT_CAT[k] === 'land'; });
                var _supNaval = _supKeys.filter(function(k) { return UNIT_CAT[k] === 'naval'; });
                var _supMyth  = _supKeys.filter(function(k) { return UNIT_CAT[k] === 'myth'; });
                html += '<div style="margin-bottom:7px;padding:5px 7px;background:rgba(91,141,217,0.06);border:1px solid rgba(91,141,217,0.2);border-radius:5px;">';
                // Ligne joueur / ville d'origine â€” liens cliquables comme herald.js
                var _supTownLink = (function() {
                    try {
                        var tObj = ITowns.getTown(sup.home_town_id);
                        if (tObj && typeof tObj.getLinkFragment === 'function') {
                            return '<a class="gp_town_link" href="#' + tObj.getLinkFragment() + '" style="color:rgba(201,168,76,0.85);font-weight:400;text-decoration:none;">' + (tObj.name || sup.home_town_name) + '</a>';
                        }
                    } catch(e) {}
                    var _frag = btoa(JSON.stringify({ id: sup.home_town_id, name: sup.home_town_name || String(sup.home_town_id) }));
                    return '<a class="gp_town_link" href="#' + _frag + '" style="color:rgba(201,168,76,0.85);font-weight:400;text-decoration:none;">' + sup.home_town_name + '</a>';
                })();
                var _supPlayerLink = (function() {
                    if (!sup.player_name) return '';
                    var _pidAttr = sup.player_id ? ' data-player-id="' + sup.player_id + '"' : '';
                    // Si c'est le mÃªme joueur que celui dont on regarde les troupes â†’ simple texte, pas de lien
                    var _isSelf = cached.fromName && sup.player_name === cached.fromName;
                    if (_isSelf) {
                        return '<span style="color:rgba(91,141,217,0.9);font-weight:700;">' + sup.player_name + '</span>';
                    }
                    return '<span style="color:rgba(91,141,217,0.9);font-weight:700;">' + sup.player_name + '</span>';
                })();
                // Si player_name absent (WMap hors chunk) â†’ placeholder + rÃ©solution AJAX
                var _needsResolve = !sup.player_name;
                var _resolveAttr  = _needsResolve ? ' data-sup-resolve="' + sup.home_town_id + '"' : '';
                html += '<div class="gfb-sup-header" style="font-size:6.5pt;margin-bottom:5px;"' + _resolveAttr + '>' +
                    (_supPlayerLink
                        ? _supPlayerLink + ' <span style="color:rgba(150,150,150,0.6);">Â·</span> ' + _supTownLink
                        : '<span style="color:rgba(150,150,150,0.5);font-style:italic;">â€¦</span> <span style="color:rgba(150,150,150,0.4);">Â·</span> ' + _supTownLink
                    ) +
                '</div>';
                // RÃ©solution AJAX diffÃ©rÃ©e si player_name manquant
                if (_needsResolve) {
                    (function(_htid, _htname) {
                        try {
                            b.ajaxRequestGet('town_info', 'info', { id: _htid, town_id: b.lastTownId, nl_init: true }, function(bot, r) {
                                if (!r || !r.html) return;
                                var _pidMatch   = r.html.match(/data-player="(\d+)"/);
                                var _pnameMatch = r.html.match(/data-player_name="([^"]+)"/);
                                if (!_pnameMatch) return;
                                var _pname = _pnameMatch[1].trim();
                                var _pid   = _pidMatch ? parseInt(_pidMatch[1]) : null;
                                // Patcher le DOM directement dans le panneau ouvert
                                var _pidAttr2 = _pid ? ' data-player-id="' + _pid + '"' : '';
                                // RÃ©cupÃ©rer le fromName du cache pour savoir si c'est le mÃªme joueur
                                var _panelEl = $('[data-sup-resolve="' + _htid + '"]').closest('[data-friend-key]');
                                var _panelFKey = _panelEl.length ? _panelEl.attr('data-friend-key') : null;
                                var _panelFromName = _panelFKey && b.troops._cache[_panelFKey] ? b.troops._cache[_panelFKey].fromName : null;
                                var _isSelf2 = _panelFromName && _pname === _panelFromName;
                                var _newPlayerLink = _isSelf2
                                    ? '<span style="color:rgba(91,141,217,0.9);font-weight:700;">' + _pname + '</span>'
                                    : '<span style="color:rgba(91,141,217,0.9);font-weight:700;">' + _pname + '</span>';
                                $('[data-sup-resolve="' + _htid + '"]').each(function() {
                                    $(this).html(_newPlayerLink + ' <span style="color:rgba(150,150,150,0.6);">Â·</span> ' + $(this).find('a.gp_town_link').prop('outerHTML'));
                                    $(this).removeAttr('data-sup-resolve');
                                });
                            });
                        } catch(e) {}
                    })(sup.home_town_id, sup.home_town_name);
                }
                // Fonction carte unitÃ© avec data-unit-id pour les infobulles
                function supUnitCard(uid) {
                    return '<div data-unit-id="' + uid + '" style="display:flex;flex-direction:column;align-items:center;cursor:help;' +
                        'background:rgba(0,0,0,0.35);border:1px solid rgba(91,141,217,0.25);' +
                        'border-radius:5px;padding:4px 5px;">' +
                        '<div class="unit_icon40x40 ' + uid + '" style="width:40px;height:40px;cursor:help;"></div>' +
                        '<span style="font-size:8pt;font-weight:700;color:#8ab4f8;margin-top:3px;">' + _supUnits[uid] + '</span>' +
                    '</div>';
                }
                // Terrestres
                if (_supLand.length) {
                    html += '<div style="font-size:6pt;color:rgba(201,168,76,0.45);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">ðŸ—¡ï¸ ' + a.t('Terrestres') + '</div>';
                    html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:5px;">';
                    _supLand.forEach(function(uid) { html += supUnitCard(uid); });
                    html += '</div>';
                }
                // Naval
                if (_supNaval.length) {
                    html += '<div style="font-size:6pt;color:rgba(201,168,76,0.45);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">âš“ ' + a.t('Naval') + '</div>';
                    html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:5px;">';
                    _supNaval.forEach(function(uid) { html += supUnitCard(uid); });
                    html += '</div>';
                }
                // Mythiques
                if (_supMyth.length) {
                    html += '<div style="font-size:6pt;color:rgba(201,168,76,0.45);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">âœ¨ ' + a.t('Mythiques') + '</div>';
                    html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:5px;">';
                    _supMyth.forEach(function(uid) { html += supUnitCard(uid); });
                    html += '</div>';
                }
                html += '</div>';
            });
            html += '</div></div>'; // ferme scroll-container + section soutiens
        }

        return html;
    }

    // â”€â”€ Trouver la fenÃªtre profil ouverte â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function findProfileWindow() {
        var wnd = null;
        try {
            // MÃ©thode 1 : itÃ©rer sur les fenÃªtres ouvertes
            var all = GPWindowMgr.getAll ? GPWindowMgr.getAll() : null;
            if (!all) {
                // MÃ©thode 2 : chercher dans les handlers
                all = [];
                for (var k in GPWindowMgr) {
                    if (GPWindowMgr[k] && typeof GPWindowMgr[k].getJQElement === "function") all.push(GPWindowMgr[k]);
                }
            }
            (all || []).forEach(function(w) {
                try { if (w.getJQElement && w.getJQElement().find("#player_towns").length > 0) wnd = w; } catch(e2) {}
            });
        } catch(e) {}
        return wnd;
    }

    // â”€â”€ Toggle panneau (modale fixed, comme wall_kills) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function toggleTownPanel($li, friendKey, friendName, townId) {
        var pid = "gfb-tp-" + townId;

        // Fermer si dÃ©jÃ  ouverte (toggle)
        var $existing = $("#gfb-troops-modal");
        if ($existing.length) {
            var isSame = $existing.data("town-id") === townId;
            $existing.remove();
            if (isSame) return;
        }

        if (b.friends && typeof b.friends._poll === "function") b.friends._poll();

        // RÃ©cupÃ©rer le nom de la ville
        var townName = townId;
        try {
            var cached = b.troops._cache[friendKey];
            if (cached && cached.towns && cached.towns[String(townId)]) {
                townName = cached.towns[String(townId)].name || townId;
            }
        } catch(e) {}

        var panelContent = !friendKey
            ? '<div style="padding:12px 8px;text-align:center;font-size:7.5pt;color:rgba(201,168,76,0.5);line-height:1.8;">DonnÃ©es indisponibles.<br><span style="font-size:7pt;color:rgba(201,168,76,0.35);">' + friendName + ' ' + a.t("n'est pas dans ta liste d'amis GrepoPlus.") + '</span></div>'
            : buildTownContent(friendKey, townId);

        var $modal = $(
            '<div id="gfb-troops-modal"' +
            ' data-friend-key="' + (friendKey || "") + '"' +
            ' data-town-id="' + townId + '"' +
            ' style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;' +
            'display:flex;align-items:center;justify-content:center;">' +
            // Overlay sombre
            '<div id="gfb-troops-overlay" style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);"></div>' +
            // FenÃªtre centrÃ©e
            '<div style="position:relative;z-index:1;width:90vw;max-width:900px;min-width:600px;max-height:80vh;' +
            'display:flex;flex-direction:column;' +
            'background:linear-gradient(160deg,#0d1117,#151c26);' +
            'border:1px solid rgba(201,168,76,0.35);border-radius:8px;' +
            'box-shadow:0 8px 40px rgba(0,0,0,0.8);font-family:Arial,sans-serif;overflow:hidden;">' +
            // Barre de titre
            '<div style="display:flex;align-items:center;justify-content:space-between;' +
            'padding:8px 12px;border-bottom:1px solid rgba(201,168,76,0.2);background:rgba(0,0,0,0.3);flex-shrink:0;">' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
            '<img src="' + HELMET + '" style="width:16px;height:16px;" />' +
            '<span style="font-family:Georgia,serif;font-size:9pt;font-weight:700;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;">' + a.t('Troupes') + ' â€” ' + townName + '</span>' +
            '</div>' +
            '<span id="gfb-troops-close" style="cursor:pointer;color:#e05555;font-size:16pt;line-height:1;padding:0 4px;opacity:0.85;transition:opacity 0.15s;" onmouseover="this.style.opacity=\'1\'" onmouseout="this.style.opacity=\'0.85\'">&times;</span>' +
            '</div>' +
            // Contenu scrollable
            '<div style="overflow-y:auto;overflow-x:hidden;padding:10px 12px 14px 12px;' +
            'scrollbar-width:thin;scrollbar-color:rgba(201,168,76,0.4) rgba(0,0,0,0.2);">' +
            panelContent +
            '</div>' +
            '</div>' +
            '</div>'
        );

        $("body").append($modal);

        // Fermer sur overlay ou croix
        $("#gfb-troops-overlay, #gfb-troops-close").on("click", function() {
            $("#gfb-troops-modal").remove();
        });
    }

    // â”€â”€ Badge dans entÃªte "Villes (N)" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function injectVillesHeader() {
        if ($("#gfb-troops-header").length) return;
        var $caption = null;
        $("#player_towns").parent().find("*").each(function() {
            if ($caption) return;
            var $el = $(this);
            if ($el.children().length === 0 && /^Villes\s*\(/.test($el.text().trim())) $caption = $el;
        });
        if (!$caption || !$caption.length) return;
        $caption.append(makeHeaderBadge("gfb-troops-header"));
    }

    // â”€â”€ Bouton casque par ville â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function injectTownButtons(friendKey, friendName) {
        if ($("#player_towns .gfb-helmet-btn").length) return;
        $("#player_towns li").each(function() {
            var $li   = $(this);
            var $link = $li.find("a.gp_town_link, a[href*='#']").first();
            var townId = null;
            if ($link.length) {
                try { townId = JSON.parse(atob(($link.attr("href") || "").replace(/^.*#/, ""))).id || null; } catch(e) {}
            }
            if (!townId) return;
            var $btn = $(
                '<a class="gfb-helmet-btn" href="#"' +
                '' + ' data-tooltip-html="&lt;strong&gt;' + (a.t ? a.t('Troupes') : 'Troupes') + '&lt;/strong&gt;&lt;br&gt;&lt;span style=&quot;color:rgba(201,168,76,0.6);font-size:6.5pt;&quot;&gt;' + (a.t ? a.t('Afficher les troupes de cette ville') : 'Afficher les troupes de cette ville') + '&lt;/span&gt;"' + '' +
                ' style="display:inline-block;vertical-align:middle;margin-left:6px;' +
                'cursor:pointer;opacity:0.8;transition:opacity 0.15s;text-decoration:none;">' +
                '<img src="' + HELMET + '" style="width:22px;height:22px;vertical-align:middle;display:inline-block;" />' +
                '</a>'
            );
            $btn.on("mouseenter", function() { $(this).css("opacity","1"); })
                .on("mouseleave", function() { $(this).css("opacity","0.8"); })
                .on("click", function(e) {
                    e.preventDefault(); e.stopPropagation();
                    toggleTownPanel($li, friendKey, friendName, townId);
                });
            if ($link.length) $link.after($btn); else $li.append($btn);
        });
    }

    // â”€â”€ Observer DOM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    (new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(node) {
                if (node.nodeType !== 1) return;
                var $pt = $(node).is("#player_towns") ? $(node) : $(node).find("#player_towns");
                if (!$pt.length) return;
                var playerName = "", playerId = null;
                var $win = $(node).closest(".game_window,.ui-dialog,body");
                var $nl  = $(node).find(".gp_player_link").first();
                if (!$nl.length) $nl = $win.find(".gp_player_link").first();
                if ($nl.length) { playerName = $nl.data("player-name") || $nl.text().trim(); playerId = $nl.data("player-id") || null; }
                if (!playerName) {
                    var m2 = ($win.find(".game_header,h3,.ui-dialog-title").first().text()||"").match(/[â€“\-]\s*(.+)$/);
                    if (m2) playerName = m2[1].trim();
                }
                if (!playerName || playerName === Game.player_name) return;
                var friendKey = null;
                if (b.friends && b.friends._list) {
                    var match = b.friends._list.find(function(f) { return f.name===playerName||String(f.id)===String(playerId); });
                    if (match) friendKey = match.key;
                }
                setTimeout(function() { injectTownButtons(friendKey, playerName); injectVillesHeader(); }, 150);
            });
            m.removedNodes.forEach(function(node) {
                if (node.nodeType !== 1) return;
                if ($(node).find("#player_towns").length || $(node).is("#player_towns")) {
                    $("#gfb-troops-modal").remove();
                }
            });
        });
    })).observe(document.body, { childList: true, subtree: true });

    // â”€â”€ Push auto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var _pushAttempts = 0;
    function pushWhenReady() {
        _pushAttempts++;
        try {
            if (Object.keys(ITowns.getTowns()).length > 0) { b.troops.push(); return; }
        } catch(e) {}
        var delay = _pushAttempts < 5 ? 2000 : _pushAttempts < 10 ? 5000 : 30000;
        c("info", a.t("ITowns pas prÃªt, rÃ©essai {0} dans {1}ms"), _pushAttempts, delay);
        setTimeout(pushWhenReady, delay);
    }
    setTimeout(pushWhenReady, 3000);
    setInterval(function() { b.troops.push(); }, 5 * 60 * 1000);

    c("info", "Loaded"); window._gfbot_module_loaded && window._gfbot_module_loaded("Troupes", true);

}).call(this);
