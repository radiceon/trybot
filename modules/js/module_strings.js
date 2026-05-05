(function(a) {
    function b() {
        var a = {
            name: "Collector",
            start: "Module started",
            stop: "Module stopped",
            msg01: "Farm worked too long, stopped",
            msg02: "Bot rest until [ts]{0}[/ts]",
            msg03: "[town]{0}[/town], cant farm village {1} ({2}), block farm until: [ts]{3}[/ts]",
            msg04: "[town]{0}[/town], block farm in village(s) [{1}] until [ts]{2}[/ts] ({3})",
            msg05: "Strange game server behavior, previous request was sent at [ts]{0}[/ts], but response was not received",
            msg06: "Strange game server behavior, request was too long: {0} sec."
        };
        var b = {
            name: "Commander",
            msg01: "Command #{0} canceled, return at: {1}",
            msg02: "Cancel command #{0} failed: {1}"
        };
        Object.defineProperties(this, {
            farm: {
                get: function() {
                    return a;
                }
            },
            commander: {
                get: function() {
                    return b;
                }
            }
        });
        return this;
    }
    a.translate = new b();
})(this);
