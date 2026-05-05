(function(a) {
    "use strict";
    var b = a.bot;
    if (b.panel) {
        b.panel.remove();
        delete b.panel;
    }
    if (typeof Object.assign !== "function") Object.assign = $.extend;
    angular.module("bot.filters", []).filter("unsafe", ["$sce", function(a) {
        return function(b) {
            return a.trustAsHtml(b);
        };
    }]);
    b.ngApp = angular.module("bot", ["bot.filters"]);
    if (!MM.models && (typeof MM.getModels == "function")) b.models = MM.getModels();
    else b.models = MM.models;
    b.checkPremium = function(a) {
        return b.models.PremiumFeatures[Game.player_id].get(a) > Timestamp.server();
    };
    b.models.hide = new GameModels.Hide();
    return function(c) {
        b.hash = c.hash;
        b.sett = {};
        Object.keys(c.settings).forEach(function(a) {
            var d = c.settings[a];
            if (d === "true") d = true;
            else if (d === "false") d = false;
            b.sett[a] = d;
        });
        var d = $('<div class="' + b.hash + 'p"></div>'),
            e = $('<img class="control" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PHBhdGggZmlsbD0iI2M5YTg0YyIgZD0iTTggNWEzIDMgMCAxMDAgNkEzIDMgMCAwMDggNXptMCAxLjVhMS41IDEuNSAwIDExMCAzIDEuNSAxLjUgMCAwMTAtM3oiLz48cGF0aCBmaWxsPSIjYzlhODRjIiBkPSJNOCAwbC0xIDIuNWE1LjUgNS41IDAgMDAtMS41LjlMMyAyLjUgMS41IDVsMiAxLjVBNS41IDUuNSAwIDAwMy41IDhhNS41IDUuNSAwIDAwLjEgMS41TDEuNSAxMSAzIDEzLjVsMi41LTFhNS41IDUuNSAwIDAwMS41LjlMOCAxNmwxLTIuNmE1LjUgNS41IDAgMDAxLjUtLjlsMi41IDEgMS41LTIuNS0yLTEuNWE1LjUgNS41IDAgMDAuMS0xLjUgNS41IDUuNSAwIDAwLS4xLTEuNWwyLTEuNUwxMyAyLjVsLTIuNSAxQTUuNSA1LjUgMCAwMDkgMi41TDggMHoiLz48L3N2Zz4=" width="16" height="16" />'),
            g = $('<img class="control" src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PGNpcmNsZSBjeD0iOCIgY3k9IjgiIHI9IjciIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjUiLz48dGV4dCB4PSI4IiB5PSIxMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2M5YTg0YyIgZm9udC1zaXplPSIxMCIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXdlaWdodD0iYm9sZCI+PzwvdGV4dD48L3N2Zz4=" width="16" height="16" />'),
            h = $("<span></span>");
        b.panel = d;
        b.being_dragged = false;
        window.bot = b; // toujours exposÃ© pour debug console
        $("body").append(d);
        d.append(e);
        d.append(g);
        d.append(h);
        d.draggable();
        b.controls.settings = e;
        b.controls.base = h;
        g.click(function() {
            window.open("//" + a.session.domain + "/en/bot/doc/", "_blank");
        });
        e.click(function() {
            b.settings();
        });

        // Ouvrir le menu dÃ¨s que possible (tick suivant = Angular prÃªt)
        setTimeout(function() {
            b.settings();
        }, 0);
    };
})(this);
