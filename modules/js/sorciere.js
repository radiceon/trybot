(function() {
    var a = this;
    var b = a.bot;
    (function() {
        var a = this,
            b = a.bot,
            c = a.logger.create("SorciÃ¨re");

        b.sorciere = {
            module: "sorciere",
            items: b.queue.items,
            active: false,

            // Polling interval handle
            _pollTimer: null,
            // Etat precedent par townId pour dÃ©tecter les changements
            _prevPowers: {},
            // Garde-fou anti-doublon : villes en cours de purification
            _purifInProgress: {},

            start: function() {
                this.active = true;
                if (this.control) this.control.addClass("active");
                if (b.sett && b.sett.sorciere_auto_purification) {
                    this.startAutoPurif();
                }
            },
            stop: function() {
                this.active = false;
                if (this.control) this.control.removeClass("active");
                this.stopAutoPurif();
            },

            // ----------------------------------------------------------------
            // AUTO-PURIFICATION (polling sur MM.CastedPowers)
            // ----------------------------------------------------------------

            startAutoPurif: function() {
                var e = this;
                e.stopAutoPurif();

                e._pollTimer = setInterval(function() {
                    e._poll();
                }, 100);

                c("info", b.t ? b.t("Auto-purification activee (polling 100ms)") : "Auto-purification activee (polling 100ms)");
            },

            stopAutoPurif: function() {
                var e = this;
                if (e._pollTimer) {
                    clearInterval(e._pollTimer);
                    e._pollTimer = null;
                }
                e._prevPowers      = {};
                e._purifInProgress = {};
                c("debug", b.t ? b.t("Auto-purification desactivee") : "Auto-purification desactivee");
            },

            _poll: function() {
                var e = this;
                if (!e.active) return;
                if (!b.sett || !b.sett.sorciere_auto_purification) return;

                var m = MM.getModels();
                if (!m || !m.CastedPowers) return;

                // Regrouper les sorts par townId
                var byTown = {};
                $.each(m.CastedPowers, function(id, power) {
                    var powerId = power.get('power_id');
                    var townId  = power.get('town_id');
                    if (!byTown[townId]) byTown[townId] = [];
                    byTown[townId].push(powerId);
                });

                // DÃ©tecter les changements et chercher narcissism
                $.each(byTown, function(townId, ids) {
                    var key = ids.slice().sort().join(',');
                    if (key === e._prevPowers[townId]) return; // rien de nouveau
                    e._prevPowers[townId] = key;

                    if (ids.indexOf('narcissism') !== -1) {
                        e._onNarcissismDetected(Number(townId));
                    }
                });
            },

            _onNarcissismDetected: function(townId) {
                var e = this;

                if (e._purifInProgress[townId]) {
                    c("debug", "Purification deja en cours sur ville " + townId);
                    return;
                }

                var townModel = MM.getModels().Town && MM.getModels().Town[townId];
                var townName  = townModel && townModel.getName ? townModel.getName() : ('ville ' + townId);

                // ðŸ”´ Visible 10s
                c("warn",
                    b.t ? b.t("Narcissisme detecte sur [{0}] -> lancement Purification !") : "Narcissisme detecte sur [{0}] -> lancement Purification !",
                    townName
                ).msg(10);

                var cleansePower = GameData.powers['cleanse'];
                if (!cleansePower) {
                    c("error", "Sort 'cleanse' introuvable dans GameData !").msg(10);
                    return;
                }

                var _gods = b.models && b.models.PlayerGods && b.models.PlayerGods[Game.player_id];
                var _favor = _gods ? _gods.getCurrentFavorForGods() : {};
                var favorAvailable = _favor['artemis'] || 0;

                if (favorAvailable < cleansePower.favor) {
                    c("warn",
                        b.t ? b.t("Faveur Artemis insuffisante ({0}/{1}) pour purifier {2} !") : "Faveur Artemis insuffisante ({0}/{1}) pour purifier {2} !",
                        favorAvailable, cleansePower.favor, townName
                    );
                    return;
                }

                e._purifInProgress[townId] = true;

                b.runAtTown(townId, function() {
                    var castedPower = new GameModels.CastedPowers({
                        power_id: 'cleanse',
                        town_id: townId
                    });

                    castedPower.cast({
                        success: function() {
                            delete e._purifInProgress[townId];
                            // ðŸŸ¢ Visible 10s
                            c("info",
                                b.t ? b.t("Purification lancee sur [{0}] !") : "Purification lancee sur [{0}] !",
                                townName
                            ).msg(10);
                        },
                        error: function(err) {
                            delete e._purifInProgress[townId];
                            // ðŸ”´ Visible 10s
                            c("error",
                                b.t ? b.t("Purification echouee sur [{0}] : {1}") : "Purification echouee sur [{0}] : {1}",
                                townName, err && err.error
                            ).msg(10);
                        }
                    });
                });
            },

            // ----------------------------------------------------------------
            // MÃ‰THODES EXISTANTES (inchangÃ©es)
            // ----------------------------------------------------------------

            text: function(b) {
                var p = GameData.powers[b.item];
                var c = a.format("([town]{0}[/town] '{1}')", b.targetTownId, p ? p.name : b.item);
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
                    if (!d) c("debug", "{0} Invalid source town", e.text(a));
                    return false;
                }
                var h = GameData.powers[a.item];
                if (!h) {
                    if (!d) c("debug", "{0} Unknown power", e.text(a));
                    return false;
                }
                var _gods = b.models.PlayerGods[Game.player_id];
                var _favor = _gods ? _gods.getCurrentFavorForGods() : {};
                if (!(h.god_id in _favor) || (h.favor > _favor[h.god_id])) {
                    if (!d) c("debug", "{0} Insufficient favor ({1}/{2})", e.text(a), _favor[h.god_id] || 0, h.favor);
                    return false;
                }
                if (!a.targetTownId) {
                    if (!d) c("debug", "{0} No target town id", e.text(a));
                    return false;
                }
                return true;
            },
            startOrder: function(a, d) {
                var e = this;
                d = typeof d === "function" ? d : function() {};
                if (!e.checkOrder(a, false)) {
                    d("check_fail", a);
                    return;
                }
                var h = GameData.powers[a.item];
                c("debug", b.t ? b.t("{0} Lancement du sort") : "{0} Lancement du sort", e.text(a));

                var castedPower = new GameModels.CastedPowers({
                    power_id: h.id,
                    town_id: a.targetTownId
                });

                b.runAtTown(a.town, function() {
                    a.isRunning = true;
                    a.started = new Date().getTime();
                    castedPower.cast({
                        success: function() {
                            delete a.isRunning;
                            delete a.started;
                            c("info", b.t ? b.t("{0} Sort lancÃ© !") : "{0} Sort lancÃ© !", e.text(a)).msg(10);
                            if (a.repeat !== true) {
                                b.queue.deleteOrder(a);
                                d("ok", a);
                            } else {
                                d("repeat", a);
                            }
                        },
                        error: function(err) {
                            delete a.isRunning;
                            delete a.started;
                            a.fails = (a.fails || 0) + 1;
                            c("error", b.t ? b.t("{0} Sort Ã©chouÃ© : {1}") : "{0} Sort Ã©chouÃ© : {1}", e.text(a), err && err.error).msg(10);
                            d("check_fail", a);
                        }
                    });
                });
            }
        };

        // Surveiller les changements de l'option en temps rÃ©el
        if (b.sett) {
            Object.defineProperty(b.sett, 'sorciere_auto_purification', {
                get: function() { return this._sorciere_auto_purification; },
                set: function(val) {
                    this._sorciere_auto_purification = val;
                    if (b.sorciere && b.sorciere.active) {
                        if (val) {
                            b.sorciere.startAutoPurif();
                        } else {
                            b.sorciere.stopAutoPurif();
                        }
                    }
                },
                configurable: true,
                enumerable: true
            });
        }

        b.queue.modules[b.sorciere.module] = b.sorciere;
        c("info", "Loaded");
        window._gfbot_module_loaded && window._gfbot_module_loaded("SorciÃ¨re", true);
    }).call(this);
}).call(this);
