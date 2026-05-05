(function() {
    var a = this;
    var b = a.bot;
    (function() {
        "use strict";
        var a = this,
            b = a.bot,
            c = a.logger.create("Trader");
        var d = 100; // seuil minimum (rÃ¨gle du jeu : 100 ressources minimum)
        var durations = {};
        var ontheway_map = {};

        b.trader = {
            module: "trader",
            active: false,
            autoStart: false,
            t: function(str) { return b.ctx && b.ctx.t ? b.ctx.t(str) : str; },
            start: function() {
                this.active = true;
                if (this.control) this.control.addClass("active");
            },
            stop: function() {
                this.active = false;
                if (this.control) this.control.removeClass("active");
            },
            load: function(cb) {
                b.request("trader:load", {}, function(res) {
                    res = res.result;
                    res.durations.forEach(function(x) {
                        durations[x[0]] = x[1];
                    });
                    res.towns.forEach(function(t) {
                        a.towns.update({ id: t[0], name: t[1], x: t[2], y: t[3] });
                    });
                    if (typeof cb == "function") cb();
                });
            },
            duration: function(a, c, f) {
                try {
                    var val = Number(f),
                        x = Number(a),
                        y = Number(c);
                    if (x > y) y = [x, x = y][0];
                    var key = x.toString() + ":" + y.toString();
                    if (isNaN(val)) return (key in durations) ? durations[key] : Infinity;
                    else {
                        var old = durations[key];
                        durations[key] = val;
                        if (old !== val) b.request("trader:duration", { town1: x, town2: y, duration: val });
                        return val;
                    }
                } catch(e) {}
            },
            ontheway: function(townId, res, add) {
                var e;
                if (townId in ontheway_map) e = ontheway_map[townId];
                else e = ontheway_map[townId] = { wood: 0, stone: 0, iron: 0 };
                if (typeof res == "object") a.RESOURCES.forEach(function(r) {
                    var v = Number(res[r]);
                    if (isNaN(v) || !isFinite(v)) v = 0;
                    if (add !== false) e[r] += v;
                    else e[r] = v;
                });
                return e;
            },
            clearAutoOrders: function() {
                b.queue.items.forEach(function(x) {
                    if ((x.module === "trader") && (x.isPlayer !== true)) b.queue.deleteOrder(x);
                });
                ontheway_map = {};
            },
            refresh: function() {
                if (!this.active) return;
                if (a.block("merchant")) return;
                var self = this;
                var interval = (parseInt(b.sett.trader_refresh_interval, 10) || 30 * 60);
                a.block("merchant", interval);
                c("debug", "Update orders ...");
                self.clearAutoOrders();
                var providers = [], consumers = [];
                for (var tid in b.custom.items) {
                    var cfg = b.custom.items[tid], id = Number(tid);
                    if (cfg.autotrade == "provider") {
                        try {
                            var town = ITowns.getTown(id);
                            if (town && town.buildings().get("market") >= 5) providers.push(id);
                        } catch(e) {}
                    } else if (cfg.autotrade == "consumer") consumers.push(id);
                }
                var orders = [], cLen = consumers.length, lastCons = null, servedConsumers = {};
                providers.forEach(function(provId) {
                    var gProv = b.custom.get(provId);
                    var useProvCustom = gProv.autotrade_provider_custom === "true" || gProv.autotrade_provider_custom === true;
                    var dur = useProvCustom ? (Number(gProv.autotrade_duration) || 0) : (Number(b.sett.trader_default_duration) || 0);
                    for (var ci = 0; ci < cLen; ci++) {
                        var consId = consumers.shift();
                        consumers.push(consId);
                        if ((lastCons === consId) && (cLen > 1)) continue;
                        if (servedConsumers[consId]) {
                            var sv = servedConsumers[consId];
                            if (sv.woodFull && sv.stoneFull && sv.ironFull) continue;
                        }
                        if (dur > 0) {
                            var f = self.duration(provId, consId);
                            if ((f != Infinity) && (f > dur)) continue;
                        }
                        var g = b.custom.get(consId);
                        var useCustom = g.autotrade_custom === true;
                        var mode = useCustom ? (g.autotrade_mode || "fixed") : (b.sett.trader_mode || "fixed");
                        var waitStock = useProvCustom ? (gProv.autotrade_wait_stock === true) : (b.sett.trader_wait_stock === true);
                        var wood = 0, stone = 0, iron = 0;
                        if (mode === "threshold") {
                            var cTown = ITowns.getTown(consId);
                            if (!cTown) continue;
                            var cRes = cTown.resources();
                            var thW = Math.max(0, useCustom ? Number(g.autotrade_wood_threshold || 0) : Number(b.sett.trader_default_wood_threshold || 0));
                            var thS = Math.max(0, useCustom ? Number(g.autotrade_stone_threshold || 0) : Number(b.sett.trader_default_stone_threshold || 0));
                            var thI = Math.max(0, useCustom ? Number(g.autotrade_iron_threshold || 0) : Number(b.sett.trader_default_iron_threshold || 0));
                            var amW = Math.max(0, useCustom ? Number(g.autotrade_wood || 0) : Number(b.sett.trader_default_wood_amount || 0));
                            var amS = Math.max(0, useCustom ? Number(g.autotrade_stone || 0) : Number(b.sett.trader_default_stone_amount || 0));
                            var amI = Math.max(0, useCustom ? Number(g.autotrade_iron || 0) : Number(b.sett.trader_default_iron_amount || 0));
                            wood  = (thW > 0 && cRes.wood  < thW) ? amW : 0;
                            stone = (thS > 0 && cRes.stone < thS) ? amS : 0;
                            iron  = (thI > 0 && cRes.iron  < thI) ? amI : 0;
                            if (wood === 0 && stone === 0 && iron === 0) continue;
                            if (waitStock) {
                                var pTown = ITowns.getTown(provId);
                                if (pTown) {
                                    var pRes = pTown.resources();
                                    if ((wood  > 0 && pRes.wood  < wood  + 20) ||
                                        (stone > 0 && pRes.stone < stone + 20) ||
                                        (iron  > 0 && pRes.iron  < iron  + 20)) continue;
                                }
                            }
                        } else {
                            wood  = Math.max(0, useCustom ? Number(g.autotrade_wood  || 0) : Number(b.sett.trader_default_wood_amount  || 0));
                            stone = Math.max(0, useCustom ? Number(g.autotrade_stone || 0) : Number(b.sett.trader_default_stone_amount || 0));
                            iron  = Math.max(0, useCustom ? Number(g.autotrade_iron  || 0) : Number(b.sett.trader_default_iron_amount  || 0));
                            if (waitStock) {
                                var pTown2 = ITowns.getTown(provId);
                                if (pTown2) {
                                    var pRes2 = pTown2.resources();
                                    if ((wood  > 0 && pRes2.wood  < wood  + 20) ||
                                        (stone > 0 && pRes2.stone < stone + 20) ||
                                        (iron  > 0 && pRes2.iron  < iron  + 20)) continue;
                                }
                            }
                        }
                        var order = { town: provId, to: consId, wood: wood, stone: stone, iron: iron };
                        if (self.checkOrder(order)) {
                            lastCons = consId;
                            if (!servedConsumers[consId]) servedConsumers[consId] = { woodFull: false, stoneFull: false, ironFull: false };
                            if (wood  > 0 && order.send && order.send.wood  >= wood)  servedConsumers[consId].woodFull  = true;
                            if (stone > 0 && order.send && order.send.stone >= stone) servedConsumers[consId].stoneFull = true;
                            if (iron  > 0 && order.send && order.send.iron  >= iron)  servedConsumers[consId].ironFull  = true;
                            if (wood  === 0) servedConsumers[consId].woodFull  = true;
                            if (stone === 0) servedConsumers[consId].stoneFull = true;
                            if (iron  === 0) servedConsumers[consId].ironFull  = true;
                            orders.push(order);
                            break;
                        }
                    }
                });
                orders.forEach(function(x) {
                    Object.assign(x, { id: "trader:" + x.town + ":" + x.to, module: "trader", item: "trade", isLocal: true });
                    b.queue.items.push(x);
                });
            },
            checkOrder: function(e, silent) {
                silent = (silent !== false);
                var label = a.format("([town]{0}[/town]->[town]{1}[/town])", e.town, e.to);
                if (!b.filters.checkModule("trader")) {
                    if (!silent) c("debug", "{0}, module disabled", label);
                    return false;
                }
                if (!this.active) {
                    if (!silent) c("debug", "{0}, disabled", label);
                    return false;
                }
                var town = ITowns.getTown(e.town);
                if (!town || town.hasConqueror()) {
                    if (!silent) c("debug", "{0}, invalid town", label);
                    return false;
                }
                var cap = town.getAvailableTradeCapacity();
                if (cap < d) {
                    if (!silent) c("debug", "{0}, trade capacity not available", label);
                    return false;
                }
                var res = town.resources(), total = 0;
                e.send = {};
                if (a.RESOURCES.some(function(r) {
                    var v = Number(e[r]);
                    if (isNaN(v) || !isFinite(v)) v = 0;
                    e.send[r] = v;
                    total += v;
                    return res[r] < (e.send[r] + 10);
                })) {
                    if (!silent) c("debug", "{0}, resources not available", label);
                    return false;
                }
                if (total == 0) {
                    if (!silent) c("debug", "{0}, empty order", label);
                    return false;
                }
                e.send = {};
                total = 0;
                if (e.isPlayer) {
                    a.RESOURCES.forEach(function(r) { e.send[r] = Number(e[r]) || 0; total += e.send[r]; });
                } else {
                    var ratios = [];
                    a.RESOURCES.forEach(function(r) {
                        var v = Math.min(e[r] * cap / total, res[r]);
                        if (e[r] > 0) ratios.push(Math.floor(v / e[r]));
                    });
                    var mult = Math.min.apply(Math, ratios);
                    a.RESOURCES.forEach(function(r) { e.send[r] = e[r] * mult; total += e.send[r]; });
                }
                var destTown = ITowns.getTown(e.to);
                if (destTown) {
                    if (destTown.hasConqueror()) {
                        if (!silent) c("debug", "{0}, consumer under siege", label);
                        return false;
                    }
                    if (b.sett.trader_warehouse_overflow !== true) {
                        var storage = destTown.getStorage(), destRes = destTown.resources(), ow = b.trader.ontheway(e.to);
                        a.RESOURCES.forEach(function(r) {
                            var space = storage - destRes[r] - ow[r];
                            if (space < 0) space = 0;
                            if (e.send[r] > space) { total -= (e.send[r] - space); e.send[r] = space; }
                        });
                    }
                }
                if (total < d) {
                    if (!silent) c("debug", "{0}, sending too small", label);
                    return false;
                }
                return true;
            },
            startOrder: function(e, cb) {
                c("debug", "([town]{0}[/town]->[town]{1}[/town]), starting ...", e.town, e.to);
                cb = (typeof cb !== "function") ? function() {} : cb;
                var self = this;
                if (!self.checkOrder(e, false)) { cb("check_fail", e); return; }
                e.isRunning = true;
                e.started = new Date().getTime();
                b.ajaxRequestGet("town_info", "trading", { id: e.to, town_id: e.town }, function(f, h) {
                    var i = />?~(\d+):(\d+):(\d+)</.exec(h.html);
                    if (i) {
                        var secs = (Number(i[1]) * 60 + Number(i[2])) * 60 + Number(i[3]);
                        self.duration(e.town, h.data.target_id, secs);
                    }
                    var maxDur = Number(b.custom.get(e.town, "autotrade_duration")),
                        curDur = self.duration(e.town, h.data.target_id);
                    if ((maxDur > 0) && (curDur > maxDur)) {
                        c("debug", "([town]{0}[/town]->[town]{1}[/town]), consumer too far", e.town, e.to);
                        delete e.isRunning;
                        cb("check_fail", e);
                        return;
                    }
                    h = h.data;
                    if (h.resources && (h.storage_volume > 0) && (h.incoming_resources) && (b.sett.trader_warehouse_overflow === false)) {
                        a.RESOURCES.forEach(function(r) {
                            var space = Math.max(0, h.storage_volume - h.resources[r] - h.incoming_resources[r]);
                            e.send[r] = Math.min(space, e.send[r]);
                        });
                        self.ontheway(e.to, h.incoming_resources, false);
                    }
                    var total = 0, srcTown = ITowns.getTown(e.town), srcRes = srcTown.resources();
                    a.RESOURCES.forEach(function(r) {
                        var v = e.send[r];
                        if (v > (srcRes[r] - 20)) v = srcRes[r] - 20;
                        if (isNaN(v) || !isFinite(v) || (v < 0)) v = 0;
                        e.send[r] = v;
                        total += v;
                    });
                    if ((total < d) || (total > h.available_capacity)) {
                        c("debug", "([town]{0}[/town]->[town]{1}[/town]), invalid trade capacity (available: {2})", e.town, e.to, total);
                        delete e.isRunning;
                        cb("check_fail", e);
                        return;
                    }
                    a.resources_add(e.town, e.send, true);
                    var payload = Object.assign({ id: e.to, town_id: e.town }, e.send);
                    b.ajaxRequestPost("town_info", "trade", payload, {
                        success: function(a, result) {
                            delete e.isRunning;
                            c("info", b.trader.t("([town]{0}[/town]) Send resources to [town]{1}[/town] {2}/{3}/{4} ({5})"), e.town, e.to, e.send.wood, e.send.stone, e.send.iron, result.success).msg(10);
                            self.ontheway(e.to, e.send);
                            if (e.repeat === true) { cb("repeat", e); }
                            else { b.queue.deleteOrder(e); cb("ok", e); }
                        },
                        error: function(a, err) {
                            delete e.isRunning;
                            if (e.repeat === true) { cb("repeat", e); }
                            else { b.queue.deleteOrder(e); }
                        }
                    }, "queue");
                }, "queue");
            }
        };

        b.queue.modules[b.trader.module] = b.trader;
        c("info", "Loaded"); window._gfbot_module_loaded && window._gfbot_module_loaded("Marchand", true);
        (function() {
            if (b.trader.active) b.trader.stop();
            else b.trader.start();
        }); /* trader autostart disabled */
    }).call(this);
}).call(this);
