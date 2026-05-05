(function() {
    var a = this;
    var b = a.bot;
    (function() {
        var a = 0;
        var b = this,
            c = this.bot,
            d = b.logger.create("Wonder-Bot");
        c.wonder = {
            timers: {},
            timer: null,
            active: false,
            start: function() {
                var a = this;
                if (this.active) return;
                if (this.control) this.control.addClass("active");
                this.active = true;
                this.run();
            },
            stop: function() {
                for (var a in this.timers)
                    if (this.timers[a]) {
                        clearTimeout(this.timers[a].id);
                        delete this.timers[a];
                    } if (this.timer) {
                    clearTimeout(this.timer);
                    this.timer = null;
                }
                c.scheduleClean("wonder");
                this.active = false;
                if (this.control) this.control.removeClass("active");
            },
            run: function() {
                var e = ITowns.getTowns(),
                    f = c.wonder,
                    g = Number(c.sett.wonder_x),
                    h = Number(c.sett.wonder_y);
                if ((g + h) < 1) {
                    f.stop();
                    return;
                }
                if (b.block("wonder") > 0) return; /* farm restart on wonder disabled */
                d("debug", "New cycle");
                c.scheduleClean("wonder");
                for (var i in e)(function(i) {
                    // VÃ©rifier si la ville participe (config custom ou global)
                    var cityConf = c.custom ? c.custom.get(i) : {};
                    var useCustom = cityConf.wonder_custom === "true" || cityConf.wonder_custom === true;
                    var isDisabled = cityConf.wonder_custom === "disabled";
                    if (isDisabled) return;
                    var woodAmt  = useCustom ? Number(cityConf.wonder_wood  || 0) : Number(c.sett.wonder_default_wood  || 0);
                    var stoneAmt = useCustom ? Number(cityConf.wonder_stone || 0) : Number(c.sett.wonder_default_stone || 0);
                    var ironAmt  = useCustom ? Number(cityConf.wonder_iron  || 0) : Number(c.sett.wonder_default_iron  || 0);
                    // Si tout est Ã  0, la ville ne participe pas
                    if (woodAmt === 0 && stoneAmt === 0 && ironAmt === 0) return;

                    var j = c.schedule(new Date().getTime(), Math.round(Math.random() * 3000) + 6000, "wonder"),
                        k = j - new Date().getTime();
                    d("info", "Wonder scheduled in {0}sec. at [town]{1}[/town]", k / 1e3, i);
                    var l = setTimeout(function() {
                        var f = {
                            town_id: i,
                            island_x: g,
                            island_y: h
                        };
                        c.ajaxRequestGet("wonders", "index", f, function(f, j, k) {
                            var j = j.data,
                                l = JSON.stringify(j);
                            var m = Timestamp.server();
                            if ((c.sett.wonder_decrease === true) && (j.stage_completed_at > Timestamp.server()) && ((m - a) > 30 * 60)) {
                                a = m;
                                var n = c.models.PlayerGods[Game.player_id].getCurrentFavorForGods(),
                                    o = true;
                                for (var p in n)
                                    if (n[p] < 400) {
                                        o = false;
                                        break;
                                    } if (o) {
                                    d("info", "Decrease build time with favor").msg(10);
                                    c.ajaxRequestPost("wonders", "decrease_build_time_with_favor", {
                                        town_id: i,
                                        island_x: g,
                                        island_y: h
                                    }, function(a, b, c) {}, "wonder");
                                }
                            }
                            if (j.max_trade_capacity < 5000) return;

                            // Calculer ce que la merveille a encore besoin
                            var needed = {};
                            c.ress.forEach(function(a) {
                                needed[a] = Math.max(j.needed_resources[a] - j.sum_ressources_on_the_way[a] - j.wonder_res[a], 0);
                            });

                            // QuantitÃ©s configurÃ©es pour cette ville
                            var targets = { wood: woodAmt, stone: stoneAmt, iron: ironAmt };
                            var townRes = {};
                            c.ress.forEach(function(a) { townRes[a] = j.curr_town_resources[a]; });

                            // N'envoyer que si la merveille en a besoin, limitÃ© par stock ville et capacitÃ© marchande
                            var u = {};
                            var totalToSend = 0;
                            c.ress.forEach(function(a) {
                                u[a] = Math.min(targets[a], needed[a], townRes[a]);
                                u[a] = Math.max(0, u[a]);
                                totalToSend += u[a];
                            });

                            // VÃ©rifier capacitÃ© marchande
                            var q = j.free_trade_capacity;
                            if (totalToSend > q) {
                                var ratio = q / totalToSend;
                                c.ress.forEach(function(a) {
                                    u[a] = Math.floor(u[a] * ratio);
                                });
                                totalToSend = u.wood + u.stone + u.iron;
                            }

                            if (totalToSend >= 1000 && ((j.stage_completed_at == null) || (j.stage_completed_at < j.stage_started_at))) {
                                var w = {
                                    wood: u.wood,
                                    stone: u.stone,
                                    iron: u.iron,
                                    island_x: g,
                                    island_y: h,
                                    town_id: i
                                };
                                d("debug", "Try send from {0} to {1}x{2} (wood: {3}, stone: {4}, iron: {5})", e[i].name, g, h, u.wood, u.stone, u.iron);
                                c.ajaxRequestPost("wonders", "send_resources", w, {
                                    success: function(a, b) {
                                        d("info", "Send resources from {5} to {0}x{1} (wood: {2}, stone: {3}, iron: {4})", g, h, u.wood, u.stone, u.iron, e[i].name).msg(10);
                                    },
                                    error: function(a, d) {
                                        c.wonder.stop();
                                        b.block("wonder", Math.random() * 5 + 10);
                                    }
                                }, "wonder");
                            }
                        }, "wonder");
                    }, k);
                    f.timers[i] = {
                        id: l,
                        time: j
                    };
                }(i));
                var j = parseInt(c.sett.wonder_interval, 10),
                    k = Math.random() * j / 15;
                f.timer = setTimeout(f.run, (j + k) * 1E3);
            }
        };
        var e = GPWindowMgr.getTypeInfo(GPWindowMgr.TYPE_WONDERS).handler;
        if (!e.prototype.onRcvData_orig) {
            e.prototype.onRcvData_orig = e.prototype.onRcvData;
            e.prototype.onRcvData = function(a, b, e) {
                var f = this;
                this.onRcvData_orig(a, b, e);
                if (e == "index" && a.data.created_at) {
                    var g = this.wnd.getJQElement(),
                        h = $("<div style='margin:10px 8px 4px;padding:7px 0;border-top:1px solid rgba(201,168,76,0.2);text-align:center;'><div style='position:relative;display:inline-block;'><div class='gp-wonder-btn' style='background:rgba(201,168,76,0.15);color:#c9a84c;border:1px solid rgba(201,168,76,0.5);border-radius:5px;padding:5px 18px;font-family:Arial,sans-serif;font-size:8pt;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.4px;'>&#10003; Choisir cette merveille</div><span style='position:absolute;top:-6px;left:50%;transform:translateX(-50%);font-family:Georgia,serif;font-size:5pt;font-weight:700;color:#8a6a1a;letter-spacing:1px;text-transform:uppercase;background:rgba(201,168,76,0.9);border:1px solid rgba(201,168,76,0.8);border-radius:3px;padding:1px 4px;white-space:nowrap;line-height:1.4;pointer-events:none;'>GrepoPlus</span></div></div>");
                    g.find("div.wonder_header").append(h);
                    h.find('.gp-wonder-btn').click(function() {
                        c.request("wonder:select", {
                            x: f.island_x,
                            y: f.island_y
                        }, function(a) {
                            c.sett.wonder_x = f.island_x;
                            c.sett.wonder_y = f.island_y;
                            d("info", "Wonder selected (x={0}, y={1})", f.island_x, f.island_y).msg(10);
                        });
                    });
                }
            };
        }
        d("info", "Loaded"); window._gfbot_module_loaded && window._gfbot_module_loaded("Merveille", true);
    }).call(this);
}).call(this);
