(function() {
    var a = this;
    var b = a.bot;
    (function() {
        var a = this,
            b = a.bot,
            c = a.logger.create("Recruiter");
        b.recruiter = {
            module: "recruiter",
            items: b.queue.items,
            active: false,
            powers: {},
            handlers: {},
            bonus: {
                attack_ship: "aristotle"
            },
            start: function() {
                this.active = true;
                if (this.control) this.control.addClass("active");
            },
            stop: function() {
                this.active = false;
                if (this.control) this.control.removeClass("active");
            },
            text: function(b) {
                var c = a.format("([town]{0}[/town] '{1}:{2}')", b.town, GameData.units[b.item].name, b.count);
                return c;
            },
            getMaxUnits: function(a) {
                var c = GameData.units[a.item],
                    d = ITowns.getTown(a.town);
                if (!c || !d) return 0;
                var e = GeneralModifications.getUnitBuildResourcesModification(d.id, c);
                if (!(e > 0)) return 0;
                var f = false;
                b.runAtTown(a.town, function() {
                    f = GameDataUnits.hasDependencies(a.item);
                });
                if (f) return 0;
                var g = {
                    population: (c.population > 0) ? c.population : 0
                };
                b.ress.forEach(function(a) {
                    g[a] = (c.resources[a] > 0) ? Math.ceil(c.resources[a] * e) : 0;
                });
                var h = d.resources(),
                    i = [];
                a.resources = {};
                angular.forEach(g, function(b, c) {
                    a.resources[c] = g[c] * a.count;
                    if (b > 0) i.push(Math.floor((h[c] - 3) / b));
                });
                if (c.favor > 0) {
                    var j = d.god();
                    if (j && (c.god_id === j || c.god_id === "all")) i.push(Math.floor((h.favor - 1) / c.favor));
                    else i.push(0);
                }
                return i.length > 0 ? Math.min.apply(null, i) : 0;
            },
            getNavalUnits: function(a) {
                var b = {},
                    c = a.god();
                angular.forEach(GameData.units, function(a, d) {
                    if (a.is_naval && (a.god_id === c || !a.god_id)) b[d] = 0;
                });
                return b;
            },
            castPower: function(a, d, e) {
                e = typeof e === "function" ? e : function() {};
                var f = ITowns.getTown(d || Game.townId),
                    g = HelperPower.getCastedPower(a, d);
                if (g && (g.getEndAt() > Timestamp.server())) {
                    c("debug", "([town]{0}[/town]) Power '{1}' already casted", d, a);
                    e();
                    return;
                }
                var h = GameData.powers[a];
                if (!h || !(h.id in b.runAtTown(f.id, function() {
                        return f.getCastablePowersOnTown();
                    }))) {
                    c("debug", "([town]{0}[/town]) Invalid power '{1}'", d, a);
                    return;
                }
                if (HelperPower.getCastedPower("town_protection", d)) {
                    c("debug", "([town]{0}[/town]) Cant cast power '{1}' ({3})", d, GameData.powers[a].name, GameData.powers.town_protection.name);
                    return;
                }
                if (!b.filters.checkModule("queue")) return;
                var i = new GameModels.CastedPowers({
                    power_id: h.id,
                    town_id: f.id
                });
                b.runAtTown(d, function() {
                    i.cast({
                        success: function(a) {
                            e(a);
                        },
                        error: function(a) {
                            c("error", b.t("([town]{0}[/town]): {1} ({2})"), d, a.error, h.name).msg(0).send();
                        }
                    });
                });
            },
            startOrder: function(d, e) {
                var f = ITowns.getTown(d.town),
                    g = this;
                e = (typeof e == "function") ? e : function() {};
                a.requister.refetched(f.id, function() {
                    if (!g.checkOrder(d, false)) {
                        e("check_fail", d);
                        return;
                    }
                    var h = function() {
                        var h = {
                            town_id: d.town,
                            unit_id: d.item,
                            amount: d.count
                        };
                        c("debug", "{0} Start order", g.text(d));
                        d.isRunning = true;
                        d.started = new Date().getTime();
                        a.resources_add(f.id, d.resources, true);
                        b.ajaxRequestPost(GameData.buildings[d.type === "barracks" ? "barracks" : "docks"].controller, "build", h, {
                            success: function() {
                                delete d.isRunning;
                                delete d.started;
                                if (d.repeat !== true) b.queue.deleteOrder(d);
                                if (d.town == Game.townId) BuildingWindowFactory.refresh();
                                c("info", b.t("{0} Start recruiting"), g.text(d)).msg(10);
                                e(d.repeat ? "repeat" : "ok", d);
                            },
                            error: function(b, e) {
                                delete d.isRunning;
                                d.fails = (typeof d.fails == "number") ? d.fails + 1 : 1;
                                var f = 30,
                                    h = new Date().getTime();
                                d.startAfter = h + f * 1E3;
                                c("debug", "{0} Freeze order until {1} sec.", g.text(d), f);
                                c("error", b.t("{0} {1}"), g.text(d), e.error).msg(10).send();
                            }
                        });
                    };
                    if (d.usePower) {
                        var i = (d.type == "barracks") ? "fertility_improvement" : "call_of_the_ocean";
                        g.castPower(i, f.id, h);
                    } else h();
                });
            },
            checkOrder: function(a, d) {
                d = typeof d !== 'undefined' ? d : true;
                if (!a) {
                    if (!d) c("debug", "Invalid order");
                    return false;
                }
                var e = this;
                if (!e.active) {
                    if (!d) c("debug", "Module disabled");
                    return false;
                }
                if (a.fails >= 3) {
                    if (!d) c("debug", "{0} Max start attempts reached ({1}/{2})", e.text(a), a.fails, 3);
                    return false;
                }
                var f = new Date().getTime();
                if (a.startAfter > f) {
                    if (!d) c("debug", "{0} Order freezed", e.text(a));
                    return false;
                }
                var g = ITowns.getTown(a.town);
                if (!g) {
                    if (!d) c("debug", "{0} Invalid town", e.text(a));
                    return false;
                }
                if (g.hasConqueror()) {
                    if (!d) c("debug", "{0} Town under siege", e.text(a));
                    return false;
                }
                var h = g.getUnitOrdersCollection(),
                    i = h.getGroundUnitOrdersCount(),
                    j = h.getNavalUnitOrdersCount(),
                    k = GameDataConstructionQueue.getUnitOrdersQueueLength(),
                    l_barracks = parseInt(b.sett.recruiter_slots_barracks, 10) || parseInt(b.sett.recruiter_slots, 10) || 2,
                    l_docks    = parseInt(b.sett.recruiter_slots_docks,    10) || parseInt(b.sett.recruiter_slots, 10) || 2;
                if ((a.type === "barracks" && i >= l_barracks) || (a.type === "docks" && j >= l_docks)) {
                    if (!d) c("debug", "{0} Maximum slots used", e.text(a));
                    return false;
                }
                if (a.type === "barracks" && i >= k) {
                    if (!d) c("debug", "{0} Orders queue is full {1}/{2}", e.text(a), i, k);
                    return false;
                } else if (a.type === "docks" && j >= k) {
                    if (!d) c("debug", "{0} Orders queue is full {1}/{2}", e.text(a), j, k);
                    return false;
                } else if (a.type !== "barracks" && a.type !== "docks") {
                    if (!d) c("debug", "{0} Order type failed ({1})", e.text(a), a.type);
                    return false;
                }
                var m = GameData.units[a.item];
                var n = e.getMaxUnits(a);
                if (n < a.count) {
                    if (!d) c("debug", "{0} Can build only {1} unit(s)", e.text(a), n);
                    return false;
                }
                if (a.usePower) {
                    var o = GameData.powers[a.type === "barracks" ? "fertility_improvement" : "call_of_the_ocean"];
                    if (!HelperPower.getCastedPower(o.id, g.id)) {
                        var p = b.models.PlayerGods[Game.player_id],
                            q = p.getCurrentFavorForGod(o.god_id);
                        if (HelperPower.getCastedPower("town_protection", g.id)) {
                            if (!d) c("debug", "{0} Cant cast power ({1})", e.text(a), GameData.powers.town_protection.name);
                            return false;
                        }
                        if (q < o.favor) {
                            if (!d) c("debug", "{0} Not enough favor for '{1}' ({2}/{3})", e.text(a), o.name, q, o.favor);
                            return false;
                        }
                    }
                }
                return true;
            },
            inject: function(a) {
                var b = a.getJQElement(),
                    c = a.getHandler(),
                    d = this;
                (function() {
                    var e = a.getID();
                    if (!d.handlers[e]) {
                        var f = c.onRcvData;
                        d.handlers[e] = f;
                        c.onRcvData = function() {
                            var e = f.apply(this, arguments);
                            var g = Layout.new_units_queue ? "#unit_orders_queue" : "#tasks";
                            var h = d.bootstrap(b.find(g), c);
                            a.setHeight(a.getHeight() + h.height());
                            return e;
                        };
                    }
                })();
            },
            bootstrap: function(a, c) {
                var d = $(b.templates.recruiter),
                    e = this;
                b.ngApp.controller("recruiterController", ["$scope", function(a) {
            a.t = function(str) { return b.ctx && b.ctx.t ? b.ctx.t(str) : str; };
            a._lang = b.ctx && b.ctx.detectLang ? b.ctx.detectLang() : 'fr';

                    a.data = {
                        items: [],
                        itemsMap: {},
                        item: {
                            repeat: false,
                            usePower: false,
                            gold: 0,
                            auto: true
                        },
                        queue: e.items
                    }, a.add = function(d) {
                        var e = {
                            item: d.item,
                            count: parseInt(d.count, 10),
                            town: Game.townId,
                            type: c.currentBuilding,
                            usePower: d.usePower,
                            repeat: d.repeat,
                            fixed: !!d.fixed,
                            gold: parseInt(d.gold, 10)
                        };
                        b.request("recruiter:add", e, function(b) {
                            a.$apply(function() {
                                d.gold = 0;
                                a.data.queue.push(b.result);
                            });
                        });
                    };
                    a.remove = function(a) {
                        b.queue.deleteOrder(a);
                    };
                    a.filterQueue = function() {
                        return function(a) {
                            return a.module === e.module && a.town == Game.townId && a.isDeleted !== true;
                        };
                    };
                    a.filterItems = function() {
                        var a = ITowns.getTown(Game.townId),
                            b = c.currentBuilding === "barracks" ? a.getLandUnits() : e.getNavalUnits(a);
                        return function(a) {
                            return (a.item in b);
                        };
                    };
                    angular.forEach(GameData.units, function(b, c) {
                        var entry = {
                            item: c,
                            name: b.name,
                            desc: b.description || "",
                            data: b
                        };
                        a.data.items.push(entry);
                        a.data.itemsMap[c] = entry;
                    });
                }]);
                angular.bootstrap(d, ["bot"]);
                a.before(d);
                return d;
            }
        };
        (function() {
            var a = BuildingWindowFactory.open,
                c = BuildingWindowFactory.refresh;
            BuildingWindowFactory.open = function(c) {
                var d = a.apply(this, arguments); /* recruiter inject in senat disabled */
                return d;
            };
        })();
        b.queue.modules[b.recruiter.module] = b.recruiter;
        c("info", "Loaded"); window._gfbot_module_loaded && window._gfbot_module_loaded("Recruteur", true);
        (function() {
            if (b.recruiter.active) b.recruiter.stop();
            else b.recruiter.start();
        }); /* recruiter autostart disabled */
    }).call(this);
}).call(this);
