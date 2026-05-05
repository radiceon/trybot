(function() {
    var a = this;
    var b = a.bot;
    (function() {
        var a = this,
            b = a.bot,
            c = a.logger.create("Chercheur");
        b.docent = {
            module: "docent",
            items: b.queue.items,
            finished: [],
            active: false,
            start: function() {
                this.active = true;
                if (this.control) this.control.addClass("active");
            },
            stop: function() {
                this.active = false;
                if (this.control) this.control.removeClass("active");
            },
            text: function(b) {
                var c = a.format("([town]{0}[/town] '{1}')", b.town, GameData.researches[b.item].name);
                return c;
            },
            checkInstantBuy: function() {
                try {
                    if (!this.active) return;
                    if (!(GameDataInstantBuy && GameDataInstantBuy.isEnabled())) return;
                    if (!b.sett.docent_instant_buy) return;
                    var a = b.models.InstantBuyData[Game.player_id].getPriceTableForType("research");
                    var free = -1;
                    for (var c in a)
                        if (a[c] == 0) { free = c; break; }
                    if (free < 0) return;
                    // Nettoyer finished : ne garder que les IDs encore actifs dans ResearchOrder
                    var activeIds = Object.keys(b.models.ResearchOrder).map(function(k) { return b.models.ResearchOrder[k].id; });
                    b.docent.finished = b.docent.finished.filter(function(id) {
                        return activeIds.indexOf(id) !== -1;
                    });
                    for (var d in b.models.ResearchOrder) {
                        d = b.models.ResearchOrder[d];
                        if (b.docent.finished.indexOf(d.id) !== -1) continue;
                        if (d.getTimeLeft() < free) return d;
                    }
                } catch (e) {}
            },
            instantBuy: function(a) {
                var d = this;
                if (!this.active) return;
                if (!(GameDataInstantBuy && GameDataInstantBuy.isEnabled())) return;
                if (!b.sett.docent_instant_buy) return;
                b.runAtTown(a.getTownId(), function() {
                    d.finished.push(a.id);
                    a.buyInstant(function() {
                        c("info", b.t("Instant research {0} in [town]{1}[/town]"), GameData.researches[a.get("research_type")].name, a.getTownId()).msg(10);
                    });
                });
            },
            getAvailableResearchPoints: function(a) {
                var c = GameDataResearches.getResearchPointsPerAcademyLevel() * a.getBuildings().get("academy"),
                    d = a.getResearches();
                angular.forEach(d.attributes, function(a, b) {
                    if (a && GameData.researches[b]) c -= GameData.researches[b].research_points;
                });
                angular.forEach(b.models.ResearchOrder, function(b) {
                    if (b.get("town_id") === a.id) c -= GameData.researches[b.get("research_type")].research_points;
                });
                return c;
            },
            checkOrder: function(a, d) {
                d = typeof d !== 'undefined' ? d : true;
                var e = this;
                if (!e.active) {
                    if (!d) c("debug", "{0} Module disabled", e.text(a));
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
                if (g.getResearches().get(a.item)) {
                    if (!d) c("debug", "{0} Already researched", e.text(a));
                    return false;
                }
                var h = 0,
                    i = GameDataConstructionQueue.getResearchOrdersQueueLength();
                angular.forEach(b.models.ResearchOrder, function(a) {
                    if (a.get("town_id") == g.id) h++;
                });
                if (h >= i) {
                    if (!d) c("debug", "{0} Orders queue is full {1}/{2}", e.text(a), h, i);
                    return false;
                }
                var j = g.resources(),
                    k = GameData.researches[a.item],
                    l = k.resources;
                if (l.wood + 3 > j.wood || l.stone + 3 > j.stone || l.iron + 3 > j.iron) {
                    if (!d) c("debug", "{0} Not enough resources, need: {1}/{2}/{3}, available {4}/{5}/{6}", e.text(a), l.wood, l.stone, l.iron, j.wood, j.stone, j.iron);
                    return false;
                }
                for (var m in k.building_dependencies) {
                    var n = k.building_dependencies[m],
                        o = g.buildings().get(m);
                    if (n > o) {
                        if (!d) c("debug", "{0} Required building '{1}' level {2}", e.text(a), GameData.buildings[m].name, n);
                        return false;
                    }
                }
                for (var p = 0; p < k.research_dependencies.length; p++) {
                    var m = k.research_dependencies[p],
                        o = g.researches().get(m);
                    if (!o) {
                        if (!d) c("debug", "{0} Required research '{1}'", e.text(a), GameData.researches[m].name);
                        return false;
                    }
                }
                if (e.getAvailableResearchPoints(g) < k.research_points) {
                    if (!d) c("debug", "{0} Not enough research points", e.text(a));
                    return false;
                }
                c("debug", "All checks passed! Available resources: {0}/{1}/{2}, research: {3}/{4}/{5}", j.wood, j.stone, j.iron, l.wood, l.stone, l.iron).send();
                return true;
            },
            startOrder: function(a, d) {
                var e = this,
                    f = ITowns.getTown(a.town);
                d = typeof d === "function" ? d : function() {};
                if (!e.checkOrder(a, false)) {
                    d("check_fail", a);
                    return;
                }
                c("debug", b.t("{0} Start researching"), e.text(a));
                var g = new GameModels.ResearchOrder({
                    research_type: a.item
                });
                b.runAtTown(a.town, function() {
                    a.isRunning = true;
                    a.started = new Date().getTime();
                    g.research(function() {
                        delete a.isRunning;
                        c("info", b.t("{0} Start researching"), e.text(a)).msg(10);
                        b.queue.deleteOrder(a);
                        d("ok", a);
                    });
                });
            }
        };
        b.queue.modules[b.docent.module] = b.docent;
        c("info", "Loaded"); window._gfbot_module_loaded && window._gfbot_module_loaded("Chercheur", true);
        (function() {
            if (b.docent.active) b.docent.stop();
            else b.docent.start();
        }); /* docent autostart disabled */
    }).call(this);
}).call(this);
