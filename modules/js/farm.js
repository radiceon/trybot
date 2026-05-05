
(function(a) {
    "use strict";
    var b = a.bot;
    // Si bot.farm est undefined (mode local), utilise _farmModule comme alias
    if (!b.farm && b._farmModule) b.farm = b._farmModule;
    var c = (b.farm && b.farm.log) ? b.farm.log
          : function() { return { msg: function(){return this;}, send: function(){return this;} }; };
    var d = {
        sword: 1,
        slinger: 2,
        archer: 3,
        hoplite: 4
    };
    var e = (b.farm && b.farm.schedule) ? b.farm.schedule : null;

    function f(b, c) {
        return a.requister.refetched(b, c);
    }

    function g() {
        return b.farm.request_start();
    }

    function h() {
        return b.farm.request_end();
    }
    var i = function(d) {
        var i = "cave_" + d.id;
        var j = function(e) {
            if (!b.farm.check_conqueror(d, e)) return 0;
            var f = b.custom.get(d.id);
            var g, h;
            if (f.autocave == "global") {
                g = b.sett.farm_autocave;
                h = b.sett.farm_autocave_amount;
            } else {
                g = f.autocave;
                h = (f.autocave_amount == "global" || !f.autocave_amount) ? b.sett.farm_autocave_amount : f.autocave_amount;
            }
            if (g == "disabled") {
                if (e !== true) c("debug", "(Auto-Cave) [town]{0}[/town], disabled", d.id);
                return 0;
            }
            g = parseInt(g, 10) / 100;
            if (a.block(i)) return 0;
            var j = d.resources();
            if ((j.iron / j.storage) < g) {
                if (e !== true) c("debug", "(Auto-Cave) [town]{0}[/town], not enough silver, skip", d.id);
                return 0;
            }
            var k = d.buildings(),
                l = k.get("hide");
            var m = (l == 10) ? -1 : l * 1e3,
                n = d.getEspionageStorage();
            if ((m != -1) && (n >= m)) {
                if (e !== true) c("debug", "(Auto-Cave) [town]{0}[/town], cave is full, skip", d.id);
                return 0;
            }
            if (!h || h === '') {
                if (e !== true) c('debug', '(Auto-Cave) [town]{0}[/town], no amount set, skip', d.id);
                return 0;
            }
            h = parseInt(h, 10) / 100;
            h = Math.min(j.iron, Math.floor(h * j.storage));
            h = Math.floor(h / 100) * 100;
            if (m != -1) h = Math.min(m - n, h);
            return h;
        };
        if ((typeof b.models.hide != "object") || (typeof b.models.hide.execute != "function")) {
            c("debug", "(Auto-Cave) No model");
            return;
        }

        // Ã‰viter de crÃ©er plusieurs timers pour la mÃªme ville
        var timerKey = "_cave_timer_" + d.id;
        if (a[timerKey]) return;

        function runCave() {
            if (!b.farm.active) return;
            if ((typeof b.models.hide != "object") || (typeof b.models.hide.execute != "function")) return;
            if (!(j(true) > 0)) return;
            e("cave_" + d.id, 0, function() {
                f(d.id, function() {
                    var e = j();
                    if (!(e > 0)) return;
                    if (!g()) return;
                    b.runAtTown(d.id, function() {
                        b.models.hide.execute("storeIron", {
                            iron_to_store: e
                        }, {
                            success: function(a) {
                                h();
                                c("info", b.t("(Auto-Cave) [town]{0}[/town], {1} ({2})"), d.id, a.success, e).msg(10);
                            },
                            error: function(b) {
                                h();
                                var f = Object.assign({}, d.resources());
                                c("error", b.t("(Auto-Cave) [town]{0}[/town], {1} ({2}/{3})"), d.id, b.error, e, f.iron).send().msg(0);
                                a.block(i, 5 * (1 + Math.random()));
                            }
                        });
                        a.resources_add(d.id, {
                            "iron": -e
                        });
                    });
                });
            });
        }

        // Lancer immÃ©diatement puis vÃ©rifier toutes les 60 secondes
        runCave();
        a[timerKey] = setInterval(runCave, 60 * 1000);
    };
    var j = function(d) {
        if (!(b.trader && b.trader.active)) return;
        var f = function(a) {
            if (typeof GameModels.CreateOffers != "function") {
                if (a !== true) c("debug", "(Auto-Market) [town]{0}[/town], no model", d.id);
                return false;
            }
            if (!b.farm.check_conqueror(d, a)) return false;
            if (d.buildings().get("market") < 2) {
                if (a !== true) c("debug", "(Auto-Market) [town]{0}[/town], market level too small", d.id);
                return false;
            }
            return true;
        };
        if (!f(true)) return;
        var i = d.buildings();
        var j = [];
        if (b.sett.farm_fmarket_wood) j.push("wood");
        if (b.sett.farm_fmarket_stone) j.push("stone");
        if (b.sett.farm_fmarket_iron) j.push("iron");
        if (j.length < 1) return;
        var k = d.resources();
        var l = ["wood", "stone", "iron"].map(function(a) {
            return {
                type: a,
                amount: k[a]
            };
        });
        var m = [];
        j.forEach(function(a) {
            if (k[a] < k.storage) return;
            var b = l.filter(function(b) {
                return b.type != a;
            });
            b = b.sort(function(a, b) {
                return a.amount > b.amount;
            });
            b = b[0].type;
            if ((a != "iron") && (i.get("hide") == 10)) b = "iron";
            m.push({
                offer_type: a,
                demand_type: b
            });
        });
        m.forEach(function(j) {
            e("market_" + d.id + "_" + j.offer_type, 0, function() {
                if (!f()) return;
                var e = d.resources();
                var k = d.getAvailableTradeCapacity();
                if (k < 100) return;
                var _cap = parseInt(b.sett.farm_market_cap) || 1000;
                var _threshold = parseFloat(b.sett.farm_market_pct) || 1.0;
                var _rate = parseFloat(b.sett.farm_market_rate) || 1.0;
                if (e[j.offer_type] < e.storage * _threshold) return;
                var l = Math.min(_cap, k);
                j.offer = Math.floor(l / 100) * 100;
                if (j.offer < 500) return;
                j.demand = Math.floor(j.offer * _rate / 100) * 100;
                j.max_delivery_time = a.rnd(1, 5);
                j.visibility = "all";
                if (!g()) return;
                b.runAtTown(d.id, function() {
                    var a = new GameModels.CreateOffers();
                    a.execute("createOffer", j, {
                        success: function(a) {
                            h();
                            var _tlog = (b.trader && b.trader.log) ? b.trader.log : c;
                            _tlog("info", b.t("(Auto-Market) [town]{0}[/town], offer created, {1}:{2} -> {3}:{4} ({5})"), d.id, j.offer_type, j.offer, j.demand_type, j.demand, a.success).msg(10);
                        },
                        error: function(a) {
                            h();
                            c("error", b.t("(Auto-Market) [town]{0}[/town], {1}"), d.id, a.error).send().msg(0);
                        }
                    });
                });
            });
        });
    };
    var k = function(d) {
        var timerKey = "_culture_timer_" + d.id;
        // Si un timer indÃ©pendant tourne dÃ©jÃ  pour cette ville, ne pas en crÃ©er un autre
        if (a[timerKey]) return;
        var runCulture = function() {
            _runCulture(d);
        };
        // Lancer immÃ©diatement puis vÃ©rifier toutes les 60 secondes
        runCulture();
        a[timerKey] = setInterval(runCulture, 60 * 1000);
    };
    var _runCulture = function(d) {
        if (!b.farm.active) return;
        var i = ["party", "triumph"],
            j = [],
            k = "all";
        var l = function(e) {
            if (!b.farm.check_conqueror(d, e)) return false;
            var f = b.custom.get(d.id);
            k = (f.autoculture == "global") ? b.sett.farm_autoculture : f.autoculture;
            if (k == "disabled") {
                if (e !== true) c("debug", "(Auto-Culture) [town]{0}[/town], disabled", d.id);
                return false;
            }
            if (a.block("culture_" + d.id)) {
                if (e !== true) c("debug", "(Auto-Culture) blocked until {0}", b.ts2text(a.block("culture_" + d.id)));
                return false;
            }
            var g = Timestamp.server(),
                h = [];
            for (var l in b.models.Celebration) {
                var m = b.models.Celebration[l],
                    n = m.getCelebrationType();
                if ((i.indexOf(n) != -1) && (m.getTownId() == d.id))
                    if (m.getFinishedAt() > g) h.push(n);
            }
            if (h.length >= i.length) {
                if (e !== true) c("debug", "(Auto-Culture) [town]{0}[/town], already started ({1})", d.id, n);
                return false;
            }
            j = [];
            if ((k == "all") || (k == "triumph")) {
                var o = b.models.PlayerKillpoints[Game.player_id].getUnusedPoints();
                if (o > GameData.celebration_cost) j.push("triumph");
                else if (e !== true) c("debug", "(Auto-Culture) [town]{0}[/town], not enough battle points for triumph", d.id);
            }
            if ((k == "all") || (k == "party")) {
                var p = d.resources(),
                    q = d.buildings().get("academy");
                if ((q >= 30) && (p.wood >= 15000) && (p.stone >= 18000) && (p.iron >= 15000)) j.push("party");
                else if (e !== true) c("debug", "(Auto-Culture) [town]{0}[/town], not enough resources", d.id);
            }
            j = j.filter(function(a) {
                return (h.indexOf(a) == -1);
            });
            j = j.filter(function(b) {
                var c = "culture_" + d.name + "_" + b;
                return !a.block(c);
            });
            return (j.length > 0);
        };
        if (!l(true)) return;
        e("culture_" + d.id, 0, function() {
            b.ajaxRequestGet("building_place", "culture", {
                town_id: d.id
            }, function(e, i) {
                f(d.id, function() {
                    if (!l()) return;
                    var e = 0;
                    j.forEach(function(f) {
                        var i = {
                            town_id: d.id,
                            celebration_type: f
                        };
                        e += 1e3 + 0.3e3 * Math.random();
                        setTimeout(function() {
                            var e = "culture_" + d.name + "_" + i.celebration_type;
                            if ((k == "all") || (k == i.celebration_type)) {
                                if (!g()) return;
                                b.ajaxRequestPost("building_place", "start_celebration", i, {
                                    success: function(b, f) {
                                        h();
                                        var _celebLabel = i.celebration_type === 'triumph'
                                            ? b.t("(Auto-Culture) [town]{0}[/town], Marche triomphale lancÃ©e")
                                            : b.t("(Auto-Culture) [town]{0}[/town], Festival lancÃ©");
                                        c("info", _celebLabel, d.id).msg(10);
                                        // Bloquer jusqu'Ã  la fin rÃ©elle de la cÃ©lÃ©bration + 30s de marge
                                        var _blockDuration = 3 * 60 * 60; // fallback 3h
                                        try {
                                            for (var _cl in b.models.Celebration) {
                                                var _cm = b.models.Celebration[_cl];
                                                if (_cm.getTownId() == d.id && _cm.getCelebrationType() == i.celebration_type) {
                                                    var _remaining = _cm.getFinishedAt() - Timestamp.server() + 30;
                                                    if (_remaining > 0) _blockDuration = _remaining;
                                                    break;
                                                }
                                            }
                                        } catch(_ce) {}
                                        a.block(e, _blockDuration);
                                    },
                                    error: function(b, e) {
                                        var g = d.resources();
                                        h();
                                        var _celebErrLabel = i.celebration_type === 'triumph'
                                            ? b.t("(Auto-Culture) [town]{0}[/town], impossible de lancer la Marche triomphale ({1})")
                                            : b.t("(Auto-Culture) [town]{0}[/town], impossible de lancer le Festival ({1})");
                                        c("error", _celebErrLabel, d.id, e.error).send().msg(0);
                                        c("info", "(Auto-Culture) type: {0}, iron: {1}, wood: {2}, stone: {3}", f, g.iron, g.wood, g.stone);
                                        a.block("culture_" + d.id, 5 * 60);
                                        a.block("block_id", 5 * (1 + Math.random()));
                                    }
                                }, "farm");
                                if (f === "party") a.resources_add(d.id, {
                                    wood: -15000,
                                    stone: -18000,
                                    iron: -15000
                                });
                            }
                        }, e);
                    });
                });
            }, "farm");
        });
    };
    if (!b.farm.bp_villages) {
        if ((typeof b.models.FarmTown != "object") || (typeof b.models.FarmTownPlayerRelation != "object")) {
            c("error", "Farm not working at this world, sorry").send().msg(30);
            return;
        }
    }
c("debug", "Captain: {0}", b.checkPremium("captain"));
    var l = b.farm.build_towns();
    l.forEach(function(a) {
        try {
            var b = a.villages.filter(function(a) {
                var b = a.getLoot(),
                    c = a.getLevel(),
                    d = GameData.farm_town.max_resources_per_day[c] * Game.game_speed;
                return (d - b) > 500;
            });
            a.villages = b;
        } catch (c) {}
    });
    for (var m in ITowns.getTowns()) {
        var n = ITowns.getTown(m);
        k(n);
    };
    for (var m in ITowns.getTowns()) {
        var n = ITowns.getTown(m);
        i(n);
    };
    for (var m in ITowns.getTowns()) {
        var n = ITowns.getTown(m);
        j(n);
    };
    l.forEach(function(a) {
        if (b.checkPremium("captain") && !(a.farm_time in d)) b.farm.farm_villages(a.town, a.villages, a.farm_time);
        else a.villages.forEach(function(c) {
            b.farm.farm_village(a.town, c, a.farm_time);
        });
    });
})(this);
