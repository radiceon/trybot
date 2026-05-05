(function() {
    var a = this;
    var b = a.bot;
    (function() {
        var a = this,
            b = a.bot,
            c = a.logger.create("Queue");
        b.queue = {
            items: JSON.parse("[]"),
            modules: {},
            timer: null,
            active: false,
            lastTown: null,
            show: function() {
                var a = this;
                if (a.el) {
                    a.el.remove();
                    a.el = null;
                    clearInterval(a.updateTimer);
                    return;
                }
                a.el = $(b.templates.queue);
                b.ngApp.controller("QueueController", ["$scope", function(c) {
            c.t = function(str) { return a.t ? a.t(str) : str; };
            c._lang = a.detectLang ? a.detectLang() : 'fr';

                    c.data = {
                        town: ITowns.getTown(Game.townId),
                        queue: a.items,
                        units: GameData.units,
                        recruiter: {
                            gold: 0,
                            fixed: false,
                            type: "barracks"
                        },
                        foreman: {
                            gold: 0,
                            fixed: false
                        },
                        docent: {
                            gold: 0,
                            fixed: false
                        },
                        trader: {
                            fixed: false,
                            repeat: false,
                            active: b.trader ? b.trader.active : false
                        }
                    };
                    c.filterQueue = function() {
                        return function(a) {
                            return a.town == c.data.town.id && !a.isDeleted;
                        };
                    };
                    c.data.buildings = {};
                    angular.forEach(GameData.buildings, function(a, b) {
                        if (!a.special && b != "place") c.data.buildings[b] = {
                            id: b,
                            name: a.name + " (" + c.data.town.getBuildings().get(b) + ")",
                            desc: a.description || ""
                        };
                    });
                    c.addForeman = function(d) {
                        var e = {
                            item: d.item,
                            town: c.data.town.id,
                            type: "main",
                            fixed: !!d.fixed,
                            gold: isNaN(d.gold) ? 0 : parseInt(d.gold, 10)
                        };
                        b.request("foreman:add", e, function(b) {
                            c.$apply(function() {
                                d.gold = 0;
                                a.items.push(b.result);
                                if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                            });
                        });
                    };
                    c.data.researches = {};
                    angular.forEach(GameData.researches, function(a, b) {
                        c.data.researches[b] = {
                            id: a.id,
                            name: a.name,
                            desc: a.description || ""
                        };
                    });
                    c.addDocent = function(a) {
                        var d = {
                            item: a.item,
                            module: c.data.module,
                            fixed: !!a.fixed,
                            town: c.data.town.id,
                            gold: isNaN(a.gold) ? 0 : parseInt(a.gold)
                        };
                        b.request("docent:add", d, function(b) {
                            c.$apply(function() {
                                a.gold = 0;
                                c.data.queue.push(b.result);
                                if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                            });
                        });
                    };
                    c.addRecruiter = function(d) {
                        var e = {
                            item: d.item,
                            module: c.data.module,
                            town: c.data.town.id,
                            type: d.type,
                            count: parseInt(d.count, 10),
                            gold: isNaN(d.gold) ? 0 : parseInt(d.gold, 10),
                            usePower: d.usePower,
                            fixed: !!d.fixed,
                            repeat: d.repeat
                        };
                        b.request("recruiter:add", e, function(b) {
                            c.$apply(function() {
                                d.gold = 0;
                                a.items.push(b.result);
                                if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                            });
                        });
                    };
                    c.unitName = function(a) {
                        return GameData.units[a] ? GameData.units[a].name : "<unknown>";
                    };
                    c.toggleTrader = function() {
                        if (!b.trader) return;
                        if (b.trader.active) {
                            b.trader.stop();
                        } else {
                            b.trader.start();
                            // Nettoyer les isRunning des ordres trader laisses en vol pendant le OFF
                            // sinon la ville reste bloquee dans run() et les ordres ne repartent pas
                            b.queue.items.forEach(function(item) {
                                if (item.module === "trader" && item.isRunning) {
                                    delete item.isRunning;
                                }
                            });
                            // Kicker la queue immediatement pour traiter les ordres en attente
                            if (b.queue && b.queue.active) {
                                clearTimeout(b.queue.timer);
                                b.queue.timer = setTimeout(function() { b.queue.run(); }, 500);
                            }
                        }
                        c.data.trader.active = b.trader.active;
                    };
                    c.addTrader = function(formData) {
                        var wood  = isNaN(formData.wood)  ? 0 : parseInt(formData.wood,  10);
                        var stone = isNaN(formData.stone) ? 0 : parseInt(formData.stone, 10);
                        var iron  = isNaN(formData.iron)  ? 0 : parseInt(formData.iron,  10);
                        if (wood + stone + iron < 100) {
                            c.data.trader.errorMsg = c.t ? c.t("Le total des ressources doit Ãªtre au moins 100.") : "Le total des ressources doit Ãªtre au moins 100.";
                            return;
                        }
                        c.data.trader.errorMsg = null;
                        var d = {
                            module: "trader",
                            item: "trade",
                            town: c.data.town.id,
                            to: parseInt(formData.to, 10),
                            wood: wood, stone: stone, iron: iron,
                            isLocal: true,
                            isPlayer: true,
                            fixed: formData.fixed === true,
                            repeat: formData.repeat === true
                        };
                        var _destTown = ITowns.getTown(d.to);
                        d.toName = _destTown ? _destTown.name : String(d.to);
                        // Push direct comme settings.js : id local, fixed/repeat garantis dans l'item Angular
                        d.id = "trader_" + d.town + "_" + d.to + "_" + Date.now();
                        a.items.push(d);
                        if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                        formData.fixed = false;
                        formData.repeat = false;
                    };
                    var d = function() {
                        c.data.units = [];
                        c.data.unitsMap = {};
                        angular.forEach(c.data.town.getLandUnits(), function(a, b) {
                            var e = {
                                type: "barracks",
                                id: b,
                                name: GameData.units[b].name,
                                desc: (GameData.units[b].description || "")
                            };
                            c.data.units.push(e);
                            c.data.unitsMap[b] = e;
                        });
                        angular.forEach(b.recruiter.getNavalUnits(c.data.town), function(a, b) {
                            var e = {
                                type: "docks",
                                id: b,
                                name: GameData.units[b].name,
                                desc: (GameData.units[b].description || "")
                            };
                            c.data.units.push(e);
                            c.data.unitsMap[b] = e;
                        });
                    };
                    c.remove = function(b) {
                        var helps = document.querySelectorAll('.bs-help');
                        helps.forEach(function(el) { el.classList.add('bs-help-hiding'); });
                        setTimeout(function() { helps.forEach(function(el) { el.classList.remove('bs-help-hiding'); }); }, 300);
                        a.deleteOrder(b);
                    };
                    c.close = function() {
                        a.show();
                    };
                    d();
                    a.updateTimer = setInterval(function() {
                        if (c.data.town.id != Game.townId) {
                            var a = ITowns.getTown(Game.townId);
                            if (a) c.$apply(function() {
                                c.data.town = ITowns.getTown(Game.townId);
                                d();
                            });
                        } else c.$apply();
                    }, 5E3);
                }]);
                angular.bootstrap(a.el, ["bot"]);
                a.el.draggable({
                    cancel: ".items, .add"
                });
                $("#ui_box").before(a.el);
            },
            stop: function() {
                if (this.active === false) return;
                clearTimeout(this.timer);
                angular.forEach(this.modules, function(a) {
                    if (typeof a.stop === "function") a.stop();
                });
                this.active = false;
                c("info", "Stopped").msg(10);
            },
            start: function() {
                var a = this;
                if (this.active === true) return;
                angular.forEach(this.modules, function(a) {
                    if (typeof a.start === "function" && a.autoStart !== false) a.start();
                });
                // Injecter les items VPS en attente si checkLicense a rÃ©pondu avant nous
                if (b._pendingVpsQueue && Array.isArray(b._pendingVpsQueue) && b._pendingVpsQueue.length > 0) {
                    var _pIds = a.items.map(function(i) { return String(i.id); });
                    b._pendingVpsQueue.forEach(function(item) {
                        if (_pIds.indexOf(String(item.id)) === -1) {
                            a.items.push(item);
                            _pIds.push(String(item.id));
                        }
                    });
                    b._pendingVpsQueue = null;
                }
                window._gfbot_module_loaded && window._gfbot_module_loaded("Queue", true);
                this.active = true;
                this.run();
            },
            print: function() {
                var a = this,
                    b = 0;
                c("debug", "--- Queue ---");
                angular.forEach(a.items, function(a) {
                    var d = ITowns.getTown(a.town);
                    if (d && a.isDeleted !== true) {
                        c("debug", "    order ([town]{0}[/town], {1}:{2}, fixed: {3})", d.name, a.module, a.item, a.fixed);
                        b++;
                    }
                });
                c("debug", "--- Queue End (length {0}) ---", b);
            },
            run: function() {
                var d = this;
                if (!d.active) return;
                var e = new Date().getTime(),
                    f = 3 * 1E3,
                    g = 5E3,
                    h = b.scheduleNearest(e - g);
                if (h > 0 && (h <= e || h - e < f)) {
                    d.timer = setTimeout(function() {
                        d.run();
                    }, f + 500);
                    return;
                }
                if (!b.filters.checkModule("queue")) {
                    d.timer = setTimeout(function() {
                        d.run();
                    }, 3E3);
                    return;
                }
                for (var i in d.modules) {
                    i = d.modules[i];
                    if (typeof i.checkInstantBuy === "function") {
                        var j = i.checkInstantBuy();
                        if (j) {
                            i.instantBuy(j);
                            d.timer = setTimeout(function() {
                                d.run();
                            }, 5E3);
                            return;
                        }
                    }
                }
                angular.forEach(d.modules, function(a) {
                    if (typeof a.refresh === "function") a.refresh();
                });
                var k = d.items.slice(0).sort(function(a, b) {
                    return a.id > b.id;
                });
                k = k.filter(function(a) {
                    return d.modules[a.module] && d.modules[a.module].active;
                });
                var l = {};
                for (var m = 0; m < k.length; m++) {
                    var j = k[m];
                    if (j.isDeleted) continue;
                    if (j.isRunning) {
                        l[j.town] = j;
                        continue;
                    }
                    if (j.fixed && !l.hasOwnProperty(j.town)) {
                        l[j.town] = j;
                        if (d.checkOrder(j)) {
                            d.startOrder(j);
                            var n = a.rnd(4000, 7000);
                            this.timer = setTimeout(function() {
                                d.run();
                            }, n);
                            return;
                        }
                    }
                };
                var o = parseInt(b.sett.queue_scan_depth, 10) || 10,
                    j = null,
                    m = 0,
                    e = new Date().getTime();
                while (m < o && d.active) {
                    j = d.items.shift();
                    if (!j) break;
                    if (j.isDeleted) continue;
                    if (j.isRunning && e - j.started > 30 * 1E3) {
                        c("debug", "Order ([town]{0}[/town], {1}:{2}) running very long time, remove from queue", j.town, j.module, j.item);
                        if (j.repeat) delete j.isRunning;
                        else continue;
                    }
                    if (l.hasOwnProperty(j.town)) {
                        d.items.push(j);
                        j = null;
                        m++;
                        continue;
                    }
                    if (!d.checkActive(j)) {
                        d.items.push(j);
                        j = null;
                        m++;
                        continue;
                    }
                    if (!d.checkOrder(j)) {
                        d.items.push(j);
                        j = null;
                        m++;
                        continue;
                    }
                    break;
                }
                if (!d.active) return;
                var n = j ? a.rnd(8e3, 12e3) : 4E3;
                if (j) {
                    d.startOrder(j, function(a, b) {
                        switch (a) {
                            case "repeat":
                            case "check_fail":
                                // RÃ©gÃ©nÃ©rer l'id pour Ã©viter ngRepeat:dupes si l'objet
                                // est re-pushÃ© (Angular trackBy $$hashKey).
                                if (b.repeat && b.id) {
                                    b.id = String(b.id).replace(/_\d+$/, "") + "_" + new Date().getTime();
                                    delete b.$$hashKey;
                                }
                                delete b.isRunning;
                                d.items.push(b);
                                try {
                                    var rootScope = angular.element(document.querySelector('.botSettings')).injector().get('$rootScope');
                                    if (!rootScope.$$phase) rootScope.$digest();
                                } catch(e) {}
                                break;
                            case "ok":
                                d.lastTown = b.town;
                                if (typeof bot.saveQueueToVPS === "function") bot.saveQueueToVPS();
                                break;
                        }
                    });
                }
                this.timer = setTimeout(function() {
                    d.run();
                }, n);
            },
            deleteOrder: function(a) {
                var c = this;
                a.isDeleted = true;
                if (!a.isLocal) b.request("queue:remove", {
                    id: a.id
                });
                setTimeout(function() {
                    var idx = c.items.indexOf(a);
                    if (idx !== -1) c.items.splice(idx, 1);
                    try {
                        var rootScope = angular.element(document.querySelector('.botSettings')).injector().get('$rootScope');
                        if (!rootScope.$$phase) rootScope.$digest();
                    } catch(e) {}
                    // Push immÃ©diat pour mettre Ã  jour friends.json
                    if (b.friends && typeof b.friends._pushShared === "function") {
                        b.friends._pushShared();
                    }
                    // Sauvegarder la queue sur le VPS
                    if (typeof b.saveQueueToVPS === "function") b.saveQueueToVPS();
                }, 100);
            },
            checkActive: function(a) {
                try {
                    return this.modules[a.module].active;
                } catch (b) {}
                return false;
            },
            checkOrder: function(a) {
                try {
                    if (a.fixed) a.checks = typeof a.checks === "number" ? a.checks + 1 : 0;
                    return this.modules[a.module].checkOrder(a, !(a.fixed && a.checks % 100 == 0));
                } catch (b) {}
                return false;
            },
            startOrder: function(a, b) {
                try {
                    return this.modules[a.module].startOrder(a, b);
                } catch (c) {}
                return false;
            }
        };
        b.queue.start();
        (function() {
            b.queue.show();
        });
    }).call(this);
}).call(this);
