(function(a) {
    "use strict";
    var b = a.bot,
        c = a.logger.create("Customization");

    function d(a, d, e) {
        var f = $(b.templates.custom),
            g = b.custom.get(d.town.id);
        b.ngApp.controller("customController", ["$scope", function(a) {
            a.t = function(str) { return b.ctx && b.ctx.t ? b.ctx.t(str) : str; };
            a._lang = b.ctx && b.ctx.detectLang ? b.ctx.detectLang() : 'fr';

            var e = [{
                id: "global",
                label: "global"
            }, {
                id: "disabled",
                label: "disabled"
            }, {
                id: "resources",
                label: "- Resources -",
                disabled: true
            }];
            if (Game.features.battlepoint_villages === true) {
                e.push.apply(e, [{
                    id: "300",
                    label: "5 (x2) minutes"
                }, {
                    id: "1200",
                    label: "20 (x2) minutes"
                }, {
                    id: "5400",
                    label: "90 (x2) minutes"
                }, {
                    id: "14400",
                    label: "240 (x2) minutes"
                }, {
                    id: "units",
                    label: "- Units -",
                    disabled: true
                }]);
                ["sword", "slinger", "archer", "hoplite"].forEach(function(a) {
                    var b = GameData.units[a];
                    if (typeof b == "undefined") return;
                    e.push({
                        id: a,
                        label: b.name
                    });
                });
            } else e.push.apply(e, [{
                id: "300",
                label: "5 minutes"
            }, {
                id: "1200",
                label: "20 minutes"
            }, {
                id: "5400",
                label: "90 minutes"
            }, {
                id: "14400",
                label: "240 minutes"
            }, {
                id: "600",
                label: "*10 minutes"
            }, {
                id: "2400",
                label: "*40 minutes"
            }, {
                id: "10800",
                label: "*180 minutes"
            }, {
                id: "28800",
                label: "*480 minutes"
            }]);
            a.data = {
                c: Object.assign({}, g),
                towns: [],
                farms: e,
                isOwn: ITowns.getTown(d.town.id) ? true : false
            };
            if (a.data.isOwn) {
                var f = b.models.Town[d.town.id];
                b.ajaxRequestGet("island_info", "index", {
                    island_id: f.getIslandId(),
                    town_id: f.id
                }, function(b, c) {
                    var d = c.json.town_list;
                    a.$apply(function() {
                        a.data.towns = [{
                            id: "random",
                            name: "*** Random ***"
                        }];
                        c.json.town_list.forEach(function(b) {
                            if (b.id == f.id) return;
                            a.data.towns.push({
                                "id": b.id.toString(),
                                "name": b.name
                            });
                        });
                    });
                }, "na");
            }
            a.data.activeTab = a.data.isOwn ? 1 : 3;
            a.save = function() {
                var e = [];
                Object.keys(a.data.c).forEach(function(b) {
                    if (g[b] == a.data.c[b]) return;
                    g[b] = a.data.c[b];
                    e.push({
                        "town": d.town.id,
                        "name": b,
                        "value": g[b]
                    });
                });
                if (e.length > 0) b.request("custom:set", e, function() {
                    c("info", b.t("Saved")).msg(10);
                });
            };
        }]);
        angular.bootstrap(f, ["bot"]);
        return a.after(f);
    }

    function e(c, e) {
        var f = ITowns.getTown(c.town.id),
            g = c.wnd;
        if (!f) {
            var h = /{x:(\d+), y:(\d+), id:\d+}/.exec(e.html);
            if (h) {
                f = {
                    x: parseInt(h[1], 10),
                    y: parseInt(h[2], 10),
                    id: c.town.id,
                    name: c.town.name
                };
                a.towns.update(f);
                b.request("custom:townInfo", f);
            }
        }
        var g = c.wnd,
            i = g.getJQElement(),
            j = i.find("#towninfo_towninfo");
        d(j, c);
    }
    var f = function() {
        var a = {},
            c = {};

        function d() {
            b.request("custom:get", {}, function(b) {
                var d = b.result;
                Object.keys(d.items).forEach(function(b) {
                    a[b] = d.items[b];
                });
                c = d["default"];
            });
        }

        function e(b, d) {
            var e = Object.assign({}, c);
            if (b in a) Object.assign(e, a[b]);
            a[b] = e;
            return (typeof d == "string") ? e[d] : e;
        }

        function f(b, d, e) {
            var f;
            if (a[b]) f = a[b];
            else f = a[b] = Object.assign({}, c);
            if (typeof d == "string") f[d] = e;
        }
        d();
        this.load = d;
        this.get = e;
        this.set = f;
        this.items = a;
        return this;
    };
    b.custom = new f();
    (function() {
        var a = GPWindowMgr.getTypeInfo(GPWindowMgr.TYPE_TOWN),
            d = a.handler.prototype.onRcvData,
            f = a.handler.prototype.onInit;
        a.handler.prototype.onRcvData = function(a) {
            var f = d.apply(this, arguments),
                g = this;
            if (g.action == "info") {
                // Affiche le panneau uniquement pour les villes qui ne nous appartiennent pas
                if (!ITowns.getTown(g.town.id)) e(g, a);
            } else if (g.action == "trading") try {
                var h = />?~(\d+):(\d+):(\d+)</.exec(a.html);
                if (h) {
                    var i = (Number(h[1]) * 60 + Number(h[2])) * 60 + Number(h[3]);
                    b.trader.duration(Game.townId, a.data.target_id, i);
                }
            } catch (j) {
                c("debug", "onRcvData trading, exception: {0}", j);
            }
            return f;
        };
        a.handler.prototype.onInit = function(a, b, c) {
            this.town = {
                id: parseInt(c.id),
                name: a
            };
            return f.apply(this, arguments);
        };
    })();
})(this);
