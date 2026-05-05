(function() {
    var a = this;
    var b = a.bot;
    (function() {
        var a = this,
            b = a.bot,
            // c et e (regroupement) supprimÃ©s â€” plus utilisÃ©s
            d = 2 * 60,
            d_approach = 10 * 60,
            f = ["attack_incoming", "farm_attack", "attack"],
            g = ["waiting", "confirmed"],
            h = 10 * 60,
            i = a.logger.create("Herald");
        cmb = null, notifications = {}, checker = {}, timers = {};
        var _playerResolvePending = {}; // cache anti-boucle pour la rÃ©solution player_name PNJ
        try {} catch (j) {}

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // HLD DEBUG â€” systÃ¨me de logs centralisÃ©
        // Activer/dÃ©sactiver via la console : window._hldDebug = true/false
        // Filtrer par catÃ©gorie : window._hldFilter = ['DETECT','DODGE'] (null = tout)
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        var _hld = (function() {
            var CATS = {
                DETECT:  '#2196F3', // DÃ©tection d'attaque (live/boot/curator)
                STATUS:  '#9C27B0', // Changements de statut
                DODGE:   '#FF9800', // Esquive / autododge
                MANUAL:  '#00BCD4', // Panel manuel
                DISAP:   '#F44336', // Disappeared / spam
                SWITCH:  '#607D8B', // Switch de ville
                RESET:   '#795548', // Reset collection movements
                PREFS:   '#4CAF50', // _attackPrefs / VPS
                RENDER:  '#9E9E9E', // Rendu UI (moins verbeux)
            };
            function _fmt(id) {
                // RÃ©sumÃ© court d'une attaque pour les logs
                if (!id) return '?';
                for (var tid in b.herald.town) {
                    var atk = b.herald.town[tid] && b.herald.town[tid].attack && b.herald.town[tid].attack[id];
                    if (atk) return 'A#' + id + '(' + (atk.from && atk.from.name || '?') + 'â†’' + (atk.to && atk.to.name || '?') + ' @' + new Date(atk.time * 1000).toLocaleTimeString() + ')';
                }
                return 'A#' + id;
            }
            return {
                log: function(cat, msg, data) {
                    try {
                        if (window._hldDebug === false) return;
                        var filter = window._hldFilter;
                        if (filter && filter.indexOf(cat) === -1) return;
                        var color = CATS[cat] || '#888';
                        var prefix = '[HLD:' + cat + ']';
                        if (data !== undefined) {
                            console.log('%c' + prefix, 'color:' + color + ';font-weight:bold', msg, data);
                        } else {
                            console.log('%c' + prefix, 'color:' + color + ';font-weight:bold', msg);
                        }
                    } catch(_e) {}
                },
                fmt: _fmt
            };
        })();
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

        function k(c) {
        }

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // _csIsLeading â€” fonction commune de dÃ©tection CS
        // Retourne true UNIQUEMENT si colonize_ship a le pourcentage le plus Ã©levÃ©
        // parmi toutes les unitÃ©s (mÃªme logique que le panel manuel).
        // distDurations : objet {uid: durÃ©eSecondes}
        // remaining     : temps restant Ã  la dÃ©tection (secondes)
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        function _csIsLeading(distDurations, remaining) {
            if (!distDurations || !distDurations.colonize_ship || !remaining) return false;
            var _boostVal  = (GameData.additional_runtime_modifier && GameData.additional_runtime_modifier.default_unit_movement_boost) || 30;
            var _meteorVal = (GameData.research_bonus && GameData.research_bonus.meteorology_speed) || 0.1;
            var _cartoVal  = (GameData.research_bonus && GameData.research_bonus.cartography_speed) || 0.1;
            var _lightVal  = (GameData.additional_runtime_modifier && GameData.additional_runtime_modifier.lighthouse_speed_bonus) || 0.15;
            var _sailVal   = (GameData.research_bonus && GameData.research_bonus.colony_ship_speed) || 0.1;
            var _setupTime = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time) || 0;
            var _JITTER    = 10;
            var _csPct = -1, _maxPct = -1;
            Object.keys(distDurations).forEach(function(_uid) {
                var _gd = GameData && GameData.units && GameData.units[_uid];
                if (!_gd || !_gd.speed) return;
                // On n'a pas la distance ici â€” on utilise directement _distDurations[uid]
                // qui est dÃ©jÃ  calculÃ© sur la bonne distance. On cherche la meilleure
                // combinaison de bonus pour minimiser l'Ã©cart avec remaining.
                var _isNaval = !!(_gd.is_naval || _gd.category === 'regular_naval' || _gd.category === 'mythological_naval');
                var _isCS    = (_uid === 'colonize_ship');
                var _baseDur = distDurations[_uid]; // durÃ©e sans bonus
                // ItÃ©rer sur les combinaisons de bonus applicables
                var _metF = _isNaval ? [false] : [false, true];
                var _carF = _isNaval ? [false, true] : [false];
                var _ligF = _isNaval ? [false, true] : [false];
                var _saiF = _isCS    ? [false, true] : [false];
                var _minSc = Infinity, _pureD = 0;
                [false, true].forEach(function(uB) {
                    _metF.forEach(function(uMet) {
                        _carF.forEach(function(uCar) {
                            _ligF.forEach(function(uLig) {
                                _saiF.forEach(function(uSai) {
                                    // Reconstruire la durÃ©e avec bonus depuis la durÃ©e de base
                                    // _baseDur = floor(50*dist/speed + setup) sans bonus
                                    // On ne peut pas recalculer proprement sans dist/speed,
                                    // donc on approxime : ratio bonus appliquÃ© sur _baseDur
                                    var _tb  = (uMet ? _meteorVal : 0) + (uCar ? _cartoVal : 0) + (uLig ? _lightVal : 0) + (uSai ? _sailVal : 0);
                                    var _b   = uB ? (1.0 + 0.01 * _boostVal) : 1.0;
                                    // _baseDur inclut setup_time â†’ retirer le setup, appliquer les bonus, remettre le setup
                                    var _durNoSetup = Math.max(0, _baseDur - _setupTime);
                                    var _dur = Math.floor(_durNoSetup / (_b * (1.0 + _tb)) + _setupTime);
                                    var _dev = Math.max(0, Math.abs(_dur - remaining) - _JITTER) / remaining;
                                    var _pen = (uB ? 0.60 : 0) + (uMet ? 0.04 : 0) + (uCar ? 0.04 : 0) + (uLig ? 0.70 : 0) + (uSai ? 0.35 : 0);
                                    var _sc  = _dev + _pen;
                                    if (_sc < _minSc) { _minSc = _sc; _pureD = _dev; }
                                });
                            });
                        });
                    });
                });
                var _pct = Math.max(0, Math.min(99, Math.round(Math.exp(-_pureD * 10) * 100)));
                if (_pct > _maxPct) _maxPct = _pct;
                if (_isCS) _csPct = _pct;
            });
            return (_csPct >= 0 && _csPct === _maxPct && _csPct > 0);
        }
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

        // RÃ©cupÃ©rer la collection movements_units de Grepolis
        // C'est lÃ  que sont stockÃ©s tous les mouvements militaires en temps rÃ©el
        function _getMovementsCollection() {
            try {
                return layout_main_controller &&
                       layout_main_controller.collections &&
                       layout_main_controller.collections.movements_units || null;
            } catch(_e) { return null; }
        }



        // _townLink â€” utilise WMap.mapData.getTown pour player_name
        function _townLink(townObj, isTarget) {
            if (!townObj || !townObj.id) return "?";
            function _playerSuffix(townId, storedName, storedPlayerId) {
                try {
                    var pName = storedName || "";
                    var pId   = storedPlayerId || null;
                    if (!pName || !pId) {
                        var t = WMap.mapData.getTown(townId);
                        if (t) {
                            pName = pName || t.player_name || "";
                            pId   = pId   || t.player_id   || null;
                        }
                    }
                    if (!pName) return "";
                    var pidAttr = pId ? " data-player-id='" + pId + "'" : "";
                    var _link = "(<a class='gp_player_link' href='#' data-player-name='" + pName + "'" + pidAttr + " style='color:inherit;'>" + pName + "</a>)";
                    return isTarget ? " " + _link : _link + " ";
                } catch(e) { return ""; }
            }
            var _wmapTown = WMap.mapData.getTown(townObj.id);
            var resolvedObj = {
                id:          townObj.id,
                name:        townObj.name,
                player_name: townObj.player_name || (_wmapTown && _wmapTown.player_name) || "",
                player_id:   townObj.player_id   || (_wmapTown && _wmapTown.player_id)   || null
            };
            var playerPart = _playerSuffix(resolvedObj.id, resolvedObj.player_name, resolvedObj.player_id);
            var tObj = ITowns.getTown(resolvedObj.id);
            var townLink;
            if (tObj && typeof tObj.getLinkFragment === "function") {
                townLink = "<a class='gp_town_link' href='#" + tObj.getLinkFragment() + "'>" + (tObj.name || resolvedObj.name) + "</a>";
            } else {
                // Inclure ix/iy dans le fragment pour que mapJump natif puisse centrer la carte
                // mÃªme si la ville est lointaine et absente de WMap.mapData.
                var _fragObj = { id: resolvedObj.id, name: resolvedObj.name || String(resolvedObj.id) };
                var _ix = townObj.ix != null ? townObj.ix : (_wmapTown && _wmapTown.x != null ? _wmapTown.x : null);
                var _iy = townObj.iy != null ? townObj.iy : (_wmapTown && _wmapTown.y != null ? _wmapTown.y : null);
                if (_ix != null) { _fragObj.ix = _ix; _fragObj.iy = _iy; }
                var fragment = btoa(JSON.stringify(_fragObj));
                townLink = "<a class='gp_town_link' href='#" + fragment + "'>" + (resolvedObj.name || resolvedObj.id) + "</a>";
            }
            return isTarget ? townLink + playerPart : playerPart + townLink;
        }

        // Convertir un attribut movements_units en objet attack pour herald
        function _movAttrToAttack(attr) {
            var myTowns = ITowns.getTowns();
            var targetIsMine = !!(myTowns[attr.target_town_id]);
            var homeIsMine   = !!(myTowns[attr.home_town_id]);
            var isIncoming   = targetIsMine && !homeIsMine;
            var fromObj = { id: attr.home_town_id,   name: attr.town_name_origin      || "" };
            var toObj   = { id: attr.target_town_id, name: attr.town_name_destination || "" };
            // Enregistrer la ville ennemie dans a.towns pour que [town]id[/town] soit rendu
            if (fromObj.id && fromObj.name) {
                a.towns.update({ id: fromObj.id, name: fromObj.name, link: attr.link_origin });
            }
            // RÃ©cupÃ©rer player_id/player_name depuis WMap.mapData
            var _wmapFrom = WMap.mapData.getTown(fromObj.id);
            var _pname = (_wmapFrom && _wmapFrom.player_name) || "";
            var _pid   = (_wmapFrom && _wmapFrom.player_id)   || null;
            // Fallback : si WMap n'a pas le player_name (ville non encore chargÃ©e dans la carte),
            // on rÃ©sout via town_info HTML â€” sans condition sur attr.player_id qui n'existe pas
            // dans movements_units et rendait le fallback totalement inopÃ©rant.
            if (!_pname && fromObj.id && !_playerResolvePending[fromObj.id]) {
                _playerResolvePending[fromObj.id] = true; // verrou : une seule tentative par ville
                b.ajaxRequestGet('town_info', 'info', { id: fromObj.id, town_id: b.lastTownId, nl_init: true }, function(bot, r) {
                    var _html = (r && r.html) || "";
                    if (!_html) {
                        // Erreur rÃ©seau -> liberer le verrou pour permettre un retry ulterieur
                        delete _playerResolvePending[fromObj.id];
                        return;
                    }
                    var pidMatch   = _html.match(/data-player="([^"]+)"/);
                    var pnameMatch = _html.match(/data-player_name="([^"]+)"/);
                    if (pnameMatch) {
                        var pid   = pidMatch ? parseInt(pidMatch[1]) : null;
                        var pname = pnameMatch[1].trim();
                        for (var tid in b.herald.town) {
                            for (var aid in b.herald.town[tid].attack) {
                                var atk = b.herald.town[tid].attack[aid];
                                if (atk && atk.from && atk.from.id == fromObj.id) {
                                    atk.from.player_name = pname;
                                    atk.from.player_id   = pid;
                                    atk.from.link = _townLink({ id: fromObj.id, name: fromObj.name, player_name: pname, player_id: pid }, false);
                                }
                            }
                        }
                        _refreshHeraldScope();
                        if (b.friends && typeof b.friends._pushShared === "function") {
                            b.friends._pushShared();
                        }
                    }
                    // Pas de pnameMatch -> village PNJ sans joueur,
                    // _playerResolvePending reste true -> plus aucun retry en boucle
                });
            }
            // Distance toujours calculÃ©e via frontend_bridge/runtime_info (cÃ´tÃ© serveur).
            // Le calcul WMap ox/oy a Ã©tÃ© supprimÃ© : les coordonnÃ©es ox/oy sont des coordonnÃ©es
            // pixel minimap (~510 pour une vraie distance de ~41000) â†’ rÃ©sultats complÃ¨tement faux.
            // frontend_bridge retourne la vraie distance utilisÃ©e par le jeu.
            var _dist = null;
            if (fromObj.id) {
                (function(_atkId, _fromId, _toId, _townId) {
                    var _results = {};
                    function _tryFinalize() {
                        if (!_results.to || !_results.from) return;
                        for (var tid in b.herald.town) {
                            var atkObj = b.herald.town[tid].attack && b.herald.town[tid].attack[_atkId];
                            if (atkObj) {
                                if (_results.from.distance != null && (atkObj.distance === null || atkObj.distance === 0 || atkObj.distance == null)) {
                                    atkObj.distance = _results.from.distance;
                                    // Construire _distDurations maintenant qu'on a la distance
                                    if (!atkObj._distDurations && GameData && GameData.units) {
                                        var _st = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time) || 0;
                                        atkObj._distDurations = {};
                                        Object.keys(GameData.units).forEach(function(_uid) {
                                            var _u = GameData.units[_uid];
                                            if (!_u || !_u.speed) return;
                                            atkObj._distDurations[_uid] = Math.floor(50 * atkObj.distance / _u.speed + _st);
                                        });
                                    }
                                }
                                atkObj._sameIslandFallback = (
                                    _results.from.island_x === _results.to.island_x &&
                                    _results.from.island_y === _results.to.island_y
                                );
                                // DÃ©tection CS aprÃ¨s _sameIslandFallback et _distDurations disponibles
                                // ExÃ©cutÃ©e ici dans tous les cas (distance dÃ©jÃ  connue via VPS ou fraÃ®che)
                                // Fallback sur _attackPrefs si _remainingAtDetection absent sur atkObj
                                // (race condition : _tryFinalize arrive aprÃ¨s purge des prefs consommÃ©es)
                                var _radCs2 = atkObj._remainingAtDetection
                                    || (b.herald._attackPrefs && b.herald._attackPrefs[atkObj.id] && b.herald._attackPrefs[atkObj.id]._remainingAtDetection);
                                if (!atkObj.cs && atkObj._distDurations && atkObj._distDurations.colonize_ship && _radCs2) {
                                    if (_csIsLeading(atkObj._distDurations, _radCs2) && atkObj.from && atkObj.from.player_name) {
                                        atkObj.cs = true;
                                        atkObj.deviation = Math.abs(1.0 - 1.0 * atkObj._distDurations.colonize_ship / _radCs2);
                                        if (b.sett.herald_militia === "cs") atkObj.militia = true;
                                        b.herald.notify_text(atkObj);
                                        b.herald.notify_email(atkObj);
                                    }
                                }
                                // Stocker ix/iy sur atk.from pour que "aller Ã " fonctionne cÃ´tÃ© ami aussi
                                if (atkObj.from && _results.from.island_x != null) {
                                    atkObj.from.ix = _results.from.island_x;
                                    atkObj.from.iy = _results.from.island_y;
                                    atkObj.from.link = _townLink({
                                        id:          atkObj.from.id,
                                        name:        atkObj.from.name,
                                        player_name: atkObj.from.player_name,
                                        player_id:   atkObj.from.player_id,
                                        ix:          _results.from.island_x,
                                        iy:          _results.from.island_y
                                    }, false);
                                }
                                _refreshHeraldScope();
                                break;
                            }
                        }
                    }
                    // RequÃªte 1 : ville CIBLE â†’ island_x/y de la cible uniquement
                    // (distance retournÃ©e = 0 car c'est notre propre ville, inutilisable)
                    b.ajaxRequestGet('frontend_bridge', 'fetch', {
                        window_type: "runtime_info",
                        tab_type: "index",
                        known_data: { models: [], collections: ["Units", "Towns"], templates: [] },
                        arguments: { target_town_id: _toId, is_portal_command: false },
                        town_id: _townId,
                        nl_init: true
                    }, function(bot, r) {
                        try {
                            var _d = r && r.models && r.models.RuntimeSimulator && r.models.RuntimeSimulator.data;
                            if (!_d) return;
                            _results.to = { island_x: _d.island_x, island_y: _d.island_y };
                            _tryFinalize();
                        } catch(_e2) {}
                    });
                    // RequÃªte 2 : ville SOURCE (attaquant) â†’ distance rÃ©elle + island_x/y
                    // La distance calculÃ©e depuis lastTownId vers la source = distance rÃ©elle de l'attaque
                    b.ajaxRequestGet('frontend_bridge', 'fetch', {
                        window_type: "runtime_info",
                        tab_type: "index",
                        known_data: { models: [], collections: ["Units", "Towns"], templates: [] },
                        arguments: { target_town_id: _fromId, is_portal_command: false },
                        town_id: _townId,
                        nl_init: true
                    }, function(bot, r) {
                        try {
                            var _d = r && r.models && r.models.RuntimeSimulator && r.models.RuntimeSimulator.data;
                            if (!_d) return;
                            _results.from = { distance: _d.distance, island_x: _d.island_x, island_y: _d.island_y };
                            _tryFinalize();
                        } catch(_e3) {}
                    });
                // Utiliser la ville CIBLE (toObj.id) comme rÃ©fÃ©rence pour le calcul de distance,
                // pas b.lastTownId qui peut Ãªtre une ville diffÃ©rente â†’ pourcentages corrects
                // mÃªme quand on est sur une autre ville au moment de la dÃ©tection.
                }(attr.id, fromObj.id, toObj.id, toObj.id));
            }
            return {
                id:         attr.id,
                command_id: attr.command_id || null,
                type:       attr.type,
                time:       attr.arrival_at,
                quest:      false,
                incoming:   isIncoming,
                distance:   _dist,
                from: {
                    id:          fromObj.id,
                    name:        fromObj.name,
                    player_id:   _pid,
                    player_name: _pname,
                    link: _townLink({ id: fromObj.id, name: fromObj.name, player_name: _pname, player_id: _pid }, false)
                },
                to:   { id: toObj.id, name: toObj.name, link: _townLink(toObj, true) }
            };
        }

        function l(a, c, d) {
            var e = {},
                j = Timestamp.server();
            if (Array.isArray(d)) d.forEach(function(a) {
                e[a] = [];
            });
            var l = a.town,
                m = 0;
            c.forEach(function(c) {
                        var d = b.custom.get(c.to.id);
                if (c.incoming !== true) return;
                if (f.indexOf(c.type) == -1) return;
                if (!(c.to.id in e)) e[c.to.id] = [];
                e[c.to.id].push(c.id);
                if (!(c.to.id in l)) l[c.to.id] = {
                    attack: {}
                };
                var g = l[c.to.id].attack;
                if (c.id in g) return;
                // DÃ©duplication Ã©tendue : Ã©viter le doublon quand deux sources (curator + movements_units)
                // crÃ©ent la mÃªme attaque avec des IDs diffÃ©rents mais mÃªme command_id ou mÃªme heure+origine.
                var _dupFound = false;
                var _dupExistingId = null;
                for (var _eid in g) {
                    var _ea = g[_eid];
                    if (!_ea) continue;
                    // MÃªme command_id
                    if (c.command_id && _ea.command_id && c.command_id == _ea.command_id) { _dupFound = true; _dupExistingId = _eid; break; }
                    // MÃªme heure d'arrivÃ©e + mÃªme ville source (fallback sans command_id)
                    if (c.time && _ea.time && c.time == _ea.time &&
                        c.from && _ea.from && c.from.id == _ea.from.id) { _dupFound = true; _dupExistingId = _eid; break; }
                }
                if (_dupFound) {
                    // L'attaque existe dÃ©jÃ  sous un ID diffÃ©rent (ex: command_overview vs movements_units).
                    // Si le nouvel ID (c.id) vient de movements_units et l'ancien (_dupExistingId) vient
                    // du fallback command_id (boot sur mauvaise ville) â†’ remplacer l'entrÃ©e avec le bon ID.
                    if (_dupExistingId && String(_dupExistingId) !== String(c.id)) {
                        var _oldAtk = g[_dupExistingId];
                        if (_oldAtk) {
                            // Migrer l'objet existant sous le bon ID movements_units
                            _oldAtk.id = c.id;
                            if (c.command_id) _oldAtk.command_id = c.command_id;
                            // Si la migration vient d'un _onMovAdd (c._liveDetected=true),
                            // retirer _bootLoaded et poser _liveDetected sur l'objet migrÃ©
                            if (c._liveDetected) {
                                _oldAtk._bootLoaded = false;
                                _oldAtk._liveDetected = true;
                                if (c._remainingAtDetection) _oldAtk._remainingAtDetection = c._remainingAtDetection;
                            }
                            g[c.id] = _oldAtk;
                            delete g[_dupExistingId];
                            // Mettre Ã  jour _attackPrefs : migrer les prefs sous le bon ID
                            if (b.herald._attackPrefs[_dupExistingId]) {
                                b.herald._attackPrefs[c.id] = b.herald._attackPrefs[_dupExistingId];
                                delete b.herald._attackPrefs[_dupExistingId];
                            }
                            // Mettre Ã  jour e[] pour que le bon ID ne soit pas marquÃ© disappeared
                            if (e[c.to.id]) {
                                var _oldIdx = e[c.to.id].indexOf(_dupExistingId);
                                if (_oldIdx !== -1) e[c.to.id].splice(_oldIdx, 1);
                                if (e[c.to.id].indexOf(c.id) === -1) e[c.to.id].push(c.id);
                            }
                            _hld.log('DETECT', 'ðŸ”„ ID migrÃ© ' + _dupExistingId + ' â†’ ' + c.id + ' (movements_units canonical)');
                            // Si migration depuis live (_onMovAdd), sauvegarder _remainingAtDetection
                            // dans _attackPrefs pour que le panel live soit rendu correctement
                            if (c._liveDetected && c._remainingAtDetection) {
                                if (!b.herald._attackPrefs[c.id]) b.herald._attackPrefs[c.id] = {};
                                if (!b.herald._attackPrefs[c.id]._remainingAtDetection) {
                                    b.herald._attackPrefs[c.id]._remainingAtDetection = c._remainingAtDetection;
                                }
                            }
                            // â”€â”€ Replanifier le timer d'esquive aprÃ¨s migration d'ID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                            // Le timer original a Ã©tÃ© posÃ© sur l'ancien ID (_dupExistingId) et rÃ©fÃ©rence
                            // l'ancien objet. AprÃ¨s migration, l'objet g[c.id] === _oldAtk est le bon,
                            // mais son timer n'existe plus (l'ancien setTimeout a capturÃ© l'ancien objet
                            // sous l'ancien ID, devenu orphelin). Si dodge=true, on replanifie maintenant.
                            // Le setTimeout existant se dÃ©clenchera quand mÃªme mais sera annulÃ© car
                            // l'objet qu'il a capturÃ© a Ã©tÃ© supprimÃ© de g (_dupExistingId n'existe plus).
                            (function(_migratedAtk) {
                                if (!_migratedAtk.dodge) return;
                                if (["waiting", "confirmed"].indexOf(_migratedAtk.status) < 0) return;
                                var _timeToDodgeMig = _migratedAtk.time - Timestamp.server() - 10;
                                _hld.log('DODGE', 'ðŸ” Replanification timer dodge aprÃ¨s migration id=' + _migratedAtk.id + ' timeRestant=' + Math.round(_timeToDodgeMig) + 's dodgeType=' + _migratedAtk.dodgeType);
                                if (_timeToDodgeMig > 0) {
                                    setTimeout(function() {
                                        if (_migratedAtk.dodge !== true) return;
                                        if (["waiting", "confirmed"].indexOf(_migratedAtk.status) < 0) return;
                                        // VÃ©rifier spam
                                        var _colMig = _getMovementsCollection();
                                        var _presentMig = [], _colCoversMig = false;
                                        if (_colMig) {
                                            _colMig.models.forEach(function(m) {
                                                var attr = m.attributes;
                                                if (attr && attr.target_town_id == _migratedAtk.to.id) {
                                                    _presentMig.push(attr.id);
                                                    _colCoversMig = true;
                                                }
                                            });
                                            if (typeof Game !== "undefined" && Game.townId == _migratedAtk.to.id) _colCoversMig = true;
                                        }
                                        var _foundMig = _presentMig.indexOf(_migratedAtk.id) !== -1 ||
                                            (_migratedAtk.command_id && _colMig && _colMig.models.some(function(mm) {
                                                return mm.attributes.command_id == _migratedAtk.id || mm.attributes.id == _migratedAtk.command_id;
                                            }));
                                        if (_migratedAtk.test !== true && _colCoversMig && !_foundMig) {
                                            _migratedAtk.status = "spam";
                                            _refreshHeraldScope();
                                            if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                            return;
                                        }
                                        _migratedAtk.status = "dodge_pending";
                                        _refreshHeraldScope();
                                        if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                        _hld.log('DODGE', 'ðŸš€ autododge (post-migration) id=' + _migratedAtk.id + ' dodgeType=' + _migratedAtk.dodgeType);
                                        try { b.herald.autododge(_migratedAtk, _migratedAtk, [_migratedAtk]); } catch(_e) {
                                            _hld.log('DODGE', 'ðŸ’¥ Exception autododge post-migration id=' + _migratedAtk.id + ' : ' + _e.toString());
                                        }
                                    }, _timeToDodgeMig * 1e3);
                                } else {
                                    // DÃ©jÃ  dans les 10 derniÃ¨res secondes â†’ esquive immÃ©diate
                                    _migratedAtk.status = "dodge_pending";
                                    _refreshHeraldScope();
                                    if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                    _hld.log('DODGE', 'ðŸš€ autododge immÃ©diat (post-migration) id=' + _migratedAtk.id + ' dodgeType=' + _migratedAtk.dodgeType);
                                    try { b.herald.autododge(_migratedAtk, _migratedAtk, [_migratedAtk]); } catch(_e) {
                                        _hld.log('DODGE', 'ðŸ’¥ Exception autododge immÃ©diat post-migration id=' + _migratedAtk.id + ' : ' + _e.toString());
                                    }
                                }
                            }(_oldAtk));
                            // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                            _refreshHeraldScope();
                        }
                    } else {
                        if (_dupExistingId && e[c.to.id] && e[c.to.id].indexOf(_dupExistingId) === -1) {
                            e[c.to.id].push(_dupExistingId);
                        }
                        _hld.log('DETECT', 'â™»ï¸ Doublon ignorÃ© id=' + c.id + ' (dÃ©jÃ  sous id=' + _dupExistingId + ')');
                    }
                    return;
                }
                var _automaneuver = (!d || d.automaneuver === undefined || d.automaneuver === "global") ? b.sett.herald_automaneuver : d.automaneuver;
                c.dodge = (!!_automaneuver && _automaneuver !== "disabled");
                if (c.dodge) c.dodgeType = 'all';
                c.status = "waiting";
                c.militia = (b.sett.herald_militia === "always");
                // Appliquer les prÃ©fÃ©rences sauvegardÃ©es (dodge/militia cochÃ©s avant le refresh)
                // NB: _prefs est lu APRÃˆS le merge doublon pour capturer les prefs migrÃ©es
                var _prefs = null;
                // Chercher si une autre entrÃ©e _attackPrefs correspond Ã  la mÃªme attaque
                // sous un ID diffÃ©rent (doublon command_id / movements_units).
                // On merge systÃ©matiquement â€” sans condition sur dodge ou militia â€”
                // pour ne perdre aucune prÃ©fÃ©rence cochÃ©e quelle que soit la ville active.
                if (b.herald._attackPrefs) {
                    for (var _altId in b.herald._attackPrefs) {
                        if (String(_altId) === String(c.id)) continue;
                        var _altP = b.herald._attackPrefs[_altId];
                        if (!_altP) continue;
                        var _sameCmd = c.command_id && _altP._commandId && String(c.command_id) === String(_altP._commandId);
                        // â”€â”€ CURATOR STABLE KEY : prefs sauvegardÃ©es sous command_id directement â”€â”€â”€â”€â”€â”€
                        // Si _altId == c.command_id, c'est la clÃ© stable curator â†’ match direct.
                        var _altIsCommandId = c.command_id && String(_altId) === String(c.command_id);
                        // Si l'attaque courante a son ID == un _commandId enregistrÃ© â†’ mÃªme attaque
                        var _curIdIsCommandId = _altP._commandId && String(c.id) === String(_altP._commandId);
                        // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        var _sameAtk = c.time && _altP._time && c.time == _altP._time && c.from && _altP._fromId && String(c.from.id) === String(_altP._fromId);
                        if (_sameCmd || _altIsCommandId || _curIdIsCommandId || _sameAtk) {
                            if (!_prefs) { b.herald._attackPrefs[c.id] = {}; _prefs = b.herald._attackPrefs[c.id]; }
                            // Merger : pour chaque champ de l'ancien ID, on prend la valeur
                            // la plus "riche" â€” true > false > undefined/null
                            for (var _k in _altP) {
                                if (_prefs[_k] === undefined || _prefs[_k] === null) {
                                    _prefs[_k] = _altP[_k];
                                } else if (_altP[_k] === true && _prefs[_k] === false) {
                                    _prefs[_k] = true; // cochÃ© sur l'autre ID â†’ prioritÃ©
                                }
                            }
                            delete b.herald._attackPrefs[_altId];
                            _hld.log('PREFS', '\u{1F500} Merge prefs doublon id=' + _altId + ' â†’ ' + c.id + ' (sameCmd=' + !!_sameCmd + ' altIsCmd=' + !!_altIsCommandId + ' curIsCmd=' + !!_curIdIsCommandId + ' sameAtk=' + !!_sameAtk + ')');
                            break;
                        }
                    }
                }
                // Lire les prefs aprÃ¨s le merge pour capturer les prefs migrÃ©es depuis un doublon
                _prefs = b.herald._attackPrefs && b.herald._attackPrefs[c.id];
                // â”€â”€ CURATOR STABLE KEY : fallback lecture sous command_id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                // Si rien sous c.id (nouvelle session, ID movements_units changÃ©),
                // chercher directement sous command_id qui est toujours stable cÃ´tÃ© serveur.
                if (!_prefs && c.command_id && b.checkPremium("curator")) {
                    var _cmdDirectPrefs = b.herald._attackPrefs && b.herald._attackPrefs[c.command_id];
                    if (_cmdDirectPrefs) {
                        // Migrer sous c.id pour que les sauvegardes ultÃ©rieures utilisent le bon ID
                        b.herald._attackPrefs[c.id] = _cmdDirectPrefs;
                        delete b.herald._attackPrefs[c.command_id];
                        _prefs = b.herald._attackPrefs[c.id];
                        _hld.log('PREFS', '\u{1F5DD}\u{FE0F} Prefs curator trouvÃ©es sous command_id=' + c.command_id + ' \u{2192} migrÃ© sous id=' + c.id);
                    }
                }
                // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                if (_prefs) {
                    _hld.log('PREFS', 'ðŸ” Prefs restaurÃ©es pour id=' + c.id + ' _rad=' + (_prefs._remainingAtDetection ? Math.round(_prefs._remainingAtDetection)+'s' : 'absent') + ' _manualSentTs=' + (_prefs._manualSentTs || 'absent'));
                    if (_prefs.dodge !== undefined) c.dodge     = _prefs.dodge;
                    if (_prefs.militia !== undefined) c.militia = _prefs.militia;
                    if (_prefs.dodgeType) c.dodgeType = _prefs.dodgeType;
                    if (c.dodge && !c.dodgeType) c.dodgeType = 'all';
                    if (_prefs.spell && _prefs.spell !== 'disabled') c.spell = _prefs.spell;
                    else if (_prefs.spells && _prefs.spells.length) c.spell = _prefs.spells[0]; // compat
                    // Restaurer les donnÃ©es de dÃ©tection sauvegardÃ©es sur VPS (persistance refresh)
                    // TOUJOURS Ã©craser depuis _attackPrefs : la valeur calculÃ©e au boot est fausse
                    // (basÃ©e sur le temps actuel, pas sur la vraie dÃ©tection initiale).
                    if (_prefs._remainingAtDetection) {
                        c._remainingAtDetection = _prefs._remainingAtDetection;
                    }
                    if (_prefs._distDurations) {
                        c._distDurations = _prefs._distDurations;
                    }
                    if (_prefs.distance) {
                        c.distance = _prefs.distance;
                    }
                    if (_prefs._manualSentTs) {
                        c._manualSentTs = _prefs._manualSentTs;
                        c._manualDetection = true;
                    }
                    // EXCEPTION : si live, conserver uniquement les donnÃ©es techniques
                    // (_remainingAtDetection, distance, etc.) pour les recrÃ©ations futures.
                    // dodge/militia/dodgeType sont gÃ©rÃ©s exclusivement par switchOption/setDodgeType
                    // qui Ã©crivent directement dans _attackPrefs â€” on ne les touche pas ici.
                    if (c._liveDetected && c._remainingAtDetection) {
                        if (!b.herald._attackPrefs[c.id]) b.herald._attackPrefs[c.id] = {};
                        var _existing = b.herald._attackPrefs[c.id];
                        _existing._remainingAtDetection = c._remainingAtDetection;
                        if (!_existing.distance       && c.distance)       _existing.distance       = c.distance;
                        if (!_existing._distDurations && c._distDurations) _existing._distDurations = c._distDurations;
                        if (!_existing._manualSentTs  && c._manualSentTs)  _existing._manualSentTs  = c._manualSentTs;
                        _hld.log('PREFS', 'ðŸ’¾ Re-sauvegarde post-consommation id=' + c.id + ' _rad=' + Math.round(_existing._remainingAtDetection||0) + 's');
                    } else {
                        // Purger seulement si aucun _remainingAtDetection sauvegardÃ© dans _attackPrefs
                        // (prÃ©sence de _remainingAtDetection = dÃ©tection live d'une session prÃ©cÃ©dente â†’ garder)
                        // Ã‰vite de dÃ©truire les prefs VPS quand _processAllMovements recrÃ©e un objet
                        // sans _liveDetected pour une attaque qui Ã©tait pourtant live.
                        var _savedPrefsForPurge = b.herald._attackPrefs && b.herald._attackPrefs[c.id];
                        if (!(_savedPrefsForPurge && _savedPrefsForPurge._remainingAtDetection)) {
                            delete b.herald._attackPrefs[c.id]; // consommÃ©, pas live â†’ on purge
                        }
                    }
                } else {
                    _hld.log('PREFS', 'âšª Pas de prefs pour id=' + c.id + ' (premiÃ¨re dÃ©tection ou prefs absentes)');
                }
                // Marquer les attaques chargÃ©es au boot (pas dÃ©tectÃ©es en live) :
                // Une attaque est "live" uniquement si _onMovAdd l'a marquÃ©e _liveDetected=true.
                // Toutes les autres (boot via collection, command_overview, _processAllMovements)
                // sont boot-loaded â†’ panel manuel requis si pas de donnÃ©es VPS.
                // Exception : si _remainingAtDetection est restaurÃ© depuis VPS â†’ donnÃ©es fiables.
                if ((!_prefs || !_prefs._remainingAtDetection) && !c._liveDetected) {
                    c._bootLoaded = true;
                    _hld.log('DETECT', 'ðŸ“‹ id=' + c.id + ' â†’ _bootLoaded=true (panel manuel requis) â€” prefs=' + (!!_prefs) + ' _liveDetected=' + (!!c._liveDetected));
                } else {
                    _hld.log('DETECT', 'ðŸŸ¢ id=' + c.id + ' â†’ LIVE dÃ©tection confirmÃ©e â€” _rad=' + Math.round(c._remainingAtDetection||0) + 's _manualDetection=' + (!!c._manualDetection));
                }
                g[c.id] = c;
                // DÃ©tection CS depuis les prefs VPS restaurÃ©es (_distDurations + _remainingAtDetection dÃ©jÃ  prÃ©sents)
                // Couvre le cas du refresh : _tryFinalize/fbFinalize ne tournent pas si distance dÃ©jÃ  en VPS
                // Fallback sur _attackPrefs si _remainingAtDetection absent sur c (objet recrÃ©Ã© sans prefs)
                var _radCsL = c._remainingAtDetection
                    || (b.herald._attackPrefs && b.herald._attackPrefs[c.id] && b.herald._attackPrefs[c.id]._remainingAtDetection);
                if (!c.cs && c._distDurations && c._distDurations.colonize_ship && _radCsL) {
                    if (_csIsLeading(c._distDurations, _radCsL) && c.from && c.from.player_name) {
                        c.cs = true;
                        c.deviation = Math.abs(1.0 - 1.0 * c._distDurations.colonize_ship / _radCsL);
                        _hld.log('DETECT', 'ðŸš¢ CS dÃ©tectÃ© depuis VPS id=' + c.id + ' deviation=' + c.deviation.toFixed(3));
                    }
                    if (b.sett.herald_militia === "cs") c.militia = (c.cs === true);
                }
                var h = function() {
                    a.notify_text(c);
                    a.notify_email(c);
                    // Partage immÃ©diat avec les amis via WebSocket
                    if (b.friends && typeof b.friends._pushShared === "function") {
                        b.friends._pushShared();
                    }
                };

                // Appliquer militia par dÃ©faut seulement si les prefs n'ont pas dÃ©jÃ  Ã©tÃ© restaurÃ©es
                if (!_prefs) c.militia = (b.sett.herald_militia === "always");
                // Timer dÃ©diÃ© : passage waiting â†’ confirmed Ã  10 minutes de l'impact
                // Timer dÃ©diÃ© : notification "en cours de prÃ©paration" Ã  2 minutes de l'impact
                (function(_atk) {
                    // waiting â†’ confirmed Ã  d_approach (10 min)
                    var _timeToConfirm = _atk.time - Timestamp.server() - d_approach;
                    if (_timeToConfirm > 0) {
                        setTimeout(function() {
                            if (_atk.status === "waiting") {
                                _atk.status = "confirmed";
                                _refreshHeraldScope();
                                if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                            }
                        }, _timeToConfirm * 1e3);
                    } else if (_atk.status === "waiting") {
                        // DÃ©jÃ  dans la fenÃªtre â†’ confirmed immÃ©diatement
                        _atk.status = "confirmed";
                    }
                    // Notification prÃ©paration Ã  2 min
                    // DÃ‰DUP par horodatage : on stocke le timestamp de la derniÃ¨re notif envoyÃ©e
                    // pour cette ville. Si une notif a Ã©tÃ© envoyÃ©e il y a moins de 30s â†’ skip.
                    // Ainsi A1+A2 (Ã©cart 3s) â†’ une seule notif. A3 (Ã©cart 34s) â†’ sa propre notif.
                    var _timeToAlert = _atk.time - Timestamp.server() - 120;
                    if (_timeToAlert > 0 && b.sett.herald_text === true) {
                        setTimeout(function() {
                            if (!_atk.dodge && !_atk.militia) return;
                            if (["waiting", "confirmed"].indexOf(_atk.status) === -1) return;
                            var _townAttacks = b.herald.town[_atk.to.id] && b.herald.town[_atk.to.id].attack;
                            var _now2 = Timestamp.server();
                            // Skip si une notif prÃ©pa a dÃ©jÃ  Ã©tÃ© envoyÃ©e pour cette ville dans les 30 derniÃ¨res secondes
                            if (_townAttacks && _townAttacks._prepNotifAt && (_now2 - _townAttacks._prepNotifAt) < 30) return;
                            if (_townAttacks) _townAttacks._prepNotifAt = _now2;
                            var _msg;
                            if (_atk.dodge && _atk.militia) _msg = b.t("ðŸŒ€ Auto-esquive + ðŸ”± Milice en cours de prÃ©paration pour [town]{0}[/town]");
                            else if (_atk.dodge)            _msg = b.t("ðŸŒ€ Auto-esquive en cours de prÃ©paration pour [town]{0}[/town]");
                            else                            _msg = b.t("ðŸ”± Milice en cours de prÃ©paration pour [town]{0}[/town]");
                            i("ally", _msg, _atk.to.id).msg(20);
                        }, _timeToAlert * 1e3);
                    }
                    // â”€â”€ Timer d'esquive individuel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    // DÃ©clenche l'esquive dÃ¨s que possible :
                    // - S'il existe une attaque sans dodge sur la mÃªme ville AVANT _atk,
                    //   on attend qu'elle soit passÃ©e (impact+1s) avant de partir.
                    //   Ex: A1(dodge) A2(dÃ©fend) A3(dodge) â†’ A3 part Ã  A2+1s, pas Ã  A3-10s.
                    // - Sinon on part Ã  10s avant l'impact comme d'habitude.
                    var _timeToDodge = _atk.time - Timestamp.server() - 10;
                    if (_timeToDodge > 0) {
                        setTimeout(function() {
                            // VÃ©rifier au moment du dÃ©clenchement que dodge est toujours activÃ©
                            if (_atk.dodge !== true) return;
                            if (["waiting", "confirmed"].indexOf(_atk.status) < 0) return;
                            // Chercher une attaque sans dodge sur la mÃªme ville, future, antÃ©rieure Ã  _atk
                            // Si elle n'est pas encore passÃ©e â†’ attendre qu'elle passe avant de partir
                            var _now2 = Timestamp.server();
                            var _waitFor = 0;
                            var _townAtks = b.herald.town[_atk.to.id] && b.herald.town[_atk.to.id].attack;
                            if (_townAtks) {
                                for (var _wid in _townAtks) {
                                    var _wa = _townAtks[_wid];
                                    if (!_wa || typeof _wa !== "object") continue;
                                    if (_wa.id === _atk.id) continue;
                                    if (_wa.dodge === true) continue;         // seulement les non-dodge
                                    if (_wa.time >= _atk.time) continue;      // seulement avant notre attaque
                                    if (_wa.time < _now2) continue;            // dÃ©jÃ  passÃ©e
                                    // Cette attaque sans dodge n'est pas encore passÃ©e â†’ attendre
                                    var _delay = _wa.time - _now2 + 1;        // +1s aprÃ¨s son impact
                                    if (_delay > _waitFor) _waitFor = _delay;
                                }
                            }
                            if (_waitFor > 0) {
                                // Reporter le dÃ©part jusqu'aprÃ¨s l'attaque Ã  dÃ©fendre
                                i("debug", "Dodge A#{0} delayed {1}s to let non-dodge attack pass first", _atk.id, Math.round(_waitFor)).send();
                                setTimeout(function() {
                                    if (_atk.dodge !== true) return;
                                    if (["waiting", "confirmed"].indexOf(_atk.status) < 0) return;
                                    _atk.status = "dodge_pending";
                                    _refreshHeraldScope();
                                    if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                    try { b.herald.autododge(_atk, _atk, [_atk]); } catch(_e) {}
                                }, _waitFor * 1e3);
                                return;
                            }
                            // â”€â”€ VÃ©rifier si cette attaque est dÃ©jÃ  englobÃ©e dans la fenÃªtre d'esquive d'une attaque prÃ©cÃ©dente â”€â”€
                            // Si une attaque dodge antÃ©rieure couvre dÃ©jÃ  _atk.time,
                            // inutile de lancer un autododge sÃ©parÃ© â€” les troupes sont dÃ©jÃ  parties
                            // et la commande de cette attaque-lÃ  a Ã©tÃ© calculÃ©e avec _lastImpact Ã©tendu Ã  _atk.time.
                            // CORRECTIF : on accepte dodge_pending ET struck (l'esquive s'est faite mais A1
                            // est dÃ©jÃ  passÃ©e). Avant : si A1 passait Ã  "struck" avant que le timer de A2 ne
                            // vÃ©rifie, A2 ne se reconnaissait plus comme couverte et relanÃ§ait un autododge inutile.
                            if (_townAtks) {
                                for (var _cid in _townAtks) {
                                    var _ca = _townAtks[_cid];
                                    if (!_ca || typeof _ca !== "object") continue;
                                    if (_ca.id === _atk.id) continue;
                                    if (_ca.dodge !== true) continue;              // seulement les attaques dodge
                                    if (_ca.time >= _atk.time) continue;           // seulement les attaques AVANT _atk
                                    // Accepter : dodge_pending (esquive en cours) ou struck (esquive faite, impact passÃ©)
                                    if (_ca.status !== "dodge_pending" && _ca.status !== "struck") continue;
                                    // Ne pas considÃ©rer couverte si le type d'esquive est incompatible
                                    var _sameType = (_ca.dodgeType === _atk.dodgeType) ||
                                                    (_ca.dodgeType === 'all') ||
                                                    (_atk.dodgeType === 'all');
                                    if (!_sameType) continue;
                                    // A_prev couvre _atk si l'Ã©cart est â‰¤ 10s (logique _lastImpact dans autododge)
                                    if (_atk.time - _ca.time <= 10) {
                                        _atk.status = "dodge_pending"; // marquer pour l'UI (pas de double esquive)
                                        _refreshHeraldScope();
                                        if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                        i("debug", "Dodge A#{0} skipped â€” already covered by dodge of A#{1} (gap={2}s, status={3})", _atk.id, _ca.id, Math.round(_atk.time - _ca.time), _ca.status).send();
                                        return;
                                    }
                                }
                            }
                            // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                            // VÃ©rifier que l'attaque est toujours prÃ©sente dans movements_units
                            // IMPORTANT : la collection ne contient que les mouvements de la ville active.
                            // Si la ville concernÃ©e par l'attaque n'est pas la ville courante, la collection
                            // est incomplÃ¨te â†’ on ne peut pas conclure que l'attaque est spam.
                            var col = _getMovementsCollection();
                            var _present = [];
                            var _colCoversThisTown = false;
                            if (col) {
                                col.models.forEach(function(m) {
                                    var attr = m.attributes;
                                    if (attr && attr.target_town_id == _atk.to.id) {
                                        _present.push(attr.id);
                                        _colCoversThisTown = true;
                                    }
                                });
                                // Si la ville active est la ville concernÃ©e, la collection est fiable mÃªme si vide
                                if (typeof Game !== "undefined" && Game.townId == _atk.to.id) {
                                    _colCoversThisTown = true;
                                }
                            }
                            // Matcher sur attr.id OU command_id (curator crÃ©e l'attaque avec command_id comme id fallback)
                            var _atkFoundInCol = _present.indexOf(_atk.id) !== -1 ||
                                (_atk.command_id && _present.some(function(_pid2) {
                                    var _m = col && col.models.find(function(mm) { return mm.attributes.id == _pid2; });
                                    return _m && (_m.attributes.command_id == _atk.id || _m.attributes.id == _atk.command_id);
                                }));
                            if (_atk.test !== true && _colCoversThisTown && !_atkFoundInCol) {
                                _atk.status = "spam";
                                _refreshHeraldScope();
                                if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                i("debug", "Dodge cancelled (spam) for attack #{0}", _atk.id);
                                return;
                            }
                            _atk.status = "dodge_pending";
                            _refreshHeraldScope();
                            if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                            i("debug", "Individual dodge triggered for attack #{0} on [town]{1}[/town]", _atk.id, _atk.to.id);
                            try {
                                b.herald.autododge(_atk, _atk, [_atk]);
                            } catch(_e) {
                                i("debug", "Individual dodge exception: {0}", _e.toString()).send();
                            }
                        }, _timeToDodge * 1e3);
                    } else if (_atk.dodge === true && ["waiting", "confirmed"].indexOf(_atk.status) >= 0) {
                        // Attaque dÃ©jÃ  dans les 10 derniÃ¨res secondes â†’ vÃ©rifier d'abord si couverte
                        var _townAtksImm = b.herald.town[_atk.to.id] && b.herald.town[_atk.to.id].attack;
                        var _coveredImm = false;
                        if (_townAtksImm) {
                            for (var _cid2 in _townAtksImm) {
                                var _ca2 = _townAtksImm[_cid2];
                                if (!_ca2 || typeof _ca2 !== "object") continue;
                                if (_ca2.id === _atk.id) continue;
                                if (_ca2.dodge !== true) continue;
                                if (_ca2.time >= _atk.time) continue;
                                if (_ca2.status !== "dodge_pending" && _ca2.status !== "struck") continue;
                                // Ne pas considÃ©rer couverte si le type d'esquive est incompatible
                                var _sameTypeImm = (_ca2.dodgeType === _atk.dodgeType) ||
                                                   (_ca2.dodgeType === 'all') ||
                                                   (_atk.dodgeType === 'all');
                                if (!_sameTypeImm) continue;
                                if (_atk.time - _ca2.time <= 10) {
                                    _coveredImm = true;
                                    _atk.status = "dodge_pending";
                                    _refreshHeraldScope();
                                    if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                    i("debug", "Dodge A#{0} skipped (imm) â€” already covered by dodge of A#{1} (gap={2}s)", _atk.id, _ca2.id, Math.round(_atk.time - _ca2.time)).send();
                                    break;
                                }
                            }
                        }
                        if (!_coveredImm) {
                            _atk.status = "dodge_pending";
                            _refreshHeraldScope();
                            try { b.herald.autododge(_atk, _atk, [_atk]); } catch(_e) {}
                        }
                    }
                    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                }(c));
                if (!c.quest) {
                    // Calculer les durÃ©es depuis la distance WMap + GameData.units (toutes les unitÃ©s du jeu)
                    // Formule : durÃ©e(s) = floor(distance * 50 / (speed * game_speed))
                    // La distance est exprimÃ©e en unitÃ©s de temps slinger, dÃ©rivÃ©e du remaining rÃ©el Ã  la dÃ©tection
                    var _detectionTs = Timestamp.server();
                    // Capturer le temps restant Ã  la dÃ©tection (immuable, utilisÃ© pour les %)
                    // NE PAS Ã©craser si dÃ©jÃ  restaurÃ© depuis le VPS (persistance refresh/reboot)
                    if (!c._remainingAtDetection) {
                        c._remainingAtDetection = c.time - _detectionTs;
                    }
                    // PrÃ©-calculer les durÃ©es de toutes les unitÃ©s du jeu depuis la distance WMap
                    // Formule rÃ©elle du jeu : floor(50 * distRaw / speed + setupTime)
                    // Le game_speed s'annule entre distance*gs et speed*gs
                    // NE PAS Ã©craser si dÃ©jÃ  restaurÃ© depuis le VPS
                    if (c.distance && GameData && GameData.units && !c._distDurations) {
                        c._distDurations = {};
                        var _setupTime = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time);
                        Object.keys(GameData.units).forEach(function(_uid) {
                            var _u = GameData.units[_uid];
                            if (!_u || !_u.speed) return;
                            c._distDurations[_uid] = Math.floor(50 * c.distance / _u.speed + _setupTime);
                        });
                    }
                    // DÃ©tection CS via colonize_ship
                    if (c._distDurations && c._distDurations.colonize_ship) {
                        var _csRem  = c._remainingAtDetection;
                        if (_csIsLeading(c._distDurations, _csRem) && c.from && c.from.player_name) {
                            c.cs = true;
                            c.deviation = Math.abs(1.0 - 1.0 * c._distDurations.colonize_ship / _csRem);
                        }
                    }
                    if (b.sett.herald_militia === "cs") c.militia = (c.cs === true);
                    _refreshHeraldScope();
                    h();
                } else h();
                m++;
            });
            for (var n in e) {
                var o = checker[n];
                if (o) {
                    o.status = "idle";
                    clearTimeout(o.timer);
                    i("debug", "Remove auto-check for [town]{0}[/town]", n);
                }
                if (!(n in l)) continue;
                var p = e[n];
                // Ne marquer "disparue" que si la liste reÃ§ue contient AU MOINS autant
                // d'attaques que ce qu'on connaÃ®t dÃ©jÃ . Si elle en contient moins,
                // la collection est incomplÃ¨te (reset partiel) â†’ on ne touche Ã  rien.
                var _knownCount = Object.keys(l[n].attack).filter(function(aid) {
                    var a = l[n].attack[aid];
                    return a && a.time > j && ["waiting","confirmed","dodge_pending","militia_pending"].indexOf(a.status) !== -1;
                }).length;
                if (p.length < _knownCount) {
                    _hld.log('DISAP', 'ðŸ›¡ï¸ Protection disappeared ville=' + n + ' â€” reÃ§u ' + p.length + ' attaques, connu ' + _knownCount + ' â†’ skip (liste incomplÃ¨te)');
                    continue;
                }
                for (var q in l[n].attack) {
                    q = l[n].attack[q];
                    // Comparer en string pour Ã©viter les faux nÃ©gatifs number vs string (indexOf est strict ===)
                    if ((q.time - j > h) && (p.map(String).indexOf(String(q.id)) == -1)) {
                        _hld.log('DISAP', 'ðŸ”´ DISAPPEARED id=' + q.id + ' nom=' + (q.from&&q.from.name||'?') + 'â†’' + (q.to&&q.to.name||'?') + ' status_avant=' + q.status + ' time=' + new Date(q.time*1000).toLocaleTimeString() + ' absent de la liste reÃ§ue=[' + p.join(',') + ']');
                        q.status = "disappeared";
                        i("debug", "Attack '{0}' disappeared", q.id);
                        // Informer les amis immÃ©diatement que l'attaque a disparu
                        if (b.friends && typeof b.friends._pushShared === "function") {
                            b.friends._pushShared();
                        }
                    }
                }
            }
            var r = 0;
            if (m > 0) {
                for (var n in l) {
                    var s = 0;
                    for (var q in l[n].attack) {
                        q = l[n].attack[q];
                        if ((q.time > j) && (g.indexOf(q.status) != -1)) s++;
                    }
                    r = Math.max(r, s);
                }
            }
        }

        function m(herald, c) {
            var d = ITowns.getTown(c);
            if (!d || !d.id) return;
            var e = checker[d.id];
            if (!e) e = checker[d.id] = {};
            if (e.status == "scheduled") return;
            e.status = "scheduled";
            e.timer = setTimeout(function() {
                e.status = "idle";
                i("debug", "Check attacks for [town]{0}[/town]", d.id);
                if (b.checkPremium("curator")) {
                    // Curator : command_overview retourne les mouvements de TOUTES les villes,
                    // peu importe la ville active â†’ dÃ©tection fiable mÃªme en arriÃ¨re-plan.
                    b.ajaxRequestGet("town_overviews", "command_overview", {}, function(_bot, resp) {
                        try {
                            if (!resp || !resp.data || !Array.isArray(resp.data.commands)) return;
                            var attacks = [], townIds = [];
                            resp.data.commands.forEach(function(cmd) {
                                if (!cmd.origin_town_player_id) return; // quÃªte NPC
                                if (cmd.origin_town_player_id === Game.player_id) return; // sortant
                                var _movId = cmd.id;
                                try {
                                    var _col = _getMovementsCollection();
                                    if (_col) {
                                        _col.models.forEach(function(mm) {
                                            var ma = mm.attributes;
                                            if (ma.command_id == cmd.id || ma.id == cmd.id) {
                                                _movId = ma.id;
                                            } else if (
                                                ma.arrival_at == cmd.arrival_at &&
                                                ma.home_town_id == cmd.origin_town_id &&
                                                ma.target_town_id == cmd.destination_town_id
                                            ) {
                                                _movId = ma.id;
                                            }
                                        });
                                    }
                                } catch(_e) {}
                                var _atkFrom = {
                                    id:          cmd.origin_town_id,
                                    name:        cmd.origin_town_name,
                                    player_id:   cmd.origin_town_player_id   || null,
                                    player_name: cmd.origin_town_player_name || ""
                                };
                                var _atkTo = {
                                    id:   cmd.destination_town_id,
                                    name: cmd.destination_town_name
                                };
                                _atkFrom.link = _townLink(_atkFrom, false);
                                _atkTo.link   = _townLink(_atkTo,   true);
                                a.towns.update(_atkFrom);
                                a.towns.update(_atkTo);
                                var atk = {
                                    id:         _movId,
                                    command_id: cmd.id,
                                    type:       cmd.type,
                                    quest:      (cmd.is_quest === true) | (!cmd.origin_town_player_id),
                                    time:       cmd.arrival_at,
                                    incoming:   true,
                                    from: _atkFrom,
                                    to:   _atkTo
                                };
                                // DÃ©tection via checker/notification :
                                // Si _attackPrefs a dÃ©jÃ  _remainingAtDetection â†’ live (session prÃ©cÃ©dente)
                                // Sinon â†’ jamais dÃ©tectÃ©e en live â†’ panel manuel
                                if (b.herald._attackPrefs[_movId] && b.herald._attackPrefs[_movId]._remainingAtDetection) {
                                    atk._liveDetected = true;
                                }
                                // Pas de _remainingAtDetection â†’ _bootLoaded=true posÃ© par l() â†’ panel manuel
                                // Calculer la distance via frontend_bridge depuis la ville ATTAQUÃ‰E (destination),
                                // pas depuis b.lastTownId (ville active) qui donnerait une distance incorrecte.
                                if (!atk.quest && _atkFrom.id && _atkTo.id) {
                                    (function(_atkId, _fromId, _toId, _destTownId, _herald) {
                                        var _fbResults = {};
                                        function _fbFinalize() {
                                            if (!_fbResults.to || !_fbResults.from) return;
                                            if (!_herald || !_herald.town || !_herald._attackPrefs) return;
                                            // Retrouver l'objet attaque dans g (peut avoir Ã©tÃ© insÃ©rÃ© par l())
                                            var _atkObj = null;
                                            for (var _tid in _herald.town) {
                                                if (_herald.town[_tid].attack && _herald.town[_tid].attack[_atkId]) {
                                                    _atkObj = _herald.town[_tid].attack[_atkId];
                                                    break;
                                                }
                                            }
                                            if (!_atkObj) return;
                                            if (_fbResults.from.distance != null && !_atkObj.distance) {
                                                _atkObj.distance = _fbResults.from.distance;
                                                if (!_atkObj._distDurations && GameData && GameData.units) {
                                                    var _st = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time) || 0;
                                                    _atkObj._distDurations = {};
                                                    Object.keys(GameData.units).forEach(function(_uid) {
                                                        var _u = GameData.units[_uid];
                                                        if (!_u || !_u.speed) return;
                                                        _atkObj._distDurations[_uid] = Math.floor(50 * _atkObj.distance / _u.speed + _st);
                                                    });
                                                }
                                                // Sauvegarder dans _attackPrefs pour persistance
                                                if (!_herald._attackPrefs[_atkId]) _herald._attackPrefs[_atkId] = {};
                                                _herald._attackPrefs[_atkId].distance = _atkObj.distance;
                                                if (_atkObj._distDurations) _herald._attackPrefs[_atkId]._distDurations = _atkObj._distDurations;
                                                _refreshHeraldScope();
                                            }
                                            _atkObj._sameIslandFallback = (
                                                _fbResults.from.island_x === _fbResults.to.island_x &&
                                                _fbResults.from.island_y === _fbResults.to.island_y
                                            );
                                            // DÃ©tection CS maintenant que _distDurations et _sameIslandFallback sont disponibles
                                            // Fallback sur _attackPrefs si _remainingAtDetection absent sur _atkObj
                                            var _radCs3 = _atkObj._remainingAtDetection
                                                || (b.herald._attackPrefs && b.herald._attackPrefs[_atkObj.id] && b.herald._attackPrefs[_atkObj.id]._remainingAtDetection);
                                            if (!_atkObj.cs && _atkObj._distDurations && _atkObj._distDurations.colonize_ship && _radCs3) {
                                                if (_csIsLeading(_atkObj._distDurations, _radCs3) && _atkObj.from && _atkObj.from.player_name) {
                                                    _atkObj.cs = true;
                                                    _atkObj.deviation = Math.abs(1.0 - 1.0 * _atkObj._distDurations.colonize_ship / _radCs3);
                                                    if (b.sett.herald_militia === "cs") _atkObj.militia = true;
                                                    b.herald.notify_text(_atkObj);
                                                    b.herald.notify_email(_atkObj);
                                                    _refreshHeraldScope();
                                                }
                                            }
                                        }
                                        // RequÃªte depuis la ville ATTAQUÃ‰E vers la cible (pour island_x/y cible)
                                        b.ajaxRequestGet('frontend_bridge', 'fetch', {
                                            window_type: "runtime_info", tab_type: "index",
                                            known_data: { models: [], collections: ["Units", "Towns"], templates: [] },
                                            arguments: { target_town_id: _toId, is_portal_command: false },
                                            town_id: _destTownId, nl_init: true
                                        }, function(bot, r) {
                                            try {
                                                var _d = r && r.models && r.models.RuntimeSimulator && r.models.RuntimeSimulator.data;
                                                if (!_d) return;
                                                _fbResults.to = { island_x: _d.island_x, island_y: _d.island_y };
                                                _fbFinalize();
                                            } catch(_e) {}
                                        });
                                        // RequÃªte depuis la ville ATTAQUÃ‰E vers la source (attaquant) â†’ vraie distance
                                        b.ajaxRequestGet('frontend_bridge', 'fetch', {
                                            window_type: "runtime_info", tab_type: "index",
                                            known_data: { models: [], collections: ["Units", "Towns"], templates: [] },
                                            arguments: { target_town_id: _fromId, is_portal_command: false },
                                            town_id: _destTownId, nl_init: true
                                        }, function(bot, r) {
                                            try {
                                                var _d = r && r.models && r.models.RuntimeSimulator && r.models.RuntimeSimulator.data;
                                                if (!_d) return;
                                                _fbResults.from = { distance: _d.distance, island_x: _d.island_x, island_y: _d.island_y };
                                                _fbFinalize();
                                            } catch(_e) {}
                                        });
                                    }(_movId, _atkFrom.id, _atkTo.id, cmd.destination_town_id, herald));
                                }
                                attacks.push(atk);
                                if (townIds.indexOf(atk.to.id) < 0) townIds.push(atk.to.id);
                            });
                            if (attacks.length > 0) {
                                l(b.herald, attacks, townIds);
                                _refreshHeraldScope();
                            }
                        } catch(ex) {
                            i("debug", "Check attacks command_overview error: {0}", ex.toString()).send();
                        }
                    }, "herald");
                } else {
                    // Sans curator : movements_units (ville active uniquement)
                    var col = _getMovementsCollection();
                    if (col) _processAllMovements(col);
                }
            }, 5e3 * (1 + Math.random()));
            i("debug", "Check attacks for [town]{0}[/town] scheduled", d.id);
        }

        function n(a) {
            var b = checker[a];
            if (b) {
                clearTimeout(b.timer);
                delete checker[a];
            }
        }

        function o(c, d) {
            var e = [];
            if (Array.isArray(d)) e = d.filter(function(a) {
                return ITowns.getTown(a);
            });
            else
                for (var f in ITowns.getTowns()) e.push(Number(f));
            if (!Array.isArray(e)) return;
            i("debug", "Refetch data for {0} town(s)", e.length);
            // â”€â”€ SÃ©paration stricte curator / non-curator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            // CURATOR  : uniquement command_overview (player_name toujours prÃ©sent).
            //            _processAllMovements est bloquÃ© au boot jusqu'Ã  la rÃ©ponse
            //            (_bootCuratorDone) pour Ã©viter tout doublon ID.
            // NON-CURATOR : uniquement la collection movements_units filtrÃ©e par ville.
            //               Pas de command_overview, pas de doublon possible.
            // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            if (b.checkPremium("curator")) {
                // Bloquer _processAllMovements pendant le chargement initial curator
                b.herald._bootCuratorDone = false;
                b.ajaxRequestGet("town_overviews", "command_overview", {}, function(_bot, d) {
                    var e = [];
                    d.data.commands.forEach(function(cmd) {
                        // RÃ©soudre l'ID depuis movements_units (attr.id) pour cohÃ©rence
                        // avec les Ã©vÃ©nements live (add/remove/reset utilisent attr.id).
                        // Matching prioritaire : command_id, puis arrival_at+home_town_id en fallback.
                        var _movId = cmd.id; // fallback = command_id
                        try {
                            var _col = _getMovementsCollection();
                            if (_col) {
                                _col.models.forEach(function(m) {
                                    var ma = m.attributes;
                                    if (ma.command_id == cmd.id || ma.id == cmd.id) {
                                        _movId = ma.id;
                                    } else if (
                                        ma.arrival_at == cmd.arrival_at &&
                                        ma.home_town_id == cmd.origin_town_id &&
                                        ma.target_town_id == cmd.destination_town_id
                                    ) {
                                        _movId = ma.id;
                                    }
                                });
                            }
                        } catch(_e) {}
                        // Si les prefs sont sauvegardÃ©es sous un ID diffÃ©rent (movements_units d'une
                        // session prÃ©cÃ©dente sur la bonne ville), les migrer sous _movId courant.
                        // Cas : boot sur ville 2 â†’ _movId = command_id fallback, mais prefs sauvegardÃ©es
                        // sous le vrai movements_units ID â†’ on cherche dans _attackPrefs par command_id.
                        if (b.herald._attackPrefs) {
                            for (var _pid in b.herald._attackPrefs) {
                                var _pp = b.herald._attackPrefs[_pid];
                                if (String(_pid) !== String(_movId) && _pp && _pp._commandId && String(_pp._commandId) === String(cmd.id)) {
                                    // Trouver les prefs sous un autre ID avec le mÃªme command_id â†’ migrer
                                    b.herald._attackPrefs[_movId] = _pp;
                                    delete b.herald._attackPrefs[_pid];
                                    break;
                                }
                            }
                        }
                        var _from = {
                            id:          cmd.origin_town_id,
                            name:        cmd.origin_town_name,
                            player_id:   cmd.origin_town_player_id   || null,
                            player_name: cmd.origin_town_player_name || ""
                        };
                        var _to = {
                            id:   cmd.destination_town_id,
                            name: cmd.destination_town_name
                        };
                        _from.link = _townLink(_from, false);
                        _to.link   = _townLink(_to,   true);
                        a.towns.update(_from);
                        a.towns.update(_to);
                        var c = {
                            id: _movId,
                            command_id: cmd.id,
                            type: cmd.type,
                            quest: (cmd.is_quest === true) | (!cmd.origin_town_player_id),
                            time: cmd.arrival_at,
                            incoming: cmd.origin_town_player_id !== Game.player_id,
                            from: _from,
                            to:   _to
                        };
                        // DÃ©tection au boot curator :
                        // - Si _attackPrefs a dÃ©jÃ  _remainingAtDetection (session prÃ©cÃ©dente) â†’ live
                        // - Sinon â†’ jamais dÃ©tectÃ©e en live â†’ _bootLoaded, panel manuel requis
                        if (c.incoming) {
                            if (b.herald._attackPrefs[_movId] && b.herald._attackPrefs[_movId]._remainingAtDetection) {
                                // DÃ©jÃ  dÃ©tectÃ©e en live avant â†’ marquer live pour Ã©viter _bootLoaded
                                c._liveDetected = true;
                            }
                            // Pas de _remainingAtDetection â†’ _bootLoaded=true posÃ© par l() â†’ panel manuel
                        }
                        e.push(c);
                    });
                    // DÃ©bloquer _processAllMovements (pour les events live suivants)
                    b.herald._bootCuratorDone = true;
                    var _townIds2 = [];
                    e.forEach(function(_a) { if (_townIds2.indexOf(_a.to.id) < 0) _townIds2.push(_a.to.id); });
                    l(b.herald, e, _townIds2);
                }, "commander");
            } else {
                // Non-curator : lire directement depuis movements_units, une ville Ã  la fois
                try {
                    e.forEach(function(townId) {
                        var col = _getMovementsCollection();
                        if (!col) return;
                        var attacks = [];
                        col.models.forEach(function(model) {
                            var atk = _movAttrToAttack(model.attributes);
                            if (atk.incoming && atk.to.id == townId) attacks.push(atk);
                        });
                        i("debug", "Fetch data (local) for [town]{0}[/town]: {1} movements", townId, attacks.length);
                        if (attacks.length > 0) l(b.herald, attacks, [townId]);
                    });
                } catch (h) {
                    i("debug", "fetch(), exception: {0}", h).send();
                }
            }
        }

        function p() {
            var a = 0,
                c = Timestamp.server(),
                d = b.herald;
            // Si auto_remove activÃ©, nettoyer immÃ©diatement les attaques terminÃ©es
            if (b.sett.herald_auto_remove === true) {
                var _changed = false;
                for (var _tid in d.town) {
                    var _atks = d.town[_tid].attack;
                    for (var _aid in _atks) {
                        var _a = _atks[_aid];
                        if (_a && (_a.time < c || ["struck","spam","disappeared","deleted"].indexOf(_a.status) !== -1)) {
                            delete _atks[_aid];
                            _changed = true;
                        }
                    }
                }
                if (_changed) _refreshHeraldScope();
            }
            for (var e in d.town) {
                var f = d.town[e];
                for (var g in f.attack) {
                    var h = f.attack[g];
                    if (h.time > c) {
                        a++;
                        break;
                    }
                }
                if (a > 0) break;
            }
            // Compter les attaques d'amis encore actives pour l'indicateur visuel
            for (var j = 0; j < d.import_data.length; j++) {
                var h = d.import_data[j];
                if (h && h.time > c && (h.status === "waiting" || h.status === "confirmed")) {
                    a++;
                    break;
                }
            }
            d.control.css("opacity", a > 0 ? "1.0" : "0.3");
        }
        b.herald = {
            town: {},
            import_data: [],
            export_data: [],
            _attackPrefs: {},
            _bootCuratorDone: !b.checkPremium("curator"), // true d'emblÃ©e si non-curator
            _startupTs: (typeof Timestamp !== 'undefined' && Timestamp.server ? Timestamp.server() : Math.floor(Date.now() / 1000)),
            _dismissedAttacks: {},
            militia: function(a) {
                var c = b.models.Town[a.to.id],
                    d = c.getMilitia(),
                    e = Timestamp.server(),
                    f = b.herald.town[c.id].militia;
                if (a.militia != true) return;
                // Accepter waiting, confirmed, militia_pending, dodge_pending
                var _validStatuses = ["waiting", "confirmed", "militia_pending", "dodge_pending"];
                if (_validStatuses.indexOf(a.status) === -1) return;
                if (c.hasConqueror()) return;
                if (d && (d.get("finished_at") >= e)) {
                    i("debug", "Militia already enlisted in [town]{0}[/town]", c.id);
                    return;
                }
                b.herald.town[c.id].militia = e;
                b.ajaxRequestPost("building_farm", "request_militia", {
                    town_id: c.id
                }, function(a, d) {
                    if (b.sett.herald_text === true) i("ally", b.t("ðŸ”± Milice levÃ©e pour [town]{0}[/town]"), c.id).msg(15);
                    b.herald.town[c.id].militia = Timestamp.now();
                }, "commander");
            },
            notify_text: function(a) {
                if (b.sett.herald_text !== true) return;
                // Les deux villes sont dans a.towns -> [town]id[/town] rendu correctement
                var fromStr = "[town]" + a.from.id + "[/town]";
                var toStr   = "[town]" + a.to.id   + "[/town]";

                // â”€â”€ BUGFIX : attendre que le JSON de langue soit chargÃ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                // b.t() est synchrone â€” si le fetch du JSON n'est pas encore terminÃ©
                // au moment de la premiÃ¨re attaque, la chaÃ®ne reste en anglais (la clÃ© brute).
                // On diffÃ¨re l'affichage jusqu'Ã  l'Ã©vÃ©nement grepoplus:langReady,
                // avec un fallback Ã  3 s si la lang est dÃ©jÃ  "fr" (pas de fetch).
                var _doNotify = function() {
                    if (a.cs === true)
                        i("error", b.t("*** CS INCOMING *** {0} attack {1}, arrival at: {2}, fiabilitÃ©: {3}%"), fromStr, toStr, b.ts2text(a.time), (100 - a.deviation * 100).toFixed(1)).msg(120);
                    else
                        i("error", b.t("{0} attack your town {1}, arrival at: {2}"), fromStr, toStr, b.ts2text(a.time)).msg(120);
                };
                var _lang = (b.detectLang ? b.detectLang() : null) || "fr";
                // Si la langue est dÃ©jÃ  en cache â†’ afficher direct (fr.json est chargÃ© comme toutes les autres)
                if (window._grepoI18nCache && window._grepoI18nCache[_lang]) {
                    _doNotify();
                } else {
                    // Attendre l'Ã©vÃ©nement de fin de chargement de la langue
                    var _done = false;
                    var _onLangReady = function() {
                        if (_done) return;
                        _done = true;
                        document.removeEventListener("grepoplus:langReady", _onLangReady);
                        _doNotify();
                    };
                    document.addEventListener("grepoplus:langReady", _onLangReady);
                    // Fallback : si l'Ã©vÃ©nement ne vient jamais (lang dÃ©jÃ  chargÃ©e avant
                    // qu'on s'abonne, ou erreur rÃ©seau), on affiche quand mÃªme aprÃ¨s 2 s
                    setTimeout(_onLangReady, 2000);
                }
                // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            },
            notify_email: function(c) {
                if (b.sett.herald_email !== true) return;
                if ((b.sett.herald_email_cs_only === true) && (c.cs !== true)) return;
                var d, e;
                if (c.cs === true) {
                    e = b.t("Your town under attack, CS!");
                    d = a.format(b.t("*** CS INCOMING ***, {0}([town]{1}[/town]) attack your town {2}([town]{3}[/town]), arrival: {4}"), c.from.name, c.from.id, c.to.name, c.to.id, b.ts2text(c.time));
                } else {
                    e = b.t("Your city under attack");
                    d = a.format(b.t("{0}([town]{1}[/town]) attack your city {2}([town]{3}[/town]), arrival: {4}"), c.from.name, c.from.id, c.to.name, c.to.id, b.ts2text(c.time));
                }
                b.request("herald:email", {
                    subject: e,
                    text: d
                });
            },
            start: function() {
                var a = this;
                if (this.active) return;
                window._gfbot_module_loaded && window._gfbot_module_loaded("HÃ©raut", true);
                this.active = true;
                this._startupTs = Timestamp.server();
                try {
                    if (b.checkPremium("curator")) o(this);
                    else o(this, [Game.townId]);
                } catch (c) {
                    i("error", "start(), exception: {0}", c.toString()).send();
                }
                timers.autododge = setInterval(function() {
                    try {
                        a.autododge_check();
                    } catch (_autododgeErr) {
                        i("error", "autododge_check(), exception: {0}", _autododgeErr && _autododgeErr.toString ? _autododgeErr.toString() : String(_autododgeErr)).send();
                    }
                }, 60 * 1e3);
                timers.control = setInterval(p, 5 * 1E3);
            },
            stop: function() {
                if (timers.control) {
                    clearInterval(timers.control);
                    timers.control = null;
                }
                if (timers.autododge) {
                    clearInterval(timers.autododge);
                    timers.autododge = null;
                }
                i("info", "Stopped");
                this.active = false;
            },
            showAttacks: function() {
                var c = this;
                if (this.showAttacksEl) {
                    b.windows.close("herald");
                    this.showAttacksEl = null;
                    return;
                }
                var d = b.templates.herald,
                    e = $(d);
                e.draggable({
                    cancel: ".scrollbox, .attack, input, select, textarea"
                });
                b.ngApp.controller("heraldController", ["$scope", function(d) {
            d.t = function(str) { return a.t ? a.t(str) : str; };
            d._lang = a.detectLang ? a.detectLang() : 'fr';

                    d.data = {
                        predicate: "time",
                        sort: "time",
                        filter: b.sett.herald_share_attacks ? "all" : "own",
                        search: ""
                    };
                    d.devMode = function() { return !!(b.sett && b.sett.dev_mode) || window._gp_devmode === true; };
                    d.forceCheck = function() {
                        b.herald.autododge_check();
                    };
                    d.close = function() {
                        c.showAttacks();
                    };
                    d.formatTs = function(a) {
                        return b.ts2text(a);
                    };
                    d.test = function() {
                        var town = ITowns.getTown(Game.townId);
                        if (!town) return;
                        var now = Timestamp.server();
                        var townData = b.herald.town[Game.townId];
                        if (!townData) townData = b.herald.town[Game.townId] = { attack: {} };

                        var players = ["Achille", "Ulysse", "Ajax", "Hector", "Perseus", "Leonidas", "Themistocle", "Pericles", "Alexandre", "Socrate"];

                        var statuses = ["waiting", "confirmed", "spam", "waiting", "confirmed"];
                        var attacks = [
                            { offset: 45,  cs: false, dodge: true,  militia: false },
                            { offset: 90,  cs: true,  dodge: true,  militia: true  },
                            { offset: 130, cs: false, dodge: false, militia: true  },
                            { offset: 200, cs: false, dodge: true,  militia: false },
                            { offset: 260, cs: true,  dodge: true,  militia: true  },
                            { offset: 320, cs: false, dodge: false, militia: false },
                            { offset: 400, cs: false, dodge: true,  militia: true  },
                            { offset: 480, cs: true,  dodge: false, militia: true  },
                            { offset: 550, cs: false, dodge: true,  militia: false },
                            { offset: 620, cs: false, dodge: false, militia: true  }
                        ];

                        var testIds = [];
                        attacks.forEach(function(atk, i) {
                            var id = 9000 + i;
                            testIds.push(id);
                            townData.attack[id] = {
                                id: id,
                                test: true,
                                isOwn: true,
                                cs: atk.cs,
                                dodge: atk.dodge,
                                militia: atk.militia,
                                status: statuses[i % statuses.length],
                                time: now + atk.offset,
                                owner: players[i % players.length],
                                from: {
                                    id: Game.townId,
                                    link: a.towns.link(Game.townId, null, false)
                                },
                                to: {
                                    id: Game.townId,
                                    link: a.towns.link(Game.townId, null, true)
                                }
                            };
                        });

                        d.refresh();

                        setTimeout(function() {
                            testIds.forEach(function(id) {
                                delete townData.attack[id];
                            });
                            try { d.$apply(function() { d.refresh(); }); } catch(e) { d.refresh(); }
                        }, 8000);
                    };
                    d.sort = function(a) {
                        var b = "-" + a,
                            c;
                        d.data.sort = a;
                        switch (d.data.predicate) {
                            case a:
                                c = b;
                                break;
                            case b:
                                c = a;
                                break;
                            default:
                                c = a;
                        };
                        d.data.predicate = c;
                    };
                    d.dodgeEmoji = function(attack) {
                        if (!attack.dodge) return '';
                        var t = attack.dodgeType || 'all';
                        if (t === 'land')  return ' âš”ï¸';
                        if (t === 'naval') return ' âš“';
                        return ' âš”ï¸âš“';
                    };
                    d.openDodgeMenu = function(attack, $event) {
                        if ($event) $event.stopPropagation();
                        // Fermer tous les autres menus
                        var _atkList = (d.data && d.data.attacks) || [];
                        _atkList.forEach(function(a) { if (a !== attack) a._dodgeMenuOpen = false; });
                        attack._dodgeMenuOpen = !attack._dodgeMenuOpen;
                        if (attack._dodgeMenuOpen && $event) {
                            // Calculer la position fixed par rapport au bouton flÃ¨che cliquÃ©
                            var _arrow = $event.currentTarget || $event.target;
                            var _rect = _arrow.getBoundingClientRect();
                            attack._dodgeMenuStyle = {
                                position: 'fixed',
                                top: (_rect.bottom + 4) + 'px',
                                left: _rect.left + 'px',
                                zIndex: 999999
                            };
                            // Fermer au prochain clic extÃ©rieur
                            setTimeout(function() {
                                $(document).one('click.dodgemenu', function() {
                                    attack._dodgeMenuOpen = false;
                                    try { d.$apply(); } catch(e) {}
                                });
                            }, 50);
                        }
                    };
                    d.setDodgeType = function(attack, type) {
                        attack._dodgeMenuOpen = false;
                        attack.dodge = true;
                        var _prevType = attack.dodgeType;
                        attack.dodgeType = type;
                        _hld.log('DODGE', 'ðŸŽ¯ setDodgeType id=' + attack.id + ' type: ' + _prevType + ' â†’ ' + type + ' status=' + attack.status);
                        // â”€â”€ Fix dodgeType par attaque : sauvegarder les prefs pour rÃ©sister aux refreshs â”€â”€
                        if (!b.herald._attackPrefs) b.herald._attackPrefs = {};
                        if (!b.herald._attackPrefs[attack.id]) b.herald._attackPrefs[attack.id] = {};
                        b.herald._attackPrefs[attack.id].dodge     = true;
                        b.herald._attackPrefs[attack.id].dodgeType = type;
                        if (attack._remainingAtDetection) b.herald._attackPrefs[attack.id]._remainingAtDetection = attack._remainingAtDetection;
                        if (attack.distance)              b.herald._attackPrefs[attack.id].distance              = attack.distance;
                        if (attack._distDurations)        b.herald._attackPrefs[attack.id]._distDurations        = attack._distDurations;
                        if (attack._manualSentTs)         b.herald._attackPrefs[attack.id]._manualSentTs         = attack._manualSentTs;
                        if (attack.command_id)            b.herald._attackPrefs[attack.id]._commandId            = attack.command_id;
                        if (attack.time)                  b.herald._attackPrefs[attack.id]._time                  = attack.time;
                        if (attack.from && attack.from.id) b.herald._attackPrefs[attack.id]._fromId               = attack.from.id;
                        // â”€â”€ CURATOR STABLE KEY : dupliquer sous command_id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        if (attack.command_id && String(attack.command_id) !== String(attack.id) && b.checkPremium("curator")) {
                            if (!b.herald._attackPrefs[attack.command_id]) b.herald._attackPrefs[attack.command_id] = {};
                            var _sdtCmdPrefs = b.herald._attackPrefs[attack.command_id];
                            _sdtCmdPrefs.dodge     = true;
                            _sdtCmdPrefs.dodgeType = type;
                            if (attack._remainingAtDetection) _sdtCmdPrefs._remainingAtDetection = attack._remainingAtDetection;
                            if (attack.distance)              _sdtCmdPrefs.distance              = attack.distance;
                            if (attack._distDurations)        _sdtCmdPrefs._distDurations        = attack._distDurations;
                            if (attack._manualSentTs)         _sdtCmdPrefs._manualSentTs         = attack._manualSentTs;
                            _sdtCmdPrefs._commandId = attack.command_id;
                            if (attack.time)               _sdtCmdPrefs._time   = attack.time;
                            if (attack.from && attack.from.id) _sdtCmdPrefs._fromId = attack.from.id;
                        }
                        // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        // â”€â”€ Fix : si le type change alors que l'attaque est dÃ©jÃ  dodge_pending,
                        //    le timer dÃ©jÃ  planifiÃ© utilisera l'ancien type (closure figÃ©e).
                        //    On remet confirmed et on replanifie proprement via switchOption. â”€â”€
                        if (_prevType !== type && attack.status === "dodge_pending") {
                            _hld.log('DODGE', 'ðŸ” setDodgeType: type changÃ© pendant dodge_pending â†’ reset confirmed + replanification id=' + attack.id);
                            attack.status = "confirmed";
                            // Simuler un re-cochage pour replanifier le timer avec le nouveau type
                            d.switchOption(attack, 'dodge'); // dÃ©coche (dodgeâ†’false)
                            d.switchOption(attack, 'dodge'); // recoche (dodgeâ†’true) â†’ replanifie
                            return; // switchOption appelle dÃ©jÃ  _refreshHeraldScope + _pushShared
                        }
                        // â”€â”€ Fix : setDodgeType ne passait pas par switchOption â†’ le setTimeout
                        //    "impact - 10s" n'Ã©tait jamais crÃ©Ã© quand on choisissait un type depuis
                        //    le menu (ex: all â†’ naval). L'esquive tombait alors sur le filet d'urgence
                        //    autododge_check (<15s), beaucoup trop tard.
                        //    Solution : simuler un re-cochage via switchOption pour crÃ©er le timer. â”€â”€
                        if (["waiting", "confirmed", "militia_pending"].indexOf(attack.status) >= 0) {
                            _hld.log('DODGE', 'â±ï¸ setDodgeType: planification timer individuel via re-cochage id=' + attack.id + ' type=' + type + ' status=' + attack.status);
                            d.switchOption(attack, 'dodge'); // dÃ©coche (dodgeâ†’false)
                            d.switchOption(attack, 'dodge'); // recoche (dodgeâ†’true) â†’ crÃ©e le setTimeout
                            return; // switchOption appelle dÃ©jÃ  _refreshHeraldScope + _pushShared
                        }
                        // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        _refreshHeraldScope();
                        if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                    };
                    d.switchOption = function(a, opt) {
                        if (a.isOwn) {
                            if (opt === 'dodge') {
                                a._dodgeMenuOpen = false;
                                a.dodge = !a.dodge;
                                if (a.dodge && !a.dodgeType) a.dodgeType = 'all';
                                _hld.log('DODGE', (a.dodge ? 'âœ… DODGE cochÃ©' : 'âŒ DODGE dÃ©cochÃ©') + ' id=' + a.id + ' dodgeType=' + a.dodgeType + ' status=' + a.status);
                            } else {
                                a[opt] = !a[opt];
                                _hld.log('DODGE', 'toggle opt=' + opt + 'â†’' + a[opt] + ' id=' + a.id);
                            }
                            // â”€â”€ Fix dodgeType par attaque : persister les prefs Ã  chaque toggle â”€â”€
                            if (!b.herald._attackPrefs) b.herald._attackPrefs = {};
                            if (!b.herald._attackPrefs[a.id]) b.herald._attackPrefs[a.id] = {};
                            b.herald._attackPrefs[a.id].dodge    = a.dodge;
                            b.herald._attackPrefs[a.id].militia  = a.militia;
                            if (a.dodgeType)             b.herald._attackPrefs[a.id].dodgeType             = a.dodgeType;
                            // Conserver _remainingAtDetection pour que l'attaque reste "live" au prochain reload
                            if (a._remainingAtDetection) b.herald._attackPrefs[a.id]._remainingAtDetection = a._remainingAtDetection;
                            if (a.distance)              b.herald._attackPrefs[a.id].distance              = a.distance;
                            if (a._distDurations)        b.herald._attackPrefs[a.id]._distDurations        = a._distDurations;
                            if (a._manualSentTs)         b.herald._attackPrefs[a.id]._manualSentTs         = a._manualSentTs;
                            // Sauvegarder command_id pour permettre la migration des prefs au boot
                            // sur une ville diffÃ©rente (quand movements_units ne contient pas cette attaque)
                            if (a.command_id)            b.herald._attackPrefs[a.id]._commandId            = a.command_id;
                            if (a.time)                  b.herald._attackPrefs[a.id]._time                  = a.time;
                            if (a.from && a.from.id)     b.herald._attackPrefs[a.id]._fromId                = a.from.id;
                            // â”€â”€ CURATOR STABLE KEY : dupliquer les prefs sous command_id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                            // L'ID movements_units change Ã  chaque refresh quand la ville n'est pas active.
                            // En sauvegardant aussi sous command_id (toujours stable), le merge au boot
                            // retrouve les prefs mÃªme si _movId a changÃ©.
                            if (a.command_id && String(a.command_id) !== String(a.id) && b.checkPremium("curator")) {
                                if (!b.herald._attackPrefs[a.command_id]) b.herald._attackPrefs[a.command_id] = {};
                                var _cmdPrefs = b.herald._attackPrefs[a.command_id];
                                _cmdPrefs.dodge    = a.dodge;
                                _cmdPrefs.militia  = a.militia;
                                if (a.dodgeType)             _cmdPrefs.dodgeType             = a.dodgeType;
                                if (a._remainingAtDetection) _cmdPrefs._remainingAtDetection = a._remainingAtDetection;
                                if (a.distance)              _cmdPrefs.distance              = a.distance;
                                if (a._distDurations)        _cmdPrefs._distDurations        = a._distDurations;
                                if (a._manualSentTs)         _cmdPrefs._manualSentTs         = a._manualSentTs;
                                _cmdPrefs._commandId = a.command_id;
                                if (a.time)              _cmdPrefs._time   = a.time;
                                if (a.from && a.from.id) _cmdPrefs._fromId = a.from.id;
                            }
                            // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                            // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                            // â”€â”€ Bug 3 fix : refresh immÃ©diat de l'UI aprÃ¨s toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                            _refreshHeraldScope();
                            // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                            if (b.friends && typeof b.friends._pushShared === "function") {
                                b.friends._pushShared();
                            }
                            // â”€â”€ Bug 2 fix : si on dÃ©coche dodge et que l'esquive est en cours,
                            //    remettre le statut Ã  "confirmed" pour annuler proprement â”€â”€
                            if (opt === "dodge" && a.dodge === false && a.status === "dodge_pending") {
                                _hld.log('DODGE', 'ðŸ” DÃ©cochage pendant dodge_pending â†’ statut remis Ã  confirmed id=' + a.id);
                                a.status = "confirmed";
                                _refreshHeraldScope();
                                if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                i("debug", "Dodge cancelled by user for attack #{0} on [town]{1}[/town]", a.id, a.to.id).send();
                            }
                            // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                            if (a[opt] === true && b.sett.herald_text === true) {
                                var _timeLeft = a.time - Timestamp.server();
                                if (_timeLeft > 0 && _timeLeft < 120) {
                                    var _msg;
                                    if (a.dodge && a.militia) _msg = b.t("ðŸŒ€ Auto-esquive + ðŸ”± Milice en cours de prÃ©paration pour [town]{0}[/town]");
                                    else if (a.dodge)         _msg = b.t("ðŸŒ€ Auto-esquive en cours de prÃ©paration pour [town]{0}[/town]");
                                    else                      _msg = b.t("ðŸ”± Milice en cours de prÃ©paration pour [town]{0}[/town]");
                                    i("ally", _msg, a.to.id).msg(20);
                                }
                            }
                            // â”€â”€ Si on vient de cocher dodge=true manuellement, planifier le timer individuel â”€â”€
                            if (opt === "dodge" && a.dodge === true && ["waiting", "confirmed", "militia_pending"].indexOf(a.status) >= 0) {
                                _hld.log('DODGE', 'â±ï¸ Planification timer dodge manuel id=' + a.id + ' dodgeType=' + a.dodgeType + ' status=' + a.status + ' timeRestant=' + Math.round(a.time - Timestamp.server()) + 's');
                                (function(_atk) {
                                    var _timeToDodge = _atk.time - Timestamp.server() - 10;
                                    // Fonction commune : vÃ©rifier spam + _waitFor + dÃ©clencher autododge
                                    // UtilisÃ©e aussi bien par le timer diffÃ©rÃ© que par le chemin immÃ©diat (< 10s).
                                    var _fireDodge = function() {
                                        if (_atk.dodge !== true) return;
                                        if (["waiting", "confirmed", "militia_pending"].indexOf(_atk.status) < 0) return;
                                        // â”€â”€ VÃ©rification spam â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                                        var col = _getMovementsCollection();
                                        var _present = [];
                                        var _colCoversThisTown = false;
                                        if (col) {
                                            col.models.forEach(function(m) {
                                                var attr = m.attributes;
                                                if (attr && attr.target_town_id == _atk.to.id) {
                                                    _present.push(attr.id);
                                                    _colCoversThisTown = true;
                                                }
                                            });
                                            if (typeof Game !== "undefined" && Game.townId == _atk.to.id) {
                                                _colCoversThisTown = true;
                                            }
                                        }
                                        // Matcher sur attr.id OU command_id (fix curator doublon)
                                        var _atkFoundInCol2 = _present.indexOf(_atk.id) !== -1 ||
                                            (_atk.command_id && col && col.models.some(function(mm) {
                                                return mm.attributes.command_id == _atk.id || mm.attributes.id == _atk.command_id;
                                            }));
                                        if (_atk.test !== true && _colCoversThisTown && !_atkFoundInCol2) {
                                            _hld.log('DISAP', 'ðŸš« SPAM dÃ©tectÃ© (fireDodge) id=' + _atk.id + ' â€” collection couvre la ville mais attaque absente. _present=[' + _present.join(',') + ']');
                                            _atk.status = "spam";
                                            _refreshHeraldScope();
                                            if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                            return;
                                        }
                                        // â”€â”€ _waitFor : attendre les attaques non-dodge antÃ©rieures â”€â”€â”€â”€â”€â”€â”€â”€â”€
                                        // CORRECTIF : le timer manuel manquait cette logique. Sans elle,
                                        // si A1=no-dodge et A2=dodge cochÃ© manuellement, les troupes
                                        // partaient 10s avant A2 sans attendre A1, laissant la ville vide.
                                        var _now2 = Timestamp.server();
                                        var _waitFor = 0;
                                        var _townAtks = b.herald.town[_atk.to.id] && b.herald.town[_atk.to.id].attack;
                                        if (_townAtks) {
                                            for (var _wid in _townAtks) {
                                                var _wa = _townAtks[_wid];
                                                if (!_wa || typeof _wa !== "object") continue;
                                                if (_wa.id === _atk.id) continue;
                                                if (_wa.dodge === true) continue;      // seulement les non-dodge
                                                if (_wa.time >= _atk.time) continue;   // seulement avant notre attaque
                                                if (_wa.time < _now2) continue;        // dÃ©jÃ  passÃ©e
                                                var _delay = _wa.time - _now2 + 1;    // +1s aprÃ¨s son impact
                                                if (_delay > _waitFor) _waitFor = _delay;
                                            }
                                        }
                                        if (_waitFor > 0) {
                                            _hld.log('DODGE', 'â³ _fireDodge id=' + _atk.id + ' retardÃ© de ' + Math.round(_waitFor) + 's (attaque non-dodge antÃ©rieure pas encore passÃ©e)');
                                            i("debug", "Manual dodge A#{0} delayed {1}s (non-dodge attack not yet passed)", _atk.id, Math.round(_waitFor)).send();
                                            setTimeout(function() {
                                                if (_atk.dodge !== true) return;
                                                if (["waiting", "confirmed", "militia_pending"].indexOf(_atk.status) < 0) return;
                                                _hld.log('DODGE', 'ðŸš€ autododge (delayed) id=' + _atk.id + ' dodgeType=' + _atk.dodgeType);
                                                _atk.status = "dodge_pending";
                                                _refreshHeraldScope();
                                                if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                                try { b.herald.autododge(_atk, _atk, [_atk]); } catch(_e) {
                                                    i("debug", "Manual dodge (delayed) exception: {0}", _e.toString()).send();
                                                }
                                            }, _waitFor * 1e3);
                                            return;
                                        }
                                        // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                                        _hld.log('DODGE', 'ðŸš€ autododge id=' + _atk.id + ' dodgeType=' + _atk.dodgeType + ' status=' + _atk.status);
                                        _atk.status = "dodge_pending";
                                        _refreshHeraldScope();
                                        if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                        i("debug", "Manual dodge triggered for attack #{0} on [town]{1}[/town]", _atk.id, _atk.to.id);
                                        try {
                                            b.herald.autododge(_atk, _atk, [_atk]);
                                        } catch(_e) {
                                            _hld.log('DODGE', 'ðŸ’¥ Exception autododge id=' + _atk.id + ' : ' + _e.toString());
                                            i("debug", "Manual dodge exception: {0}", _e.toString()).send();
                                        }
                                    };
                                    if (_timeToDodge > 0) {
                                        _hld.log('DODGE', 'â±ï¸ _fireDodge planifiÃ© dans ' + Math.round(_timeToDodge) + 's pour id=' + _atk.id);
                                        setTimeout(_fireDodge, _timeToDodge * 1e3);
                                    } else {
                                        // Moins de 10s â†’ dÃ©clencher immÃ©diatement (avec _waitFor quand mÃªme)
                                        _hld.log('DODGE', 'âš¡ _fireDodge immÃ©diat (< 10s) pour id=' + _atk.id);
                                        _fireDodge();
                                    }
                                }(a));
                            }
                            // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        }
                    };
                    // Ouvre un panel sort en popup jQuery (hors Angular pour Ã©viter les digest loops)
                    // Infobulle pour l'emoji sort dans le header
                    d.spellTooltipHtml = function(sid) {
                        try {
                            var _p = GameData.powers[sid];
                            if (!_p) return sid;
                            return '<strong>' + _p.name + '</strong>'
                                + (_p.description ? '<br><span style=&quot;color:#a09070;font-size:10px;&quot;>' + _p.description + '</span>' : '')
                                + '<br><span style=&quot;color:#c9a84c;font-size:10px;&quot;>' + (a.t ? a.t('Faveur') : 'Faveur') + ' : ' + (_p.favor || 0) + '</span>';
                        } catch(e) { return sid; }
                    };
                    d.spellTooltipText = function(sid) {
                        try {
                            var _p = GameData.powers[sid];
                            if (!_p) return sid;
                            var _favor = (a.t ? a.t('Faveur') : 'Faveur') + ' : ' + (_p.favor || 0);
                            return _p.name + (_p.description ? '\n' + _p.description : '') + '\n' + _favor;
                        } catch(e) { return sid; }
                    };
                    d.spellBtnTooltip = function() {
                        var _t = a.t ? a.t.bind(a) : function(s) { return s; };
                        return '<strong>' + _t('Sort divin') + '</strong>'
                            + '<br><span style="color:#a09070;font-size:10px;">'
                            + _t('Le sort se lance automatiquement 4 Ã  5 secondes avant l\'arrivÃ©e des troupes ennemies.')
                            + '<br><br>âš ï¸ '
                            + _t('Certains sorts peuvent Ãªtre inefficaces car les ennemis arriveront seulement 4 Ã  5 secondes plus tard.')
                            + '</span>';
                    };
                    // â”€â”€ Positionner et afficher le panel info â”€â”€
                    function _showInfoPanel(_panel, $event) {
                        // Si le panel est dÃ©jÃ  dans le DOM avec une position dÃ©finie, ne pas repositionner â€”
                        // juste rendre visible (cas du remplissage asynchrone du contenu aprÃ¨s premier affichage).
                        var _alreadyPlaced = _panel.parent().length && _panel.css('top') !== '' && _panel.css('top') !== 'auto' && parseInt(_panel.css('top')) > 0;
                        if (_alreadyPlaced) {
                            _panel.css('visibility', 'visible');
                            return;
                        }
                        _panel.css({ position: 'fixed', visibility: 'hidden', 'z-index': 999999 });
                        $('body').append(_panel);
                        // Bloquer le scanner de tooltips natif de Grepolis sur nos icÃ´nes d'unitÃ©s
                        _panel.find('.unit_icon40x40').on('mouseenter mouseover', function(e) {
                            e.stopImmediatePropagation();
                        });
                        // Tooltips bonus gÃ©rÃ©s par le handler global dans settings.js (data-bonus-id)
                        var _btn = $event && $event.currentTarget;
                        if (_btn) {
                            var _rect = _btn.getBoundingClientRect ? _btn.getBoundingClientRect() : null;
                            if (_rect) {
                                var _panelW = _panel.outerWidth();
                                var _panelH = _panel.outerHeight();
                                var _vw = window.innerWidth;
                                var _vh = window.innerHeight;
                                var _left = _rect.left;
                                var _top  = _rect.bottom + 4;
                                if (_left + _panelW > _vw - 8) _left = _vw - _panelW - 8;
                                if (_left < 8) _left = 8;
                                if (_top + _panelH > _vh - 8) _top = _rect.top - _panelH - 4;
                                if (_top < 8) _top = 8;
                                _panel.css({ top: _top + 'px', left: _left + 'px', visibility: 'visible' });
                            } else {
                                _panel.css({ top: '100px', right: '20px', visibility: 'visible' });
                            }
                        } else {
                            _panel.css({ top: '100px', right: '20px', visibility: 'visible' });
                        }
                        // Bouton fermer (croix)
                        _panel.find('.gfb-info-close').off('click.infoclose').on('click.infoclose', function(e) {
                            e.stopPropagation();
                            $('#gfb-info-panel').remove();
                            $(document).off('click.infopanel');
                        });
                        setTimeout(function() {
                            $(document).on('click.infopanel', function(e) {
                                if (!$(e.target).closest('#gfb-info-panel').length) {
                                    $('#gfb-info-panel').remove();
                                    $(document).off('click.infopanel');
                                }
                            });
                        }, 100);
                    }

                    // â”€â”€ Panel "? Infos" : analyse probabiliste de l'unitÃ© attaquante â”€â”€
                    d.openInfoPanel = function(attack, $event) {
                        if ($event) $event.stopPropagation();
                        var _t = a.t ? a.t.bind(a) : function(s) { return s; };

                        // Toggle : si panel dÃ©jÃ  ouvert pour cette attaque â†’ fermer
                        var _existingPanel = $('#gfb-info-panel');
                        if (_existingPanel.length && _existingPanel.data('attack-id') === attack.id) {
                            _existingPanel.remove();
                            $(document).off('click.infopanel');
                            return;
                        }
                        _existingPanel.remove();
                        $(document).off('click.infopanel');

                        // â”€â”€ Temps restant â”€â”€
                        var _remaining = attack.time - Timestamp.server();
                        if (_remaining <= 0) {
                            var _donePanel = $('<div id="gfb-info-panel" class="hw-spell-panel">'
                                + '<div class="hw-spell-panel-title">âš¤ï¸ ' + _t('Analyse de l\'attaque') + '</div><span class="notif-close gfb-info-close" title="' + _t('Fermer') + '">âœ•</span>'
                                + '<div style="padding:8px;color:#888;font-size:9px;">' + _t('Attaque dÃ©jÃ  arrivÃ©e') + '</div>'
                                + '</div>').data('attack-id', attack.id);
                            _showInfoPanel(_donePanel, $event);
                            return;
                        }

                        // â”€â”€ Utiliser _distDurations (fiables, prÃ©-calculÃ©es Ã  la dÃ©tection) â”€â”€
                        // Si _bootLoaded, l'attaque n'a pas Ã©tÃ© dÃ©tectÃ©e en live â†’ _distDurations
                        // calculÃ©es depuis maintenant, pas depuis l'envoi rÃ©el â†’ non fiables â†’ panel manuel.
                        // Si _manualSentTs prÃ©sent mais _manualDetection absent (restauration VPS tardive) â†’ forcer le flag
                        if (attack._manualSentTs && !attack._manualDetection) {
                            attack._manualDetection = true;
                        }
                        // Fallback : si le VPS n'a pas encore rÃ©pondu, vÃ©rifier _attackPrefs directement
                        if (!attack._manualDetection && b.herald._attackPrefs && b.herald._attackPrefs[attack.id] && b.herald._attackPrefs[attack.id]._manualSentTs) {
                            var _latePrefs = b.herald._attackPrefs[attack.id];
                            attack._manualSentTs    = _latePrefs._manualSentTs;
                            attack._manualDetection = true;
                            if (_latePrefs._remainingAtDetection) attack._remainingAtDetection = _latePrefs._remainingAtDetection;
                            if (_latePrefs._distDurations)        attack._distDurations        = _latePrefs._distDurations;
                            if (_latePrefs.distance)              attack.distance              = _latePrefs.distance;
                        }

                        // â”€â”€ _BONUS_ICONS / _buildBonusIcons : portÃ©e partagÃ©e entre les deux panels â”€â”€
                        var _BONUS_ICONS_SHARED = [
                            { factor: 0.7, cls: 'power power_icon45x45 unit_movement_boost', naval: false, tip: 'Sort : Vitesse des unitÃ©s (-30%)', type: 'power',    id: 'unit_movement_boost', size: 45 },
                            { factor: 0.9, cls: 'research_icon research40x40 meteorology',   naval: false, tip: 'MÃ©tÃ©orologie (-10%)',              type: 'research',  id: 'meteorology',         size: 40 },
                            { factor: 0.9, cls: 'research_icon research40x40 cartography',   naval: false, tip: 'Cartographie (-10%)',              type: 'research',  id: 'cartography',         size: 40 },
                            { factor: 0.9, cls: 'research_icon research40x40 set_sail',      naval: true,  tip: 'Voiles dÃ©ployÃ©es (-10%)',          type: 'research',  id: 'set_sail',            size: 40 },
                            { factor: 0.9, cls: 'building_icon40x40 lighthouse',             naval: true,  tip: 'Phare (-10%)',                     type: 'building',  id: 'lighthouse',          size: 40 }
                        ];
                        // _buildBonusIcons : accepte un objet de flags { boost, meteor, carto, light, sail }
                        // directement issus de _bestObj â€” aucune reconstruction numÃ©rique fragile.
                        function _buildBonusIcons(flags, isNaval) {
                            if (!flags) return '';
                            // Mapping flag â†’ entrÃ©e _BONUS_ICONS_SHARED
                            var _flagMap = { unit_movement_boost: !!flags.boost, meteorology: !!flags.meteor, cartography: !!flags.carto, set_sail: !!flags.sail, lighthouse: !!flags.light };
                            var icons = '';
                            _BONUS_ICONS_SHARED.forEach(function(bi) {
                                if (!_flagMap[bi.id]) return;
                                if (bi.naval && !isNaval) return;
                                var _scale = (16 / bi.size).toFixed(4);
                                icons += '<div data-bonus-type="' + bi.type + '" data-bonus-id="' + bi.id + '" '
                                    + 'style="display:inline-block;width:16px;height:16px;overflow:hidden;'
                                    + 'flex-shrink:0;vertical-align:middle;cursor:help;position:relative;">'
                                    + '<div class="modifier_icon ' + bi.cls + '" '
                                    + 'style="transform:scale(' + _scale + ');transform-origin:top left;'
                                    + 'position:absolute;top:0;left:0;pointer-events:none;"></div>'
                                    + '</div>';
                            });
                            return icons ? '<span style="display:inline-flex;align-items:center;gap:1px;margin-left:3px;">' + icons + '</span>' : '';
                        }

                        console.log('[HERALD-DEBUG-COND] id=' + attack.id
                            + ' | _distDurations=' + (attack._distDurations ? Object.keys(attack._distDurations).length + ' unitÃ©s' : 'ABSENT')
                            + ' | _bootLoaded=' + (!!attack._bootLoaded)
                            + ' | _manualDetection=' + (!!attack._manualDetection)
                            + ' | _remainingAtDetection=' + (attack._remainingAtDetection ? Math.round(attack._remainingAtDetection) + 's' : 'ABSENT'));
                        if (attack._distDurations && Object.keys(attack._distDurations).length > 0 && !attack._bootLoaded && !attack._manualDetection) {
                            _hld.log('RENDER', 'ðŸ–¥ï¸ Rendu panel live id=' + attack.id + ' _remainingAtDetection=' + Math.round(attack._remainingAtDetection||0) + 's _distDurations keys=' + Object.keys(attack._distDurations).length + ' _bootLoaded=' + (!!attack._bootLoaded) + ' _manualDetection=' + (!!attack._manualDetection), { _distDurations: attack._distDurations, _rad: attack._remainingAtDetection });
                            var _panel = $('<div id="gfb-info-panel" class="hw-spell-panel">'
                                + '<div class="hw-spell-panel-title">âš¤ï¸ ' + _t('Analyse de l\'attaque') + '</div><span class="notif-close gfb-info-close" title="' + _t('Fermer') + '">âœ•</span>'
                                + '<div></div>'
                                + '</div>').data('attack-id', attack.id);
                            _showInfoPanel(_panel, $event);
                            (function(_atk, _panel2) {
                            // â”€â”€ Recalculer le temps restant pour l'affichage (peut avoir Ã©voluÃ©) â”€â”€
                            var _remainingForCalc = _atk._remainingAtDetection;
                            var _remainingDisplay = _atk.time - Timestamp.server();
                            var _hh = Math.floor(_remainingDisplay / 3600);
                            var _mm = Math.floor((_remainingDisplay % 3600) / 60);
                            var _ss = Math.floor(_remainingDisplay % 60);
                            var _timeStr = (_hh > 0 ? _hh + 'h ' : '') + (_mm > 0 ? _mm + 'm ' : '') + _ss + 's';

                            // â”€â”€ UnitÃ©s offensives â€” gÃ©nÃ©rÃ©es dynamiquement depuis GameData â”€â”€
                            var _LAND_UNITS = {}, _NAVAL_UNITS = {}, _FLYING_UNITS = {};
                            Object.keys(GameData.units).forEach(function(uid) {
                                var u = GameData.units[uid];
                                if (u.is_npc_unit_only || u.unit_function === 'function_def') return;
                                if (u.is_naval || u.category === 'regular_naval' || u.category === 'mythological_naval') {
                                    _NAVAL_UNITS[uid] = 1;
                                } else if (u.special_abilities && u.special_abilities.indexOf('flying') !== -1) {
                                    _FLYING_UNITS[uid] = 1;
                                } else {
                                    _LAND_UNITS[uid] = 1;
                                }
                            });
                            // same_island : comparer les coordonnÃ©es x/y de l'Ã®le via WMap
                            var _wmapF = WMap.mapData.getTown(_atk.from.id);
                            var _wmapT = WMap.mapData.getTown(_atk.to.id);
                            var _sameIsland = !!(_wmapF && _wmapT && _wmapF.x === _wmapT.x && _wmapF.y === _wmapT.y);
                            // Fallback : si WMap n'a pas les donnÃ©es, utiliser _sameIslandFallback
                            // calculÃ© lors de la requÃªte frontend_bridge (stockÃ© sur l'objet attaque)
                            if (!_wmapF || !_wmapT) {
                                if (typeof _atk._sameIslandFallback === 'boolean') {
                                    _sameIsland = _atk._sameIslandFallback;
                                }
                            }
                            // Si Ã®le diffÃ©rente : terrestres ne peuvent pas traverser â†’ exclure _LAND_UNITS
                            var _ALL_UNITS = {};
                            if (_sameIsland) Object.keys(_LAND_UNITS).forEach(function(k) { _ALL_UNITS[k] = 1; });
                            Object.keys(_FLYING_UNITS).forEach(function(k) { _ALL_UNITS[k] = 1; });
                            Object.keys(_NAVAL_UNITS).forEach(function(k) { _ALL_UNITS[k] = 1; });

                            // â”€â”€ Combinaisons de bonus possibles â”€â”€
                            // Le jeu applique les bonus sur la VITESSE, pas sur la durÃ©e.
                            // Formule : duration = floor(50 * distRaw / (speed * modifier) + setupTime)
                            // modifier = generalMod * groundMod (terrestre) ou generalMod * navalMod (naval)
                            // generalMod  : 1 + 0.01 * default_unit_movement_boost (sort vitesse)
                            // groundMod   : 1 + meteorology_speed (mÃ©tÃ©o)
                            // navalMod    : 1 + cartography_speed + lighthouse_speed_bonus + colony_ship_speed
                            var _setupTime = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time);
                            var _boostVal  = (GameData.additional_runtime_modifier && GameData.additional_runtime_modifier.default_unit_movement_boost) || 30;
                            var _meteorVal = (GameData.research_bonus && GameData.research_bonus.meteorology_speed) || 0.1;
                            var _cartoVal  = (GameData.research_bonus && GameData.research_bonus.cartography_speed) || 0.1;
                            var _lightVal  = (GameData.additional_runtime_modifier && GameData.additional_runtime_modifier.lighthouse_speed_bonus) || 0.15;
                            var _sailVal   = (GameData.research_bonus && GameData.research_bonus.colony_ship_speed) || 0.1;

                            function _getFactors(isNaval, isColonizeShip, distRaw, speed) {
                                // Formule exacte du jeu (vÃ©rifiÃ©e dans game.min.js / applyTownBonus) :
                                // - carto, phare, sail sont ADDITIFS entre eux â†’ navalBonus = carto + phare (+ sail si CS)
                                // - mÃ©tÃ©o est ADDITIF seul â†’ groundBonus = mÃ©tÃ©o
                                // - boost (sort) est MULTIPLICATIF par-dessus tout
                                // Formule finale : duration = floor(50 * dist / (speed * boostMod * (1 + townBonus)) + setupTime)
                                var _res = [];
                                var _useBoosts  = [false, true];
                                var _useMets    = isNaval        ? [false] : [false, true];
                                var _useCars    = isNaval        ? [false, true] : [false];
                                var _useLigs    = isNaval        ? [false, true] : [false];
                                var _useSails   = isColonizeShip ? [false, true] : [false];

                                _useBoosts.forEach(function(useBoost) {
                                    _useMets.forEach(function(useMet) {
                                        _useCars.forEach(function(useCar) {
                                            _useLigs.forEach(function(useLig) {
                                                _useSails.forEach(function(useSail) {
                                                    // Bonus de ville : additifs (applyTownBonus du jeu)
                                                    var _townBonus = (useMet  ? _meteorVal : 0)
                                                                   + (useCar  ? _cartoVal  : 0)
                                                                   + (useLig  ? _lightVal  : 0)
                                                                   + (useSail ? _sailVal   : 0);
                                                    // Boost : multiplicatif par-dessus
                                                    var _boostMod = useBoost ? (1.0 + 0.01 * _boostVal) : 1.0;
                                                    var _mod = _boostMod * (1.0 + _townBonus);
                                                    var _dur = Math.floor(50 * distRaw / (speed * _mod) + _setupTime);
                                                    var _pen = 0;
                                                    // PÃ©nalitÃ©s calibrÃ©es sur la raretÃ© de chaque bonus :
                                                    // - mÃ©tÃ©o / carto : trÃ¨s communs â†’ pÃ©nalitÃ© faible
                                                    // - set_sail (colonizer) : rare â†’ pÃ©nalitÃ© moyenne
                                                    // - boost (+30%) : rare (sort) â†’ pÃ©nalitÃ© Ã©levÃ©e
                                                    // - phare : extrÃªmement rare â†’ pÃ©nalitÃ© trÃ¨s Ã©levÃ©e
                                                    if (useBoost) _pen += 0.60;  // sort vitesse : rare
                                                    if (useMet)   _pen += 0.04;  // mÃ©tÃ©o : trÃ¨s commun
                                                    if (useCar)   _pen += 0.04;  // carto : trÃ¨s commun
                                                    if (useLig)   _pen += 0.70;  // phare : extrÃªmement rare
                                                    if (useSail)  _pen += 0.35;  // set_sail : rare
                                                    _res.push({
                                                        dur: _dur, mod: _mod, penalty: _pen,
                                                        boost: useBoost, meteor: useMet,
                                                        carto: useCar, light: useLig, sail: useSail
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                                return _res;
                            }

                            // â”€â”€ Calcul des probabilitÃ©s â”€â”€
                            // Pour chaque unitÃ© : on calcule la durÃ©e thÃ©orique avec chaque combinaison
                            // de bonus, et on cherche laquelle colle le mieux au _remainingForCalc rÃ©el.
                            var _results = [];

                            Object.keys(_ALL_UNITS).forEach(function(_uid) {
                                var _isNaval = !!_NAVAL_UNITS[_uid];
                                var _isColonizeShip = (_uid === 'colonize_ship');
                                var _gd = (typeof GameData !== 'undefined' && GameData.units && GameData.units[_uid]);
                                var _name = (_gd && _gd.name) ? _gd.name : _uid;
                                var _speed = _gd && _gd.speed;

                                if (!_speed) {
                                    _results.push({ id: _uid, name: _name, pct: -1, bonus: 0, naval: _isNaval });
                                    return;
                                }

                                // â”€â”€ Tester TOUTES les combinaisons (sans bonus inclus) â”€â”€
                                // On ne court-circuite jamais : la combo sans bonus peut gagner si son
                                // score (dÃ©viation + pÃ©nalitÃ©) est le plus bas de tous.
                                var _factorObjs = _getFactors(_isNaval, _isColonizeShip, _atk.distance, _speed);

                                // Combinaison sans bonus (penalty=0)
                                var _noBonusDur = Math.floor(50 * _atk.distance / (_speed * 1.0) + _setupTime);
                                var _noBonusObj = { dur: _noBonusDur, mod: 1.0, penalty: 0,
                                    boost: false, meteor: false, carto: false, light: false, sail: false };

                                var _allCombos = [_noBonusObj].concat(_factorObjs.filter(function(o) {
                                    return o.boost || o.meteor || o.carto || o.light || o.sail;
                                }));

                                var _bestObj = _noBonusObj;
                                var _minScore = Infinity;
                                // â”€â”€ TolÃ©rance Â±10s anti-timing du jeu â”€â”€
                                // Grepolis ajoute intentionnellement un jitter de Â±10s Ã  la durÃ©e
                                // visible. On absorbe cet Ã©cart avant de calculer la dÃ©viation relative.
                                var _JITTER = 10;
                                _allCombos.forEach(function(_obj) {
                                    var _rawDiff = Math.abs(_obj.dur - _remainingForCalc);
                                    var _adjDiff = Math.max(0, _rawDiff - _JITTER);
                                    var _dev = _adjDiff / _remainingForCalc;
                                    var _score = _dev + _obj.penalty;
                                    var _isWinner = _score < _minScore;
                                    console.log('[HERALD-DEBUG] uid=' + _uid
                                        + ' | dur=' + _obj.dur + 's'
                                        + ' | remaining=' + Math.round(_remainingForCalc) + 's'
                                        + ' | rawDiff=' + Math.round(_rawDiff) + 's'
                                        + ' | adjDiff=' + _adjDiff.toFixed(1) + 's'
                                        + ' | dev=' + _dev.toFixed(4)
                                        + ' | penalty=' + _obj.penalty.toFixed(2)
                                        + ' | score=' + _score.toFixed(4)
                                        + ' | boost=' + _obj.boost
                                        + ' met=' + _obj.meteor
                                        + ' car=' + _obj.carto
                                        + ' lig=' + _obj.light
                                        + ' sail=' + _obj.sail
                                        + (_isWinner ? ' <<< MEILLEUR' : ''));
                                    if (_isWinner) {
                                        _minScore = _score;
                                        _bestObj  = _obj;
                                    }
                                });
                                console.log('[HERALD-DEBUG] uid=' + _uid + ' WINNER FINAL: boost=' + _bestObj.boost + ' met=' + _bestObj.meteor + ' car=' + _bestObj.carto + ' lig=' + _bestObj.light + ' sail=' + _bestObj.sail + ' | score=' + _minScore.toFixed(4));

                                // DÃ©viation pure de la meilleure combo (sans pÃ©nalitÃ©, avec jitter absorbÃ©)
                                var _pureDev = Math.max(0, Math.abs(_bestObj.dur - _remainingForCalc) - _JITTER) / _remainingForCalc;

                                // _pct : courbe exponentielle â†’ 0% Ã©cart=99%, 5%=61%, 10%=37%, 20%=14%
                                // Max 99% pour Ã©viter les faux 100% sur plusieurs unitÃ©s
                                var _pct = Math.max(0, Math.min(99, Math.round(Math.exp(-_pureDev * 10) * 100)));
                                _results.push({ id: _uid, name: _name, pct: _pct, naval: _isNaval,
                                    flags: { boost: _bestObj.boost, meteor: _bestObj.meteor, carto: _bestObj.carto, light: _bestObj.light, sail: _bestObj.sail } });
                            });

                            _results.sort(function(x, y) {
                                if (x.pct === -1 && y.pct !== -1) return 1;
                                if (y.pct === -1 && x.pct !== -1) return -1;
                                return y.pct - x.pct;
                            });

                            // â”€â”€ Construction du HTML â”€â”€
                            // IcÃ´ne via classes natives Grepolis
                            function _buildUnitIcon(uid, unitName) {
                                return '<div class="unit_icon40x40 ' + uid + '" data-unit-id="' + uid + '" '
                                    + 'style="display:inline-block;flex-shrink:0;'
                                    + 'vertical-align:middle;border-radius:3px;border:1px solid #5a4020;'
                                    + 'overflow:hidden;cursor:pointer;"></div>';
                            }

                            // (_BONUS_ICONS_SHARED / _buildBonusIcons dÃ©finis dans la portÃ©e parente)

                            function _buildBar(pct, color) {
                                return '<div style="display:inline-block;width:65px;height:8px;background:#1a1208;'
                                    + 'border-radius:4px;overflow:hidden;vertical-align:middle;'
                                    + 'border:1px solid #3a2a10;">'
                                    + '<div style="width:' + pct + '%;height:100%;background:' + color + ';border-radius:4px;"></div>'
                                    + '</div>';
                            }

                            var _html = '';

                            _results.forEach(function(r) {
                                if (r.pct === -1) {
                                    _html += '<div style="display:flex;align-items:center;gap:5px;margin:2px 0;opacity:0.4;">'
                                        + _buildUnitIcon(r.id, r.name)
                                        + '<span style="color:#7a6e5a;font-size:9px;flex:1;">' + r.name + '</span>'
                                        + '</div>';
                                    return;
                                }
                                var _color = r.pct >= 70 ? '#4CAF50' : (r.pct >= 40 ? '#FFC107' : '#e53935');
                                var _bonusIcons = _buildBonusIcons(r.flags, r.naval);
                                _html += '<div style="display:flex;align-items:center;gap:5px;margin:2px 0;">'
                                    + _buildUnitIcon(r.id, r.name)
                                    + '<span style="color:#d4c49a;min-width:80px;font-size:9px;flex:1;display:flex;align-items:center;white-space:nowrap;overflow:hidden;">'
                                    +   r.name + _bonusIcons
                                    + '</span>'
                                    + _buildBar(r.pct, _color)
                                    + '<span style="color:' + _color + ';font-weight:700;min-width:26px;text-align:right;font-size:9px;">' + r.pct + '%</span>'
                                    + '</div>';
                            });

                            _panel2.find('div:last-child').replaceWith(
                                '<div class="gfb-info-scroll">'
                                + _html
                                + '<div style="margin-top:8px;padding-top:6px;border-top:1px solid #3a2a10;color:#7a6e5a;font-size:8px;font-style:italic;">'
                                + 'âš ï¸ ' + _t('UnitÃ©s dÃ©fensives exclues de la simulation')
                                + '</div>'
                                + '</div>'
                            );
                            _showInfoPanel(_panel2, null);

                            }(attack, _panel));
                            return; // _distDurations utilisÃ©es â†’ pas de call HTTP
                        }

                        // _distDurations absent â†’ attaque boot-loaded (pas dÃ©tectÃ©e en live)
                        // Afficher un formulaire minimal pour saisir l'heure d'envoi
                        (function(_atk, _ev) {
                            var _arrivalTs = _atk.time;
                            var _pad = function(n) { return n < 10 ? '0' + n : '' + n; };

                            // PrÃ©-remplir depuis _manualSentTs si dÃ©jÃ  renseignÃ© (ex: aprÃ¨s refresh)
                            var _now = new Date();
                            var _prefillDate = _now.getFullYear() + '-' + _pad(_now.getMonth()+1) + '-' + _pad(_now.getDate());
                            var _prefillHH   = '';
                            var _prefillMM   = '';
                            if (_atk._manualSentTs) {
                                var _savedD = new Date((_atk._manualSentTs - ((typeof Timestamp !== 'undefined' && Timestamp.offset) ? Timestamp.offset : 0)) * 1000);
                                _prefillDate = _savedD.getFullYear() + '-' + _pad(_savedD.getMonth()+1) + '-' + _pad(_savedD.getDate());
                                _prefillHH   = _pad(_savedD.getHours());
                                _prefillMM   = _pad(_savedD.getMinutes());
                            }

                            var _manualPanel = $('<div id="gfb-info-panel" class="hw-spell-panel">'
                                + '<div class="hw-spell-panel-title">\u26a4\ufe0f ' + _t('Analyse de l\'attaque') + '</div><span class="notif-close gfb-info-close" title="' + _t('Fermer') + '">âœ•</span>'
                                + '<div class="gfb-info-scroll">'
                                +   '<div class="hw-manual-arrival">'
                                +     _t('Arriv\u00e9e') + '\u00a0: <b class="hw-manual-arrival-time">'
                                +     new Date(_arrivalTs * 1000).toLocaleTimeString() + '</b>'
                                +   '</div>'
                                +   '<div class="hw-manual-field">'
                                +     '<label class="hw-manual-label">' + _t('Heure d\'envoi')                                +     ' <i class="bs-help" style="font-size:9px;vertical-align:middle;"><span class="bs-help-q">?</span><span class="bs-tooltip">' + _t('Heure d\'envoi tooltip') + '</span></i>'                                +     '</label>'
                                +     '<div class="hw-manual-inputs">'
                                +       '<input type="date" id="gfb-manual-date" value="' + _prefillDate + '" class="hw-manual-date" style="color-scheme:dark;" autocomplete="off">'
                                +       '<input type="text" id="gfb-manual-hh" maxlength="2" value="' + _prefillHH + '" class="hw-manual-time-part" placeholder="HH" autocomplete="off" autocorrect="off" autocapitalize="off">'
                                +       '<span class="hw-manual-sep">:</span>'
                                +       '<input type="text" id="gfb-manual-mm" maxlength="2" value="' + _prefillMM + '" class="hw-manual-time-part" placeholder="MM" autocomplete="off" autocorrect="off" autocapitalize="off">'
                                +     '</div>'
                                +   '</div>'
                                +   '<button id="gfb-manual-calc" class="hw-spell-cast-btn hw-manual-submit">'
                                +     _t('Valider')
                                +   '</button>'
                                + '</div>'
                                + '</div>').data('attack-id', _atk.id);


                            _showInfoPanel(_manualPanel, _ev);

                            // Si heure dÃ©jÃ  renseignÃ©e (aprÃ¨s refresh) â†’ afficher directement les rÃ©sultats
                            if (_atk._manualSentTs) {
                                setTimeout(function() {
                                    _doCalc();
                                }, 0);
                            }

                            function _doCalc() {
                                var _dateStr = $('#gfb-manual-date').val();
                                var _hhStr   = $('#gfb-manual-hh').val().trim();
                                var _mmStr   = $('#gfb-manual-mm').val().trim();
                                if (!_dateStr || _hhStr === '' || _mmStr === '') {
                                    return;
                                }

                                var _hh = parseInt(_hhStr, 10);
                                var _mm = parseInt(_mmStr, 10);
                                if (isNaN(_hh) || isNaN(_mm) || _hh < 0 || _hh > 23 || _mm < 0 || _mm > 59) {
                                    $('#gfb-info-panel .gfb-info-scroll').html(
                                        '<div class="hw-manual-error">'
                                        + '\u26a0\ufe0f ' + _t('Heure invalide') + '</div>'
                                    );
                                    return;
                                }

                                var _timeStr2 = _pad(_hh) + ':' + _pad(_mm);
                                var _sentLocal = new Date(_dateStr + 'T' + _timeStr2 + ':00');
                                if (isNaN(_sentLocal.getTime())) {
                                    $('#gfb-info-panel .gfb-info-scroll').html(
                                        '<div class="hw-manual-error">'
                                        + '\u26a0\ufe0f ' + _t('Date invalide') + '</div>'
                                    );
                                    return;
                                }
                                var _sentTs = _sentLocal.getTime() / 1000;
                                var _serverOffset = (typeof Timestamp !== 'undefined' && Timestamp.offset) ? Timestamp.offset : 0;
                                _sentTs += _serverOffset;

                                // Bloquer une heure d'envoi dans le futur
                                var _nowServer = (typeof Timestamp !== 'undefined' && Timestamp.server) ? Timestamp.server() : (Date.now() / 1000 + _serverOffset);
                                if (_sentTs > _nowServer) {
                                    $('#gfb-info-panel .gfb-info-scroll').html(
                                        '<div class="hw-manual-error">'
                                        + '\u26a0\ufe0f ' + _t('L\'heure d\'envoi ne peut pas \u00eatre dans le futur') + '</div>'
                                    );
                                    return;
                                }

                                var _manualRemaining = _arrivalTs - _sentTs;
                                if (_manualRemaining <= 0 || _manualRemaining > 86400 * 3) {
                                    $('#gfb-info-panel .gfb-info-scroll').html(
                                        '<div class="hw-manual-error">'
                                        + '\u26a0\ufe0f ' + _t('Heure d\'envoi incoh\u00e9rente avec l\'heure d\'arriv\u00e9e') + '</div>'
                                    );
                                    return;
                                }

                                // â”€â”€ Stocker et marquer comme dÃ©tection manuelle fiable â”€â”€
                                _hld.log('MANUAL', 'ðŸ“ Panel manuel soumis id=' + _atk.id + ' sentTs=' + new Date(_sentTs*1000).toLocaleTimeString() + ' arrivalTs=' + new Date(_arrivalTs*1000).toLocaleTimeString() + ' remaining=' + Math.round(_manualRemaining) + 's (' + Math.round(_manualRemaining/60) + 'min)');
                                _atk._remainingAtDetection = _manualRemaining;
                                _atk._manualDetection = true;
                                _atk._manualSentTs = _sentTs;
                                // Retirer le flag bootLoaded : les donnÃ©es sont maintenant fiables
                                delete _atk._bootLoaded;

                                var _setupTime2 = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time);

                                // â”€â”€ Recalculer _distDurations depuis la vraie durÃ©e manuelle â”€â”€
                                if (_atk.distance && GameData && GameData.units) {
                                    _atk._distDurations = {};
                                    Object.keys(GameData.units).forEach(function(_uid2) {
                                        var _u2 = GameData.units[_uid2];
                                        if (!_u2 || !_u2.speed) return;
                                        _atk._distDurations[_uid2] = Math.floor(50 * _atk.distance / _u2.speed + _setupTime2);
                                    });
                                }

                                // â”€â”€ Sauvegarder au VPS (_attackPrefs) â€” inclut l'heure saisie pour prÃ©-remplissage au refresh â”€â”€
                                if (!b.herald._attackPrefs) b.herald._attackPrefs = {};
                                if (!b.herald._attackPrefs[_atk.id]) b.herald._attackPrefs[_atk.id] = {};
                                b.herald._attackPrefs[_atk.id]._remainingAtDetection = _manualRemaining;
                                b.herald._attackPrefs[_atk.id]._distDurations = _atk._distDurations || {};
                                // Sauvegarder _manualSentTs pour permettre le prÃ©-remplissage lors de l'Ã©dition aprÃ¨s refresh
                                b.herald._attackPrefs[_atk.id]._manualSentTs = _sentTs;
                                _hld.log('PREFS', 'ðŸ’¾ Panel manuel â†’ _attackPrefs sauvegardÃ© id=' + _atk.id + ' _rad=' + Math.round(_manualRemaining) + 's _distDurations prÃ©sents=' + (Object.keys(_atk._distDurations||{}).length > 0));
                                if (b.friends && typeof b.friends._pushShared === 'function') b.friends._pushShared();

                                // â”€â”€ DÃ©tection CS depuis l'heure de dÃ©part manuelle â”€â”€
                                // RÃ¨gle : badge CS uniquement si le CS a le pourcentage le plus Ã©levÃ© de tous les rÃ©sultats.
                                if (_atk._distDurations && _atk._distDurations.colonize_ship) {
                                    var _csTimeM  = _atk._distDurations.colonize_ship;
                                    var _csRemM   = _manualRemaining;
                                    // Calculer le pct de chaque unitÃ© (mÃªme formule que _doRender)
                                    var _boostValM  = (GameData.additional_runtime_modifier && GameData.additional_runtime_modifier.default_unit_movement_boost) || 30;
                                    var _meteorValM = (GameData.research_bonus && GameData.research_bonus.meteorology_speed) || 0.1;
                                    var _cartoValM  = (GameData.research_bonus && GameData.research_bonus.cartography_speed) || 0.1;
                                    var _lightValM  = (GameData.additional_runtime_modifier && GameData.additional_runtime_modifier.lighthouse_speed_bonus) || 0.15;
                                    var _sailValM   = (GameData.research_bonus && GameData.research_bonus.colony_ship_speed) || 0.1;
                                    var _setupTimeM = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time) || 0;
                                    var _JITTERM    = 10;
                                    var _csPctM = -1, _maxPctM = -1;
                                    Object.keys(_atk._distDurations).forEach(function(_uidM) {
                                        var _gdM = GameData && GameData.units && GameData.units[_uidM];
                                        if (!_gdM || !_gdM.speed) return;
                                        var _isNavalM = !!(_gdM.is_naval || _gdM.category === 'regular_naval' || _gdM.category === 'mythological_naval');
                                        var _isCSM    = (_uidM === 'colonize_ship');
                                        var _metFM = _isNavalM ? [false] : [false, true];
                                        var _carFM = _isNavalM ? [false, true] : [false];
                                        var _ligFM = _isNavalM ? [false, true] : [false];
                                        var _saiFM = _isCSM    ? [false, true] : [false];
                                        var _minScM = Infinity, _pureDM = 0;
                                        [false, true].forEach(function(uB) { _metFM.forEach(function(uMet) { _carFM.forEach(function(uCar) { _ligFM.forEach(function(uLig) { _saiFM.forEach(function(uSai) {
                                            var _tbM  = (uMet ? _meteorValM : 0) + (uCar ? _cartoValM : 0) + (uLig ? _lightValM : 0) + (uSai ? _sailValM : 0);
                                            var _bM   = uB ? (1.0 + 0.01 * _boostValM) : 1.0;
                                            var _durM = Math.floor(50 * _atk.distance / (_gdM.speed * _bM * (1.0 + _tbM)) + _setupTimeM);
                                            var _devM = Math.max(0, Math.abs(_durM - _csRemM) - _JITTERM) / _csRemM;
                                            var _penM = (uB ? 0.60 : 0) + (uMet ? 0.04 : 0) + (uCar ? 0.04 : 0) + (uLig ? 0.70 : 0) + (uSai ? 0.35 : 0);
                                            var _scM  = _devM + _penM;
                                            if (_scM < _minScM) { _minScM = _scM; _pureDM = _devM; }
                                        }); }); }); }); });
                                        var _pctM = Math.max(0, Math.min(99, Math.round(Math.exp(-_pureDM * 10) * 100)));
                                        if (_pctM > _maxPctM) _maxPctM = _pctM;
                                        if (_isCSM) _csPctM = _pctM;
                                    });
                                    // Badge CS uniquement si CS est en tÃªte (pct le plus Ã©levÃ© parmi toutes les unitÃ©s)
                                    var _csIIM = Math.abs(1.0 - 1.0 * _csTimeM / _csRemM);
                                    if (_csPctM >= 0 && _csPctM === _maxPctM && _csPctM > 0) {
                                        _atk.cs = true;
                                        _atk.deviation = _csIIM;
                                    } else {
                                        _atk.cs = false;
                                        delete _atk.deviation;
                                    }
                                    _refreshHeraldScope();
                                    if (b.friends && typeof b.friends._pushShared === 'function') b.friends._pushShared();
                                }

                                // â”€â”€ Rendu des rÃ©sultats (extrait pour pouvoir Ãªtre appelÃ© sans formulaire dans le DOM) â”€â”€
                                function _doRender(manualRemaining) {
                                    var _boostVal2  = (GameData.additional_runtime_modifier && GameData.additional_runtime_modifier.default_unit_movement_boost) || 30;
                                    var _meteorVal2 = (GameData.research_bonus && GameData.research_bonus.meteorology_speed) || 0.1;
                                    var _cartoVal2  = (GameData.research_bonus && GameData.research_bonus.cartography_speed) || 0.1;
                                    var _lightVal2  = (GameData.additional_runtime_modifier && GameData.additional_runtime_modifier.lighthouse_speed_bonus) || 0.15;
                                    var _sailVal2   = (GameData.research_bonus && GameData.research_bonus.colony_ship_speed) || 0.1;
                                    var _setupTime2 = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time) || 0;

                                    var _LAND2 = {}, _NAVAL2 = {}, _FLYING2 = {};
                                    Object.keys(GameData.units).forEach(function(uid) {
                                        var u = GameData.units[uid];
                                        if (u.is_npc_unit_only || u.unit_function === 'function_def') return;
                                        if (u.is_naval || u.category === 'regular_naval' || u.category === 'mythological_naval') { _NAVAL2[uid] = 1; }
                                        else if (u.special_abilities && u.special_abilities.indexOf('flying') !== -1) { _FLYING2[uid] = 1; }
                                        else { _LAND2[uid] = 1; }
                                    });
                                    var _wmapF2 = WMap.mapData.getTown(_atk.from.id);
                                    var _wmapT2 = WMap.mapData.getTown(_atk.to.id);
                                    var _sameIsland2 = !!(_wmapF2 && _wmapT2 && _wmapF2.x === _wmapT2.x && _wmapF2.y === _wmapT2.y);
                                    if (!_wmapF2 || !_wmapT2) {
                                        if (typeof _atk._sameIslandFallback === 'boolean') _sameIsland2 = _atk._sameIslandFallback;
                                    }
                                    var _ALL2 = {};
                                    if (_sameIsland2) Object.keys(_LAND2).forEach(function(k) { _ALL2[k] = 1; });
                                    Object.keys(_FLYING2).forEach(function(k) { _ALL2[k] = 1; });
                                    Object.keys(_NAVAL2).forEach(function(k) { _ALL2[k] = 1; });

                                    var _results2 = [];
                                    Object.keys(_ALL2).forEach(function(_uid3) {
                                        var _isNaval3 = !!_NAVAL2[_uid3];
                                        var _isCS3    = (_uid3 === 'colonize_ship');
                                        var _gd3      = GameData && GameData.units && GameData.units[_uid3];
                                        var _name3    = (_gd3 && _gd3.name) ? _gd3.name : _uid3;
                                        var _speed3   = _gd3 && _gd3.speed;
                                        if (!_speed3) { _results2.push({ id: _uid3, name: _name3, pct: -1, bonus: 0, naval: _isNaval3 }); return; }
                                        // Formule exacte du jeu (vÃ©rifiÃ©e dans game.min.js / applyTownBonus) :
                                        // - carto + phare + sail sont ADDITIFS entre eux â†’ townBonus = carto + phare (+ sail si CS)
                                        // - mÃ©tÃ©o est ADDITIF seul pour les terrestres â†’ townBonus = mÃ©tÃ©o
                                        // - boost (pouvoir) est MULTIPLICATIF par-dessus : speed *= (1+boost) * (1+townBonus)
                                        var _genMods3  = [false, true];  // boost actif ou non
                                        var _metFlags3 = _isNaval3 ? [false] : [false, true];
                                        var _carFlags3 = _isNaval3 ? [false, true] : [false];
                                        var _ligFlags3 = _isNaval3 ? [false, true] : [false];
                                        var _saiFlags3 = _isCS3    ? [false, true] : [false];
                                        var _bestObj3 = { boost: false, meteor: false, carto: false, light: false, sail: false };
                                        var _minScore3 = Infinity, _pureDev3 = 0;
                                        var _JITTER3 = 10;
                                        _genMods3.forEach(function(useBoost) { _metFlags3.forEach(function(useMet) { _carFlags3.forEach(function(useCar) { _ligFlags3.forEach(function(useLig) { _saiFlags3.forEach(function(useSai) {
                                            // Bonus de ville : additifs entre eux (applyTownBonus du jeu)
                                            var _townBonus3 = (useMet ? _meteorVal2 : 0) + (useCar ? _cartoVal2 : 0) + (useLig ? _lightVal2 : 0) + (useSai ? _sailVal2 : 0);
                                            // Boost (pouvoir) : multiplicatif par-dessus
                                            var _boostMod3  = useBoost ? (1.0 + 0.01 * _boostVal2) : 1.0;
                                            var _mod3 = _boostMod3 * (1.0 + _townBonus3);
                                            var _dur3 = Math.floor(50 * _atk.distance / (_speed3 * _mod3) + _setupTime2);
                                            var _pen3 = (useBoost ? 0.60 : 0) + (useMet ? 0.04 : 0) + (useCar ? 0.04 : 0) + (useLig ? 0.70 : 0) + (useSai ? 0.35 : 0);
                                            var _dev3 = Math.max(0, Math.abs(_dur3 - manualRemaining) - _JITTER3) / manualRemaining;
                                            var _score3 = _dev3 + _pen3;
                                            if (_score3 < _minScore3) { _minScore3 = _score3; _bestObj3 = { boost: useBoost, meteor: useMet, carto: useCar, light: useLig, sail: useSai }; _pureDev3 = _dev3; }
                                        }); }); }); }); });
                                        var _pct3 = Math.max(0, Math.min(99, Math.round(Math.exp(-_pureDev3 * 10) * 100)));
                                        _results2.push({ id: _uid3, name: _name3, pct: _pct3, naval: _isNaval3,
                                            flags: { boost: _bestObj3.boost, meteor: _bestObj3.meteor, carto: _bestObj3.carto, light: _bestObj3.light, sail: _bestObj3.sail } });
                                    });
                                    _results2.sort(function(x, y) {
                                        if (x.pct === -1 && y.pct !== -1) return 1;
                                        if (y.pct === -1 && x.pct !== -1) return -1;
                                        return y.pct - x.pct;
                                    });
                                    var _html3 = '';
                                    _results2.forEach(function(r) {
                                        if (r.pct === -1) {
                                            _html3 += '<div class="hw-unit-row hw-unit-row-off"><div class="unit_icon40x40 ' + r.id + ' hw-unit-icon"></div><span class="hw-unit-name">' + r.name + '</span></div>';
                                            return;
                                        }
                                        var _color3 = r.pct >= 70 ? '#4CAF50' : (r.pct >= 40 ? '#FFC107' : '#e53935');
                                        _html3 += '<div class="hw-unit-row"><div class="unit_icon40x40 ' + r.id + ' hw-unit-icon"></div>'
                                            + '<span class="hw-unit-name" style="display:flex;align-items:center;white-space:nowrap;overflow:hidden;">' + r.name + _buildBonusIcons(r.flags, r.naval) + '</span>'
                                            + '<div class="hw-unit-bar-wrap"><div class="hw-unit-bar" style="width:' + r.pct + '%;background:' + _color3 + ';"></div></div>'
                                            + '<span class="hw-unit-pct" style="color:' + _color3 + ';">' + r.pct + '%</span></div>';
                                    });
                                    _html3 += '<div style="margin-top:8px;padding-top:6px;border-top:1px solid #3a2a10;color:#7a6e5a;font-size:8px;font-style:italic;">âš ï¸ ' + _t('UnitÃ©s dÃ©fensives exclues de la simulation') + '</div>';
                                    _html3 += '<button class="hw-spell-cast-btn hw-manual-edit-btn" id="gfb-manual-edit" style="margin-top:6px;width:100%;">âœŽ ' + _t('Modifier l\'heure') + '</button>';
                                    $('#gfb-info-panel .gfb-info-scroll').html(_html3);
                                    // Repositionner maintenant que le contenu est injectÃ© (hauteur rÃ©elle connue)
                                    var _p = $('#gfb-info-panel');
                                    if (_p.length && $event) {
                                        var _btn2 = $event.currentTarget;
                                        var _r2 = _btn2 && _btn2.getBoundingClientRect ? _btn2.getBoundingClientRect() : null;
                                        if (_r2) {
                                            var _pw = _p.outerWidth(), _ph = _p.outerHeight();
                                            var _vw2 = window.innerWidth, _vh2 = window.innerHeight;
                                            var _l2 = _r2.left, _t2 = _r2.bottom + 4;
                                            if (_l2 + _pw > _vw2 - 8) _l2 = _vw2 - _pw - 8;
                                            if (_l2 < 8) _l2 = 8;
                                            if (_t2 + _ph > _vh2 - 8) _t2 = _r2.top - _ph - 4;
                                            if (_t2 < 8) _t2 = 8;
                                            _p.css({ top: _t2 + 'px', left: _l2 + 'px', visibility: 'visible' });
                                        }
                                    }
                                    $('#gfb-manual-edit').on('click', function(e) {
                                        e.stopPropagation();
                                        var _savedTs = _atk._manualSentTs;
                                        var _editDate = '', _editHH = '', _editMM = '';
                                        if (_savedTs) {
                                            var _d = new Date((_savedTs - ((typeof Timestamp !== 'undefined' && Timestamp.offset) ? Timestamp.offset : 0)) * 1000);
                                            _editDate = _d.getFullYear() + '-' + _pad(_d.getMonth()+1) + '-' + _pad(_d.getDate());
                                            _editHH   = _pad(_d.getHours());
                                            _editMM   = _pad(_d.getMinutes());
                                        }
                                        var _formHtml = '<div class="hw-manual-arrival">' + _t('ArrivÃ©e') + '\u00a0: <b class="hw-manual-arrival-time">' + new Date(_arrivalTs * 1000).toLocaleTimeString() + '</b></div>'
                                            + '<div class="hw-manual-field"><label class="hw-manual-label">' + _t('Heure d\'envoi') + '</label>'
                                            + '<div class="hw-manual-inputs">'
                                            + '<input type="date" id="gfb-manual-date" value="' + _editDate + '" class="hw-manual-date" style="color-scheme:dark;" autocomplete="off">'
                                            + '<input type="text" id="gfb-manual-hh" maxlength="2" value="' + _editHH + '" class="hw-manual-time-part" placeholder="HH" autocomplete="off">'
                                            + '<span class="hw-manual-sep">:</span>'
                                            + '<input type="text" id="gfb-manual-mm" maxlength="2" value="' + _editMM + '" class="hw-manual-time-part" placeholder="MM" autocomplete="off">'
                                            + '</div></div>'
                                            + '<button id="gfb-manual-calc" class="hw-spell-cast-btn hw-manual-submit">' + _t('Valider') + '</button>';
                                        $('#gfb-info-panel .gfb-info-scroll').html(_formHtml);
                                        $('#gfb-manual-calc').on('click', function(e2) { e2.stopPropagation(); _doCalc(); });
                                    });
                                }

                                // â”€â”€ Si la distance est absente, la demander activement via frontend_bridge â”€â”€
                                // Pour les attaques boot-loadÃ©es, _movAttrToAttack n'a jamais Ã©tÃ© appelÃ© avec
                                // _dist===null â†’ le fallback frontend_bridge n'a jamais Ã©tÃ© dÃ©clenchÃ©.
                                // On le lance ici directement, puis on appelle _doRender() directement
                                // sans repasser par _doCalc() (le formulaire n'est plus dans le DOM).
                                if (!_atk.distance) {
                                    $('#gfb-info-panel .gfb-info-scroll').html(
                                        '<div style="padding:8px;color:#d4c49a;font-size:9px;text-align:center;">'
                                        + 'â³ ' + _t('Calcul de la distance en coursâ€¦')
                                        + '</div>'
                                    );
                                    var _fbResults = {};
                                    function _fbTryFinalize() {
                                        if (!_fbResults.to || !_fbResults.from) return;
                                        if (_fbResults.from.distance != null && _fbResults.from.distance > 0) {
                                            _atk.distance = _fbResults.from.distance;
                                            var _st2 = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time) || 0;
                                            _atk._distDurations = {};
                                            if (GameData && GameData.units) {
                                                Object.keys(GameData.units).forEach(function(_uid2) {
                                                    var _u2 = GameData.units[_uid2];
                                                    if (!_u2 || !_u2.speed) return;
                                                    _atk._distDurations[_uid2] = Math.floor(50 * _atk.distance / _u2.speed + _st2);
                                                });
                                            }
                                            _atk._sameIslandFallback = (
                                                _fbResults.from.island_x === _fbResults.to.island_x &&
                                                _fbResults.from.island_y === _fbResults.to.island_y
                                            );
                                            if (!b.herald._attackPrefs) b.herald._attackPrefs = {};
                                            if (!b.herald._attackPrefs[_atk.id]) b.herald._attackPrefs[_atk.id] = {};
                                            b.herald._attackPrefs[_atk.id].distance       = _atk.distance;
                                            b.herald._attackPrefs[_atk.id]._distDurations = _atk._distDurations;
                                            // â”€â”€ DÃ©tection CS (chemin async : distance absente au moment de _doCalc) â”€â”€
                                            // Badge CS uniquement si CS a le pct le plus Ã©levÃ© parmi toutes les unitÃ©s.
                                            if (_atk._distDurations && _atk._distDurations.colonize_ship) {
                                                var _boostValFb  = (GameData.additional_runtime_modifier && GameData.additional_runtime_modifier.default_unit_movement_boost) || 30;
                                                var _meteorValFb = (GameData.research_bonus && GameData.research_bonus.meteorology_speed) || 0.1;
                                                var _cartoValFb  = (GameData.research_bonus && GameData.research_bonus.cartography_speed) || 0.1;
                                                var _lightValFb  = (GameData.additional_runtime_modifier && GameData.additional_runtime_modifier.lighthouse_speed_bonus) || 0.15;
                                                var _sailValFb   = (GameData.research_bonus && GameData.research_bonus.colony_ship_speed) || 0.1;
                                                var _setupTimeFb = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time) || 0;
                                                var _JITTERFB    = 10;
                                                var _csPctFb = -1, _maxPctFb = -1;
                                                Object.keys(_atk._distDurations).forEach(function(_uidFb) {
                                                    var _gdFb = GameData && GameData.units && GameData.units[_uidFb];
                                                    if (!_gdFb || !_gdFb.speed) return;
                                                    var _isNavalFb = !!(_gdFb.is_naval || _gdFb.category === 'regular_naval' || _gdFb.category === 'mythological_naval');
                                                    var _isCSFb    = (_uidFb === 'colonize_ship');
                                                    var _metFFb = _isNavalFb ? [false] : [false, true];
                                                    var _carFFb = _isNavalFb ? [false, true] : [false];
                                                    var _ligFFb = _isNavalFb ? [false, true] : [false];
                                                    var _saiFFb = _isCSFb    ? [false, true] : [false];
                                                    var _minScFb = Infinity, _pureDFb = 0;
                                                    [false, true].forEach(function(uBFb) { _metFFb.forEach(function(uMFb) { _carFFb.forEach(function(uCFb) { _ligFFb.forEach(function(uLFb) { _saiFFb.forEach(function(uSFb) {
                                                        var _tbFb  = (uMFb ? _meteorValFb : 0) + (uCFb ? _cartoValFb : 0) + (uLFb ? _lightValFb : 0) + (uSFb ? _sailValFb : 0);
                                                        var _bFb   = uBFb ? (1.0 + 0.01 * _boostValFb) : 1.0;
                                                        var _durFb = Math.floor(50 * _atk.distance / (_gdFb.speed * _bFb * (1.0 + _tbFb)) + _setupTimeFb);
                                                        var _devFb = Math.max(0, Math.abs(_durFb - _manualRemaining) - _JITTERFB) / _manualRemaining;
                                                        var _penFb = (uBFb ? 0.60 : 0) + (uMFb ? 0.04 : 0) + (uCFb ? 0.04 : 0) + (uLFb ? 0.70 : 0) + (uSFb ? 0.35 : 0);
                                                        var _scFb  = _devFb + _penFb;
                                                        if (_scFb < _minScFb) { _minScFb = _scFb; _pureDFb = _devFb; }
                                                    }); }); }); }); });
                                                    var _pctFb = Math.max(0, Math.min(99, Math.round(Math.exp(-_pureDFb * 10) * 100)));
                                                    if (_pctFb > _maxPctFb) _maxPctFb = _pctFb;
                                                    if (_isCSFb) _csPctFb = _pctFb;
                                                });
                                                var _csIIfb = Math.abs(1.0 - 1.0 * _atk._distDurations.colonize_ship / _manualRemaining);
                                                if (_csPctFb >= 0 && _csPctFb === _maxPctFb && _csPctFb > 0) {
                                                    _atk.cs = true;
                                                    _atk.deviation = _csIIfb;
                                                } else {
                                                    _atk.cs = false;
                                                    delete _atk.deviation;
                                                }
                                                if (b.sett.herald_militia === 'cs') _atk.militia = (_atk.cs === true);
                                                b.herald._attackPrefs[_atk.id]._remainingAtDetection = _manualRemaining;
                                                _refreshHeraldScope();
                                                if (b.friends && typeof b.friends._pushShared === 'function') b.friends._pushShared();
                                            }
                                            // Appeler _doRender directement avec le manualRemaining dÃ©jÃ  calculÃ©
                                            _doRender(_manualRemaining);
                                        } else {
                                            $('#gfb-info-panel .gfb-info-scroll').html(
                                                '<div class="hw-manual-nodist">'
                                                + 'âš ï¸ ' + _t('Distance WMap indisponible â€” pourcentages non calculables.')
                                                + '</div>'
                                            );
                                        }
                                    }
                                    b.ajaxRequestGet('frontend_bridge', 'fetch', {
                                        window_type: "runtime_info", tab_type: "index",
                                        known_data: { models: [], collections: ["Units", "Towns"], templates: [] },
                                        arguments: { target_town_id: _atk.to.id, is_portal_command: false },
                                        town_id: _atk.to.id, nl_init: true
                                    }, function(_bot, r) {
                                        try {
                                            var _d = r && r.models && r.models.RuntimeSimulator && r.models.RuntimeSimulator.data;
                                            if (!_d) return;
                                            _fbResults.to = { island_x: _d.island_x, island_y: _d.island_y };
                                            _fbTryFinalize();
                                        } catch(_e) {}
                                    });
                                    // BUGFIX : town_id = _atk.to.id (ville attaquÃ©e), PAS b.lastTownId (ville active)
                                    // Le serveur calcule la distance depuis town_id â†’ si on met b.lastTownId (ville 2)
                                    // alors que l'attaque vise ville 1, la distance retournÃ©e est fausse â†’ tout Ã  0%.
                                    b.ajaxRequestGet('frontend_bridge', 'fetch', {
                                        window_type: "runtime_info", tab_type: "index",
                                        known_data: { models: [], collections: ["Units", "Towns"], templates: [] },
                                        arguments: { target_town_id: _atk.from.id, is_portal_command: false },
                                        town_id: _atk.to.id, nl_init: true
                                    }, function(_bot, r) {
                                        try {
                                            var _d = r && r.models && r.models.RuntimeSimulator && r.models.RuntimeSimulator.data;
                                            if (!_d) return;
                                            _fbResults.from = { distance: _d.distance, island_x: _d.island_x, island_y: _d.island_y };
                                            _fbTryFinalize();
                                        } catch(_e) {}
                                    });
                                    return;
                                }

                                // Distance prÃ©sente â†’ rendu direct via _doRender
                                _doRender(_manualRemaining);
                            }

                            $('#gfb-manual-calc').on('click', function(e) {
                                e.stopPropagation();
                                _doCalc();
                            });
                        }(attack, $event));
					};

                    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    d.openSpellPanel = function(attack) {
                        if (!attack || !attack.command_id) return;
                        // Si panel dÃ©jÃ  ouvert pour cette attaque â†’ juste fermer
                        // Fermer panel sort si l'attaque associÃ©e n'est plus visible
                        var _openSpellPanel = $('#gfb-spell-panel');
                        if (_openSpellPanel.length) {
                            var _panelAtkId = _openSpellPanel.data('attack-id');
                            if (_panelAtkId !== undefined) {
                                var _stillHere = false;
                                var _atkList = (d.data && d.data.attacks) || [];
                                for (var _pi = 0; _pi < _atkList.length; _pi++) {
                                    if (_atkList[_pi] && _atkList[_pi].id === _panelAtkId) { _stillHere = true; break; }
                                }
                                if (!_stillHere) {
                                    _openSpellPanel.remove();
                                    $(document).off('click.spellpanel');
                                }
                            }
                        }
                        var _existing = $('#gfb-spell-panel');
                        if (_existing.length && _existing.data('attack-id') === attack.id) {
                            _existing.remove();
                            return;
                        }
                        _existing.remove();

                        // Calculer les sorts disponibles
                        var _spells = [];
                        var _favor = {};
                        try {
                            var _gods = b.models.PlayerGods[Game.player_id];
                            _favor = _gods ? _gods.getCurrentFavorForGods() : {};
                            for (var _pid in GameData.powers) {
                                var _p = GameData.powers[_pid];
                                if (!_p) continue;
                                if (!Array.isArray(_p.targets) || _p.targets.indexOf("target_command") < 0) continue;
                                _spells.push({
                                    id:        _p.id || _pid,
                                    name:      _p.name,
                                    desc:      _p.description || "",
                                    favor:     _p.favor || 0,
                                    god_id:    _p.god_id || "",
                                    available: (_favor[_p.god_id] || 0) >= (_p.favor || 0)
                                });
                            }
                        } catch(e) {}

                        // RÃ©cap dieux avec faveur disponible
                        var _godsWithFavor = [];
                        var _godsSeen = {};
                        _spells.forEach(function(sp) {
                            if (sp.god_id && !_godsSeen[sp.god_id]) {
                                _godsSeen[sp.god_id] = true;
                                _godsWithFavor.push(sp.god_id);
                            }
                        });
                        var _FAVOR_ICON = '<span class="gfb-favor-icon" style="display:inline-block;"></span>';
                        var _godBar = _godsWithFavor.map(function(gid) {
                            var _f = Math.floor(_favor[gid] || 0);
                            var _gdata = GameData.gods && GameData.gods[gid];
                            var _gname = _gdata ? _gdata.name : gid;
                            var _tooltipHtml = '<strong>' + _gname + '</strong>'
                                + (_gdata && _gdata.topic ? '<br><span style=&quot;color:#a09070;font-size:10px;&quot;>' + _gdata.topic + '</span>' : '');
                            return '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">'
                                + '<div style="font-size:6.5pt;color:#a09070;line-height:1;text-align:center;white-space:nowrap;">' + _gname + '</div>'
                                + '<div class="hw-god-chip" data-tooltip-html="' + _tooltipHtml + '">'
                                + '<div style="width:16px;height:16px;overflow:hidden;flex-shrink:0;border-radius:2px;">'
                                + '<div class="god_mini ' + gid + '" style="width:62px;height:62px;transform:scale(0.258);transform-origin:top left;"></div>'
                                + '</div>'
                                + '<div style="display:flex;align-items:center;gap:1px;">' + _FAVOR_ICON
                                + '<span style="font-size:6pt;font-weight:700;color:' + (_f > 0 ? '#c9a84c' : '#7a6e5a') + ';">' + _f + '</span>'
                                + '</div></div></div>';
                        }).join('');
                        var _godsRecap = _godsWithFavor.length > 0
                            ? '<div class="hw-gods-recap">' + _godBar + '</div>'
                            : '';

                        // SÃ©lection unique
                        var _selectedId = attack.spell || (attack.spells && attack.spells[0]) || null;

                        // Construire les cartes â€” mÃªme logique que commander
                        var _FAVOR_ICON = '<span class="gfb-favor-icon" style="display:inline-block;"></span>';
                        var _cards = '';
                        _spells.forEach(function(sp) {
                            var _lowFavor = sp.available ? '' : ' hw-spell-low-favor';
                            var _isSel = (_selectedId === sp.id) ? ' hw-spell-card-sel' : '';
                            var _tooltipHtml = ('<strong>' + sp.name + '</strong>' + (sp.desc ? '<br><span style=&quot;color:#a09070;font-size:10px;&quot;>' + sp.desc + '</span>' : '') + '<br><span style=&quot;color:#c9a84c;font-size:10px;&quot;>' + (a.t ? a.t('Faveur') : 'Faveur') + ' : ' + sp.favor + '</span>').replace(/"/g, '&quot;');
                            _cards += '<div class="hw-spell-card' + _lowFavor + _isSel + '" data-spell-id="' + sp.id + '" data-tooltip-html="' + _tooltipHtml + '" style="cursor:pointer;">'
                                + '<span class="power_icon16x16 ' + sp.id + '" style="display:inline-block;width:16px;height:16px;"></span>'
                                + '<div class="hw-spell-card-name">' + sp.name + '</div>'
                                + '<div class="hw-spell-card-favor">' + _FAVOR_ICON + '<span>' + sp.favor + '</span></div>'
                                + '</div>';
                        });

                        var _panel = $('<div id="gfb-spell-panel" class="hw-spell-panel">'
                            + '<div class="hw-spell-panel-title"><span class="gfb-favor-icon" style="display:inline-block;margin-right:4px;"></span>' + (a.t ? a.t('Sort divin') : 'Sort divin') + '</div>'
                            + _godsRecap
                            + '<div class="hw-spell-grid">' + _cards + '</div>'
                            + '<div class="hw-spell-panel-actions">'
                            + '<button type="button" class="hw-spell-cast-btn">' + (a.t ? a.t('Valider') : 'Valider') + '</button>'
                            + '<button type="button" class="hw-spell-cancel-btn">' + (a.t ? a.t('Annuler') : 'Annuler') + '</button>'
                            + '</div></div>').data('attack-id', attack.id);

                        // SÃ©lection radio (un seul sort)
                        var _selected = _selectedId;
                        _panel.on('click', '.hw-spell-card', function() {
                            var _id = $(this).data('spell-id');
                            _panel.find('.hw-spell-card').removeClass('hw-spell-card-sel');
                            if (_selected === _id) {
                                _selected = null;
                            } else {
                                _selected = _id;
                                $(this).addClass('hw-spell-card-sel');
                            }
                        });

                        // Valider
                        _panel.on('click', '.hw-spell-cast-btn', function() {
                            attack.spell = _selected || null;
                            attack.spells = _selected ? [_selected] : []; // compat
                            attack._spellScheduled = false;
                            _refreshHeraldScope();
                            if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                            // Si attaque Ã  moins de 10s â†’ lancer immÃ©diatement
                            if (_selected && (attack.time - Timestamp.server()) <= 10) {
                                var _pp = GameData.powers[_selected];
                                var _sid = _selected;
                                var _toIdImm = attack.to.id;
                                b.runAtTown(_toIdImm, function() {
                                    GrepoApiHelper.execute.call(this, "Commands", "cast", { id: attack.command_id, power_id: _sid }, {
                                        success: function() { i("ally", b.t("âœ¨ Sort {0} lancÃ© pour la dÃ©fense de [town]{1}[/town]"), _pp ? _pp.name : _sid, _toIdImm).msg(10); },
                                        error:   function(err) { i("error", b.t("Sort Ã©chouÃ© pour [town]{0}[/town] : {1}"), _toIdImm, err && err.error).msg(10); }
                                    });
                                });
                            }
                            _panel.remove();
                        });

                        _panel.on('click', '.hw-spell-cancel-btn', function() { _panel.remove(); });

                        // Positionner en fixed par rapport au bouton Sort cliquÃ©
                        var _spellBtn = null;
                        var _el = b.herald.showAttacksEl;
                        if (_el) {
                            _el.find('.hw-attack').each(function() {
                                var _scope = angular.element(this).scope();
                                if (_scope && _scope.attack && _scope.attack.id === attack.id) {
                                    _spellBtn = $(this).find('.hw-spell-btn')[0];
                                    return false;
                                }
                            });
                        }
                        // Appender d'abord pour connaÃ®tre les dimensions rÃ©elles
                        _panel.css({ position: 'fixed', visibility: 'hidden', 'z-index': 999999, 'max-width': '380px' });
                        $('body').append(_panel);
                        if (_spellBtn) {
                            var _rect = _spellBtn.getBoundingClientRect();
                            var _panelW = _panel.outerWidth();
                            var _panelH = _panel.outerHeight();
                            var _vw = window.innerWidth;
                            var _vh = window.innerHeight;
                            // Position de base : sous le bouton, alignÃ© Ã  gauche
                            var _left = _rect.left;
                            var _top  = _rect.bottom + 4;
                            // EmpÃªcher dÃ©bordement Ã  droite
                            if (_left + _panelW > _vw - 8) _left = _vw - _panelW - 8;
                            if (_left < 8) _left = 8;
                            // EmpÃªcher dÃ©bordement en bas â†’ afficher au-dessus du bouton
                            if (_top + _panelH > _vh - 8) _top = _rect.top - _panelH - 4;
                            if (_top < 8) _top = 8;
                            _panel.css({ top: _top + 'px', left: _left + 'px', visibility: 'visible' });
                        } else {
                            _panel.css({ visibility: 'visible' });
                        }

                        // Fermer si clic extÃ©rieur
                        setTimeout(function() {
                            $(document).on('click.spellpanel', function(e) {
                                if (!$(e.target).closest('#gfb-spell-panel').length) {
                                    _panel.remove();
                                    $(document).off('click.spellpanel');
                                }
                            });
                        }, 100);
                    };
                    d.refresh = function() {
                        // Synchroniser la rÃ©fÃ©rence import_data (injectÃ©e par friends._injectFriendData sur b.herald.import_data)
                        if (b.herald.import_data !== c.import_data) {
                            c.import_data = b.herald.import_data;
                        }
                        var e = [],
                            f = Timestamp.server();
                        var _finishedStatuses = ["struck", "spam", "disappeared"];
                        for (var g in c.town) {
                            var h = ITowns.getTown(g);
                            for (var i in c.town[g].attack) {
                                var j = c.town[g].attack[i];
                                if (!j) continue;
                                if (typeof j !== "object") continue; // skip _prepNotifAt et autres flags
                                // Toujours exclure les supprimÃ©es
                                if (j.status === "deleted") continue;
                                // Exclure les attaques passÃ©es SAUF si elles ont un statut terminÃ© Ã  afficher
                                if (j.time < f && _finishedStatuses.indexOf(j.status) < 0) continue;
                                j.isOwn = true;
                                if (!j.from) j.from = {};
                                // Reconstruire avec _townLink pour inclure ix/iy â†’ "aller Ã " fonctionnel cÃ´tÃ© ami
                                j.from.link = _townLink({
                                    id:          j.from.id,
                                    name:        j.from.name        || "",
                                    player_name: j.from.player_name || "",
                                    player_id:   j.from.player_id   || null,
                                    ix:          j.from.ix != null ? j.from.ix : null,
                                    iy:          j.from.iy != null ? j.from.iy : null
                                }, false);
                                j.from.id          = j.from.id;
                                j.from.name        = j.from.name        || "";
                                j.from.player_name = j.from.player_name || "";
                                if (!j.to) j.to = {};
                                j.to.link = _townLink({
                                    id:   j.to.id,
                                    name: j.to.name || "",
                                    ix:   j.to.ix != null ? j.to.ix : null,
                                    iy:   j.to.iy != null ? j.to.iy : null
                                }, true);
                                j.to.id   = j.to.id;
                                j.to.name = j.to.name || "";
                                if (j._showSpells === undefined) j._showSpells = false;
                                e.push(j);
                            }
                        }
                        // Ajouter immÃ©diatement les attaques d'amis dÃ©jÃ  en mÃ©moire
                        if (c.import_data && c.import_data.length) {
                            c.import_data.forEach(function(atk) {
                                if (!atk) return;
                                e.push(atk);
                            });
                        }
                        d.data.attacks = e;
                    };
                    d.remove = function(townId, atkId) {
                        // Chercher d'abord dans les attaques propres
                        var townData = b.herald.town[townId];
                        if (townData && townData.attack && townData.attack[atkId]) {
                            var atk = townData.attack[atkId];
                            atk.militia = false;
                            atk.status = "deleted";
                            delete townData.attack[atkId];
                            if (b.friends && typeof b.friends._pushShared === "function") {
                                b.friends._pushShared();
                            }
                        } else if (b.herald.import_data) {
                            // Suppression locale d'une attaque d'ami
                            // MÃ©moriser dans _dismissedAttacks (persistÃ© sur VPS via _pushShared)
                            if (!b.herald._dismissedAttacks) b.herald._dismissedAttacks = {};
                            b.herald._dismissedAttacks[atkId] = Timestamp.server() + 3 * 24 * 3600;
                            b.herald.import_data = b.herald.import_data.filter(function(x) {
                                return x.id !== atkId;
                            });
                            if (b.friends && typeof b.friends._pushShared === "function") {
                                b.friends._pushShared();
                            }
                        }
                        d.refresh();
                    };
                    d.filter = function() {
                        return function(a) {
                            switch (d.data.filter) {
                                case "own":
                                    return a.isOwn == true;
                                case "external":
                                    return a.isOwn == false;
                                default:
                                    return true;
                            }
                        };
                    };
                    d.filterSearch = function(attack) {
                        var s = d.data.search.toLowerCase().replace(/^\s+|\s+$/g, "");
                        if (s.length < 1) return true;
                        var candidates = [];
                        if (attack.from && attack.from.name)        candidates.push(attack.from.name);
                        if (attack.from && attack.from.player_name) candidates.push(attack.from.player_name);
                        if (attack.to   && attack.to.name)          candidates.push(attack.to.name);
                        if (attack.owner)                            candidates.push(attack.owner);
                        // player_name via WMap.mapData si pas encore sur l'objet
                        if (!attack.from.player_name) {
                            var _wt = WMap.mapData.getTown(attack.from.id);
                            if (_wt && _wt.player_name) candidates.push(_wt.player_name);
                        }
                        return candidates.some(function(n) {
                            return n && n.toLowerCase().indexOf(s) >= 0;
                        });
                    };
                    d.share = function() {
                        b.herald.share();
                    };
                    d.refresh();
                    // RafraÃ®chir les attaques amis immÃ©diatement Ã  l'ouverture
                    if (b.friends && typeof b.friends._poll === "function") {
                        b.friends._poll();
                    }
                }]);
                angular.bootstrap(e, ["bot"]);
                b.windows.open("herald", e);
                this.showAttacksEl = e;
                // Store scope for external $digest triggers
                var injector = angular.element(e[0]).injector();
                if (injector) {
                    b.herald._scope = injector.get("$rootScope");
                }
            },
            autododge_check: function() {
                // Nouveau systÃ¨me simplifiÃ© :
                // - Plus de regroupement d'attaques, plus de logique de fenÃªtre
                // - Cette fonction gÃ¨re uniquement : nettoyage des attaques passÃ©es,
                //   passage waitingâ†’confirmed, milice, sorts automatiques
                // - L'esquive est dÃ©clenchÃ©e UNIQUEMENT via le timer individuel
                //   de chaque attaque (dodge=true cochÃ© dans le menu ou par auto-esquive)
                var k = Timestamp.server();
                for (var g in b.herald.town) {
                    var h = ITowns.getTown(g);
                    if (typeof h != "object") continue;
                    var j = b.herald.town[h.id].attack;
                    for (var n in j) {
                        var o = j[n];
                        if (!o) continue;
                        // Nettoyage des attaques passÃ©es
                        if (o.time < k) {
                            if (b.sett.herald_auto_remove === true) {
                                delete j[n];
                                if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                            } else if (["waiting", "confirmed", "militia_pending", "dodge_pending"].indexOf(o.status) !== -1) {
                                o.status = "struck";
                                if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                            }
                            continue;
                        }
                        if (o.test === true) continue;
                        if (["waiting", "confirmed"].indexOf(o.status) < 0) continue;
                        // Passage waiting â†’ confirmed Ã  10 min de l'impact
                        if (o.time - k <= d_approach && o.status === "waiting") {
                            o.status = "confirmed";
                            _refreshHeraldScope();
                            if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                        }
                        // Milice et sorts pour toutes les attaques dans la fenÃªtre des 2 min (esquive ou non)
                        if (o.time - k < d) {
                            var p = 4 + 1.5 * Math.random();
                            if (o.militia === true) {
                                o.status = "militia_pending";
                                _refreshHeraldScope();
                                (function(_o, _p) {
                                    setTimeout(function() {
                                        if (_o.militia !== true) {
                                            if (_o.status === "militia_pending") { _o.status = "confirmed"; _refreshHeraldScope(); }
                                            return;
                                        }
                                        b.herald.militia(_o);
                                    }, (_o.time - Timestamp.server() - _p) * 1e3);
                                }(o, p));
                            }
                            var _autoSpell = o.spell || (Array.isArray(o.spells) && o.spells[0]) || null;
                            if (_autoSpell && !o._spellScheduled) {
                                o._spellScheduled = true;
                                var _spellDelay = o.time - Timestamp.server() - p;
                                if (_spellDelay > 0) {
                                    (function(_cmdId, _toId, _o) {
                                        setTimeout(function() {
                                            if (["waiting", "confirmed", "militia_pending", "dodge_pending"].indexOf(_o.status) === -1) return;
                                            // Relire le sort au moment du dÃ©clenchement (l'utilisateur a pu le changer ou l'annuler)
                                            var _sid = _o.spell || (Array.isArray(_o.spells) && _o.spells[0]) || null;
                                            if (!_sid) return; // sort annulÃ© entre-temps
                                            var _pp = GameData.powers[_sid];
                                            b.runAtTown(_toId, function() {
                                                GrepoApiHelper.execute.call(this, "Commands", "cast", { id: _cmdId, power_id: _sid }, {
                                                    success: function() { i("ally", b.t("âœ¨ Sort {0} lancÃ© pour la dÃ©fense de [town]{1}[/town]"), _pp ? _pp.name : _sid, _toId).msg(10); },
                                                    error:   function(err) { i("error", b.t("Sort Ã©chouÃ© pour [town]{0}[/town] : {1}"), _toId, err && err.error).msg(10); }
                                                });
                                            });
                                        }, _spellDelay * 1e3);
                                    }(o.command_id, o.to.id, o));
                                }
                            }
                        }
                        // Si dodge=true et dans la fenÃªtre de dÃ©clenchement (2 min),
                        // dÃ©clencher l'esquive individuelle pour cette attaque
                        if (o.dodge === true && (o.time - k < 15) && o.status !== "dodge_pending") {
                            (function(_o, _town) {
                                var col = _getMovementsCollection();
                                var _present = [];
                                var _colCoversThisTown = false;
                                if (col) {
                                    col.models.forEach(function(m) {
                                        var attr = m.attributes;
                                        if (attr && attr.target_town_id == _town.id) {
                                            _present.push(attr.id);
                                            _colCoversThisTown = true;
                                        }
                                    });
                                    if (typeof Game !== "undefined" && Game.townId == _town.id) {
                                        _colCoversThisTown = true;
                                    }
                                }
                                // VÃ©rifier que l'attaque est toujours prÃ©sente (pas spam)
                                // Seulement si la collection couvre bien cette ville (ville active)
                                // Matcher sur attr.id OU command_id (fix curator doublon)
                                var _atkFoundInCol3 = _present.indexOf(_o.id) !== -1 ||
                                    (_o.command_id && col && col.models.some(function(mm) {
                                        return mm.attributes.command_id == _o.id || mm.attributes.id == _o.command_id;
                                    }));
                                if (_o.test !== true && _colCoversThisTown && !_atkFoundInCol3) {
                                    _o.status = "spam";
                                    _refreshHeraldScope();
                                    if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                    return;
                                }
                                _o.status = "dodge_pending";
                                _refreshHeraldScope();
                                if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
                                i("debug", "Individual dodge triggered for attack #{0} on [town]{1}[/town]", _o.id, _town.id);
                                try {
                                    b.herald.autododge(_o, _o, [_o]);
                                } catch(_e) {
                                    i("debug", "autododge_check() individual, exception: {0}", _e.toString()).send();
                                }
                            }(o, h));
                        }
                    }
                }
            },
            // Fallback dÃ©clenchÃ© par commander.js quand send_units Ã©choue (ex: mode vacances)
            // Retente l'esquive avec les villes candidates restantes
            _autododgeFallback: function(c, _remaining) {
                var f = b.models.Town[c.to.id];
                if (!f) {
                    i("error", "Dodge fallback: ville [town]{0}[/town] introuvable", c.to.id).msg(10).send();
                    return;
                }
                if (!_remaining || _remaining.length === 0) {
                    i("error", b.t("Aucune ville trouvÃ©e pour esquiver l'attaque !"), f.id).msg(10).send();
                    return;
                }
                var _next = _remaining[Math.floor(Math.random() * _remaining.length)];
                var _stillRemaining = _remaining.filter(function(tid) { return tid != _next; });
                i("warning", "Dodge fallback: retente avec [town]{0}[/town] ({1} candidats restants)", _next, _stillRemaining.length).send();

                var _dodgeType = c.dodgeType || 'all';
                var e = [];
                if (_dodgeType === 'all' || _dodgeType === 'naval') e.push({ type: "naval", id: _next });
                if (_dodgeType === 'all' || _dodgeType === 'land')  e.push({ type: "land",  id: _next });

                var _now_pre = Timestamp.server();
                var _idealDepart_pre = c.time - 10;
                var _lastImpact_pre = c.time;
                if (b.herald.town[f.id] && b.herald.town[f.id].attack) {
                    var _changed = true;
                    while (_changed) {
                        _changed = false;
                        for (var _aid in b.herald.town[f.id].attack) {
                            var _a = b.herald.town[f.id].attack[_aid];
                            if (_a && typeof _a === "object" && _a.id !== c.id &&
                                _a.dodge === true &&
                                _a.time > _lastImpact_pre && _a.time <= _lastImpact_pre + 10) {
                                _lastImpact_pre = _a.time;
                                _changed = true;
                            }
                        }
                    }
                }

                e.forEach(function(a) {
                    b.ajaxRequestGet("town_info", "support", {
                        id: a.id,
                        town_id: f.id
                    }, function(d, resp) {
                        if (resp.json && resp.json.error) {
                            // Cette ville aussi est en erreur, retenter avec les suivantes
                            i("warning", "Dodge fallback: [town]{0}[/town] en erreur aussi, retente...", a.id).send();
                            b.herald._autododgeFallback(c, _stillRemaining);
                            return;
                        }
                        var g = {
                            town:   { id: f.id, name: f.getName() },
                            target: { id: a.id, name: "* auto-dodge fallback *" },
                            data:   { units: resp.json.units },
                            type:   a.type
                        };
                        b.request("herald:plan", g, function(d) {
                            if (!d.result.order) return;
                            var e = d.result.order, troops = [], j = 0;
                            e.units.forEach(function(a) {
                                troops.push(GameData.units[a.id].name + ": " + a.count);
                                j += a.count;
                            });
                            if (j < 1) {
                                i("error", "Dodge fallback: aucune unitÃ© disponible pour [town]{0}[/town]", f.id).msg(10);
                                return;
                            }
                            var _now = _now_pre;
                            var _idealDepart = _idealDepart_pre;
                            var _lastImpact = _lastImpact_pre;
                            if (_now > _idealDepart) {
                                e.time = _now + 1;
                                e.dodge = Math.max(1, Math.floor((_lastImpact + 1 - e.time) / 2));
                                if (e.time + 2 * e.dodge < _lastImpact + 1) {
                                    e.time += 1;
                                    e.dodge = Math.max(1, Math.floor((_lastImpact + 1 - e.time) / 2));
                                }
                            } else {
                                e.time = _idealDepart;
                                e.dodge = Math.max(3, Math.floor((_lastImpact + 1 - e.time) / 2));
                                if (e.time + 2 * e.dodge < _lastImpact + 1) {
                                    e.time += 1;
                                    e.dodge = Math.max(3, Math.floor((_lastImpact + 1 - e.time) / 2));
                                }
                            }
                            e._dodgeFallbackAttack = c;
                            e._dodgeFallbackCandidates = _stillRemaining;
                            i("debug", "Dodge fallback: order crÃ©Ã© vers [town]{0}[/town], dodge={1}s", a.id, e.dodge).send();
                            b.commander.create(e);
                        });
                    }, "na");
                });
            },
            autododge: function(c, d, e) {
                var f = b.models.Town[c.to.id];
                // Re-check aprÃ¨s le retour des troupes.
                // On cherche la prochaine attaque SANS dodge (ex: A2 Ã  dÃ©fendre) pour savoir
                // quand les troupes doivent Ãªtre rentrÃ©es. On s'arrÃªte Ã  elle, pas au-delÃ .
                var _lastImpactForReturn = c.time;
                if (b.herald.town[f.id] && b.herald.town[f.id].attack) {
                    var _changed2 = true;
                    while (_changed2) {
                        _changed2 = false;
                        for (var _rid in b.herald.town[f.id].attack) {
                            var _ra = b.herald.town[f.id].attack[_rid];
                            if (_ra && typeof _ra === "object" && _ra.id !== c.id &&
                                _ra.dodge === true &&
                                (_ra.dodgeType === c.dodgeType || _ra.dodgeType === 'all' || c.dodgeType === 'all') &&
                                _ra.time > _lastImpactForReturn && _ra.time <= _lastImpactForReturn + 10) {
                                _lastImpactForReturn = _ra.time;
                                _changed2 = true;
                            }
                        }
                    }
                }
                var _troopsReturn = _lastImpactForReturn + 1; // retour 1s aprÃ¨s le dernier impact du groupe dodge
                setTimeout(function() {
                    b.herald.autododge_check();
                }, (_troopsReturn - Timestamp.server()) * 1e3);
                // Tente l'esquive vers un candidat de la liste (ignore les villes en erreur/vacances)
                var p = function(a, d, _candidates) {
                    var e = [];
                    if (d == null) d = a;
                    var _dodgeType = c.dodgeType || 'all';
                    if (_dodgeType === 'all' || _dodgeType === 'naval') {
                        if (d != null) e.push({ type: "naval", id: d });
                    }
                    if (_dodgeType === 'all' || _dodgeType === 'land') {
                        if (a != null) e.push({ type: "land",  id: a });
                    }
                    i("debug", "Choose [town]{0}[/town] for naval units, [town]{1}[/town] for land units, active: {2}", d, a, e.length).send();
                    // Capturer _now et _idealDepart AVANT les requetes reseau (commun a tous les types).
                    // _lastImpact est calcule separement par type d'unite (land/naval) a l'interieur
                    // du forEach : un dodge 'land' ne doit pas prolonger le retour des troupes navales
                    // et vice versa (ex: dodge all sur A1 + dodge naval sur A2 â†’ terres rentrent a A1+1s,
                    // bateaux rentrent a A2+1s).
                    var _now_pre = Timestamp.server();
                    var _idealDepart_pre = c.time - 10;
                    var g = 0;
                    e.forEach(function(a) {
                        // Calculer _lastImpact propre a ce type d'unite (a.type = 'land' ou 'naval')
                        // On cherche les autres attaques dodge qui couvrent CE type : dodgeType === a.type ou 'all'
                        var _lastImpact_pre = c.time;
                        if (b.herald.town[f.id] && b.herald.town[f.id].attack) {
                            var _changed_pre = true;
                            while (_changed_pre) {
                                _changed_pre = false;
                                for (var _aid_pre in b.herald.town[f.id].attack) {
                                    var _a_pre = b.herald.town[f.id].attack[_aid_pre];
                                    if (_a_pre && typeof _a_pre === "object" && _a_pre.id !== c.id &&
                                        _a_pre.dodge === true &&
                                        (_a_pre.dodgeType === a.type || _a_pre.dodgeType === 'all') &&
                                        _a_pre.time > _lastImpact_pre && _a_pre.time <= _lastImpact_pre + 10) {
                                        _lastImpact_pre = _a_pre.time;
                                        _changed_pre = true;
                                    }
                                }
                            }
                        }
                        setTimeout(function() {
                            b.ajaxRequestGet("town_info", "support", {
                                id: a.id,
                                town_id: f.id
                            }, function(d, e) {
                                // Si la ville retourne une erreur (mode vacances ou autre), retenter avec une autre ville
                                if (e.json && e.json.error) {
                                    var _remaining = (_candidates || []).filter(function(tid) { return tid != a.id; });
                                    if (_remaining.length > 0) {
                                        var _next = _remaining[Math.floor(Math.random() * _remaining.length)];
                                        p(_next, _next, _remaining);
                                    } else {
                                        i("error", b.t("Aucune ville trouvÃ©e pour esquiver l'attaque !"), f.id).msg(10).send();
                                    }
                                    return;
                                }
                                var g = {
                                    town: {
                                        id: f.id,
                                        name: f.getName()
                                    },
                                    target: {
                                        id: a.id,
                                        name: "name" in a ? a.name : "* auto-dodge *"
                                    },
                                    data: {
                                        units: e.json.units
                                    },
                                    type: a.type
                                };
                                b.request("herald:plan", g, function(d) {
                                    if (!d.result.order) {
                                        return;
                                    }
                                    var e = d.result.order,
                                        g = [],
                                        j = 0;
                                    e.time = Timestamp.server();
                                    e.units.forEach(function(a) {
                                        g.push(GameData.units[a.id].name + ": " + a.count);
                                        j += a.count;
                                    });
                                    if (j < 1) {
                                        // Aucune unitÃ© disponible (troupes encore en route)
                                        // Retry toutes les 200ms jusqu'Ã  100ms avant l'impact
                                        var _timeLeft = (c.time - Timestamp.server()) * 1e3;
                                        if (_timeLeft > 100) {
                                            (function(_atk) {
                                                setTimeout(function() {
                                                    if (_atk.status !== "dodge_pending") return;
                                                    b.herald.autododge(_atk, _atk, [_atk]);
                                                }, 200);
                                            }(c));
                                        } else {
                                            i("error", "No units for dodge [town]{0}[/town] ({1}), impact imminent", f.id, a.type).msg(10);
                                        }
                                        return;
                                    }
                                    g = g.join(", ");
                                                    // Utiliser les valeurs prÃ©-capturÃ©es avant les requÃªtes rÃ©seau
                                    var _now = _now_pre;
                                    var _idealDepart = _idealDepart_pre;
                                    var _lastImpact = _lastImpact_pre;
                                    if (_now > _idealDepart) {
                                        // Trop tard pour le dÃ©part idÃ©al, on part dans 1s
                                        // (+1 indispensable : commander n'exÃ©cute pas si window.start <= now)
                                        e.time = _now + 1;
                                        // Formule : depart + 2*dodge = lastImpact + 1
                                        // Si l'Ã©cart (lastImpact+1 - depart) est pair, Math.floor donne retour impact+0s.
                                        // Correction : dÃ©caler e.time d'1s pour rendre l'Ã©cart impair â†’ retour exact impact+1s.
                                        e.dodge = Math.max(1, Math.floor((_lastImpact + 1 - e.time) / 2));
                                        if (e.time + 2 * e.dodge < _lastImpact + 1) {
                                            e.time += 1;
                                            e.dodge = Math.max(1, Math.floor((_lastImpact + 1 - e.time) / 2));
                                        }
                                    } else {
                                        e.time = _idealDepart;
                                        // MÃªme formule : retour Ã  _idealDepart + 2*dodge = lastImpact + 1
                                        // MÃªme correction de paritÃ© si nÃ©cessaire.
                                        e.dodge = Math.max(3, Math.floor((_lastImpact + 1 - e.time) / 2));
                                        if (e.time + 2 * e.dodge < _lastImpact + 1) {
                                            e.time += 1;
                                            e.dodge = Math.max(3, Math.floor((_lastImpact + 1 - e.time) / 2));
                                        }
                                    }
                                    var _retourPrevu = e.time + 2 * e.dodge;
                                    _hld.log('DODGE', 'ðŸ“ Calcul dodge id=' + c.id + ' type=' + a.type + ' depart=' + new Date(e.time*1000).toLocaleTimeString() + ' dodge=' + e.dodge + 's impact=' + new Date(c.time*1000).toLocaleTimeString() + ' retour=' + new Date(_retourPrevu*1000).toLocaleTimeString() + ' (impact+' + Math.round(_retourPrevu - c.time) + 's)');
                                    i("debug", "Auto-dodge for [town]{0}[/town] ({1}) created, start:{2}, duration: {3}sec, town: [town]{4}[/town], troops: {5}", f.id, a.type, b.ts2text(e.time), e.dodge, a.id, g).send();
                                    // Stocker les infos de fallback dans l'ordre pour que commander puisse retenter
                                    // en cas d'erreur (ex: ville cible en mode vacances)
                                    e._dodgeFallbackAttack = c;
                                    e._dodgeFallbackCandidates = (_candidates || []).filter(function(tid) { return tid != a.id; });
                                    b.commander.create(e);
                                });
                            }, "na");
                        }, g);
                    });
                };
                b.ajaxRequestGet("island_info", "index", {
                    island_id: f.getIslandId(),
                    town_id: f.id
                }, function(b, c) {
                    var d = [];
                    var e = null;
                    c.json.town_list.forEach(function(b) {
                        a.towns.update(b);
                        if (b.id != f.id) d.push(b.id);
                    });
                    if (d.length < 1) i("error", "Cant choose town for dodging land units for [town]{0}[/town]", f.id).msg(10).send();
                    else e = d[Math.floor(Math.random() * d.length)];
                    p(e, e, d);
                }, "commander");
            },
            share: function() {
                if (b.sett.herald_share_attacks !== true) return;
                var a = [];
                angular.forEach(b.herald.town, function(b, c) {
                    angular.forEach(b.attack, function(b) {
                        a.push({
                            id: b.id,
                            time: b.time,
                            from: b.from,
                            to: b.to,
                            militia: b.militia ? true : false,
                            cs: b.cs ? true : false,
                            status: b.status
                        });
                    });
                });
                a = a.sort(function(a, b) {
                    return a.time - b.time;
                });
                // Ancien systÃ¨me herald:share dÃ©sactivÃ© â€” partage via systÃ¨me Amis VPS
            },
            poll: function(a, c) {
                // Ancien systÃ¨me dÃ©sactivÃ© â€” utiliser le systÃ¨me Amis VPS
                if (typeof c === "function") c();
            },
            test: function(a) {
                var c = ITowns.getTown(a || Game.townId),
                    d = b.custom.get(c.id);
                i("debug", "Build test attacks for [town]{0}[/town]", c.id);
                var e = [],
                    f = Timestamp.server(),
                    g = 0;
                for (var h = 0; h < 10; h++) {
                    g += 10 * Math.random();
                    var j = 45 + f + g;
                    if (h >= 5) j += 45;
                    e.push({
                        dodge: (d.automaneuver != "disabled"),
                        id: h + 1,
                        test: true,
                        status: "waiting",
                        from: {
                            id: c.id
                        },
                        to: {
                            id: c.id
                        },
                        time: j
                    });
                }
                e[e.length - 1].cs = true;
                e.forEach(function(a) {
                    a.militia = (b.sett.herald_militia == "always") || ((b.sett.herald_militia == "cs") && (a.cs === true));
                });
                e = e.sort(function(a, b) {
                    return a.time > b.time;
                });
                var k = b.herald.town[c.id];
                if (!k) k = b.herald.town[c.id] = {
                    attack: {}
                };
                e.forEach(function(a) {
                    k.attack[a.id] = a;
                    var c = "Test attack: {0}) {1}";
                    if (a.cs == true) c += " -> CS <-";
                    i("debug", c, a.id, b.ts2text(a.time));
                });
                this.autododge_check();
            }
        };
        b.herald.control = $('<img width="16" height="16" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbD0iI2M5YTg0YyIgZD0iTTIgMmw1IDUtMSAxLTUtNVYyaDF6bTEyIDB2MWwtNSA1LTEtMSA1LTVoMXpNNyA5bDItMiA0IDQtMSAxLTMtM3pNNSAxMWwtMSAxLTIgMmgybDEtMSAxIDFoMmwtMi0yeiIvPjwvc3ZnPg==" class="control" style="opacity: 0.3;"/>');
        b.controls.herald = b.herald.control;
        b.controls.base.before(b.herald.control);
        b.herald.control.show();
        b.herald.control.click(function() {
            b.herald.showAttacks();
        });
        // timers.texport (herald.share toutes les 10 min) supprimÃ© â€” remplacÃ© par WS SHARE_DATA via friends._pushShared()
        // timers.timport (herald.poll toutes les 10 min) supprimÃ© â€” remplacÃ© par WS FRIEND_DATA push depuis le serveur
            $.Observer(GameEvents.notification.push).subscribe("Grepeye", function(a, c) {
            var d = b.herald,
                e = GrepoNotificationStack,
                f = false,
                g = [];
            e.loop(function(a, c, d) {
                var e = c.getOpt(),
                    h = "n" + e.id;
                if (h in notifications) return;
                switch (e.type) {
                    case NotificationType.INCOMING_ATTACK:
                        try {
                            var i = JSON.parse(e.param_str);
                            if (g.indexOf(i.town_id) < 0) {
                                m(b.herald, i.town_id);
                                g.push(i.town_id);
                            }
                        } catch (j) { }
                        f = true;
                        break;
                    case "botcheck":
                        Game.bot_check = Timestamp.server();
                        setTimeout(function() {
                            $.Observer(GameEvents.bot_check.update_started_at_change).publish({});
                        }, (Math.random() * 7 + 7) * 1E3);
                        b.captcha.isWaiting = true;
                        break;
                }
                notifications[h] = true;
            });
        });
        $.Observer(GameEvents.notification.message.arrive).subscribe("GrepoEyeMessage", function(a, c) {});
        $.Observer(GameEvents.notification.report.arrive).subscribe("GrepoEyeReport", function(a, c) {});

        function q(c, d, e) {
            var f, g;
            if (c) {
                f = ITowns.getTown(c.get("town_id"));
                if (!f) return;
                g = c.getUnitsMovements(true, true).map(function(a) {
                    return a.attributes;
                });
                n(f.id);
            } else {
                f = ITowns.getTown(e);
                g = d;
            }
            if (!f) return;
            var h = [];
            g.forEach(function(b) {
                var c = {
                    to: {
                        id: f.id,
                        name: f.name,
                        link: a.towns.link(f.id, null, false)
                    },
                    from: {
                        id: b.town.id,
                        name: b.town.name,
                        link: b.town.link
                    },
                    id: b.id,
                    time: b.arrival_at,
                    quest: b.town.is_quest == true,
                    type: b.type,
                    incoming: b.incoming_attack === true
                };
                a.towns.update(c.from);
                h.push(c);
            });
            l(b.herald, h, [f.id]);
        }
        // Ã‰couter la collection movements_units de Grepolis en temps rÃ©el
        var _movBound = null;
        function _bindMovements() {
            var col = _getMovementsCollection();
            if (!col || col === _movBound) return;
            if (_movBound) {
                try { _movBound.off("add",    _onMovAdd);    } catch(_e) {}
                try { _movBound.off("remove", _onMovRemove); } catch(_e) {}
                try { _movBound.off("reset",  _onMovReset);  } catch(_e) {}
            }
            _movBound = col;
            col.on("add",    _onMovAdd);
            col.on("remove", _onMovRemove);
            col.on("reset",  _onMovReset);
            // Traiter les mouvements dÃ©jÃ  prÃ©sents au moment du bind
            _processAllMovements(col);
        }
        function _refreshHeraldScope() {
            if (!b.herald.showAttacksEl) return;
            try {
                var scope = angular.element(b.herald.showAttacksEl[0]).scope();
                if (!scope) return;
                if (scope.$$phase || scope.$root.$$phase) {
                    scope.refresh();
                } else {
                    scope.$apply(function() { scope.refresh(); });
                }
            } catch(_e) {}
        }

        function _onMovAdd(model) {
            var attr = model.attributes;
            var atk = _movAttrToAttack(attr);
            _hld.log('DETECT', 'ðŸ”µ onMovAdd â€” id=' + attr.id + ' incoming=' + atk.incoming + ' type=' + attr.type + ' from=' + (attr.town_name_origin||'?') + ' â†’ to=' + (attr.town_name_destination||'?') + ' arrive=' + (attr.arrival_at ? new Date(attr.arrival_at*1000).toLocaleTimeString() : '?'));
            if (atk.incoming) {
                // Marquer comme dÃ©tectÃ©e en live AVANT l() pour que _bootLoaded ne soit pas posÃ©
                atk._liveDetected = true;
                // Sauvegarder le remaining immÃ©diatement dans _attackPrefs pour survivre
                // aux recrÃ©ations d'objet (refresh, _processAllMovements, VPS restore).
                // Sans Ã§a, si l'objet est recrÃ©Ã© plus tard, _remainingAtDetection est recapturÃ©
                // depuis le temps restant actuel (faux) au lieu du moment de l'envoi rÃ©el.
                var _radNow = atk.time - Timestamp.server();
                _hld.log('DETECT', 'ðŸŸ¢ LIVE dÃ©tection id=' + atk.id + ' remaining=' + Math.round(_radNow) + 's', { atk: atk });
                if (!b.herald._attackPrefs) b.herald._attackPrefs = {};
                if (!b.herald._attackPrefs[atk.id]) b.herald._attackPrefs[atk.id] = {};
                if (!b.herald._attackPrefs[atk.id]._remainingAtDetection) {
                    b.herald._attackPrefs[atk.id]._remainingAtDetection = _radNow;
                    _hld.log('PREFS', 'ðŸ’¾ _attackPrefs[' + atk.id + ']._remainingAtDetection sauvegardÃ©=' + Math.round(_radNow) + 's');
                } else {
                    _hld.log('PREFS', 'âš ï¸ _attackPrefs[' + atk.id + ']._remainingAtDetection dÃ©jÃ  prÃ©sent=' + Math.round(b.herald._attackPrefs[atk.id]._remainingAtDetection) + 's â€” non Ã©crasÃ©');
                }
                l(b.herald, [atk], [atk.to.id]);
                _refreshHeraldScope();
                // Forcer le fetch notify sur la ville attaquÃ©e pour dÃ©clencher la notification
                // mÃªme si ce n'est pas la ville active (Game.townId) au moment de la dÃ©tection.
                try {
                    $.ajax({
                        url: '/game/notify?town_id=' + atk.to.id + '&action=fetch&h=' + Game.csrfToken,
                        success: function(resp) {
                            if (resp && resp.json && Array.isArray(resp.json.notifications)) {
                                try { NotificationLoader.recvNotifyData(resp.json); } catch(e) {}
                            }
                        }
                    });
                } catch(_ne) {}
                // Mettre Ã  jour le statut immÃ©diatement
                setTimeout(function() {
                    try { b.herald.autododge_check(); } catch(e) {}
                }, 200);
            } else {
                _hld.log('DETECT', 'âšª onMovAdd ignorÃ© (non incoming)');
            }
        }
        function _onMovRemove(model) {
            var attr = model.attributes;
            var townId = attr.target_town_id;
            var atkId  = attr.id;
            _hld.log('STATUS', 'ðŸ—‘ï¸ onMovRemove â€” id=' + atkId + ' townId=' + townId + ' time=' + (attr.arrival_at ? new Date(attr.arrival_at*1000).toLocaleTimeString() : '?'));
            if (b.herald.town[townId] && b.herald.town[townId].attack[atkId]) {
                var atk = b.herald.town[townId].attack[atkId];
                if (b.sett.herald_auto_remove === true) {
                    _hld.log('STATUS', 'ðŸ—‘ï¸ auto_remove=true â†’ suppression directe id=' + atkId);
                    delete b.herald.town[townId].attack[atkId];
                } else {
                    // Si l'heure d'impact est passÃ©e â†’ a frappÃ©, sinon â†’ annulÃ©e
                    var _newStatus = (atk.time <= Timestamp.server()) ? "struck" : "spam";
                    _hld.log('STATUS', 'ðŸ“Œ onMovRemove â†’ statut=' + _newStatus + ' (time=' + new Date(atk.time*1000).toLocaleTimeString() + ' now=' + new Date(Timestamp.server()*1000).toLocaleTimeString() + ') id=' + atkId);
                    atk.status = _newStatus;
                }
                _refreshHeraldScope();
            } else {
                _hld.log('STATUS', 'âš ï¸ onMovRemove â€” attaque id=' + atkId + ' introuvable dans herald.town[' + townId + '] (dÃ©jÃ  supprimÃ©e ?)');
            }
        }
        function _onMovReset(col) {
            var stillPresent = {};
            col.models.forEach(function(m) { stillPresent[m.attributes.id] = true; });
            var _now = Timestamp.server();
            _hld.log('RESET', 'ðŸ”„ onMovReset â€” ' + col.models.length + ' modÃ¨les dans la collection aprÃ¨s reset, Game.townId=' + (typeof Game !== 'undefined' ? Game.townId : '?'));
            // DÃ©terminer les villes reprÃ©sentÃ©es dans la collection aprÃ¨s reset
            // pour ne pas toucher aux attaques des villes absentes (cas du switch de ville)
            var townsInCol = {};
            col.models.forEach(function(m) {
                if (m.attributes.target_town_id) townsInCol[m.attributes.target_town_id] = true;
                if (m.attributes.home_town_id)   townsInCol[m.attributes.home_town_id]   = true;
            });
            // La ville active est forcÃ©ment concernÃ©e mÃªme si elle n'a plus de mouvements
            if (typeof Game !== "undefined" && Game.townId) townsInCol[Game.townId] = true;
            _hld.log('SWITCH', 'ðŸ™ï¸ onMovReset â€” villes dans collection: [' + Object.keys(townsInCol).join(',') + ']');
            // Le nettoyage (spam/struck) est gÃ©rÃ© uniquement par _onMovRemove
            // (suppression unitaire rÃ©elle). _onMovReset peut se dÃ©clencher avec une
            // collection incomplÃ¨te pendant le rechargement â†’ ne jamais marquer ici.
            _processAllMovements(col);
        }
        function _processAllMovements(col) {
            if (!col || !col.models) return;
            // CURATOR : pendant le chargement initial (command_overview pas encore rÃ©pondu),
            // bloquer _processAllMovements pour Ã©viter les doublons ID.
            // Une fois _bootCuratorDone=true les events live passent normalement.
            if (b.checkPremium("curator") && b.herald._bootCuratorDone === false) {
                _hld.log('DETECT', 'â¸ï¸ _processAllMovements bloquÃ© â€” curator pas encore chargÃ© (_bootCuratorDone=false)');
                return;
            }
            var attacks = [];
            var townIds = [];
            _hld.log('DETECT', 'âš™ï¸ _processAllMovements â€” ' + col.models.length + ' modÃ¨les');
            col.models.forEach(function(model) {
                var atk = _movAttrToAttack(model.attributes);
                if (!atk.incoming) return;
                // Sauvegarder _remainingAtDetection UNIQUEMENT si on a dÃ©jÃ  une entrÃ©e VPS
                // (attaque dÃ©tectÃ©e en live dans une session prÃ©cÃ©dente).
                // Ne PAS crÃ©er d'entrÃ©e pour les attaques boot-loaded (reÃ§ues hors connexion) :
                // elles doivent rester _bootLoaded=true et aller dans le panel manuel.
                // Bug 2 fix : l'ancien code crÃ©ait systÃ©matiquement _remainingAtDetection ici
                // et posait _liveDetected=true, ce qui faisait afficher les % sur des attaques
                // jamais dÃ©tectÃ©es en live.
                var _existingPrefs = b.herald._attackPrefs[atk.id];
                if (_existingPrefs && _existingPrefs._remainingAtDetection) {
                    // Attaque connue depuis une dÃ©tection live â†’ conserver, marquer live
                    atk._liveDetected = true;
                    _hld.log('DETECT', 'âœ… _processAllMovements â€” id=' + atk.id + ' prefs VPS trouvÃ©s, marquÃ© _liveDetected (remaining=' + Math.round(_existingPrefs._remainingAtDetection) + 's)');
                } else {
                    _hld.log('DETECT', 'ðŸ“‹ _processAllMovements â€” id=' + atk.id + ' pas de prefs VPS â†’ sera _bootLoaded=true (panel manuel)');
                }
                // Sinon : pas de _remainingAtDetection crÃ©Ã© ici â†’ l() posera _bootLoaded=true
                attacks.push(atk);
                if (townIds.indexOf(atk.to.id) < 0) townIds.push(atk.to.id);
            });
            if (attacks.length > 0) {
                _hld.log('DETECT', 'ðŸ“¤ _processAllMovements â†’ l() avec ' + attacks.length + ' attaque(s), villes=[' + townIds.join(',') + ']');
                l(b.herald, attacks, townIds);
            } else {
                _hld.log('DETECT', 'ðŸ“¤ _processAllMovements â†’ aucune attaque incoming trouvÃ©e');
            }
        }
        _bindMovements();
        setInterval(_bindMovements, 3 * 1000);

        (function() {
            // Polling toutes les 5s via l'endpoint notify direct (non throttlÃ© contrairement Ã 
            // requestNotifications qui est limitÃ© Ã  ~2 appels rapides puis 30s cÃ´tÃ© serveur).
            // Game.csrfToken contient le hash fixe de session, Game.townId la ville active.
            setInterval(function() {
                try {
                    $.ajax({
                        url: '/game/notify?town_id=' + Game.townId + '&action=fetch&h=' + Game.csrfToken,
                        success: function(resp) {
                            if (resp && resp.json && Array.isArray(resp.json.notifications)) {
                                try { NotificationLoader.recvNotifyData(resp.json); } catch(e) {}
                            }
                        }
                    });
                } catch(e) {}
            }, 1 * 1000);
        }());

        // â”€â”€ Polling command_overview toutes les 1s (curator uniquement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // movements_units est scopÃ©e Ã  Game.townId â†’ les attaques sur les villes en arriÃ¨re-plan
        // ne dÃ©clenchent jamais _onMovAdd. command_overview retourne les mouvements de TOUTES les
        // villes du joueur, indÃ©pendamment de la ville active : c'est le seul moyen de dÃ©tecter
        // fiablement les attaques sans switcher de ville.
        //
        // Ce bloc gÃ¨re Ã©galement les transitions dynamiques curator â†” non-curator en cours de session :
        //   â€¢ curator expire   â†’ dÃ©bascule sur movements_units (_bindMovements)
        //   â€¢ curator achetÃ©   â†’ rebascule sur command_overview (dÃ©marrage du polling curator)
        //     Le polling tourne toujours, mÃªme sans curator au boot, pour dÃ©tecter l'achat en live.
        (function() {
            var _lastSeenIds    = {}; // id â†’ true, pour ne traiter chaque attaque qu'une seule fois
            var _curatorActive  = b.checkPremium("curator"); // Ã©tat curator connu au tick prÃ©cÃ©dent

            // Si curator actif au boot : init _bootCuratorDone=false comme d'habitude
            if (_curatorActive) b.herald._bootCuratorDone = false;

            setInterval(function() {
                try {
                    var _hasCurator = b.checkPremium("curator");

                    // â”€â”€ Transition : curator vient d'EXPIRER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    if (_curatorActive && !_hasCurator) {
                        _curatorActive = false;
                        _hld.log('DETECT', 'âš ï¸ Curator expirÃ© â€” bascule sur movements_units (non-curator)');
                        // Rebind movements_units + scan complet comme au boot sans curator
                        _bindMovements();
                        return;
                    }

                    // â”€â”€ Transition : curator vient d'ÃŠTRE ACHETÃ‰ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    if (!_curatorActive && _hasCurator) {
                        _curatorActive = true;
                        _lastSeenIds   = {}; // reset pour retraiter toutes les attaques via command_overview
                        _hld.log('DETECT', 'âœ… Curator activÃ© en cours de session â€” bascule sur command_overview');
                        // DÃ©binder movements_units pour Ã©viter les doublons avec command_overview
                        if (_movBound) {
                            try { _movBound.off("add",    _onMovAdd);    } catch(_e) {}
                            try { _movBound.off("remove", _onMovRemove); } catch(_e) {}
                            try { _movBound.off("reset",  _onMovReset);  } catch(_e) {}
                            _movBound = null;
                        }
                        // Marquer boot curator terminÃ© (les attaques existantes sont dÃ©jÃ  dans herald)
                        b.herald._bootCuratorDone = true;
                        // pas de return : on tombe directement dans le polling curator ci-dessous
                    }

                    // â”€â”€ Polling normal curator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                    if (!_hasCurator) return; // non-curator : rien Ã  faire ici, movements_units s'en charge
                    if (b.herald._bootCuratorDone === false) return; // boot curator pas encore terminÃ©
                    b.ajaxRequestGet("town_overviews", "command_overview", {}, function(_bot, resp) {
                        if (!resp || !resp.data || !Array.isArray(resp.data.commands)) return;

                        resp.data.commands.forEach(function(cmd) {
                            if (!cmd.origin_town_player_id) return; // NPC / quÃªte
                            if (cmd.origin_town_player_id === Game.player_id) return; // mouvement sortant

                            // RÃ©soudre le vrai ID movements_units (attr.id) pour cohÃ©rence avec les events live
                            var _movId = cmd.id;
                            try {
                                var _col = _getMovementsCollection();
                                if (_col) {
                                    _col.models.forEach(function(mm) {
                                        var ma = mm.attributes;
                                        if (ma.command_id == cmd.id || ma.id == cmd.id) {
                                            _movId = ma.id;
                                        } else if (
                                            ma.arrival_at == cmd.arrival_at &&
                                            ma.home_town_id == cmd.origin_town_id &&
                                            ma.target_town_id == cmd.destination_town_id
                                        ) {
                                            _movId = ma.id;
                                        }
                                    });
                                }
                            } catch(_e) {}

                            // DÃ©jÃ  traitÃ© dans cette session â†’ skip
                            if (_lastSeenIds[_movId]) return;
                            _lastSeenIds[_movId] = true;

                            // DÃ©jÃ  prÃ©sente dans herald (chargÃ©e au boot ou par _onMovAdd) â†’ skip
                            var _alreadyKnown = false;
                            for (var _tid in b.herald.town) {
                                if (b.herald.town[_tid].attack && b.herald.town[_tid].attack[_movId]) {
                                    _alreadyKnown = true;
                                    break;
                                }
                            }
                            if (_alreadyKnown) return;

                            // Nouvelle attaque dÃ©tectÃ©e en arriÃ¨re-plan : injection comme live
                            var _radNow = cmd.arrival_at - Timestamp.server();
                            if (!b.herald._attackPrefs) b.herald._attackPrefs = {};
                            if (!b.herald._attackPrefs[_movId]) b.herald._attackPrefs[_movId] = {};
                            if (!b.herald._attackPrefs[_movId]._remainingAtDetection) {
                                b.herald._attackPrefs[_movId]._remainingAtDetection = _radNow;
                                _hld.log('PREFS', 'ðŸ’¾ POLL curator â€” _attackPrefs[' + _movId + ']._remainingAtDetection=' + Math.round(_radNow) + 's');
                            }

                            var _from = {
                                id:          cmd.origin_town_id,
                                name:        cmd.origin_town_name,
                                player_id:   cmd.origin_town_player_id   || null,
                                player_name: cmd.origin_town_player_name || ""
                            };
                            var _to = {
                                id:   cmd.destination_town_id,
                                name: cmd.destination_town_name
                            };
                            _from.link = _townLink(_from, false);
                            _to.link   = _townLink(_to,   true);
                            a.towns.update(_from);
                            a.towns.update(_to);

                            var atk = {
                                id:            _movId,
                                command_id:    cmd.id,
                                type:          cmd.type,
                                quest:         (cmd.is_quest === true) | (!cmd.origin_town_player_id),
                                time:          cmd.arrival_at,
                                incoming:      true,
                                _liveDetected: true, // marquÃ© live â†’ l() ne posera pas _bootLoaded=true
                                from: _from,
                                to:   _to
                            };

                            _hld.log('DETECT', 'ðŸŸ¡ POLL curator â€” nouvelle attaque id=' + _movId + ' from=' + _from.name + ' â†’ to=' + _to.name + ' arrive=' + new Date(cmd.arrival_at * 1000).toLocaleTimeString());
                            l(b.herald, [atk], [_to.id]);
                            _refreshHeraldScope();

                            // â”€â”€ Calcul distance + _distDurations via frontend_bridge (mÃªme logique que _movAttrToAttack) â”€â”€
                            (function(_atkId, _fromId, _toId, _destTownId) {
                                var _fbResults = {};
                                function _fbFinalize() {
                                    if (!_fbResults.to || !_fbResults.from) return;
                                    var _atkObj = null;
                                    for (var _tid in b.herald.town) {
                                        if (b.herald.town[_tid].attack && b.herald.town[_tid].attack[_atkId]) {
                                            _atkObj = b.herald.town[_tid].attack[_atkId];
                                            break;
                                        }
                                    }
                                    if (!_atkObj) return;
                                    if (_fbResults.from.distance != null && _fbResults.from.distance > 0 && !_atkObj.distance) {
                                        _atkObj.distance = _fbResults.from.distance;
                                        var _st = (Game.constants && Game.constants.units && Game.constants.units.runtime_setup_time) || 0;
                                        _atkObj._distDurations = {};
                                        if (GameData && GameData.units) {
                                            Object.keys(GameData.units).forEach(function(_uid) {
                                                var _u = GameData.units[_uid];
                                                if (!_u || !_u.speed) return;
                                                _atkObj._distDurations[_uid] = Math.floor(50 * _atkObj.distance / _u.speed + _st);
                                            });
                                        }
                                        _atkObj._sameIslandFallback = (
                                            _fbResults.from.island_x === _fbResults.to.island_x &&
                                            _fbResults.from.island_y === _fbResults.to.island_y
                                        );
                                        // Sauvegarder dans _attackPrefs pour persistance
                                        if (!b.herald._attackPrefs) b.herald._attackPrefs = {};
                                        if (!b.herald._attackPrefs[_atkId]) b.herald._attackPrefs[_atkId] = {};
                                        b.herald._attackPrefs[_atkId].distance       = _atkObj.distance;
                                        b.herald._attackPrefs[_atkId]._distDurations = _atkObj._distDurations;
                                        _hld.log('DETECT', 'ðŸ“ POLL curator â€” distance calculÃ©e id=' + _atkId + ' dist=' + _atkObj.distance + ' _distDurations keys=' + Object.keys(_atkObj._distDurations).length);
                                        _refreshHeraldScope();
                                    }
                                }
                                // RequÃªte vers la ville cible (pour island_x/y)
                                b.ajaxRequestGet('frontend_bridge', 'fetch', {
                                    window_type: "runtime_info", tab_type: "index",
                                    known_data: { models: [], collections: ["Units", "Towns"], templates: [] },
                                    arguments: { target_town_id: _toId, is_portal_command: false },
                                    town_id: _destTownId, nl_init: true
                                }, function(_bot, r) {
                                    try {
                                        var _d = r && r.models && r.models.RuntimeSimulator && r.models.RuntimeSimulator.data;
                                        if (!_d) return;
                                        _fbResults.to = { island_x: _d.island_x, island_y: _d.island_y };
                                        _fbFinalize();
                                    } catch(_e) {}
                                });
                                // RequÃªte vers la ville source (pour la vraie distance)
                                b.ajaxRequestGet('frontend_bridge', 'fetch', {
                                    window_type: "runtime_info", tab_type: "index",
                                    known_data: { models: [], collections: ["Units", "Towns"], templates: [] },
                                    arguments: { target_town_id: _fromId, is_portal_command: false },
                                    town_id: _destTownId, nl_init: true
                                }, function(_bot, r) {
                                    try {
                                        var _d = r && r.models && r.models.RuntimeSimulator && r.models.RuntimeSimulator.data;
                                        if (!_d) return;
                                        _fbResults.from = { distance: _d.distance, island_x: _d.island_x, island_y: _d.island_y };
                                        _fbFinalize();
                                    } catch(_e) {}
                                });
                            }(_movId, _from.id, _to.id, _to.id));
                            // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

                            // Forcer notify sur la ville attaquÃ©e pour dÃ©clencher la notification sonore/visuelle
                            try {
                                $.ajax({
                                    url: '/game/notify?town_id=' + _to.id + '&action=fetch&h=' + Game.csrfToken,
                                    success: function(r) {
                                        if (r && r.json && Array.isArray(r.json.notifications)) {
                                            try { NotificationLoader.recvNotifyData(r.json); } catch(_e) {}
                                        }
                                    }
                                });
                            } catch(_ne) {}

                            setTimeout(function() {
                                try { b.herald.autododge_check(); } catch(_e) {}
                            }, 200);
                        });
                    }, "herald");
                } catch(e) {}
            }, 1000);
        }());


        // â”€â”€ Patch WMap.mapJump : fix "aller Ã " pour les villes lointaines absentes de WMap â”€â”€
        (function() {
            if (!window.WMap || typeof WMap.mapJump !== "function") return;
            var _nativeMapJump = WMap.mapJump.bind(WMap);
            WMap.mapJump = function(townObj, arg2, arg3) {
                if (!townObj || typeof townObj !== "object") return _nativeMapJump.apply(WMap, arguments);
                var townId = townObj.id;
                if (!townId) return _nativeMapJump.apply(WMap, arguments);
                if (townObj.ix != null || townObj.x != null || townObj.iy != null) return _nativeMapJump.apply(WMap, arguments);
                var wmapTown = WMap.mapData && WMap.mapData.getTown(townId);
                if (wmapTown && (wmapTown.x != null || wmapTown.ix != null)) {
                    var enriched = {};
                    for (var k in townObj) enriched[k] = townObj[k];
                    enriched.ix = wmapTown.x  != null ? wmapTown.x  : wmapTown.ix;
                    enriched.iy = wmapTown.y  != null ? wmapTown.y  : wmapTown.iy;
                    return _nativeMapJump.call(WMap, enriched, arg2, arg3);
                }
                b.ajaxRequestGet('frontend_bridge', 'fetch', {
                    window_type: "runtime_info",
                    tab_type: "index",
                    known_data: { models: [], collections: ["Units", "Towns"], templates: [] },
                    arguments: { target_town_id: townId, is_portal_command: false },
                    town_id: b.lastTownId,
                    nl_init: true
                }, function(_bot, r) {
                    try {
                        var d = r && r.models && r.models.RuntimeSimulator && r.models.RuntimeSimulator.data;
                        if (!d || d.island_x == null) return;
                        var enriched = {};
                        for (var k in townObj) enriched[k] = townObj[k];
                        enriched.ix = d.island_x;
                        enriched.iy = d.island_y;
                        _nativeMapJump.call(WMap, enriched, arg2, arg3);
                    } catch(e) {}
                });
            };
        })();
        // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

        i("info", "Loaded"); window._gfbot_module_loaded && window._gfbot_module_loaded("HÃ©raut", true);
        b.herald.start();
    }).call(this);
    (function() {
        var a = this;
        b = a.bot;
        var c = Game.alliance_id ? Game.alliance_id.toString() : "";
        if (c != "None") b.request("bot:sessionAllianceId", {
            alliance_id: c
        });
    }).call(this);
}).call(this);
