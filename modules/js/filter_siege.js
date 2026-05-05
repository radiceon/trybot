(function(a) {
    "use strict";
    var b = a.bot,
        c = a.logger.create("BLOCK_TOWN_UNDER_SIEGE");
    b.filters.add("BLOCK_TOWN_UNDER_SIEGE", function(a, d, e, f, g, h) {
        if (b.sett.filter_siege === false) return true;
        if (e && (e.town_id || e.current_town_id)) {
            var i = e.current_town_id ? e.current_town_id : e.town_id,
                j = b.models.Town[i];
            if (!j) {
                c("debug", "Invalid town [town]{0}[/town], request '{1}:{2}' canceled", e.town_id, a, d);
                return false;
            } else if (j.hasConqueror()) {
                c("debug", "[town]{0}[/town] under siege, request '{1}:{2}' canceled", j.id, a, d);
                return false;
            }
        }
        return true;
    });
})(this);
