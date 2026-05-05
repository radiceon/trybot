(function(a) {
    "use strict";
    var b = a.bot,
        c = a.logger.create("Captcha-Bot");
    var d = {
        timer: null,
        isValid: true,
        wait: false,
        window: null,
        re: $.fn.recaptcha,
        f: $.fn.captcha
    };

    function e(a) {
        var e = function() {
            var f = $("#recaptcha_container"),
                g = $("#g-recaptcha-response");
            if ((g.length == 0) || (f.length == 0)) {
                setTimeout(e, 1E3);
                return;
            }
            var h = {
                sitekey: f.attr("data-sitekey"),
                url: document.location.href
            };
            b.request("captcha:re2", h, function(f) {
                d.isValid = f.result.valid !== false;
                if (!d.isValid) {
                    c("error", "Subscription expired").msg(0);
                    return;
                }
                var h = function(d) {
                    var e = $("#" + a),
                        f = h.bind(null, d);
                    if (e.length < 1) return;
                    b.request("captcha:check", {
                        id: d
                    }, function(h) {
                        switch (h.result.status) {
                            case "processing":
                                c("info", "Captcha not ready yet").msg(10);
                                setTimeout(f, 4E3);
                                break;
                            case "ready":
                                g[0].value = h.result.response;
                                c("info", "Re2 ready").msg(0);
                                e.find(".btn_confirm").click();
                                setTimeout(function() {
                                    var c = $("#" + a);
                                    if (c.length > 0) b.request("captcha:bad", {
                                        id: d
                                    });
                                    else b.request("captcha:ok", {
                                        id: d
                                    });
                                }, 10E3);
                                break;
                            default:
                                setTimeout(f, 5E3);
                                break;
                        }
                    });
                };
                if (f.result.status === "new") h(f.result.id);
                else setTimeout(e, 5E3);
            });
        };
        e();
    }
    // DÃ©tecte si une fenÃªtre captcha est actuellement ouverte (mÃªme logique que le TrÃ©sorier)
    function isCaptchaActive() {
        try { if (window.BotCheckWindowFactory && BotCheckWindowFactory.isBotCheckActive()) return true; } catch(e) {}
        try { if (window.RecaptchaWindowFactory && RecaptchaWindowFactory.isCaptchaWindowOpened()) return true; } catch(e) {}
        if ($("#captcha_window").length > 0) return true;
        if ($("#recaptcha_window").length > 0) return true;
        if ($("#hcaptcha_window").length > 0) return true;
        if ($("#captcha_curtain").length > 0) return true;
        return false;
    }

    // Surveille la rÃ©solution du captcha et reset d.wait automatiquement
    var _captchaWatchdog = null;
    function startCaptchaWatchdog() {
        if (_captchaWatchdog) return; // dÃ©jÃ  en cours
        c("debug", "Watchdog captcha dÃ©marrÃ©, en attente de rÃ©solution...");
        function waitForVisible() {
            if (!isCaptchaActive()) {
                // Pas encore visible, on attend qu'il apparaisse
                _captchaWatchdog = setTimeout(waitForVisible, 1000);
                return;
            }
            pollResolution();
        }
        function pollResolution() {
            if (!isCaptchaActive()) {
                // FenÃªtre fermÃ©e, double-check 2s aprÃ¨s pour Ã©viter les faux positifs
                setTimeout(function() {
                    if (!isCaptchaActive()) {
                        d.wait = false;
                        _captchaWatchdog = null;
                        // Aucune notification ici â€” le trÃ©sorier gÃ¨re ses propres messages
                    } else {
                        _captchaWatchdog = setTimeout(pollResolution, 5000);
                    }
                }, 2000);
            } else {
                _captchaWatchdog = setTimeout(pollResolution, 5000);
            }
        }
        waitForVisible();
    }

    b.captcha = {};
    Object.defineProperty(b.captcha, "isWaiting", {
        get: function() {
            return d.wait;
        },
        set: function(a) {
            if (a == true) {
                d.wait = true;
                startCaptchaWatchdog(); // dÃ©marre le watchdog dÃ¨s qu'on bloque
            }
        }
    });
    (function(c) {
        c.fn.recaptcha = function(c) {
            try {
                d.window = d.re.call(this, c);
                if (b.sett.captcha_enable) setTimeout(function() {
                    e("recaptcha_window");
                }, 7E3);
                return d.window;
            } catch (f) {
                return d.window;
            }
        };
    }(jQuery));
    var f;
    if (window.BotCheckWindowFactory && (typeof BotCheckWindowFactory.isBotCheckActive == "function")) f = function() {
        return BotCheckWindowFactory.isBotCheckActive();
    };
    else f = function() {
        return false;
    };
    var g;
    if (window.RecaptchaWindowFactory && (typeof RecaptchaWindowFactory.isCaptchaWindowOpened == "function")) g = function() {
        return RecaptchaWindowFactory.isCaptchaWindowOpened();
    };
    else g = function() {
        return false;
    };
    b.filters.add("BLOCK_CAPTCHA", function(a, c, e, h, i, j) {
        if (b.captchaFails > 3) return false;
        if (d.wait === true) {
            // Si le captcha n'est plus visible mais le flag est encore bloquÃ©,
            // on lance le watchdog pour le dÃ©bloquer automatiquement
            if (!isCaptchaActive()) startCaptchaWatchdog();
            return false;
        }
        if (f() || g()) return false;
        if (($("#captcha_window").length > 0) || ($("#recaptcha_window").length > 0) || (Math.abs(Timestamp.now() - Game.bot_check) < 10)) return false;
        return true;
    });
    c("info", "Loaded"); window._gfbot_module_loaded && window._gfbot_module_loaded("Captcha", true);
})(this);
