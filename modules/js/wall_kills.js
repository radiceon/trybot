(function() {
    "use strict";
    var a = this;
    var b = a.bot;
    var c = a.logger.create("WallKills");

    var HELMET = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMTY1Ij48c3R5bGU+Lmh7ZmlsbDojOEI2OTE0fS5oaHtmaWxsOiNDOUE4NEN9Lmhze2ZpbGw6IzVDNDIwOX0uaGR7ZmlsbDojM0QyQjA1fS5we2ZpbGw6IzhCMUExQX0ucGh7ZmlsbDojQzIzMDMwfTwvc3R5bGU+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwtOCkiPjxlbGxpcHNlIGN4PSIxMDAiIGN5PSIyOCIgcng9IjgiIHJ5PSIyMiIgY2xhc3M9InBoIiB0cmFuc2Zvcm09InJvdGF0ZSgtOCwxMDAsMjgpIi8+PGVsbGlwc2UgY3g9IjEwMCIgY3k9IjI2IiByeD0iNSIgcnk9IjIwIiBjbGFzcz0icCIgdHJhbnNmb3JtPSJyb3RhdGUoLTgsMTAwLDI2KSIvPjxwYXRoIGQ9Ik03MCAzOCBRMTAwIDEwIDEzMCAzOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQzIzMDMwIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTMwIDEwMCBRMjggNjggNDAgNTIgUTU1IDMwIDEwMCAyOCBRMTQ1IDMwIDE2MCA1MiBRMTcyIDY4IDE3MCAxMDBaIiBjbGFzcz0iaCIvPjxwYXRoIGQ9Ik01MCA5NSBRNDggNjggNTggNTQgUTcwIDM4IDEwMCAzNiBRMTMwIDM4IDEzOCA1MiBRMTQ2IDY0IDE0NCA5MFoiIGNsYXNzPSJoaCIgb3BhY2l0eT0iLjQiLz48cGF0aCBkPSJNMzAgMTAwIFEyOCAxMTUgMzUgMTI1IFE1MCAxNDAgMTAwIDE0MiBRMTUwIDE0MCAxNjUgMTI1IFExNzIgMTE1IDE3MCAxMDBaIiBjbGFzcz0iaHMiLz48cGF0aCBkPSJNMzAgMTAwIFEyMiAxMDggMjAgMTI1IFEyMiAxMzggMzUgMTQyIFE0MCAxMzggMzUgMTI1WiIgY2xhc3M9ImhzIi8+PHBhdGggZD0iTTE3MCAxMDAgUDE3OCAxMDggMTgwIDEyNSBRMTc4IDEzOCAxNjUgMTQyIFExNjAgMTM4IDE2NSAxMjVaIiBjbGFzcz0iaHMiLz48cmVjdCB4PSI5MyIgeT0iOTgiIHdpZHRoPSIxNCIgaGVpZ2h0PSIzMiIgcng9IjQiIGNsYXNzPSJoZCIvPjxyZWN0IHg9Ijk1IiB5PSIxMDAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIyOCIgcng9IjMiIGNsYXNzPSJocyIvPjxjaXJjbGUgY3g9IjU1IiBjeT0iNzAiIHI9IjQiIGNsYXNzPSJoZCIvPjxjaXJjbGUgY3g9IjU1IiBjeT0iNzAiIHI9IjIiIGNsYXNzPSJoaCIvPjxjaXJjbGUgY3g9IjE0NSIgY3k9IjcwIiByPSI0IiBjbGFzcz0iaGQiLz48Y2lyY2xlIGN4PSIxNDUiIGN5PSI3MCIgcj0iMiIgY2xhc3M9ImhoIi8+PHBhdGggZD0iTTMwIDEwMCBRMjggNjggNDAgNTIgUTU1IDMwIDEwMCAyOCBRMTQ1IDMwIDE2MCA1MiBRMTcyIDY4IDE3MCAxMDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0M5QTg0QyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBhdGggZD0iTTMwIDEwMCBRMjggMTE1IDM1IDEyNSBRNTAgMTQyIDEwMCAxNDQgUTE1NCAxNDIgMTY1IDEyNSBRMTcyIDExNSAxNzAgMTAwIiBmaWxsPSJub25lIiBzdHJva2U9IiM4QjY5MTQiIHN0cm9rZS13aWR0aD0iMS41Ii8+PC9nPjwvc3ZnPg==";

    var LAND_UNITS  = ["sword","slinger","archer","hoplite","rider","chariot","catapult","militia",
                       "medusa","zyklop","harpy","manticore","cerberus","griffin","minotaur","pegasus",
                       "spartoi","calydonian_boar","godsent"];
    var NAVAL_UNITS = ["big_transporter","small_transporter","bireme","attack_ship","demolition_ship",
                       "trireme","colonize_ship","sea_monster","cyclops","ladon","scylla","charybdis"];

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Ã‰TAT EN RAM
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var reportKillsTable = {};
    var wallState        = null;

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // HELPERS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    function readContainer($c) {
        var u = {};
        $c.find(".wall_report_unit[data-unit_id]").each(function() {
            var uid = $(this).data("unit_id");
            var n   = parseInt($(this).data("unit_count"), 10) || 0;
            if (uid && n > 0) u[uid] = n;
        });
        return u;
    }

    function extractAttKills($root) {
        var $containers = $root.find(".wall_unit_container");
        if (!$containers.length) return null;
        return readContainer($containers.eq(0));
    }

    function resolveReportIdFromDialog($dialog) {
        var rid = $dialog.data("report_id") ||
                  $dialog.find("[data-report_id]").first().data("report_id");
        if (rid) return String(rid);
        var found = null;
        $dialog.find("a[href]").each(function() {
            var href = $(this).attr("href") || "";
            var m = href.match(/report[_\/]id[=\/:](\d+)/) || href.match(/\/report\/(\d+)/);
            if (m) { found = m[1]; return false; }
        });
        return found;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // HOOK CLIC SUR LA LISTE DES RAPPORTS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function _installClickHook() {
        $(document).off("click.wk_reportlist").on("click.wk_reportlist", "a[data-reportid]", function() {
            var rid = String($(this).attr("data-reportid") || $(this).data("reportid") || "");
            if (!rid) return;
            window._wk_opening_report_id = rid;
            setTimeout(function() { tryInjectForReport(rid); }, 800);
            setTimeout(function() { tryInjectForReport(rid); }, 1800);
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // FETCH DES REMPARTS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function fetchWallData(callback) {
        b.ajaxRequestGet("building_wall", "index", { town_id: Game.townId }, function(bot, data) {
            if (!data) return;
            var raw = data.html || data.js || (typeof data === "string" ? data : "") || "";
            if (!raw) return;
            // $.parseHTML(..., null, false) parse le HTML SANS executer les <script>.
            // $(raw) les executerait, declenchant le rendu des sliders d'unites du jeu
            // qui crashent si un ID d'unite est absent de GameData.units.
            var $parsed = $($.parseHTML(raw, null, false));
            var $root   = $parsed.filter("#building_wall");
            if (!$root.length) $root = $parsed.find("#building_wall");
            if (!$root.length) $root = $parsed;
            var attKills = extractAttKills($root);
            if (attKills === null) return;
            if (callback) callback(attKills);
        }, "wall_kills");
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // CALCUL DU DIFF
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function computeDiffAndStore(newAtt, reportId) {
        var prev = wallState;
        wallState = { att: newAtt };

        if (!prev) return;

        var beforeAtt = prev.att;
        var land = {}, naval = {}, hasChange = false;
        var keys = {};
        Object.keys(beforeAtt).forEach(function(k) { keys[k] = 1; });
        Object.keys(newAtt).forEach(function(k)    { keys[k] = 1; });

        Object.keys(keys).forEach(function(uid) {
            var diff = (newAtt[uid] || 0) - (beforeAtt[uid] || 0);
            if (diff <= 0) return;
            hasChange = true;
            if (NAVAL_UNITS.indexOf(uid) !== -1) naval[uid] = diff;
            else                                  land[uid]  = diff;
        });

        if (!hasChange) return;

        var entry = {
            land:     land,
            naval:    naval,
            reportId: String(reportId),
            ts:       Date.now()
        };
        reportKillsTable[String(reportId)] = entry;
        setTimeout(function() { tryInjectForReport(String(reportId)); }, 300);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // RÃ‰CEPTION D'UN RAPPORT â†’ fetch remparts â†’ diff
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function onReportArrived(reportId) {
        fetchWallData(function(newAtt) {
            computeDiffAndStore(newAtt, reportId);
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // HOOKS GAMEEVENT
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function _installReportHooks() {
        if (typeof GameEvents === "undefined" || !GameEvents.notification || !GameEvents.notification.report) {
            setTimeout(_installReportHooks, 2000);
            return;
        }
        if (window._wk_report_hooked) return;

        $.Observer(GameEvents.notification.report.arrive).subscribe("WallKills", function(evt, data) {
            var reportId = data && (data.param_id || data.report_id || data.reportId);
            if (reportId) onReportArrived(String(reportId));
        });

        window._wk_report_hooked = true;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // INJECTION DU BOUTON
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function tryInjectForReport(reportId) {
        var kills = reportKillsTable[reportId];
        if (!kills) return;
        if ($("#gfb-wallkills-btn").length) return;
        $(".ui-dialog:visible, .game_window:visible").each(function() {
            var $d = $(this);
            if (!$d.find(".report_unit.unknown").length) return;
            var dialogReportId = window._wk_opening_report_id || resolveReportIdFromDialog($d);
            if (dialogReportId && String(dialogReportId) === String(reportId)) {
                injectPanel(kills);
                return false;
            }
            if (!dialogReportId) {
                injectPanel(kills);
                return false;
            }
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PERSISTANCE VPS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function pushToVPS(reportId, entry) {
        if (!b.friends || typeof b.friends.share !== "function") return;
        if (!b.wall_kills._vpsMap) b.wall_kills._vpsMap = {};
        b.wall_kills._vpsMap[reportId] = entry;
        b.friends.share(undefined, undefined, undefined, undefined, undefined, b.wall_kills._vpsMap);
    }

    function removeFromVPS(reportId) {
        if (!b.friends || typeof b.friends.share !== "function") return;
        if (!b.wall_kills._vpsMap) b.wall_kills._vpsMap = {};
        delete b.wall_kills._vpsMap[reportId];
        b.friends.share(undefined, undefined, undefined, undefined, undefined, b.wall_kills._vpsMap);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // RESTAURATION AU DÃ‰MARRAGE (appelÃ©e par friends.js)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function restorePending(ownWallKills) {
        if (!ownWallKills || typeof ownWallKills !== "object") return;
        b.wall_kills._vpsMap = ownWallKills;

        var toDelete = [];
        Object.keys(ownWallKills).forEach(function(reportId) {
            var entry = ownWallKills[reportId];
            if (!entry || !entry.ts) { toDelete.push(reportId); return; }
            reportKillsTable[reportId] = entry;
        });

        if (toDelete.length > 0) {
            toDelete.forEach(function(id) { delete b.wall_kills._vpsMap[id]; });
            b.friends.share(undefined, undefined, undefined, undefined, undefined, b.wall_kills._vpsMap);
        }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // CONSTRUCTION DU PANNEAU HTML
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function unitRowHTML(uid, count) {
        return '<div data-unit-id="' + uid + '" style="' +
            'display:flex;flex-direction:column;align-items:center;cursor:help;' +
            'background:rgba(0,0,0,0.4);border:1px solid rgba(201,168,76,0.18);' +
            'border-radius:5px;padding:4px 5px;min-width:50px;">' +
            '<div class="unit_icon40x40 ' + uid + '" style="width:40px;height:40px;"></div>' +
            '<span style="font-size:8pt;font-weight:700;color:#f0d080;margin-top:3px;">' + count.toLocaleString() + '</span>' +
        '</div>';
    }

    function buildButton() {
        return '<div id="gfb-wallkills-btn" style="margin-top:6px;margin-bottom:4px;cursor:pointer;">' +
            '<div style="display:inline-flex;align-items:flex-start;gap:4px;' +
            'background:linear-gradient(135deg,#0d1117,#1a2332);' +
            'border:1px solid rgba(201,168,76,0.4);border-radius:4px;' +
            'padding:4px 8px;font-family:Georgia,serif;">' +
            '<span style="font-size:13px;line-height:1;margin-top:1px;">&#128128;</span>' +
            '<span style="display:flex;flex-direction:column;align-items:center;">' +
            '<span style="font-size:7.5pt;font-weight:700;color:#c9a84c;letter-spacing:0.5px;">' +
            b.t("Troupes cachÃ©es tuÃ©es") + '</span>' +
            '<span style="font-size:6pt;color:rgba(201,168,76,0.55);letter-spacing:0.3px;margin-top:1px;">' +
            b.t("click_to_view") + '</span>' +
            '</span>' +
            '<span style="font-size:6pt;font-weight:700;color:#c9a84c;letter-spacing:1px;' +
            'background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);' +
            'border-radius:3px;padding:1px 5px;">GrepoPlus</span>' +
            '</div></div>';
    }

    function buildPanel(kills) {
        var landKeys  = LAND_UNITS.filter(function(u)  { return kills.land[u]  > 0; });
        var navalKeys = NAVAL_UNITS.filter(function(u) { return kills.naval[u] > 0; });
        var tsText    = new Date(kills.ts).toLocaleString();

        var html =
            '<div id="gfb-wallkills-modal" style="' +
            'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;' +
            'display:flex;align-items:center;justify-content:center;">' +
            '<div id="gfb-wallkills-overlay" style="' +
            'position:absolute;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(0,0,0,0.5);"></div>' +
            '<div style="position:relative;z-index:1;min-width:320px;max-width:480px;' +
            'background:linear-gradient(135deg,#0d1117,#111d2b);' +
            'border:1px solid rgba(201,168,76,0.35);border-radius:8px;' +
            'overflow:hidden;font-family:Georgia,serif;box-shadow:0 8px 32px rgba(0,0,0,0.7);">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;' +
            'padding:10px 14px;border-bottom:1px solid rgba(201,168,76,0.15);background:rgba(0,0,0,0.25);">' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-size:18px;line-height:1;">&#128128;</span>' +
            '<span style="font-size:9pt;font-weight:700;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;">' +
            b.t("UnitÃ©s cachÃ©es tuÃ©es") +
            '</span></div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-size:6.5pt;font-weight:700;color:#c9a84c;letter-spacing:1px;' +
            'background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);' +
            'border-radius:3px;padding:2px 6px;margin-left:10px;">GrepoPlus</span>' +
            '<span id="gfb-wallkills-close" style="cursor:pointer;color:#e05555;' +
            'font-size:14pt;line-height:1;padding:0 4px;opacity:0.85;transition:opacity 0.15s;" onmouseover="this.style.opacity=\'1\'" onmouseout="this.style.opacity=\'0.85\'">&times;</span>' +
            '</div></div>' +
            '<div style="padding:14px 16px;">';

        if (!landKeys.length && !navalKeys.length) {
            html += '<div style="text-align:center;font-size:9pt;color:rgba(201,168,76,0.5);padding:10px 0;">' +
                b.t("Aucune unitÃ© cachÃ©e tuÃ©e") + '</div>';
        } else {
            html += '<div style="font-size:7pt;color:rgba(201,168,76,0.35);margin-bottom:10px;">&#9889; ' + tsText + '</div>';
            if (landKeys.length) {
                html += '<div style="font-size:7.5pt;font-weight:700;color:rgba(201,168,76,0.55);' +
                    'text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;' +
                    'border-bottom:1px solid rgba(201,168,76,0.1);padding-bottom:4px;">&#9876; ' +
                    b.t("Terrestres") + '</div>';
                html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
                landKeys.forEach(function(uid) { html += unitRowHTML(uid, kills.land[uid]); });
                html += '</div>';
            }
            if (navalKeys.length) {
                html += '<div style="font-size:7.5pt;font-weight:700;color:rgba(201,168,76,0.55);' +
                    'text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;' +
                    'border-bottom:1px solid rgba(201,168,76,0.1);padding-bottom:4px;">&#9875; ' +
                    b.t("Naval") + '</div>';
                html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
                navalKeys.forEach(function(uid) { html += unitRowHTML(uid, kills.naval[uid]); });
                html += '</div>';
            }
        }
        html += '</div></div></div>';
        return html;
    }

    function showModal(kills) {
        $("#gfb-wallkills-modal").remove();
        $("body").append(buildPanel(kills));
        $("#gfb-wallkills-overlay, #gfb-wallkills-close").on("click", function() {
            $("#gfb-wallkills-modal").remove();
        });
    }

    function injectPanel(kills) {
        if ($("#gfb-wallkills-btn").length) return;
        pushToVPS(String(kills.reportId), kills);
        var $btn = $(buildButton());
        $btn.on("click", function() { showModal(kills); });
        $(".button.simulate_units").last().before($btn);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // INIT AU DÃ‰MARRAGE
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function initWall() {
        fetchWallData(function(attKills) {
            wallState = { att: attKills };
        });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // DÃ‰MARRAGE
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    setTimeout(function() {
        initWall();
        _installReportHooks();
        _installClickHook();
    }, 800);

    // Exposition
    if (!b.wall_kills) b.wall_kills = {};
    b.wall_kills._restorePending = restorePending;
    b.wall_kills._table          = reportKillsTable;
    b.wall_kills._vpsMap         = {};

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // API DEBUG CONSOLE : window._wk
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    window._wk = {
        state:      function() { return wallState; },
        table:      function() { return reportKillsTable; },
        init:       function() { initWall(); },
        fakeReport: function(reportId) { onReportArrived(String(reportId || "TEST_" + Date.now())); },
        inject:     function(reportId) { tryInjectForReport(String(reportId)); },
        testModal:  function() { showModal({ land: { sword: 150, archer: 80, hoplite: 45 }, naval: { bireme: 12 }, reportId: "TEST", ts: Date.now() }); },
        checkHooks: function() { return { report_arrive: !!window._wk_report_hooked, GameEvents: (typeof GameEvents !== "undefined") && !!GameEvents.notification }; },
        restore:    restorePending,
        showModal:  showModal
    };

    window._gfbot_module_loaded && window._gfbot_module_loaded("Remparts", true);

}).call(this);
