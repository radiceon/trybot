(function(a) {
    "use strict";
    var b = a.bot,
        c = a.logger.create("Commander"),
        d = a.translate.commander,
        e;
    try {
        e = b.models.CommandsMenuBubble[Game.player_id];
    } catch (f) {}
    var g = function(a, c, d, e) {
        b.ajaxRequestPost(a, c, d, e, "commander");
    };
    var h = function(a, c, d, e) {
        b.ajaxRequestGet(a, c, d, e, "commander");
    };

    function i(e) {
        var f = 10;
        var _log = c; // capture du logger avant tout redÃ©finition locale de 'c' dans les sous-fonctions
        var j = {
            WAIT: "wait",
            ABORT: "abort",
            START: "start",
            CANCEL: "cancel",
            RESTART: "restart",
            ERROR: "error",
            DELETE: "delete",
            SUCCESS: "success"
        };
        var k = (Game.features.is_commands_menu_bubble_with_individual_pushables === true);
        var l = {
            opts: e,
            action: e.action === "support" ? "support" : "attack",
            accuracy: parseInt(e.accuracy, 10),
            dodge: parseInt(e.dodge, 10),
            attempt: 0,
            state: j.WAIT,
            notify: e.notify === true,
            window: {},
            tolerance_sec: (Number.isInteger(parseInt(e.tolerance_sec, 10)) && parseInt(e.tolerance_sec, 10) >= 0) ? Math.min(parseInt(e.tolerance_sec, 10), 3) : 0,
            tolerance_dir: (e.tolerance_dir === "before" || e.tolerance_dir === "after") ? e.tolerance_dir : "both"
        };
        var m = this;
        if (!Number.isInteger(l.accuracy)) l.accuracy = 0;
        if (!Number.isInteger(l.dodge)) l.dodge = 0;
        // Sort unique
        if (("spell" in e) && e.spell && e.spell !== "disabled" && (e.spell in GameData.powers)) {
            l.spell = e.spell;
        } else if ("spells" in e && Array.isArray(e.spells) && e.spells.length > 0 && (e.spells[0] in GameData.powers)) {
            l.spell = e.spells[0]; // compat ancien format multi-sort
        } else {
            l.spell = null;
        }
        if (("heroes" in GameData) && (e.hero in GameData.heroes)) l.hero = e.hero;
        l.id = "id" in e ? e.id : (Date.now().toString(36) + Math.random().toString(36).substr(2, 4));
        l.state = "state" in e ? e.state : j.WAIT;
        l.status = "status" in e ? e.status : "";
        switch (e.action + ":" + (typeof e.strategy === "string" ? e.strategy : "regular")) {
            case "attack:attack":
            case "attack:regular":
                l.type = "attack";
                break;
            case "attack:breach":
                l.type = "breakthrough";
                break;
            case "attack:revolt":
                l.type = "revolt";
                break;
            case "attack:found":
                l.type = "colony";
                break;
            case "support:support":
            case "support:regular":
                l.type = "support";
                break;
        }

        function n() {
            var a = Object.assign({}, l.opts);
            a.time += Timestamp.clientGMTOffset();
            b.request("commander:save", a, function(a) {
                if ("result" in a && a.result && a.result.id && typeof a.result.id !== "number") l.id = a.result.id;
                // Pousser vers le VPS aprÃ¨s que l'ID soit bien assignÃ©
                if (b.friends && typeof b.friends._pushShared === "function") {
                    b.friends._pushShared();
                }
            });
        }

        function o(a, c) {
            if (a === j.SUCCESS) l.status = (typeof c === "string") ? c : m.status;
            else l.status = (typeof c === "string") ? c : m.status;
            l.state = a;
            b.request("commander:state", {
                id: l.id,
                state: l.state,
                status: l.status
            });
            _refreshOrders(); // dÃ©clenche _saveToStorage
            // Fermer le panel sort si ouvert pour cet ordre
            var _openPanel = $('#gfb-spell-panel');
            if (_openPanel.length && _openPanel.data('order-id') === l.id) {
                _openPanel.remove();
                $(document).off('click.ordspellpanel');
            }
            // Partager l'Ã©tat mis Ã  jour avec les amis en temps rÃ©el
            if (b.friends && typeof b.friends._pushShared === "function") {
                b.friends._pushShared();
            }
        }

        function p() {
            if (l.state != j.WAIT) return;
            var b = Timestamp.server();
            if (l.dodge > 0) l.window = {
                start: l.opts.time,
                stop: l.opts.time
            };
            else if (l.accuracy === 0) {
                l.window.start = l.opts.time - l.opts.duration;
                l.window.stop = l.window.start;
            } else {
                var c = l.opts.time - l.opts.duration;
                l.window.start = c - f + l.accuracy;
                l.window.stop = c + f + l.accuracy;
            }
            clearTimeout(l.startTimer);
            clearTimeout(l.emulateTimer);
            clearTimeout(l.blockUiTimer);
            clearTimeout(l.correctTimer);
            clearTimeout(l.notifyTimer);
            var d = l.window.start - b;
            if ((d < 0) || (l.window.start < b)) {
                o(j.ABORT, "Start time expired");
                return;
            }
            if (d > 10 * 60) l.correctTimer = setTimeout(p, 5 * 60 * 1e3);
            if (d > 0) {
                // Si le calage est actif, on dÃ©marre 10s plus tÃ´t pour avoir la fenÃªtre complÃ¨te
                // de _wantedDepart - 10s Ã  _wantedDepart + 10s
                var _startDelay = (l.opts.order_timing === true && l.dodge === 0)
                    ? Math.max(0, d - 10) * 1e3
                    : d * 1e3;
                l.startTimer = setTimeout(m.start, _startDelay);
                // Notification avant envoi (bas Ã  droite, style bot)
                if (l.opts.notify === true) {
                    var _notifyDelay = Math.max(0, d - 10);
                    l.notifyTimer = setTimeout(function() {
                        var _actionColor = (l.action === "support") ? "#4caf6e" : "#e05555";
                        var _actionLabel = l.action === "support" ? a.t("Support") : a.t("Attaque");
                        var _townId = l.opts.town && l.opts.town.id;
                        var _targetId = l.opts.target && l.opts.target.id;
                        var _townName = (l.opts.town && l.opts.town.name) ? l.opts.town.name : "?";
                        var _targetName = (l.opts.target && l.opts.target.name) ? l.opts.target.name : "?";
                        var _secLeft = Math.round(l.window.start - Timestamp.server());
                        var _notifText = "ðŸ”” [color=" + _actionColor + "]" + _actionLabel + " dans ~" + _secLeft + "s[/color]";
                        _notifText += " " + (_townId ? "[town]" + _townId + "[/town]" : _townName);
                        _notifText += " => " + (_targetId ? "[town]" + _targetId + "[/town]" : _targetName);
                        _log("info", _notifText).msg(20);
                    }, _notifyDelay * 1e3);
                }
                if ((d > 15) && (l.opts.emulate !== false)) {
                    d -= 10 + 5 * Math.random();
                    l.emulateTimer = setTimeout(q, d * 1e3);
                }
            }
        }

        function q() {
            var a = {
                id: l.opts.target.id,
                town_id: l.opts.town.id
            };
            h("town_info", l.action, a, function(a, d) {
                c("debug", "Command #{0}, emulate ...", l.id);
                if (b.sett.commander_troops_autocorrect === true) {
                    c("debug", "Command #{0}, correct ...", l.id);
                    var e = 0;
                    l.opts.units.forEach(function(a) {
                        var b = d.json.units[a.id];
                        a.count = Math.min(b.count, a.count);
                        e += a.count;
                    });
                }
                if (e < 1) {
                    c("warning", "Command #{0} aborted, no troops", l.id).msg(0).send();
                    o(j.ABORT, "No troops");
                    clearTimeout(l.startTimer);
                    clearTimeout(l.blockUiTimer);
                }
            });
        }
        Object.defineProperty(this, "text", {
            get: function() {
                var a = "[town]" + l.opts.town.id + "[/town]",
                    c = "[town]" + l.opts.target.id + "[/town]",
                    d = "";
                if (l.dodge > 0) {
                    var e = b.ts2text(l.opts.time);
                    d = "[dodge] " + a + " (" + e + ") -> " + c + " (+" + l.dodge + ")";
                } else {
                    var e = "",
                        g = b.ts2text(l.opts.time);
                    d = "[" + l.action;
                    if (l.spell in GameData.powers) d += ", " + GameData.powers[l.spell].name;
                    d += "] ";
                    if (l.accuracy !== 0) {
                        e += b.ts2text(l.opts.time - l.opts.duration + l.accuracy);
                        e += " Â± " + f;
                        g += " " + (l.accuracy > 0 ? "+" : "") + l.accuracy;
                    } else e += b.ts2text(l.opts.time - l.opts.duration);
                    d += a + " (" + e + ") -> " + c + " (" + g + ")";
                }
                d += "\n" + this.units();
                return d;
            }
        });
        this.units = function() {
            var a = [];
            l.opts.units.forEach(function(b) {
                a.push(GameData.units[b.id].name + ": " + b.count);
            });
            if ("hero" in l) a.push(GameData.heroes[l.hero].name);
            return a.join(", ");
        };

        function r(d) {
            var e = typeof d === "function" ? d : function() {},
                f = [];
            f.push("Find attack -> target: " + l.opts.target.id + ", type: " + l.type + ", started at: " + b.ts2text(l.startAt) + ", arrival at: " + b.ts2text(l.opts.time) + ", duration: " + l.opts.duration);
            a.cmbFetch(l.opts.town.id, function(cmds) {
                try {
                    var d;
                    if (isNumber(l.commandId)) d = cmds.some(function(cmd) {
                        if (l.commandId === cmd.id) {
                            e(cmd);
                            return true;
                        } else return false;
                    });
                    else d = cmds.some(function(cmd) {
                        var c = cmd.arrival_at - cmd.started_at;
                        var d = "\tcancel: " + cmd.cancelable + ", target: " + cmd.town.id + ", started at:" + b.ts2text(cmd.started_at) + ", arrival at: " + b.ts2text(cmd.arrival_at) + ", duration: " + c + ", type: " + cmd.type;
                        if (cmd.cancelable !== true) {
                            d += " (cancelable)";
                            f.push(d);
                            return false;
                        }
                        if (cmd.town.id != l.opts.target.id) {
                            d += " (target)";
                            f.push(d);
                            return false;
                        }
                        if (cmd.type.indexOf(l.type) !== 0) {
                            d += " (type)";
                            f.push(d);
                            return false;
                        }
                        if (Math.abs(l.startAt - cmd.started_at) > 5) {
                            d += " (started)";
                            f.push(d);
                            return false;
                        }
                        if (Math.abs(l.duration - c) > 15) {
                            d += " (duration)";
                            f.push(d);
                            return false;
                        }
                        if (b.commander.find(cmd.id)) {
                            d += " (command id)";
                            f.push(d);
                            return false;
                        }
                        e(cmd);
                        return true;
                    });
                } catch (g) {
                    f.push("find(), exception: " + g.toString()).send();
                }
                if (!d) {
                    // Retry aprÃ¨s 3s â€” la commande peut ne pas encore Ãªtre visible dans cmbFetch
                    setTimeout(function() {
                        a.cmbFetch(l.opts.town.id, function(cmds2) {
                            var found = cmds2 && cmds2.some(function(cmd) {
                                if (isNumber(l.commandId) && l.commandId === cmd.id) { e(cmd); return true; }
                                var c = cmd.arrival_at - cmd.started_at;
                                return cmd.cancelable && cmd.town.id == l.opts.target.id &&
                                    cmd.type.indexOf(l.type) === 0 &&
                                    Math.abs(l.startAt - cmd.started_at) <= 10 &&
                                    Math.abs(l.duration - c) <= 30 &&
                                    !b.commander.find(cmd.id) && (e(cmd), true);
                            });
                            if (!found) {
                                c("debug", "Command #{0} not found after retry", l.id).send();
                            }
                        });
                    }, 3000);
                }
            });
        }
        this.start = function() {
            if ([j.WAIT, j.RESTART].indexOf(l.state) < 0) return;
            var d = ITowns.getTown(l.opts.town.id);
            if (typeof d === "undefined") {
                b.refetched(l.opts.town.id, function() {
                    var d2 = ITowns.getTown(l.opts.town.id);
                    if (typeof d2 === "undefined") {
                        o(j.ERROR, a.t("ville introuvable (administrateur manquant ?)"));
                        return;
                    }
                    if (d2.hasConqueror()) {
                        o(j.ERROR, a.t("ville assiÃ©gÃ©e"));
                        return;
                    }
                    // Ville chargÃ©e, on relance proprement
                    l.state = j.WAIT;
                    m.start();
                });
                return;
            }
            if (d.hasConqueror()) {
                o(j.ABORT, "town under siege");
                return;
            }
            var e = {
                id: l.opts.target.id,
                type: typeof l.opts.strategy === "string" ? l.opts.strategy : l.action,
                town_id: d.id
            };
            l.opts.units.forEach(function(a) {
                e[a.id] = a.count;
            });
            if ("hero" in l) {
                var f = d.getHero(l.hero);
                if (f && f.isAvailableInTown()) e.heroes = l.hero;
            }
            var h = {};
            h.success = function(a, d) {
                // Troupes parties
                l.startAt = Timestamp.server();

                // â”€â”€ Calage des ordres â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                // Si l'option est cochÃ©e et que ce n'est pas un dodge, on vÃ©rifie
                // que l'heure d'arrivÃ©e rÃ©elle correspond Ã  celle voulue.
                // FenÃªtre d'essais : departure_wanted - 10s  â†’  departure_wanted + 10s
                if (l.opts.order_timing === true && l.dodge === 0) {
                    var _timingTownId   = l.opts.town.id;
                    var _timingTargetId = l.opts.target.id;
                    var _wantedArrival  = l.opts.time;
                    var _duration       = l.opts.duration;
                    var _wantedDepart   = _wantedArrival - _duration;
                    var _timingDeadline = _wantedDepart + 10;

                    var _cachedArrival = null;
                    function _readRealArrival() {
                        if (_cachedArrival !== null) return _cachedArrival;
                        // MÃ©thode 1 : movements_units (instantanÃ©, fonctionne si ville active)
                        try {
                            var col = window.layout_main_controller &&
                                      window.layout_main_controller.collections &&
                                      window.layout_main_controller.collections.movements_units;
                            if (col && col.models) {
                                for (var _mi = 0; _mi < col.models.length; _mi++) {
                                    var _attr = col.models[_mi].attributes;
                                    if (String(_attr.home_town_id)   === String(_timingTownId) &&
                                        String(_attr.target_town_id) === String(_timingTargetId) &&
                                        Math.abs(parseInt(_attr.started_at, 10) - l.startAt) <= 5) {
                                        _cachedArrival = parseInt(_attr.arrival_at, 10);
                                        if (!l.commandId && _attr.command_id) l.commandId = _attr.command_id;
                                        return _cachedArrival;
                                    }
                                }
                            }
                        } catch(_ex) {}
                        // MÃ©thode 2 : command_overview (curator requis, fonctionne quelle que soit la ville active)
                        if (b.checkPremium("curator")) {
                            b.ajaxRequestGet("town_overviews", "command_overview", { town_id: _timingTownId, nl_init: true }, function(_bot, resp) {
                                try {
                                    var _cmds = (resp && resp.data && resp.data.commands) || [];
                                    _cmds.forEach(function(cmd) {
                                        if (_cachedArrival !== null) return;
                                        if (String(cmd.origin_town_id)      !== String(_timingTownId))   return;
                                        if (String(cmd.destination_town_id) !== String(_timingTargetId)) return;
                                        if (Math.abs(parseInt(cmd.started_at, 10) - l.startAt) > 5)     return;
                                        _cachedArrival = parseInt(cmd.arrival_at, 10);
                                        if (!l.commandId && cmd.id) l.commandId = cmd.id;
                                    });
                                } catch(_ex2) {}
                            }, "commander");
                        }
                        return null; // sera relu au prochain tick de l'interval (250ms)
                    }

                    function _cancelAndRetry(_cmdId) {
                        c("debug", "Command #{0} timing: arrival wrong, cancel & retry", l.id).send();
                        b.ajaxRequestPost("command_info", "cancel_command", { id: _cmdId, town_id: _timingTownId }, {}, "commander");
                        var _now = Timestamp.server();
                        if (_now <= _timingDeadline) {
                            l.state = j.WAIT;
                            setTimeout(function() {
                                if (l.state === j.WAIT) m.start();
                            }, 300);
                        } else {
                            c("warning", a.t("Calage non rÃ©ussi, ordre annulÃ©") + " [town]{0}[/town] â†’ [town]{1}[/town]", _timingTownId, _timingTargetId).msg(10).send();
                            o(j.ABORT, a.t("Calage non rÃ©ussi"));
                        }
                    }

                    var _timingAttempt = 0;
                    var _timingMaxAttempts = 8;
                    var _timingInterval = setInterval(function() {
                        _timingAttempt++;
                        var _realArrival = _readRealArrival();
                        if (_realArrival !== null) {
                            clearInterval(_timingInterval);
                            // VÃ©rification avec tolÃ©rance configurÃ©e par l'utilisateur
                            var _tolSec = (l.tolerance_sec !== undefined && l.tolerance_sec !== null) ? l.tolerance_sec : 0;
                            var _tolDir = l.tolerance_dir || "both";
                            var _arrivalDiff = _realArrival - _wantedArrival; // positif = en retard, nÃ©gatif = en avance
                            var _tolMin = (_tolDir === "after")  ?  0       : -_tolSec;
                            var _tolMax = (_tolDir === "before") ?  0       :  _tolSec;
                            if (_arrivalDiff >= _tolMin && _arrivalDiff <= _tolMax) {
                                c("debug", "Command #{0} timing: arrival OK ({1}, diff={2}s)", l.id, _realArrival, _arrivalDiff).send();
                                o(j.SUCCESS);
                                c("ally", b.t ? b.t("ðŸš€ Troupes parties : [town]{0}[/town] â†’ [town]{1}[/town]") : "ðŸš€ Troupes parties : [town]{0}[/town] â†’ [town]{1}[/town]", _timingTownId, _timingTargetId).msg(15);
                                if (b.sett.commander_autoremove === true) setTimeout(m.remove, 30e3);
                            } else {
                                // PrioritÃ© : commandId dÃ©jÃ  rÃ©cupÃ©rÃ© via _readRealArrival
                                if (l.commandId) {
                                    _cancelAndRetry(l.commandId);
                                    return;
                                }
                                // MÃ©thode 1 : movements_units (si ville active)
                                var _foundCmdId = null;
                                try {
                                    var col = window.layout_main_controller &&
                                              window.layout_main_controller.collections &&
                                              window.layout_main_controller.collections.movements_units;
                                    if (col && col.models) {
                                        for (var _mi2 = 0; _mi2 < col.models.length; _mi2++) {
                                            var _a2 = col.models[_mi2].attributes;
                                            if (String(_a2.home_town_id)   === String(_timingTownId) &&
                                                String(_a2.target_town_id) === String(_timingTargetId) &&
                                                Math.abs(parseInt(_a2.started_at, 10) - l.startAt) <= 5 &&
                                                _a2.command_id) {
                                                _foundCmdId = _a2.command_id;
                                                break;
                                            }
                                        }
                                    }
                                } catch(_ex2) {}
                                if (_foundCmdId) {
                                    _cancelAndRetry(_foundCmdId);
                                } else if (b.checkPremium("curator")) {
                                    // MÃ©thode 2 : command_overview (curator requis, fonctionne hors ville active)
                                    b.ajaxRequestGet("town_overviews", "command_overview", { town_id: _timingTownId, nl_init: true }, function(_bot, resp) {
                                        try {
                                            var _cmds = (resp && resp.data && resp.data.commands) || [];
                                            var _cmdId = null;
                                            _cmds.forEach(function(cmd) {
                                                if (_cmdId) return;
                                                if (String(cmd.origin_town_id)      !== String(_timingTownId))   return;
                                                if (String(cmd.destination_town_id) !== String(_timingTargetId)) return;
                                                if (!cmd.cancelable) return;
                                                if (Math.abs(parseInt(cmd.started_at, 10) - l.startAt) > 5)     return;
                                                _cmdId = cmd.id;
                                            });
                                            if (_cmdId) {
                                                _cancelAndRetry(_cmdId);
                                            } else {
                                                c("warning", a.t("Calage non rÃ©ussi") + " [town]{0}[/town] â†’ [town]{1}[/town]", _timingTownId, _timingTargetId).msg(10).send();
                                                o(j.ABORT, a.t("Calage non rÃ©ussi"));
                                            }
                                        } catch(_ex3) {
                                            c("warning", a.t("Calage non rÃ©ussi") + " [town]{0}[/town] â†’ [town]{1}[/town]", _timingTownId, _timingTargetId).msg(10).send();
                                            o(j.ABORT, a.t("Calage non rÃ©ussi"));
                                        }
                                    }, "commander");
                                } else {
                                    c("warning", a.t("Calage non rÃ©ussi") + " [town]{0}[/town] â†’ [town]{1}[/town]", _timingTownId, _timingTargetId).msg(10).send();
                                    o(j.ABORT, a.t("Calage non rÃ©ussi"));
                                }
                            }
                        } else if (_timingAttempt >= _timingMaxAttempts) {
                            clearInterval(_timingInterval);
                            c("warning", "Command #{0} timing: could not read arrival_at after {1} attempts, validating anyway", l.id, _timingMaxAttempts).send();
                            o(j.SUCCESS);
                            c("ally", b.t ? b.t("ðŸš€ Troupes parties : [town]{0}[/town] â†’ [town]{1}[/town]") : "ðŸš€ Troupes parties : [town]{0}[/town] â†’ [town]{1}[/town]", _timingTownId, _timingTargetId).msg(15);
                            if (b.sett.commander_autoremove === true) setTimeout(m.remove, 30e3);
                        }
                    }, 250);

                    return; // le reste est gÃ©rÃ© dans le callback ci-dessus
                }
                // â”€â”€ Fin calage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

                o(j.SUCCESS);
                // Notification dÃ©part des troupes
                if (l.dodge > 0 && b.sett.herald_text === true) {
                    c("ally", a.t("ðŸŒ€ Les troupes esquivent [town]{0}[/town]"), l.opts.town.id).msg(15);
                } else if (l.dodge === 0) {
                    c("ally", b.t ? b.t("ðŸš€ Troupes parties : [town]{0}[/town] â†’ [town]{1}[/town]") : "ðŸš€ Troupes parties : [town]{0}[/town] â†’ [town]{1}[/town]", l.opts.town.id, l.opts.target.id).msg(15);
                }
                // RÃ©cupÃ©rer command_id depuis movements_units pour les sorts
                if (l.spell) {
                    var _townId = l.opts.town.id;
                    var _targetId = l.opts.target.id;
                    var _arrivalAt = l.opts.time;
                    var _spellAttempt = 0;
                    var _maxAttempts = 8;


                    // Tentative immÃ©diate via movements_units (pas de rÃ©seau, instantanÃ©)
                    function _tryMovementsUnits() {
                        try {
                            var col = window.layout_main_controller &&
                                      window.layout_main_controller.collections &&
                                      window.layout_main_controller.collections.movements_units;
                            if (col && col.models) {
                                col.models.forEach(function(mv) {
                                    var attr = mv.attributes;
                                    if (!l.commandId &&
                                        String(attr.home_town_id)   === String(_townId) &&
                                        String(attr.target_town_id) === String(_targetId) &&
                                        Math.abs(attr.arrival_at - _arrivalAt) <= 11 &&
                                        attr.command_id) {
                                        l.commandId = attr.command_id;
                                    }
                                });
                            }
                        } catch(ex) {}
                        return !!l.commandId;
                    }

                    // Si trouvÃ© immÃ©diatement, on lance sans attendre
                    if (_tryMovementsUnits()) {
                        t();
                    } else {
                        // Sinon on poll toutes les 2s : movements_units d'abord, curator en fallback
                        var _spellInterval = setInterval(function() {
                            _spellAttempt++;
                            if (_tryMovementsUnits()) {
                                clearInterval(_spellInterval);
                                t();
                                return;
                            }
                            if (b.checkPremium("curator")) {
                                b.ajaxRequestGet("town_overviews", "command_overview", { town_id: _townId, nl_init: true }, function(_bot, resp) {
                                    try {
                                        if (resp && resp.data && Array.isArray(resp.data.commands)) {
                                            resp.data.commands.forEach(function(cmd) {
                                                if (!l.commandId &&
                                                    String(cmd.origin_town_id)      === String(_townId) &&
                                                    String(cmd.destination_town_id) === String(_targetId) &&
                                                    Math.abs(cmd.arrival_at - _arrivalAt) <= 11) {
                                                    l.commandId = cmd.id;
                                                }
                                            });
                                        }
                                    } catch(ex) {}
                                    if (l.commandId) {
                                        clearInterval(_spellInterval);
                                        t();
                                    } else if (_spellAttempt >= _maxAttempts) {
                                        clearInterval(_spellInterval);
                                        c("warning", "Command #{0}, impossible de trouver le commandId pour lancer le sort", l.id).msg(0).send();
                                    }
                                });
                            } else if (_spellAttempt >= _maxAttempts) {
                                clearInterval(_spellInterval);
                                c("warning", "Command #{0}, impossible de trouver le commandId pour lancer le sort", l.id).msg(0).send();
                            }
                        }, 2000);
                    }
                }
                if (b.sett.commander_autoremove === true) setTimeout(m.remove, 30e3);
                // Si c'est une esquive (dodge > 0), annuler le soutien aprÃ¨s dodge secondes pour rappeler les troupes
                if (l.dodge > 0) {
                    // Calculer l'heure de retour thÃ©orique et la comparer Ã  l'impact
                    var _retourTheorique = l.startAt + 2 * l.dodge;
                    // Note: on ne connaÃ®t pas l'heure d'impact ici, mais on peut calculer d'aprÃ¨s l.opts
                    // Compenser la latence rÃ©seau : l.t est le timestamp juste avant l'envoi,
                    // la rÃ©ponse arrive ~1s plus tard. On soustrait le temps dÃ©jÃ  Ã©coulÃ©
                    // pour que le rappel se fasse exactement dodge secondes aprÃ¨s le dÃ©part rÃ©el.
					var _elapsed = Date.now() - l.t.getTime();
					
					// Drift serveur (clÃ© du problÃ¨me)
					var _drift = l.startAt - l.opts.time;
					
					// Ajustement en ms
					var _adjust = _drift * 1000;
					
					// Nouveau dÃ©lai corrigÃ©
					var _dodgeDelay = Math.max(0, l.dodge * 1000 - _elapsed - _adjust);
                    var _townId    = l.opts.town.id;
                    var _targetId  = l.opts.target.id;
                    var _startAt   = l.startAt;
                    c("debug", "Command #{0} dodge, will recall troops in {1}s (elapsed={2}ms, town={3} target={4})", l.id, Math.round(_dodgeDelay / 1e3), _elapsed, _townId, _targetId);

                    // Rappel via requÃªte AJAX directe Ã  command_info/index.
                    // Cette approche fonctionne quelle que soit la ville active dans le jeu :
                    // on interroge le serveur avec town_id explicite, on matche par home/target/started_at,
                    // puis on envoie cancel_command avec le command_id trouvÃ©.
                    var _startAtTolerance = 2; // secondes de tolÃ©rance pour matcher le started_at

                    function _doRecallViaAjax() {
                        // â”€â”€ MÃ©thode 1 : movements_units (pas besoin du curator) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        function _recallViaMovements() {
                            var _cmdIds = [];
                            try {
                                var col = window.layout_main_controller &&
                                          window.layout_main_controller.collections &&
                                          window.layout_main_controller.collections.movements_units;
                                if (col && col.models) {
                                    col.models.forEach(function(mv) {
                                        var attr = mv.attributes;
                                        if (String(attr.home_town_id)   === String(_townId) &&
                                            String(attr.target_town_id) === String(_targetId) &&
                                            attr.command_id && _cmdIds.indexOf(attr.command_id) === -1) {
                                            var mvStartedAt = parseInt(attr.started_at, 10);
                                            if (Math.abs(mvStartedAt - _startAt) <= _startAtTolerance) {
                                                _cmdIds.push(attr.command_id);
                                            }
                                        }
                                    });
                                }
                            } catch(ex) { /* silent */ }
                            return _cmdIds;
                        }

                        // â”€â”€ MÃ©thode 2 : command_overview (curator requis) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        function _recallViaCurator() {
                            try {
                                b.ajaxRequestGet("town_overviews", "command_overview", { town_id: _townId, nl_init: true }, function(_bot, resp) {
                                    try {
                                        var _cmdIds = [];
                                        var _commands = (resp && resp.data && resp.data.commands) || [];
                                        _commands.forEach(function(cmd) {
                                            if (String(cmd.origin_town_id)      !== String(_townId))   return;
                                            if (String(cmd.destination_town_id) !== String(_targetId)) return;
                                            if (cmd.cancelable !== true) return;
                                            var mvStartedAt = parseInt(cmd.started_at, 10);
                                            if (Math.abs(mvStartedAt - _startAt) > _startAtTolerance) return;
                                            if (cmd.id && _cmdIds.indexOf(cmd.id) === -1) _cmdIds.push(cmd.id);
                                        });
                                        if (_cmdIds.length === 0) {
                                            c("debug", "Command #{0} recall [curator]: aucune commande trouvÃ©e (peut-Ãªtre dÃ©jÃ  revenue)", l.id).send();
                                            return;
                                        }
                                        c("debug", "Command #{0} recall [curator]: {1} commande(s) trouvÃ©e(s)", l.id, _cmdIds.length).send();
                                        if (b.sett.herald_text === true) c("info", a.t("[color=#4caf6e]Rappel des troupes [town]{0}[/town][/color]"), _townId).msg(10);
                                        _cmdIds.forEach(function(_cmdId) {
                                            b.ajaxRequestPost("command_info", "cancel_command", { id: _cmdId, town_id: _townId }, {}, "commander");
                                        });
                                    } catch(ex) {
                                        c("debug", "Command #{0} recall [curator] parse error: {1}", l.id, ex.toString()).send();
                                    }
                                }, "commander");
                            } catch(ex) {
                                c("debug", "Command #{0} recall [curator] error: {1}", l.id, ex.toString()).send();
                            }
                        }

                        // â”€â”€ SÃ©lection automatique de la mÃ©thode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                        try {
                            if (!b.checkPremium("curator")) {
                                // Pas de curator : fallback direct sur movements_units
                                c("debug", "Command #{0} recall: curator absent, utilisation de movements_units", l.id).send();
                                var _movIds = _recallViaMovements();
                                if (_movIds.length > 0) {
                                    c("debug", "Command #{0} recall [movements_units]: {1} commande(s) trouvÃ©e(s)", l.id, _movIds.length).send();
                                    if (b.sett.herald_text === true) c("info", a.t("[color=#4caf6e]Rappel des troupes [town]{0}[/town][/color]"), _townId).msg(10);
                                    _movIds.forEach(function(_cmdId) {
                                        b.ajaxRequestPost("command_info", "cancel_command", { id: _cmdId, town_id: _townId }, {}, "commander");
                                    });
                                } else {
                                    c("debug", "Command #{0} recall: aucune commande trouvÃ©e (movements_units vide)", l.id).send();
                                }
                            } else {
                            // Curator en prioritÃ© â€” fallback sur movements_units si curator ne trouve rien
                            b.ajaxRequestGet("town_overviews", "command_overview", { town_id: _townId, nl_init: true }, function(_bot, resp) {
                                try {
                                    var _cmdIds = [];
                                    var _commands = (resp && resp.data && resp.data.commands) || [];
                                    _commands.forEach(function(cmd) {
                                        if (String(cmd.origin_town_id)      !== String(_townId))   return;
                                        if (String(cmd.destination_town_id) !== String(_targetId)) return;
                                        if (cmd.cancelable !== true) return;
                                        var mvStartedAt = parseInt(cmd.started_at, 10);
                                        if (Math.abs(mvStartedAt - _startAt) > _startAtTolerance) return;
                                        if (cmd.id && _cmdIds.indexOf(cmd.id) === -1) _cmdIds.push(cmd.id);
                                    });
                                    if (_cmdIds.length > 0) {
                                        c("debug", "Command #{0} recall [curator]: {1} commande(s) trouvÃ©e(s)", l.id, _cmdIds.length).send();
                                        if (b.sett.herald_text === true) c("info", a.t("[color=#4caf6e]Rappel des troupes [town]{0}[/town][/color]"), _townId).msg(10);
                                        _cmdIds.forEach(function(_cmdId) {
                                            b.ajaxRequestPost("command_info", "cancel_command", { id: _cmdId, town_id: _townId }, {}, "commander");
                                        });
                                    } else {
                                        c("debug", "Command #{0} recall [curator]: aucune commande trouvÃ©e, fallback movements_units", l.id).send();
                                        var _movIds = _recallViaMovements();
                                        if (_movIds.length > 0) {
                                            c("debug", "Command #{0} recall [movements_units]: {1} commande(s) trouvÃ©e(s)", l.id, _movIds.length).send();
                                            if (b.sett.herald_text === true) c("info", a.t("[color=#4caf6e]Rappel des troupes [town]{0}[/town][/color]"), _townId).msg(10);
                                            _movIds.forEach(function(_cmdId) {
                                                b.ajaxRequestPost("command_info", "cancel_command", { id: _cmdId, town_id: _townId }, {}, "commander");
                                            });
                                        } else {
                                            c("debug", "Command #{0} recall: aucune commande trouvÃ©e (curator + movements_units)", l.id).send();
                                        }
                                    }
                                } catch(ex) {
                                    c("debug", "Command #{0} recall [curator] parse error: {1}", l.id, ex.toString()).send();
                                }
                            }, "commander");
                            } // end else (curator disponible)
                        } catch(ex) {
                            c("debug", "Command #{0} recall erreur inattendue: {1}", l.id, ex.toString()).send();
                        }
                    }

                    setTimeout(_doRecallViaAjax, _dodgeDelay);
                }
            };
            h.error = function(a, _err) {
                // Si c'est un dodge auto et qu'il reste des villes candidates, retenter avec une autre
                if (l.dodge > 0 && l.opts._dodgeFallbackAttack && l.opts._dodgeFallbackCandidates && l.opts._dodgeFallbackCandidates.length > 0) {
                    var _atk = l.opts._dodgeFallbackAttack;
                    var _remaining = l.opts._dodgeFallbackCandidates;
                    c("warning", "Command #{0} dodge failed ({1}), retrying with another town ({2} candidates left)", l.id, _err && _err.error, _remaining.length).send();
                    o(j.ABORT, _err && _err.error);
                    if (b.herald && typeof b.herald.autododge === "function") {
                        // Cloner l'attaque avec les candidats restants pour le fallback
                        var _atkFallback = Object.assign({}, _atk, { _dodgeFallbackCandidates: _remaining });
                        // Passer les candidats restants directement via le mÃ©canisme interne de herald
                        b.herald._autododgeFallback(_atkFallback, _remaining);
                    }
                    return;
                }
                // Retry sur "Pas assez d'unitÃ©s" : les troupes ne sont peut-Ãªtre pas encore revenues
                // aprÃ¨s l'annulation du calage. On rÃ©essaie toutes les 100ms tant qu'on est
                // dans la fenÃªtre de dÃ©part autorisÃ©e (heure_dÃ©part_voulue + 10s).
                // Guard : si un retry est dÃ©jÃ  planifiÃ©, on ne rentre pas en rÃ©cursion
                if (l._noUnitsRetryPending) return;
                var _errMsg = (_err && _err.error) ? _err.error : "";
                var _httpStatus = (_err && _err.status) ? _err.status : 0;
                var _isNoUnits = _errMsg.toLowerCase().indexOf("assez") !== -1 ||
                                 _errMsg.toLowerCase().indexOf("units") !== -1 ||
                                 _errMsg.toLowerCase().indexOf("unit") !== -1 ||
                                 _errMsg.toLowerCase().indexOf("enough") !== -1;
                // 429 Too Many Requests : on attend 500ms puis on retente comme "no units"
                var _isRateLimit = (_httpStatus === 429) || _errMsg.toLowerCase().indexOf("many") !== -1;
                if (_isNoUnits || _isRateLimit) {
                    // _timingDeadline = heure_dÃ©part_voulue + 10s (mÃªme calcul que dans h.success)
                    var _deadline = (l.opts.time - l.opts.duration) + 10;
                    var _now = Timestamp.server();
                    if (_now <= _deadline) {
                        var _delay = 300;
                        c("debug", "Command #{0} {1}, retrying in {2}ms (deadline in {3}s)...", l.id, _isRateLimit ? "rate limited" : "not enough units", _delay, Math.round(_deadline - _now)).send();
                        l._noUnitsRetryPending = true;
                        setTimeout(function() {
                            l._noUnitsRetryPending = false;
                            if ([j.WAIT, j.RESTART].indexOf(l.state) < 0) return; // Ã©tat changÃ© entretemps
                            delete l.commandId;
                            l.t = new Date();
                            g("town_info", "send_units", e, h);
                        }, _delay);
                        return;
                    }
                    // FenÃªtre expirÃ©e : on affiche l'erreur calage, pas l'erreur serveur
                    c("warning", a.t("Calage non rÃ©ussi, ordre annulÃ©") + " [town]{0}[/town] â†’ [town]{1}[/town]", l.opts.town.id, l.opts.target.id).msg(10).send();
                    o(j.ABORT, a.t("Calage non rÃ©ussi"));
                    return;
                }
                o(j.ERROR, _errMsg || _err.error);
                c("error", "Start command #{0} failed: {1}", l.id, _err && _err.error).send();
            };
            delete l.commandId;
            l.t = new Date();
            g("town_info", "send_units", e, h);
        };
        Object.defineProperties(this, {
            "action": {
                get: function() { return l.action; }
            },
            "strategy": {
                get: function() { return l.opts && l.opts.strategy ? l.opts.strategy : ""; }
            },
            "notify": {
                get: function() { return l.notify === true || (l.opts && l.opts.notify === true); }
            },
            "html": {
                get: function() {
                    return i.html(l.opts);
                }
            },
            "state": {
                get: function() {
                    return l.state;
                }
            },
            "id": {
                get: function() {
                    return l.id;
                }
            },
            "town": {
                get: function() {
                    return {
                        id: l.opts.town.id,
                        name: l.opts.town.name
                    };
                }
            },
            "target": {
                get: function() {
                    var a = ITowns.getTown(l.opts.target.id);
                    return {
                        id: l.opts.target.id,
                        name: l.opts.target.name
                    };
                }
            },
            "startAt": {
                get: function() {
                    return l.window.start;
                }
            },
            "dodge": {
                get: function() { return l.dodge; }
            },
            "arrivalAt": {
                get: function() {
                    return (l.dodge === 0) ? l.opts.time : l.opts.time + l.dodge;
                }
            },
            "time": {
                get: function() {
                    return l.opts.time;
                }
            },
            "commandId": {
                get: function() {
                    return isNumber(l.commandId) ? l.commandId : -1;
                }
            },
            "status": {
                get: function() {
                    switch (l.state) {
                        case j.ABORT:
                        case j.ERROR:
                            return l.status;
                        case j.SUCCESS:
                            return l.startAt ? a.format(a.t("envoyÃ© Ã  {0}"), a.ts2text(l.startAt)) : "";
                        case j.START:
                            return a.format("started at: {0}, arrival at: {1}", a.ts2text(l.startAt), a.ts2text(l.arrivalAt || l.opts.time));
                        case j.CANCEL:
                            return a.format("started at: {0}, returned at: {1}", a.ts2text(l.startAt), a.ts2text(l.returnAt));
                        case j.WAIT:
                            return a.format(a.t("dÃ©part {0} â€” arrivÃ©e {1}"), a.ts2text(l.window.start), a.ts2text(l.opts.time));
                        default:
                            return "";
                    }
                }
            }
        });

        function s(a) {
            // Annule la commande en transit (rappel de troupes)
            // Utilise cmbFetch pour trouver la commande puis cancelCommand
            var _onSuccess = typeof a === "function" ? a : function() {};
            var _callbacks = {
                success: function(cmd) {
                    r(function(cmd) {
                        o(j.CANCEL);
                        l.returnAt = cmd.arrival_at;
                        c("info", d.msg01, l.id, b.ts2text(l.returnAt)).msg(10).send();
                        _onSuccess(m);
                    });
                },
                error: function(err) {
                    o(j.ERROR, err.error);
                    c("error", d.msg02, l.id, err.error).msg(0).send();
                }
            };
            b.runAtTown(l.opts.town.id, function() {
                c("info", "Send 'cancel' request for attack #{0} (new)", l.id);
                GrepoApiHelper.execute.call(this, "Commands", "cancelCommand", { id: l.commandId }, _callbacks);
            });
        }

        function t(a) {
            var sid = l.spell;
            c("debug", "[Spell t()] spell={0} commandId={1}", sid, l.commandId).send();
            if (!sid) {
                console.warn("[Spell t()] aucun sort a lancer");
                return;
            }
            if (!l.commandId) {
                console.warn("[Spell t()] commandId manquant - sort annule");
                c("debug", "[Spell t()] commandId manquant - sort annule").send();
                return;
            }
            var _gods = b.models.PlayerGods[Game.player_id];
            var _favor = _gods ? _gods.getCurrentFavorForGods() : {};
            var d = GameData.powers[sid];
            if (!d) {
                console.warn("[Spell t()] sort inconnu:", sid);
                c("debug", "[Spell t()] sort inconnu: {0}", sid).send();
                return;
            }
            if (!(d.god_id in _favor) || (d.favor > _favor[d.god_id])) {
                c("warning", "Command #{0}, faveur insuffisante pour le sort '{1}'", l.id, d.name).msg(10);
                return;
            }
            c("debug", "[Spell t()] cast command_id={0} power_id={1}", l.commandId, sid).send();
            b.runAtTown(l.opts.town.id, function() {
                GrepoApiHelper.execute.call(this, "Commands", "cast", { id: l.commandId, power_id: sid }, {
                    success: function() {
                        c("info", "Command #{0}, sort {1} lance", l.id, d.name).msg(10);
                        if (typeof a === "function") a(m);
                    },
                    error: function(err) {
                        console.error("[Spell t()] cast FAILED:", sid, err && err.error);
                        c("error", "Command #{0} cast spell '{1}' failed: {2}", l.id, sid, err && err.error).msg(0).send();
                    }
                });
            });
        }
        this.serialize = function() {
            return {
                id:       l.id,
                state:    l.state,
                opts:     l.opts,
                action:   l.action,
                accuracy: l.accuracy,
                dodge:    l.dodge,
                spell:    l.spell || null,
                hero:     l.hero
            };
        };
        this.setSpell = function(spellId) {
            l.spell = (spellId && spellId !== "disabled" && (spellId in GameData.powers)) ? spellId : null;
            if (b.friends && typeof b.friends._pushShared === "function") b.friends._pushShared();
        };
        // Compat multi-sort (legacy)
        this.setSpells = function(spellsArr) { m.setSpell(Array.isArray(spellsArr) ? spellsArr[0] : spellsArr); };
        Object.defineProperty(this, "spell",  { get: function() { return l.spell || null; } });
        Object.defineProperty(this, "spells", { get: function() { return l.spell ? [l.spell] : []; } });
        this.remove = function() {
            var _prevState = l.state; // capturer avant de passer Ã  DELETE
            l.state = j.DELETE;
            clearTimeout(l.startTimer);
            clearTimeout(l.emulateTimer);
            clearTimeout(l.correctTimer);
            clearTimeout(l.blockUiTimer);
            clearTimeout(l.notifyTimer);
            b.request("commander:delete", {
                id: l.id
            }, function(a) {
                // Pas de notification Ã  la suppression
            });
            // Partager la suppression immÃ©diatement (sans debounce) pour que
            // friends.json soit mis Ã  jour avant un Ã©ventuel refresh
            if (b.friends && typeof b.friends._pushShared === "function") {
                b.friends._pushShared(true);
            }
        };
        this.cancel = function() {
            m.remove();
        };
        p();
        if (e.save !== false) n();
        // La notification en bas Ã  droite n'est envoyÃ©e que si notify:true (cochÃ©e dans le menu de planification)
        // Elle se dÃ©clenche ~10s avant l'envoi des troupes, pas Ã  la crÃ©ation de l'ordre
    }
    Object.defineProperty(i, "RANDOM", {
        get: function() {
            return 10;
        }
    });
    // Emojis par unitÃ©
    // RÃ©cupÃ¨re player_name depuis WMap.mapData (sans ouvrir de fenÃªtre)
    function _getPlayerName(townId) {
        if (!townId) return "";
        try {
            var t = WMap.mapData.getTown(townId);
            if (t && t.player_name) return t.player_name;
        } catch(e) {}
        return "";
    }

    var _unitEmoji = {
        militia:"ðŸ—¡ï¸", sword:"âš”ï¸", slinger:"ðŸªƒ", archer:"ðŸ¹", hoplite:"ðŸ›¡ï¸", rider:"ðŸ´", chariot:"ðŸª–", catapult:"ðŸ’£",
        centaur:"ðŸŽ", pegasus:"ðŸ¦…", godsent:"âš¡", harpy:"ðŸ¦…", medusa:"ðŸ", cyclop:"ðŸ‘ï¸", zyklop:"ðŸ‘¹",
        manticore:"ðŸ¦‚", cerberus:"ðŸ•", fury:"ðŸ˜ˆ", griffin:"ðŸ¦…", calydonian_boar:"ðŸ—", satyr:"ðŸ", spartoi:"âš”ï¸", ladon:"ðŸ²",
        big_transporter:"ðŸš¢", small_transporter:"â›µ", bireme:"ðŸš¤", trireme:"â›µ", attack_ship:"âš“",
        demolition_ship:"ðŸ’¥", colonize_ship:"ðŸ›ï¸", sea_monster:"ðŸ¦‘", minotaur:"ðŸ‚", siren:"ðŸ§œâ€â™€ï¸"
    };
    i.html = function(c) {
        if (!c || !c.town || !c.target) return "Commandement";
        var _actionLabel, _actionColor;
        if (c.action === "support") { _actionLabel = a.t ? a.t("Support") : "Support"; _actionColor = "#4caf6e"; }
        else if (c.strategy === "found") { _actionLabel = a.t ? a.t("Colonisation") : "Colonisation"; _actionColor = "#c9a84c"; }
        else if (c.dodge > 0) { _actionLabel = a.t ? a.t("Esquive") : "Esquive"; _actionColor = "#5b8dd9"; }
        else { _actionLabel = a.t ? a.t("Attaque") : "Attaque"; _actionColor = "#e05555"; }
        // GÃ©nÃ©rer des liens cliquables directement via btoa(JSON) â€” fonctionne mÃªme sans coordonnÃ©es d'Ã®le
        function _townLink(townObj, isTarget) {
            try {
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
            var playerPart = _playerSuffix(townObj.id, townObj.player_name, townObj.player_id);
            var tObj = ITowns.getTown(townObj.id);
            var townLink;
            if (tObj && typeof tObj.getLinkFragment === "function") {
                townLink = "<a class='gp_town_link' href='#" + tObj.getLinkFragment() + "'>" + (tObj.name || townObj.name) + "</a>";
            } else {
                // btoa ne supporte pas l'Unicode â€” encoder en UTF-8 d'abord via unescape+encodeURIComponent
                var _townName = townObj.name || String(townObj.id);
                var _townId   = townObj.id;
                var fragment;
                try {
                    var jsonStr = JSON.stringify({ id: _townId, name: _townName });
                    fragment = btoa(unescape(encodeURIComponent(jsonStr)));
                } catch(e) {
                    // Fallback : utiliser uniquement l'id numerique, toujours safe pour btoa
                    fragment = btoa(JSON.stringify({ id: _townId, name: "" + _townId }));
                }
                townLink = "<a class='gp_town_link' href='#" + fragment + "'>" + _townName + "</a>";
            }
            return isTarget ? townLink + playerPart : playerPart + townLink;
            } catch(e) { return townObj && townObj.name ? townObj.name : "?"; }
        }
        var _from = _townLink(c.town, false);
        var _to = _townLink(c.target, true);
        var g = "<span style='color:" + _actionColor + ";font-weight:700;'>" + _actionLabel + "</span>";
        g += " " + _from + " &rArr; " + _to;
        if (c.notify === true) g += "";
        var k = [];
        if (c.units) c.units.forEach(function(a) {
            var emoji = _unitEmoji[a.id] || "âš”ï¸";
            var unitName = (GameData.units[a.id] && GameData.units[a.id].name) ? GameData.units[a.id].name : a.id;
            k.push(emoji + " " + a.count + " " + unitName);
        });
        if ("hero" in c && GameData.heroes && GameData.heroes[c.hero]) k.push(GameData.heroes[c.hero].name);
        g += "<br/>" + k.join(", ");
        return g;
    };
    a.Command = i;
    var j = [];

    // Construit un tableau plat d'objets lisibles par Angular depuis j[]
    function _buildOrdersList() {
        return j
            .filter(function(cmd) { return cmd.state !== "delete"; })
            .map(function(cmd) {
                var _s = cmd.serialize ? cmd.serialize() : {};
                var _opts = _s.opts || {};
                var _targetTown = _opts.target && _opts.target.id ? WMap.mapData.getTown(_opts.target.id) : null;
                var targetPlayerName = (_opts.target && _opts.target.player_name)
                    || (_targetTown && _targetTown.player_name)
                    || "";
                return {
                    id: cmd.id,
                    html: cmd.html,
                    state: cmd.state,
                    status: cmd.status,
                    startAt: cmd.startAt,
                    arrivalAt: cmd.arrivalAt,
                    action: cmd.action,
                    strategy: cmd.strategy,
                    dodge: cmd.dodge || 0,
                    external: false,
                    notify: cmd.notify === true || !!_opts.notify,
                    order_timing:  !!_opts.order_timing,
                    tolerance_sec: _opts.tolerance_sec !== undefined ? _opts.tolerance_sec : 0,
                    tolerance_dir: _opts.tolerance_dir || "both",
                    town: { name: cmd.town ? cmd.town.name : "" },
                    target: { name: cmd.target ? cmd.target.name : "", player_name: targetPlayerName },
                    _cmd: cmd
                };
            });
    }

    // Reconstruit c.data.orders et force le rendu Angular
    function _refreshOrders() {
        var _cs = b.commander && b.commander._ctrlScope;
        // Si autoremove activÃ©, supprimer immÃ©diatement les ordres success/delete de j[]
        if (b.sett && b.sett.commander_autoremove === true) {
            for (var _i = j.length - 1; _i >= 0; _i--) {
                if (j[_i] && (j[_i].state === "success" || j[_i].state === "delete")) {
                    j.splice(_i, 1);
                }
            }
        }
        if (!_cs || !_cs.data) return;
        var built = _buildOrdersList();
        if (!_cs.$$phase && !_cs.$root.$$phase) {
            _cs.$apply(function() { _cs.data.orders = built; });
        } else {
            _cs.data.orders = built;
        }
    }

    function k() {
        var c, d = null,
            e = false;

        function f(opts) {
            // Snapshot des options globales au moment de la crÃ©ation â€” chaque ordre porte sa propre valeur
            opts.order_timing = (b.sett.commander_order_timing === true);
            var cmd = new a.Command(opts);
            if (opts.town && opts.town.id) a.towns.update({ id: opts.town.id, name: opts.town.name });
            if (opts.target && opts.target.id) a.towns.update({ id: opts.target.id, name: opts.target.name });
            j.push(cmd);
            _refreshOrders();
        }

        function g(a) {
            return j.find(function(b) {
                return (b.commandId != -1) && (b.commandId == a);
            });
        }

        function h(c) {
            // Ancien systÃ¨me commander:poll dÃ©sactivÃ© â€” partage via systÃ¨me Amis VPS
            if (typeof c === "function") c([]);
        }

        function i() {
            if (e) return;
            c = l();
            c.draggable({
                cancel: ".scrollbox, .order, .filters, input, textarea"
            });
            b.windows.open("orders", c);
            e = true;
            // RafraÃ®chissement automatique toutes les 10s pour retirer les ordres pÃ©rimÃ©s
            b.commander._refreshTimer = setInterval(function() {
                var _cs = b.commander._ctrlScope;
                if (_cs && _cs.reload) { try { _cs.reload(); } catch(ex) {} }
            }, 10000);
        }

        function k() {
            if (!e) return;
            b.windows.close("orders");
            e = false;
            // ArrÃªter le timer de rafraÃ®chissement
            if (b.commander._refreshTimer) {
                clearInterval(b.commander._refreshTimer);
                b.commander._refreshTimer = null;
            }
        }

        function l() {
            var c = b.templates.orders,
                d = $(c);
            b.ngApp.controller("commanderOrdersController", ["$scope", function(c) {
            c.t      = function(str) { return a.t ? a.t(str) : str; };
            c.format = function() { return a.format ? a.format.apply(a, arguments) : arguments[0]; };
            c.ts2text = function(ts) { return a.ts2text ? a.ts2text(ts) : ts; };
            c._lang = a.detectLang ? a.detectLang() : 'fr';

                c.data = {
                    orders: [],
                    filter: "own",
                    actionFilter: "all",
                    search: "",
                    sort: "arrivalAt",
                    predicate: "arrivalAt"
                };
                b.commander._ctrlScope = c;
                c.devMode = function() { return !!(b.sett && b.sett.dev_mode) || window._gp_devmode === true; };
                c.close = k;

                c.filterTowns = function(order) {
                    var a = c.data.search.toLowerCase().replace(/^\s+|\s+$/g, "");
                    if (a.length < 1) return true;
                    var names = [];
                    // Noms de villes
                    if (order.town && order.town.name)     names.push(order.town.name);
                    if (order.target && order.target.name) names.push(order.target.name);
                    // Joueur ami (ordres partagÃ©s via friends)
                    if (order.player) names.push(order.player);
                    // player_name sur target (rempli par _buildOrdersList)
                    if (order.target && order.target.player_name) names.push(order.target.player_name);
                    // Extraire data-player-name depuis le HTML rendu (source la plus fiable)
                    if (order.html) {
                        var _matches = order.html.match(/data-player-name='([^']+)'/g) || [];
                        _matches.forEach(function(m) {
                            var _n = m.replace("data-player-name='", "").replace("'", "");
                            if (_n) names.push(_n);
                        });
                    }
                    return names.some(function(n) {
                        return n && n.toLowerCase().indexOf(a) >= 0;
                    });
                };

                c.timingLabel = function(order) {
                    if (!order || !order.order_timing) return "";
                    var sec = order.tolerance_sec !== undefined ? order.tolerance_sec : 0;
                    var dir = order.tolerance_dir || "both";
                    if (dir === "before") return "â± â‰¤" + sec + "s " + c.t("Avant");
                    if (dir === "after")  return "â± â‰¤" + sec + "s " + c.t("AprÃ¨s");
                    return "â± Â±" + sec + "s";
                };

                c.filterOrders = function(order) {
                    if (!order) return true;
                    if (order.state === "delete") return false;
                    // Masquer les auto-esquives
                    var _dodge = order.dodge || (order._cmd && order._cmd.dodge) || 0;
                    if (_dodge > 0) return false;
                    // Filtre par type (ami/moi)
                    if (c.data.filter === "own" && order.external) return false;
                    if (c.data.filter === "external" && !order.external) return false;
                    // Filtre par action
                    if (c.data.actionFilter !== "all") {
                        var action   = order.action || (order._cmd && order._cmd.action) || "";
                        var strategy = order.strategy || (order._cmd && order._cmd.opts && order._cmd.opts.strategy) || "";
                        var isColony  = (strategy === "found") ||
                            (!!(order._cmd && order._cmd.opts && order._cmd.opts.units && order._cmd.opts.units.some(function(u) { return u.id === "colonize_ship"; })));
                        var isSupport = (action === "support");
                        if (c.data.actionFilter === "attack"  && (isSupport || isColony)) return false;
                        if (c.data.actionFilter === "support" && !isSupport) return false;
                        if (c.data.actionFilter === "colony"  && !isColony) return false;
                    }
                    return true;
                };

                // Filtre pour les pastilles : sans le filtre ami/moi pour que le badge
                // "Amis" soit visible mÃªme quand l'onglet actif est "Mes ordres"
                c.filterBadge = function(order) {
                    if (!order) return true;
                    if (order.state === "delete") return false;
                    var _dodge = order.dodge || (order._cmd && order._cmd.dodge) || 0;
                    if (_dodge > 0) return false;
                    return true;
                };

                c.reload = function() {
                    var ownOrders = _buildOrdersList();
                    c.data.orders = ownOrders;

                    // Ajouter les ordres des amis
                    var friendOrders = [];
                    var _now = Timestamp.server();
                    if (b.commander._friendOrders) {
                        Object.keys(b.commander._friendOrders).forEach(function(name) {
                            var entry   = b.commander._friendOrders[name];
                            var ordList = Array.isArray(entry) ? entry : (entry.orders || []);
                            var pid     = Array.isArray(entry) ? "" : (entry.playerId || "");
                            ordList.forEach(function(o) {
                                if (o.state === "delete") return;
                                // Calculer startAt/arrivalAt depuis opts (non prÃ©sents dans serialize)
                                var arrivalAt = o.opts && o.opts.time ? o.opts.time : 0;
                                var departAt  = (arrivalAt && o.opts && o.opts.duration) ? arrivalAt - o.opts.duration : arrivalAt;
                                // Marquer cancelled_offline si le dÃ©part est passÃ© depuis > 10s sans succÃ¨s
                                if (departAt > 0 && departAt < _now && o.state !== "success") {
                                    if ((_now - departAt) > 10) {
                                        o.state = "cancelled_offline";
                                    }
                                }
                                friendOrders.push(Object.assign({}, o, {
                                    external:  true,
                                    player:    name,
                                    playerId:  pid,
                                    startAt:   departAt,
                                    arrivalAt: arrivalAt,
                                    html:      o.html || a.Command.html(Object.assign({}, o.opts, { action: o.action, dodge: o.dodge || 0 }))
                                }));
                            });
                        });
                    }

                    h(function(sharedOrders) {
                        var shared = sharedOrders.map(function(b) {
                            return {
                                player: b.player,
                                html: a.Command.html(b),
                                state: b.state,
                                status: b.status,
                                external: true,
                                town: { name: b.town.name },
                                target: { name: b.target.name }
                            };
                        });
                        if (c.$$phase || c.$root.$$phase) {
                            c.data.orders = ownOrders.concat(shared).concat(friendOrders);
                        } else {
                            c.$apply(function() {
                                c.data.orders = ownOrders.concat(shared).concat(friendOrders);
                            });
                        }
                    });
                };

                try { c.reload(); } catch(e) { c.data.orders = []; }

                c.sort = function(a) {
                    c.data.sort = a;
                    if (a === "state") {
                        // Tri par statut : success en premier, puis les autres
                        c.data.predicate = function(order) {
                            var order_map = { "success": 0, "cancel": 1, "error": 2, "abort": 3, "start": 4, "wait": 5 };
                            return order_map[order.state] !== undefined ? order_map[order.state] : 6;
                        };
                        return;
                    }
                    var b = "-" + a, d;
                    switch (c.data.predicate) {
                        case a: d = b; break;
                        case b: d = a; break;
                        default: d = a;
                    }
                    c.data.predicate = d;
                };

                c.remove = function(order) {
                    if (order && order.external) {
                        // MÃ©moriser dans _dismissedOrders (persistÃ© sur VPS) pour survivre au refresh
                        // ClÃ© composite "friend_nomAmi_id" pour Ã©viter collision avec ses propres ordres
                        if (!b.commander._dismissedOrders) b.commander._dismissedOrders = {};
                        var _dismissKey = order.player ? "friend_" + order.player + "_" + order.id + "_" + (order.opts && order.opts.time ? order.opts.time : "") : order.id;
                        b.commander._dismissedOrders[_dismissKey] = Timestamp.server() + 3 * 24 * 3600;
                        // Retirer aussi de _friendOrders en mÃ©moire pour effet immÃ©diat
                        var playerName = order.player;
                        if (playerName && b.commander._friendOrders && b.commander._friendOrders[playerName]) {
                            var entry = b.commander._friendOrders[playerName];
                            var list  = Array.isArray(entry) ? entry : (entry.orders || []);
                            var filtered = list.filter(function(o) { return o.id !== order.id; });
                            if (Array.isArray(entry)) {
                                b.commander._friendOrders[playerName] = filtered;
                            } else {
                                entry.orders = filtered;
                            }
                        }
                        if (b.friends && typeof b.friends._pushShared === "function") {
                            b.friends._pushShared();
                        }
                    } else if (order && order._cmd) {
                        order._cmd.cancel();
                    }
                    var idx = c.data.orders.indexOf(order);
                    if (idx > -1) c.data.orders.splice(idx, 1);
                };

                c.test = function() {
                    var types = [
                        {label: a.t("Attaque"),      color: "#e05555", action: "attack", strategy: "attack"},
                        {label: a.t("Support"),      color: "#4caf6e", action: "support", strategy: "support"},
                        {label: a.t("Attaque"),      color: "#e05555", action: "attack", strategy: "attack"},
                        {label: a.t("Colonisation"), color: "#f0d080", action: "attack", strategy: "found"},
                        {label: a.t("Support"),      color: "#4caf6e", action: "support", strategy: "support"},
                        {label: a.t("Attaque"),      color: "#e05555", action: "attack", strategy: "attack"},
                        {label: a.t("Support"),      color: "#4caf6e", action: "support", strategy: "support"},
                        {label: a.t("Attaque"),      color: "#e05555", action: "attack", strategy: "attack"},
                        {label: a.t("Colonisation"), color: "#f0d080", action: "attack", strategy: "found"},
                        {label: "Support",      color: "#4caf6e", action: "support", strategy: "support"}
                    ];
                    var towns = ["AthÃ©na","Sparte","Corinthe","Argos","ThÃ¨bes","MycÃ¨nes","Olympie","Delphes","Rhodes","Cnossos"];
                    var units = ["âš”ï¸ 50 Hoplites, ðŸ¹ 10 Archers","âš”ï¸ 30 Ã‰pÃ©istes, ðŸ´ 20 Cavaliers",
                        "ðŸ¹ 100 Archers, â›µ 5 TriÃ¨res","âš”ï¸ 80 Hoplites, â›µ 1 CS",
                        "ðŸ´ 40 Cavaliers, ðŸ¹ 15 Archers","âš”ï¸ 60 Hoplites, âš”ï¸ 30 Ã‰pÃ©istes",
                        "â›µ 20 BirÃ¨mes, â›µ 10 TriÃ¨res","ðŸ¹ 50 Archers, ðŸ´ 25 Cavaliers",
                        "âš”ï¸ 90 Hoplites, â›µ 2 CS","âš”ï¸ 35 Ã‰pÃ©istes, ðŸ¹ 35 Archers"];
                    var fakeOrders = [], now = Date.now();
                    for (var i = 0; i < 10; i++) {
                        var t = types[i], from = towns[i], to = towns[(i+3)%10];
                        var fo = {
                            id: "demo-" + now + "-" + i,
                            html: "<span style=\'color:" + t.color + ";font-weight:700;\'>" + t.label + "</span> <strong>" + from + "</strong> &rArr; <strong>" + to + "</strong> &mdash; " + units[i],
                            state: ["wait","wait","start"][i%3],
                            status: "Ordre de test â€” disparaÃ®t dans 5s",
                            action: t.action,
                            strategy: t.strategy,
                            player: null, external: false,
                            town: { name: from }, target: { name: to }
                        };
                        fakeOrders.push(fo);
                        c.data.orders.unshift(fo);
                    }
                    setTimeout(function() {
                        c.$apply(function() {
                            fakeOrders.forEach(function(fo) {
                                var idx = c.data.orders.indexOf(fo);
                                if (idx > -1) c.data.orders.splice(idx, 1);
                            });
                        });
                    }, 5000);
                };

                // Infobulle sort
                c.spellTooltipHtml = function(sid) {
                    try {
                        var _p = GameData.powers[sid];
                        if (!_p) return sid;
                        return '<strong>' + _p.name + '</strong>'
                            + (_p.description ? '<br><span style=&quot;color:#a09070;font-size:10px;&quot;>' + _p.description + '</span>' : '')
                            + '<br><span style=&quot;color:#c9a84c;font-size:10px;&quot;>' + (a.t ? a.t('Faveur') : 'Faveur') + ' : ' + (_p.favor || 0) + '</span>';
                    } catch(e) { return sid; }
                };
                c.spellName = function(sid) {
                    try { return (GameData.powers[sid] && GameData.powers[sid].name) || ''; } catch(e) { return ''; }
                };

                // Panel sort jQuery pour Ã©dition d'un ordre existant
                c.openOrderSpellPanel = function(order, evt) {
                    if (evt) { evt.stopPropagation(); evt.preventDefault(); }
                    // Toggle
                    if ($('#gfb-spell-panel').data('order-id') === order.id) { $('#gfb-spell-panel').remove(); return; }
                    $('#gfb-spell-panel').remove();
                    var _gods = b.models.PlayerGods[Game.player_id];
                    var _favor = _gods ? _gods.getCurrentFavorForGods() : {};
                    var _spells = [];
                    for (var _pid in GameData.powers) {
                        var _p = GameData.powers[_pid];
                        if (!_p || !Array.isArray(_p.targets) || _p.targets.indexOf("target_command") < 0) continue;
                        _spells.push({ id: _p.id || _pid, name: _p.name, desc: _p.description || "", favor: _p.favor || 0, god_id: _p.god_id || "", available: (_favor[_p.god_id] || 0) >= (_p.favor || 0) });
                    }
                    var _FAVOR_ICON = '<span class="gfb-favor-icon" style="display:inline-block;"></span>';
                    var _godsSeen = {}, _godsWithFavor = [];
                    _spells.forEach(function(sp) { if (sp.god_id && !_godsSeen[sp.god_id]) { _godsSeen[sp.god_id] = true; _godsWithFavor.push(sp.god_id); } });
                    var _godBar = _godsWithFavor.map(function(gid) {
                        var _f = Math.floor(_favor[gid] || 0);
                        var _gdata = GameData.gods && GameData.gods[gid];
                        var _gname = _gdata ? _gdata.name : gid;
                        var _tt = ('<strong>' + _gname + '</strong>' + (_gdata && _gdata.topic ? '<br><span style=&quot;color:#a09070;font-size:10px;&quot;>' + _gdata.topic + '</span>' : '')).replace(/"/g, '&quot;');
                        return '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">'
                            + '<div style="font-size:6pt;color:#a09070;line-height:1;white-space:nowrap;">' + _gname + '</div>'
                            + '<div class="hw-god-chip" data-tooltip-html="' + _tt + '">'
                            + '<div style="width:16px;height:16px;overflow:hidden;border-radius:2px;"><div class="god_mini ' + gid + '" style="width:62px;height:62px;transform:scale(0.258);transform-origin:top left;"></div></div>'
                            + '<div style="display:flex;align-items:center;gap:1px;">' + _FAVOR_ICON
                            + '<span style="font-size:6pt;font-weight:700;color:' + (_f > 0 ? '#c9a84c' : '#7a6e5a') + ';">' + _f + '</span></div></div></div>';
                    }).join('');
                    var _currentSpell = (order._cmd && order._cmd.spell) || "disabled";
                    var _selectedId = _currentSpell !== "disabled" ? _currentSpell : null;
                    var _cards = '';
                    _spells.forEach(function(sp) {
                        var _isSel = (_selectedId === sp.id) ? ' hw-spell-card-sel' : '';
                        var _lowFavor = sp.available ? '' : ' hw-spell-low-favor';
                        var _tt = ('<strong>' + sp.name + '</strong>' + (sp.desc ? '<br><span style=&quot;color:#a09070;font-size:10px;&quot;>' + sp.desc + '</span>' : '') + '<br><span style=&quot;color:#c9a84c;font-size:10px;&quot;>' + (a.t ? a.t('Faveur') : 'Faveur') + ' : ' + sp.favor + '</span>').replace(/"/g, '&quot;');
                        _cards += '<div class="hw-spell-card' + _lowFavor + _isSel + '" data-spell-id="' + sp.id + '" data-tooltip-html="' + _tt + '" style="cursor:pointer;">'
                            + '<span class="power_icon16x16 ' + sp.id + '" style="display:inline-block;width:16px;height:16px;"></span>'
                            + '<div class="hw-spell-card-name">' + sp.name + '</div>'
                            + '<div class="hw-spell-card-favor">' + _FAVOR_ICON + '<span>' + sp.favor + '</span></div></div>';
                    });
                    var _panel = $('<div id="gfb-spell-panel" class="hw-spell-panel">'
                        + '<div class="hw-spell-panel-title"><span class="gfb-favor-icon" style="display:inline-block;margin-right:4px;"></span>' + (a.t ? a.t("Sort divin") : "Sort divin") + '</div>'
                        + '<div class="hw-gods-recap">' + _godBar + '</div>'
                        + '<div class="hw-spell-grid">' + _cards + '</div>'
                        + '<div class="hw-spell-panel-actions"><button class="hw-spell-cast-btn">' + (a.t ? a.t("Valider") : "Valider") + '</button><button class="hw-spell-cancel-btn">' + (a.t ? a.t("Annuler") : "Annuler") + '</button></div>'
                        + '</div>').data('order-id', order.id);
                    var _selected = _selectedId;
                    _panel.on('click', '.hw-spell-card', function() {
                        var _id = $(this).data('spell-id');
                        _panel.find('.hw-spell-card').removeClass('hw-spell-card-sel');
                        if (_selected === _id) {
                            _selected = null; // dÃ©sÃ©lectionner si dÃ©jÃ  sÃ©lectionnÃ©
                        } else {
                            _selected = _id;
                            $(this).addClass('hw-spell-card-sel');
                        }
                    });
                    _panel.on('click', '.hw-spell-cast-btn', function() {
                        if (order._cmd && typeof order._cmd.setSpell === 'function') {
                            order._cmd.setSpell(_selected);
                            try { c.$apply(function() {}); } catch(e) {}
                        }
                        _panel.remove();
                    });
                    _panel.on('click', '.hw-spell-cancel-btn', function() { _panel.remove(); });
                    // Positionner en fixed par rapport au bouton â€” mÃªme logique que herald
                    _panel.css({ position: 'fixed', visibility: 'hidden', 'z-index': 999999, 'max-width': '380px' });
                    $('body').append(_panel);
                    var _btnEl = $(evt && evt.target).closest('.hw-spell-btn, [ng-click*="SpellPanel"]');
                    var _btnNode = _btnEl[0];
                    if (_btnNode) {
                        var _rect = _btnNode.getBoundingClientRect();
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
                        _panel.css({ visibility: 'visible' });
                    }
                    // Fermer sur clic extÃ©rieur
                    setTimeout(function() {
                        $(document).on('click.ordspellpanel', function(e) {
                            if (!$(e.target).closest('#gfb-spell-panel').length) {
                                _panel.remove();
                                $(document).off('click.ordspellpanel');
                            }
                        });
                    }, 100);
                };
            }]);
            angular.bootstrap(d, ["bot"]);
            return d;
        }
                Object.defineProperties(this, {
            "control": {
                get: function() {
                    return d;
                }
            },
            "visible": {
                get: function() {
                    return e;
                }
            }
        });
        this.show = i;
        this.hide = k;
        this.find = g;
        this.create = f;
        this.getOrders = function() { return j; }; // accÃ¨s externe pour _pushShared
        return this;
    }(function() {
        if (!document.getElementById("gfb-favor-style")) {
            var _favorCdnUrl = 'https://gpfr.innogamescdn.com/images/game/autogenerated/resources/resources_size30_e5ca7d1.png';
            var _favorVpsUrl = 'https://grepoplus.duckdns.org/bot/assets/autogenerated/resources/resources_size30.png';
            function _applyFavorStyle(url) {
                var _css = ".gfb-favor-icon{display:inline-block;width:14px;height:14px;flex-shrink:0;vertical-align:middle;background-image:url('" + url + "');background-position:0px -28px;background-size:56px auto;background-repeat:no-repeat;}";
                $("<style>").attr("id","gfb-favor-style").text(_css).appendTo("head");
            }
            if (typeof window._grepoBotResolveSprite === 'function') {
                window._grepoBotResolveSprite(_favorCdnUrl, _favorVpsUrl, _applyFavorStyle);
            } else {
                _applyFavorStyle(_favorCdnUrl);
            }
        }
        var d = [];
        for (var e in GameData.powers) {
            var f = GameData.powers[e];
            if (Array.isArray(f.targets) && (f.targets.indexOf("target_command") >= 0)) d.push({
                id: f.id,
                name: f.name,
                god_id: f.god_id || null,
                favor: f.favor || 0,
                desc: f.description || ""
            });
        }
        var g = {};

        function i(e) {
            var f = b.templates.commander,
                i = $(f);
            b.ngApp.controller("commander", ["$scope", function(f) {
            f.t = function(str) { return a.t ? a.t(str) : str; };
            f._lang = a.detectLang ? a.detectLang() : 'fr';
            f.nearestTooltip = a.t ? a.t("nearest_cities_tooltip") : "The 5 nearest cities (by island coordinates)";

                var townGod = null;
                try {
                    var twnObj = ITowns.getTown(Game.townId);
                    if (twnObj && typeof twnObj.god === "function") townGod = twnObj.god();
                    else if (twnObj && twnObj.attributes && twnObj.attributes.god) townGod = twnObj.attributes.god;
                } catch(ge) {}
                // Filter by god AND by action (attack spells in attack, support spells in support)
                var actionType = e.action === "support" ? "support" : "attack";
                var filteredPowers = d.filter(function(p) {
                    return true; // tous les dieux â€” la faveur est globale
                }).map(function(p) {
                    var _gods = b.models.PlayerGods[Game.player_id];
                    var _favor = _gods ? _gods.getCurrentFavorForGods() : {};
                    return Object.assign({}, p, { available: (_favor[p.god_id] || 0) >= p.favor });
                });
                f.data = {
                    o: { spell: "disabled", spells: [], spellName: "", dodge: false, day: "0", accuracy: 0, tolerance_sec: "0", tolerance_dir: "both" },
                    powers: filteredPowers,
                    actionType: actionType,
                    spellName: ""
                };
                f.isTimingEnabled = function() { return b.sett && b.sett.commander_order_timing === true; };
                f.spellNameFn = function(sid) {
                    try { return (GameData.powers[sid] && GameData.powers[sid].name) || ''; } catch(e) { return ''; }
                };
                var i = g[e.target_id];
                if (!i) i = g[e.target_id] = {
                    id: e.target_id,
                    filter: []
                };
                if (!Array.isArray(i.nearest)) i.nearest = [];
                if (!Array.isArray(i.filter)) i.filter = [];
                if (!i.prev) i.prev = {
                    day: "0",
                    hour: "",
                    minute: "",
                    second: "",
                    accuracy: 0,
                    tolerance_sec: "0",
                    tolerance_dir: "both"
                };
                Object.assign(f.data.o, i.prev);
                f.data.nearest = i.nearest;
                f.data.target = i;
                f.schedule = function() {
                    var a = {
                        units: []
                    };
                    var d = e.getUnitInputs(),
                        g = 0,
                        h = 0,
                        j = 0;
                    if (GameDataHeroes && GameDataHeroes.areHeroesEnabled()) {
                        var k = CM.get(e.wnd.getContext(), "cbx_include_hero");
                        if (k && k.isChecked()) a.hero = e.getHeroInTheTown().getId();
                    }
                    var l = e.data.researches && ("berth" in e.data.researches) ? e.data.researches.berth : 0;
                    e.getUnitInputs().each(function(b, c) {
                        var d = parseInt(c.value, 10);
                        if (d > 0) {
                            var f = e.data.units[c.name],
                                i = GameData.units[f.id];
                            var k = {
                                id: f.id,
                                count: d,
                                duration: "hero" in a ? f.duration : f.duration_without_bonus,
                                naval: i.is_naval === true
                            };
                            if (k.naval) {
                                j++;
                                if (f.capacity > 0) g += k.count * (f.capacity + l);
                            } else if (i.flying !== true) h += k.count * f.population;
                            a.units.push(k);
                        }
                    });
                    if (a.units.length < 1) {
                        c("warning", "No troops given").msg(10);
                        return;
                    }
                    if ((j > 0) && (h > g)) {
                        c("warning", "Not enough transport capacity, available {0}, required {1}", g, h).msg(10);
                        return;
                    }
                    var m;
                    if (j > 0) m = a.units.filter(function(a) {
                        return a.naval;
                    });
                    else m = a.units;
                    a.duration = m.reduce(function(a, b) {
                        return a.duration < b.duration ? b : a;
                    }).duration;
                    if (f.data.o.dodge === true) {
                        var n = parseInt(f.data.o.dodge_sec, 10);
                        if (n > 0) a.dodge = n;
                    }
                    var o = Timestamp.serverGMTOffset() + Timestamp.clientGMTOffset(),
                        p = new Date(1e3 * (Timestamp.server() + o)),
                        q = new Date(p.getTime()),
                        r = {},
                        s = f.data.o;
                    ["day", "hour", "minute", "second"].forEach(function(a) {
                        var b = parseInt(s[a], 10);
                        r[a] = Number.isInteger(b) ? b : -1;
                    });
                    // HH obligatoire
                    if (r.hour < 0) { c("warning", b.t("L'heure est obligatoire (HH)")).msg(10); return; }
                    if (r.hour > 23) { c("warning", "Heure invalide (0-23)").msg(10); return; }
                    if (r.minute > 59) { c("warning", "Minutes invalides (0-59)").msg(10); return; }
                    if (r.second > 59) { c("warning", "Secondes invalides (0-59)").msg(10); return; }
                    // MM et SS vides = 00
                    var _m = r.minute >= 0 ? r.minute : 0;
                    var _s = r.second >= 0 ? r.second : 0;
                    if (r.day > 0) q.setDate(q.getDate() + r.day);
                    q.setHours(r.hour, _m, _s, 0);
                    if (a.dodge > 0) {
                        if (q < p) {
                            c("warning", "Troops does not have time").msg(10);
                            return;
                        }
                    } else if ((q.getTime() - p.getTime()) < a.duration * 1e3) {
                        c("warning", "Troops does not have time").msg(10);
                        return;
                    }
                    a.time = q.getTime() / 1e3 - o;
                    if (f.data.o.accuracy !== "0") {
                        var t = parseInt(f.data.o.accuracy, 10);
                        if (isNumber(t) && (t !== 0)) a.accuracy = t;
                    }
                    if (f.data.o.spell && f.data.o.spell !== "disabled") a.spell = f.data.o.spell;
                    else if (f.data.o.spells && f.data.o.spells.length > 0) a.spell = f.data.o.spells[0]; // compat
                    if (f.data.o.notify === true) a.notify = true;
                    if (b.sett && b.sett.commander_order_timing === true) {
                        var _tsec = parseInt(f.data.o.tolerance_sec, 10);
                        if (!Number.isInteger(_tsec) || _tsec < 0) _tsec = 0;
                        if (_tsec > 3) _tsec = 3;
                        a.tolerance_sec = _tsec;
                        a.tolerance_dir = f.data.o.tolerance_dir || "both";
                    }
                    var u = ITowns.getTown(Game.townId);
                    // RÃ©cupÃ©rer le nom ET l'id du joueur cible depuis le lien natif Grepolis
                    if (!i.player_name || !i.player_id) {
                        try {
                            var _wndJq = e.wnd.getJQElement();
                            _wndJq.find('a.gp_player_link').each(function() {
                                var $a = $(this);
                                var _pn = $a.attr('data-player-name') || '';
                                var _pi = $a.attr('data-player-id')   || null;
                                if (!_pn) {
                                    var href = $a.attr('href') || '';
                                    var fragment = href.replace('#', '');
                                    if (fragment) {
                                        try {
                                            var data = JSON.parse(atob(fragment));
                                            if (data && data.name) _pn = data.name;
                                            if (data && data.id)   _pi = data.id;
                                        } catch(ex2) {}
                                    }
                                }
                                if (_pn) {
                                    i.player_name = _pn;
                                    i.player_id   = _pi;
                                    return false;
                                }
                            });
                        } catch(ex) {}
                    }
                    Object.assign(a, {
                        action: e.action,
                        town: {
                            id: u.id,
                            name: u.name,
                            player_name: _getPlayerName(u.id) || Game.player_name,
                            player_id:   Game.player_id
                        },
                        target: {
                            id: e.target_id,
                            name: e.wnd.getTitle(),
                            player_name: (i && i.player_name) || _getPlayerName(e.target_id),
                            player_id:   (i && i.player_id)   || null
                        }
                    });
                    var v = e.wnd.getJQElement().find(".attack_type.checked");
                    if (v.length > 0) {
                        v = v[0].getAttribute("data-attack");
                        a.strategy = v;
                    }
                    a.units = a.units.map(function(a) {
                        return {
                            id: a.id,
                            count: a.count
                        };
                    });
                    b.commander.create(a);
                    // Notification de confirmation â€” utilise les noms directement (pas [town] tags)
                    // car la ville cible (ennemie) peut ne pas Ãªtre dans d.towns au moment de l'envoi
                    var _confirmColor = a.action === "support" ? "#4caf6e" : "#e05555";
                    var _confirmLabel = a.action === "support" ? f.t("Support") : f.t("Attaque");
                    var _confirmNotif = "âœ… [color=" + _confirmColor + "]" + _confirmLabel + " " + f.t("planifiÃ©") + "[/color]";
                    _confirmNotif += " [town]" + a.town.id + "[/town] => [town]" + a.target.id + "[/town]";
                    c("info", _confirmNotif).msg(10);
                    e.resetUnitInputs();
                    i.prev = Object.assign(i.prev, {
                        day: s.day,
                        hour: s.hour,
                        minute: s.minute,
                        second: s.second,
                        accuracy: s.accuracy,
                        notify: s.notify === true,
                        tolerance_sec: (s.tolerance_sec !== undefined && s.tolerance_sec !== null) ? s.tolerance_sec : "0",
                        tolerance_dir: s.tolerance_dir || "both"
                    });
                };
                f.switch_town = function(townId, evt) {
                    try {
                        var tObj = ITowns.getTown(townId);
                        if (tObj && typeof tObj.getLinkFragment === "function") {
                            // Nos propres villes : simuler un vrai clic Ã  la position de la souris
                            // pour que Grepolis ouvre la fenÃªtre Ã  l'endroit du clic (et non en haut Ã  gauche)
                            var fragment = tObj.getLinkFragment();
                            var link = $("<a class='gp_town_link' href='#" + fragment + "'>t</a>").appendTo("body");
                            var clickX = evt && evt.clientX ? evt.clientX : 0;
                            var clickY = evt && evt.clientY ? evt.clientY : 0;
                            var mouseEvt = new MouseEvent("click", {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                                clientX: clickX,
                                clientY: clickY,
                                screenX: clickX,
                                screenY: clickY
                            });
                            link[0].dispatchEvent(mouseEvt);
                            link.remove();
                        } else {
                            // Ville ennemie/alliÃ©e : ouvrir via GPWindowMgr
                            GPWindowMgr.open(GPWindowMgr.TYPE_TOWN, townId);
                        }
                    } catch(e) {}
                };
                f.troops = function(a) {
                    var b = [];
                    for (var c in ITowns.getTowns()) {
                        var d = ITowns.getTown(c),
                            e = d.units();
                        if (e[a] > 0) b.push({
                            id: c,
                            name: d.name,
                            total: e[a]
                        });
                    }
                    b = b.sort(function(a, b) {
                        return b.total - a.total;
                    });
                    b = b.slice(0, 10);
                    f.data.nearest = i.nearest = b;
                    i.additional = (a in GameData.units) ? GameData.units[a].name_plural : a;
                };
                // Panel sorts jQuery â€” mÃªme systÃ¨me que les attaques entrantes
                f.openCommanderSpellPanel = function(evt) {
                    if (evt) { evt.stopPropagation(); evt.preventDefault(); }
                    if ($('#gfb-spell-panel').length) { $('#gfb-spell-panel').remove(); return; }
                    $('#gfb-spell-panel').remove();
                    var _gods = b.models.PlayerGods[Game.player_id];
                    var _favor = _gods ? _gods.getCurrentFavorForGods() : {};
                    var _spells = [];
                    for (var _pid in GameData.powers) {
                        var _p = GameData.powers[_pid];
                        if (!_p) continue;
                        if (!Array.isArray(_p.targets) || _p.targets.indexOf("target_command") < 0) continue;
                        _spells.push({ id: _p.id || _pid, name: _p.name, desc: _p.description || "", favor: _p.favor || 0, god_id: _p.god_id || "", available: (_favor[_p.god_id] || 0) >= (_p.favor || 0) });
                    }
                    // RÃ©cap dieux
                    var _FAVOR_ICON = '<span class="gfb-favor-icon" style="display:inline-block;"></span>';
                    var _godsSeen = {}, _godsWithFavor = [];
                    _spells.forEach(function(sp) { if (sp.god_id && !_godsSeen[sp.god_id]) { _godsSeen[sp.god_id] = true; _godsWithFavor.push(sp.god_id); } });
                    var _godBar = _godsWithFavor.map(function(gid) {
                        var _f = Math.floor(_favor[gid] || 0);
                        var _gdata = GameData.gods && GameData.gods[gid];
                        var _gname = _gdata ? _gdata.name : gid;
                        var _tooltipHtml = ('<strong>' + _gname + '</strong>' + (_gdata && _gdata.topic ? '<br><span style=&quot;color:#a09070;font-size:10px;&quot;>' + _gdata.topic + '</span>' : '')).replace(/"/g, '&quot;');
                        return '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;">'
                            + '<div style="font-size:6.5pt;color:#a09070;line-height:1;text-align:center;white-space:nowrap;">' + _gname + '</div>'
                            + '<div class="hw-god-chip" data-tooltip-html="' + _tooltipHtml + '">'
                            + '<div style="width:16px;height:16px;overflow:hidden;border-radius:2px;">'
                            + '<div class="god_mini ' + gid + '" style="width:62px;height:62px;transform:scale(0.258);transform-origin:top left;"></div>'
                            + '</div>'
                            + '<div style="display:flex;align-items:center;gap:1px;">' + _FAVOR_ICON
                            + '<span style="font-size:6pt;font-weight:700;color:' + (_f > 0 ? '#c9a84c' : '#7a6e5a') + ';">' + _f + '</span></div>'
                            + '</div></div>';
                    }).join('');
                    // Cartes sorts
                    var _currentSpell = f.data.o.spell || "disabled";
                    var _selectedId = _currentSpell !== "disabled" ? _currentSpell : null;
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
                        + '<div class="hw-spell-panel-title"><span class="gfb-favor-icon" style="display:inline-block;margin-right:4px;"></span>' + (a.t ? a.t("Sort divin") : "Sort divin") + '</div>'
                        + '<div class="hw-gods-recap">' + _godBar + '</div>'
                        + '<div class="hw-spell-grid">' + _cards + '</div>'
                        + '<div class="hw-spell-panel-actions">'
                        + '<button type="button" class="hw-spell-cast-btn">' + (a.t ? a.t("Valider") : "Valider") + '</button>'
                        + '<button type="button" class="hw-spell-cancel-btn">' + (a.t ? a.t("Annuler") : "Annuler") + '</button>'
                        + '</div></div>');
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
                    _panel.on('click', '.hw-spell-cast-btn', function() {
                        try {
                            f.$apply(function() {
                                f.data.o.spell = _selected || "disabled";
                                f.data.o.spells = _selected ? [_selected] : [];
                                f.data.spellName = _selected && GameData.powers[_selected] ? GameData.powers[_selected].name : '';
                            });
                        } catch(e) {}
                        _panel.remove();
                    });
                    _panel.on('click', '.hw-spell-cancel-btn', function() { _panel.remove(); });
                    // Injecter en fixed dans body â€” mÃªme logique que herald
                    _panel.css({ position: 'fixed', visibility: 'hidden', 'z-index': 999999, 'max-width': '380px' });
                    $('body').append(_panel);
                    var _btn = $(evt && evt.target).closest('.hw-spell-btn, [ng-click*="SpellPanel"]');
                    var _btnNode = _btn[0];
                    if (_btnNode) {
                        var _rect = _btnNode.getBoundingClientRect();
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
                        _panel.css({ visibility: 'visible' });
                    }
                    setTimeout(function() {
                        $(document).on('click.cmdspellpanel', function(e) {
                            if (!$(e.target).closest('#gfb-spell-panel').length) {
                                _panel.remove();
                                $(document).off('click.cmdspellpanel');
                            }
                        });
                    }, 300);
                };
                f.nearest = function() {
                    i.additional = "nearest";

                    function b(a, b) {
                        var c = [];
                        var d = ITowns.getTowns();
                        var ax = a.getIslandCoordinateX ? a.getIslandCoordinateX() : a.x;
                        var ay = a.getIslandCoordinateY ? a.getIslandCoordinateY() : a.y;
                        for (var e in d) {
                            var g = d[e],
                                e = g.getIslandCoordinateX(),
                                h = g.getIslandCoordinateY();
                            var j = {
                                id: g.id,
                                name: g.name,
                                distance: Math.pow((ax - e), 2) + Math.pow((ay - h), 2)
                            };
                            c.push(j);
                        }
                        c = c.sort(function(a, b) {
                            return a.distance - b.distance;
                        });
                        c = c.slice(0, 5);
                        i.nearest = c;
                        if (b) f.$apply(function() {
                            f.data.nearest = i.nearest;
                        });
                        else f.data.nearest = i.nearest;
                    }
                    var c = a.towns.get(e.target_id);
                    if (isNumber(c.x) && isNumber(c.y)) b(c, false);
                    else h("town_info", "info", {
                        id: e.target_id
                    }, function(c, d) {
                        var f = /"gp_island_link">[^\d]+(\d+)<[\s\S]*{x:(\d+), y:(\d+)/.exec(d.html);
                        if (f) {
                            var coordX = parseInt(f[2], 10);
                            var coordY = parseInt(f[3], 10);
                            a.towns.update({
                                id: e.target_id,
                                name: e.wnd.getTitle(),
                                island: f[1],
                                x: coordX,
                                y: coordY
                            });
                            b({ x: coordX, y: coordY, getIslandCoordinateX: function() { return coordX; }, getIslandCoordinateY: function() { return coordY; } }, true);
                        }
                    });
                };
            }]);
            angular.bootstrap(i, ["bot"]);
            return i;
        }
        // Intercepter onRcvData de WndHandlerTown pour retirer notre panel sur info/commerce/etc.
        var _townOnRcvData = GPWindowMgr.getTypeInfo(GPWindowMgr.TYPE_TOWN).handler.prototype.onRcvData;
        GPWindowMgr.getTypeInfo(GPWindowMgr.TYPE_TOWN).handler.prototype.onRcvData = function(a) {
            var _wnd = this.wnd;
            if (_wnd) {
                var _jq = _wnd.getJQElement();
                var _panel = _jq.find(".gfb-commander-panel");
                if (_panel.length) {
                    var _tid = this.target_id || (this.town && this.town.id);
                    var _e = _tid ? g[_tid] : null;
                    if (_e && _e.addedH > 0) { _wnd.setHeight(_wnd.getHeight() - _e.addedH); _e.addedH = 0; }
                    _panel.remove();
                }
            }
            return _townOnRcvData.apply(this, arguments);
        };
        var _origGetWindowOptions = WndHandlerTown.prototype.getDefaultWindowOptions;
        WndHandlerTown.prototype.getDefaultWindowOptions = function() {
            var b = _origGetWindowOptions.apply(this, arguments);
            try {
                a.towns.update({
                    id: this.town.id,
                    name: this.town.name
                });
            } catch (c) {}
            return b;
        };
        function _installAttackHooks() {
            if (WndHandlerAttack.prototype.onRcvData._gfbot_hooked) return;
            var _origRcv = WndHandlerAttack.prototype.onRcvData;
            WndHandlerAttack.prototype.onRcvData = function(a) {
                try {
                    var tid = this.target_id || (a && a.json && a.json.target_id);
                    if (tid && a && a.json) {
                        var entry = g[tid];
                        if (!entry) entry = g[tid] = { id: tid, h: 0 };
                        if (!entry.player_name) {
                            var json = a.json;
                            var pName = json.player_name || json.owner_name || json.owner || "";
                            if (pName) entry.player_name = pName;
                        }
                    }
                } catch(ex) {}
                return _origRcv.apply(this, arguments);
            };
            WndHandlerAttack.prototype.onRcvData._gfbot_hooked = true;
        }
        _installAttackHooks();
        setTimeout(_installAttackHooks, 3000);

        var k = WndHandlerAttack.prototype.render;
        WndHandlerAttack.prototype.render = function(a) {
            var b = k.apply(this, arguments),
                c = this.wnd,
                d = c.getID();
            var e = g[this.target_id];
            if (!e) e = g[this.target_id] = {
                id: this.target_id,
                h: 0
            };
            var _jq = c.getJQElement();
            // Si player_name pas encore connu, on le capturera quand l'utilisateur ouvrira la fenÃªtre info
            // (hook WndHandlerTown.onRcvData s'en charge automatiquement)

            _jq.find(".gfb-commander-panel").remove();
            if ((a == "attack") || (a == "support")) {
                var f = i(this);
                f.addClass("gfb-commander-panel");
                _jq.find(".send_units_form").append(f);
                var _c = c, _e = e;
                setTimeout(function() {
                    var realH = f.outerHeight(true);
                    if (realH > 0) { _e.addedH = realH; _c.setHeight(_c.getHeight() + realH); }
                }, 50);
            }
            return b;
        };
    })();
    b.request("commander:load", {}, function(d) {
        var e = 0;
        d.result.commands.forEach(function(a) {
            a.save = false;
            a.silent = true;
            a.loaded = true;
            a.time -= Timestamp.clientGMTOffset();
            b.commander.create(a);
            e++;
        });
        if (Array.isArray(d.result.towns)) d.result.towns.forEach(function(b) {
            a.towns.update({
                id: b[0],
                name: b[1],
                x: b[2],
                y: b[3]
            });
        });
        c("info", "Loaded commands: {0}", e);
    });
    b.commander = new k();
    b.controls.commander = $('<span class="control round16" title="Commandant">ðŸš©</span>');
    b.controls.base.after(b.controls.commander);
    b.controls.commander.show();
    b.controls.commander.click(function() {
        if (b.commander.visible) b.commander.hide();
        else b.commander.show();
    });

    b.filters.add("BLOCK_FARM_ON_COMMANDER", function(a, b, c, d, e, f) {
        if ((f === "commander") || (f === "na")) return true;
        var g = Timestamp.now();
        return !j.some(function(a) {
            var b = a.startAt - g;
            return (b < 180) && (b > -20) && (a.state !== "delete");
        });
    });
    c("info", "Loaded"); window._gfbot_module_loaded && window._gfbot_module_loaded("Commandant", true);
})(this);
