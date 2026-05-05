(function() {
    var a = this;
    var b = a.bot;
    (function() {
        var a = this,
            b = a.bot,
            c = a.logger.create("Foreman");
        b.foreman = {
            module: "foreman",
            items: b.queue.items,
            finished: [],
            handlers: {},
            active: false,
            buildingData: {},
            finishedOrders: {},
            nextBuildingDataUpdate: 0,
            start: function() {
                this.active = true;
                if (this.control) this.control.addClass("active");
            },
            stop: function() {
                this.active = false;
                if (this.control) this.control.removeClass("active");
            },
            getBuildingDataHash: function(a) {
                var c;
                b.runAtTown(a.id, function() {
                    var b = a.buildingOrders(),
                        d = b.last();
                    c = "len:" + b.length + ", " + "qlen:" + GameDataConstructionQueue.getBuildingOrdersQueueLength() + ", " + "last:" + (d ? d.id : -1);
                });
                return c;
            },
            updateBuildingData: function(a) {
                var c = this,
                    d = b.models.Town[a.id],
                    e = this.getBuildingDataHash(a),
                    f = this.buildingData[a.id] = {
                        hash: e
                    };
                b.runAtTown(a.id, function() {
                    f.data = d.getBuildingBuildData(function() {
                        c.nextBuildingDataUpdate = Date.now() + 5 * 1E3;
                    });
                });
            },
            getBuildingData: function(a) {
                var b = this.buildingData[a.id];
                var c = this.getBuildingDataHash(a);
                if (!b || b.hash != c) {
                    if (this.nextBuildingDataUpdate > Date.now()) return;
                    this.nextBuildingDataUpdate = Date.now() + 5 * 1E3;
                    return this.updateBuildingData(a, c);
                }
                return b.data;
            },
            checkEmptyQueue: function(a) {
                var b = this,
                    d = 0;
                angular.forEach(b.items, function(b) {
                    if (!b.isDeleted && b.module === a.module && a.town === b.town) d++;
                });
                if (d == 0) c("info", b.t("Queue in [town]{0}[/town] is empty"), a.town).msg(10);
            },
            text: function(b) {
                var c = a.format("([town]{0}[/town] '{1}')", b.town, GameData.buildings[b.item].name);
                return c;
            },
            checkInstantBuy: function() {
                try {
                    if (!this.active) return;
                    if (!(GameDataInstantBuy && GameDataInstantBuy.isEnabled())) return;
                    if (!b.sett.foreman_instant_buy) return;
                    var a = b.models.InstantBuyData[Game.player_id].getPriceTableForType("building");
                    free = -1;
                    for (var c in a)
                        if (a[c] == 0) {
                            free = c;
                            break;
                        } if (free < 0) return;
                    // Nettoyer finished : ne garder que les IDs encore actifs dans BuildingOrder
                    var activeIds = Object.keys(b.models.BuildingOrder).map(function(k) { return b.models.BuildingOrder[k].id; });
                    b.foreman.finished = b.foreman.finished.filter(function(id) {
                        return activeIds.indexOf(id) !== -1;
                    });
                    for (var d in b.models.BuildingOrder) {
                        d = b.models.BuildingOrder[d];
                        if (b.foreman.finished.indexOf(d.id) !== -1) continue;
                        if (d.getTimeLeft() < free) return d;
                    }
                } catch (e) {}
            },
            instantBuy: function(a) {
                var d = this;
                if (!this.active) return;
                if (!(GameDataInstantBuy && GameDataInstantBuy.isEnabled())) return;
                if (!b.sett.foreman_instant_buy) return;
                b.runAtTown(a.getTownId(), function() {
                    d.finished.push(a.id);
                    a.buyInstant(function() {
                        c("info", b.t("Instant buy {0} in [town]{1}[/town]"), GameData.buildings[a.getBuildingId()].name, a.getTownId()).msg(10);
                    });
                });
            },
            checkOrder: function(a, d) {
                d = typeof d !== 'undefined' ? d : true;
                var e = this;
                if (!e.active) {
                    if (!d) c("debug", "{0} Module disabled", e.text(a));
                    return false;
                };
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
                var h = this.getBuildingData(g),
                    i = h ? h.getBuildingData() : null;
                if (!h || !i || !i[a.item]) {
                    if (!d) c("debug", "{0} Building data not available", e.text(a));
                    return false;
                }
                i = i[a.item];
                var j = parseInt(b.sett.foreman_slots, 10),
                    k = g.buildingOrders();
                if (k.length >= j) {
                    if (!d) c("debug", "{0} Maximum slots used", e.text(a));
                    return false;
                }
                if (h.getIsBuildingOrderQueueFull()) {
                    if (!d) c("debug", "{0} Building order queue is full", e.text(a));
                    return false;
                }
                var l = {
                        population: i.population_for
                    },
                    m = g.resources();
                b.ress.forEach(function(a) {
                    var b = i.resources_for[a];
                    l[a] = (b > 0) ? b : 0;
                });
                for (var n in l) {
                    var o = (n == "population") ? l[n] : l[n] + 30;
                    if (m[n] < o) {
                        if (!d) c("debug", "{0} Not enough resources ({1}: {2}/{3})", e.text(a), n, m[n], l[n]);
                        return false;
                    }
                }
                a.resources = Object.assign({}, l);
                if (!us.isArray(i.missing_dependencies)) {
                    var p = [];
                    angular.forEach(i.missing_dependencies, function(a, b) {
                        p.push(a.name + " " + a.needed_level);
                    });
                    if (!d) c("debug", "{0} Missing dependencies: {1}", e.text(a), p.join(", "));
                    return false;
                }
                if (i.has_max_level) {
                    if (!d) c("debug", "{0} Maximum level reached", e.text(a));
                    return false;
                }
                return true;
            },
            startOrder: function(d, e) {
                var f = this,
                    g = ITowns.getTown(d.town);
                e = (typeof e == "function") ? e : function() {};
                a.requister.refetched(g.id, function() {
                    if (!b.foreman.checkOrder(d, false)) {
                        e("check_fail", d);
                        return;
                    }
                    var h = {
                        success: function(a) {
                            delete d.isRunning;
                            c("info", b.t("{0} Order started ({1})"), f.text(d), a.success).msg(10);
                            if (d.town == Game.townId) BuildingWindowFactory.refresh();
                            if (d.repeat === true) {
                                e("repeat", d);
                            } else {
                                b.queue.deleteOrder(d);
                                e("ok", d);
                            }
                            if (b.sett.foreman_notify_empty_queue === true) f.checkEmptyQueue(d);
                            f.updateBuildingData(g);
                        },
                        error: function(b) {
                            delete d.isRunning;
                            d.fails = typeof d.fails === "number" ? d.fails + 1 : 1;
                            var e = 30,
                                h = new Date().getTime();
                            d.startAfter = h + e * 1E3;
                            c("debug", "{0} Freeze order until {1} sec.", f.text(d), e);
                            c("error", b.t("{0} {1}"), f.text(d), b.error).msg(0).send();
                            f.updateBuildingData(g);
                        }
                    };
                    d.isRunning = true;
                    d.started = new Date().getTime();
                    var i = new GameModels.BuildingOrder();
                    c("debug", "{0} Starting order ...", f.text(d));
                    b.runAtTown(d.town, function() {
                        a.resources_add(d.town, d.resources, true);
                        i.execute("buildUp", {
                            building_id: d.item,
                            town_id: d.town,
                            build_for_gold: false
                        }, h);
                    });
                });
            },
            inject: function(a) {
                var b = a.getHandler(),
                    c = this;
                (function() {
                    var d = a.getID();
                    if (!c.handlers[d]) {
                        var e = b.onRcvData;
                        c.handlers[d] = e;
                        b.onRcvData = function(d) {
                            var f = a.getJQElement();
                            var g = e.apply(this, arguments);
                            var h = c.bootstrap(f.find("#building_tasks_main"), b);
                            a.setHeight(a.getHeight() + h.height());
                            return g;
                        };
                    }
                })();
            },
            bootstrap: function(a, c) {
                var d = this,
                    e = $(b.templates.foreman);
                b.ngApp.controller("ForemanController", ["$scope", function(a) {
            a.t = function(str) { return b.ctx && b.ctx.t ? b.ctx.t(str) : str; };
            a._lang = b.ctx && b.ctx.detectLang ? b.ctx.detectLang() : 'fr';

                    a.data = {
                        items: [],
                        itemsMap: {},
                        item: {
                            auto: b.sett.foreman_default_auto,
                            gold: 0
                        },
                        gameData: GameData.buildings,
                        queue: d.items
                    };
                    var e = setInterval(function() {
                        var b = c.wnd.getJQElement(),
                            d = b.find("#buildings > div[id^=building_main_]");
                        if (d.length > 0) {
                            clearInterval(e);
                            angular.forEach(d, function(b) {
                                var c = b.id.substring(14);
                                c = GameData.buildings[c];
                                if (c) {
                                    var d = $("<span title='Add to queue' class='foreman add-to-queue'>+</span>");
                                    d.click(function() {
                                        var b = {
                                            item: c.id,
                                            auto: a.data.item.auto,
                                            gold: 0
                                        };
                                        a.$apply(function() {
                                            a.add(b);
                                        });
                                    });
                                    $(b).append(d);
                                }
                            });
                        }
                    }, 1E3);
                    a.add = function(d) {
                        var e = {
                            item: d.item,
                            town: Game.townId,
                            type: c.currentBuilding,
                            fixed: !d.auto,
                            gold: parseInt(d.gold, 10)
                        };
                        b.request("foreman:add", e, function(b) {
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
                            return a.module === d.module && a.town == Game.townId && !a.isDeleted;
                        };
                    };
                    angular.forEach(GameData.buildings, function(b, c) {
                        if (!b.special && c != "place") {
                            var entry = {
                                "item": c,
                                "name": b.name,
                                "desc": b.description || ""
                            };
                            a.data.items.push(entry);
                            a.data.itemsMap[c] = entry;
                        }
                    });
                }]);
                angular.bootstrap(e, ["bot"]);
                a.before(e);
                return e;
            }
        };
        (function() {
            var a = BuildingWindowFactory.open;
            BuildingWindowFactory.open = function(c) {
                var d = a.apply(this, arguments); /* foreman inject in senat disabled */
                return d;
            };
        })();
        b.queue.modules[b.foreman.module] = b.foreman;
        c("info", "Loaded"); window._gfbot_module_loaded && window._gfbot_module_loaded("Constructeur", true);
        (function() {
            if (b.foreman.active) b.foreman.stop();
            else b.foreman.start();
        }); /* foreman autostart disabled */
    }).call(this);
}).call(this);
