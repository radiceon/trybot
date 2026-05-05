(function(d) {
    "use strict";

    function Logger(d) {
        var logBuffer = [],
            townTagRegex = new RegExp(/\[town\](\d+)\[\/town\]/gi),
            timestampTagRegex = new RegExp(/\[ts\](\d+|\d+\.\d+)\[\/ts\]/gi),
            playerTagRegex = new RegExp(/\[player\](\d+)\[\/player\]/gi),
            playerNameTagRegex = new RegExp(/\[playername\]([^\[]+)\[\/playername\]/gi),
            colorTagRegex = new RegExp("\\[color=([a-z0-9#]+)\\]([^[]+)\\[/color\\]", "gi"),
            htmlCharsRegex = new RegExp(/>|<|\n/g);
        var htmlEscapeMap = {
            ">": "&gt;",
            "<": "&lt;",
            "\n": "<br/>"
        };

        function escapeHtml(logText) {
            return logText.replace(htmlCharsRegex, function(monthStr) {
                return (monthStr in htmlEscapeMap) ? htmlEscapeMap[monthStr] : monthStr
            })
        }

        function parseColorTags(logText, renderedMessage) {
            return logText.replace(colorTagRegex, function(fullColorMatch, colorName, colorText) {
                if (renderedMessage === true) {
                    return ["<span style=\"color:", colorName, "\">", colorText, "</span>"].join("")
                } else {
                    return colorText
                }
            })
        }

        function parseTownTags(logText, renderedMessage) {
            return logText.replace(townTagRegex, function(monthStr, encodedStrings) {
                var townObj = d.towns.get(encodedStrings),
                    resultText = monthStr;
                if (townObj && townObj.notfound !== true) {
                    if (renderedMessage) {
                        var townLinkFragment;
                        if (typeof townObj.getLinkFragment == "function") {
                            townLinkFragment = townObj.getLinkFragment()
                        } else {
                            townLinkFragment = btoa(JSON.stringify({
                                id: townObj.id,
                                ix: townObj.onAudioStarted,
                                iy: townObj.pauseAudio,
                                name: townObj.name
                            }))
                        };
                        resultText = "<span class=\"bbcodes bbcodes_town\"><a class=\"gp_town_link\" href=\"#" + townLinkFragment + "\">" + townObj.name + "</a></span>"
                    } else {
                        resultText = "'" + monthStr + " (" + townObj.name + ")'"
                    }
                };
                return resultText
            })
        }

        function parsePlayerNameTags(logText, renderedMessage) {
            return logText.replace(playerNameTagRegex, function(full, name) {
                if (renderedMessage) {
                    return "<span class=\"bbcodes\"><a class=\"gp_player_link\" href=\"#\" data-player-name=\"" + name + "\">" + name + "</a></span>";
                }
                return name;
            });
        }

        function parseTimestampTags(logText, renderedMessage) {
            return logText.replace(timestampTagRegex, function(monthStr, encodedStrings) {
                var timestamp = Number(encodedStrings);
                timestamp = d.ts2text(timestamp);
                if (renderedMessage) {
                    timestamp = "<span class=\"ts\">" + timestamp + "</span>"
                };
                return timestamp
            })
        }

        function LogEntry(logLevel, rawMessage, buttonLabel, isLoggingEnabled) {
            var logText = parseTownTags(rawMessage),
                dateObj = new Date(),
                A = this;
            logText = parseTimestampTags(logText);
            A.msg = function(scheduleTimeout) {
                if (!isLoggingEnabled()) {
                    return A
                };
                var renderedMessage = escapeHtml(rawMessage);
                renderedMessage = parseTimestampTags(renderedMessage, true);
                renderedMessage = parseTownTags(renderedMessage, true);
                renderedMessage = parsePlayerNameTags(renderedMessage, true);
                renderedMessage = parseColorTags(renderedMessage, true);
                d.ui.message(renderedMessage, logLevel, scheduleTimeout, buttonLabel, logText);
                return A
            };
            A.send = function() {
                d.api.log(logLevel, logText);
                return A
            };
            Object.defineProperties(A, {
                "message": {
                    get: function() {
                        return rawMessage
                    }
                },
                "type": {
                    get: function() {
                        return logLevel
                    }
                },
                "text": {
                    get: function() {
                        return logText
                    }
                },
                "time": {
                    get: function() {
                        return dateObj
                    }
                },
                "module": {
                    get: function() {
                        return buttonLabel
                    }
                }
            });
            return A
        }
        return {
            create: function(moduleName, validateSession) {
                var isLoggingEnabled = function() {
                    return (typeof validateSession == "function") ? validateSession() : true
                };
                return function(logEntries) {
                    if (arguments.length < 2) {
                        return
                    };
                    var loggerName = [];
                    for (var argIndex = 1; argIndex < arguments.length; argIndex++) {
                        loggerName.push(arguments[argIndex])
                    };
                    var logEntries = arguments[0].toLowerCase(),
                        rawMessage = d.format.apply(this, loggerName);
                    var loggerModule = new LogEntry(logEntries, rawMessage, moduleName, isLoggingEnabled);
                    rawMessage = d.ts2text(Timestamp.server()) + " >>> [" + logEntries;
                    if (moduleName) {
                        rawMessage += ", " + moduleName
                    };
                    rawMessage += "] " + loggerModule.text;
                    if (logEntries == "warning") {
                        logEntries = "warn"
                    };
                    if ((logEntries == "error" || logEntries == "warn") && typeof console[logEntries] == "function") {
                        console[logEntries](rawMessage)
                    };
                    logBuffer.push(rawMessage);
                    return loggerModule
                }
            },
            buffer: function() {
                return logBuffer.slice(0)
            }
        }
    }
    d.logger = new Logger(d);
    d.log = d.logger.create();

    function initUtils(d) {
        var bot = d.bot;
        d.RESOURCES = ["wood", "stone", "iron"];
        d.rnd = function dc(minValue, linkData) {
            var minVal = Number(minValue),
                maxVal = Number(linkData);
            if (isNaN(minVal)) {
                minVal = 0
            };
            if (isNaN(maxVal)) {
                maxVal = 0
            };
            return (minVal + (maxVal - minVal) * Math.random())
        };
        d.format = function(logText) {
            var formattedText = logText;
            for (var argIndex = 1; argIndex < arguments.length; argIndex++) {
                formattedText = formattedText.replace("{" + (argIndex - 1) + "}", arguments[argIndex])
            };
            return formattedText
        };
        d.ts2text = function(timestamp) {
            var dateObj = Timestamp.toDate(timestamp + Timestamp.localeGMTOffset()),
                charSet = dateObj.getUTCDate().toString(),
                monthStr = (dateObj.getUTCMonth() + 1).toString(),
                yearStr = dateObj.getUTCFullYear().toString(),
                hoursStr = dateObj.getUTCHours().toString(),
                minutesStr = dateObj.getUTCMinutes().toString(),
                secondsStr = dateObj.getUTCSeconds().toString();
            return (charSet.length == 1 ? "0" + charSet : charSet) + "." + (monthStr.length == 1 ? "0" + monthStr : monthStr) + "." + yearStr + " " + (hoursStr.length == 1 ? "0" + hoursStr : hoursStr) + ":" + (minutesStr.length == 1 ? "0" + minutesStr : minutesStr) + ":" + (secondsStr.length == 1 ? "0" + secondsStr : secondsStr)
        };
        d.cmbFetch = function(townId, callbackFn) {
            var requestPayload = {
                "model_url": "CommandsMenuBubble/" + Game.player_id,
                "action_name": "forceUpdate",
                "arguments": {},
                "town_id": townId,
                "nl_init": NotificationLoader.isGameInitialized()
            };
            requestPayload = JSON.stringify(requestPayload);
            requestPayload = encodeURIComponent(requestPayload);
            requestPayload = "json=" + requestPayload;
            var apiUrl = "/game/frontend_bridge?town_id=" + townId + "&action=execute&h=" + Game.csrfToken;
            $.post(apiUrl, requestPayload, function(responseData) {
                var requestData = responseData.json;
                if ("error" in requestData) {
                    d.log("error", "cmbFetch() error: {0}", requestData.error).msg(0).send();
                    return
                };
                var unitMovements = [];
                if (Array.isArray(requestData.notifications)) {
                    requestData.notifications.forEach(function(notification) {
                        if (notification.subject !== "CommandsMenuBubble") {
                            return
                        };
                        var parsedNotif = JSON.parse(notification.param_str);
                        if (typeof parsedNotif.CommandsMenuBubble !== "object") {
                            return
                        };
                        parsedNotif = parsedNotif.CommandsMenuBubble;
                        if (Array.isArray(parsedNotif.unit_movements)) {
                            unitMovements.push.apply(unitMovements, parsedNotif.unit_movements)
                        }
                    });
                    requestData.notifications = requestData.notifications.filter(function(notification) {
                        return notification.subject !== "CommandsMenuBubble"
                    });
                    try {
                        if (NotificationLoader && (requestData.notifications.length > 0)) {
                            NotificationLoader.recvNotifyData(requestData, false)
                        }
                    } catch (e) {
                        d.log("cmbFetch() notifications: {0}", e).send()
                    }
                }
                // Toujours appeler le callback — même si notifications est absent ou vide
                // (cas normal quand aucun mouvement n'est en cours depuis cette ville)
                if (typeof callbackFn === "function") {
                    callbackFn(unitMovements)
                }
            })
        };
        d.getCommands = function(townModelKey, callbackWrapper) {
            var dl = ["id", "type", "strategy", "arrival_at", "started_at"];
            var farmPayload = townModelKey;
            if (!Array.isArray(farmPayload)) {
                farmPayload = [];
                for (var dm in ITowns.getTowns()) {
                    farmPayload.push(dm)
                }
            };
            if (bot.checkPremium("curator") && (farmPayload.length > 1)) {
                d.log("debug", "Use curator to fetch commands");
                bot.ajaxRequestGet("town_overviews", "command_overview", {}, function(cs, resultText) {
                    var farmList = [];
                    resultText.data.commands.forEach(function(minValue) {
                        var farmResult = {
                            src: {
                                id: minValue.origin_town_id,
                                name: minValue.origin_town_name,
                                link: minValue.townurl_base64_origin
                            },
                            dst: {
                                id: minValue.destination_town_id,
                                name: minValue.destination_town_name,
                                link: minValue.townurl_base64_destination
                            }
                        };
                        if ((farmPayload.indexOf(farmResult.src.id) == -1) && (farmPayload.indexOf(farmResult.dst.id) == -1)) {
                            return
                        };
                        d.towns.update(farmResult.src);
                        d.towns.update(farmResult.dst);
                        dl.forEach(function(isValidated) {
                            if (isValidated in minValue) {
                                farmResult[isValidated] = minValue[isValidated]
                            }
                        });
                        farmResult.quest = (!minValue.destination_town_player_id) || (!minValue.origin_town_player_id);
                        farmList.push(farmResult)
                    });
                    if (typeof callbackWrapper == "function") {
                        callbackWrapper(farmList)
                    }
                }, "commander")
            } else {
                d.log("debug", "Use loop to fetch commands");

                var townObj = farmPayload.length > 0 ? ITowns.getTown(farmPayload[0]) : null;
                if (!townObj) {
                    d.log("debug", "Cant fetch commands, invalid town").send();
                    if (typeof callbackWrapper == "function") {
                        callbackWrapper([])
                    };
                    return
                };
                d.cmbFetch(townObj.id, function(unitMovements) {
                    var farmList = [];
                    if (Array.isArray(unitMovements)) {
                        unitMovements.forEach(function(cs) {
                            var audioFilename = {},
                                dn = {},
                                dp = (cs.incoming === true) || (cs.incoming_attack === true);
                            if (dp) {
                                audioFilename.id = cs.town.id;
                                audioFilename.name = cs.town.name;
                                dn.id = townObj.id;
                                dn.name = townObj.name
                            } else {
                                audioFilename.id = townObj.id;
                                audioFilename.name = townObj.name;
                                dn.id = cs.town.id;
                                dn.name = cs.town.name
                            };
                            var farmResult = {
                                src: audioFilename,
                                dst: dn,
                                quest: cs.town.is_quest == true
                            };
                            d.towns.update(cs.town);
                            dl.forEach(function(isValidated) {
                                if (isValidated in cs) {
                                    farmResult[isValidated] = cs[isValidated]
                                }
                            });
                            farmList.push(farmResult)
                        })
                    };
                    if (typeof callbackWrapper === "function") {
                        callbackWrapper(farmList)
                    }
                })
            }
        };
        d.resources_add = function(townId, du, dq) {
            try {
                if (townId in bot.models.Town) {
                    var socketState = bot.models.Town[townId],
                        resultText = socketState.getResources(),
                        farmData = socketState.getStorageCapacity(),
                        dr = Object.assign({}, du);
                    if (dq === true) {
                        Object.keys(dr).forEach(function(notification) {
                            dr[notification] = -dr[notification]
                        })
                    };
                    for (var dm in dr) {
                        if (dm in resultText) {
                            resultText[dm] += dr[dm];
                            if (resultText[dm] < 0) {
                                resultText[dm] = 0
                            } else {
                                if (resultText[dm] > farmData) {
                                    resultText[dm] = farmData
                                }
                            };
                            socketState.set("last_" + dm, resultText[dm])
                        }
                    }
                    // Ne mettre à jour resources_last_update QUE si on a vraiment modifié
                    // les ressources - évite de perturber la détection d'arrivée de trades
                    socketState.set("resources_last_update", Timestamp.server());
                    if ("population" in dr) {
                        var socketTimer = socketState.getAvailablePopulation();
                        socketTimer += dr.population;
                        if (socketTimer < 0) {
                            socketTimer = 0
                        };
                        socketState.set("available_population", socketTimer)
                    }
                }
            } catch (e) {
                d.log("debug", "resources_add(), exception: {0}", e).send()
            }
        }
    }
    initUtils(d);

    function createBlockManager() {
        var blockTimers = {};
        return function(moduleName, duration) {
            if (isNumber(duration)) {
                if (duration > 0) {
                    blockTimers[moduleName] = Timestamp.server() + duration;
                    return blockTimers[moduleName]
                } else {
                    delete blockTimers[moduleName];
                    return 0
                }
            } else {
                if (moduleName in blockTimers) {
                    var now = Timestamp.server();
                    if (now < blockTimers[moduleName]) {
                        return blockTimers[moduleName]
                    } else {
                        delete blockTimers[moduleName];
                        return 0
                    }
                } else {
                    return 0
                }
            }
        }
    }

    function createScheduler(d) {
        var farmList = [];

        function scheduleAdd(dateObj, randomOffset, scheduleModule) {
            var now = (new Date).getTime();
            if (typeof scheduleModule == "undefined") {
                scheduleModule = "default"
            };
            dateObj = Math.max(dateObj, now) - randomOffset;
            var candidateTimes = [dateObj],
                minTime = 0;
            farmList.forEach(function(notification) {
                if (notification.time > dateObj) {
                    candidateTimes.push(notification.time)
                } else {
                    if (notification.time < now) {
                        minTime++
                    }
                }
            });
            candidateTimes = candidateTimes.sort();
            if (minTime > 10) {
                farmList = farmList.filter(function(notification) {
                    return notification.time >= now
                })
            };
            var pendingData = dateObj;
            for (var argIndex = 0; argIndex < candidateTimes.length - 1; argIndex++) {
                pendingData = candidateTimes[argIndex + 1];
                if ((pendingData - candidateTimes[argIndex]) > 2 * randomOffset) {
                    pendingData = candidateTimes[argIndex];
                    break
                }
            };
            pendingData += randomOffset;
            farmList.push({
                time: pendingData,
                tag: scheduleModule
            });
            return pendingData
        }

        function scheduleClean(dateObj) {
            var candidateTimes = [],
                now = (new Date).getTime();
            dateObj = Math.max(dateObj, now);
            farmList.forEach(function(notification) {
                if (notification.time > dateObj) {
                    candidateTimes.push(notification.time)
                }
            });
            candidateTimes = candidateTimes.sort();
            return candidateTimes.length > 0 ? candidateTimes[0] : 0
        }

        function scheduleTimeout(dateObj, randomOffset, scheduleModule) {
            var now = (new Date).getTime();
            if (typeof dateObj == "undefined") {
                dateObj = 0
            };
            if (typeof randomOffset == "undefined") {
                randomOffset = 4000
            };
            if (typeof scheduleModule == "undefined") {
                scheduleModule = "default"
            };
            var cx = scheduleAdd(dateObj, randomOffset, scheduleModule);
            return Math.max(cx - now, 0)
        }

        function scheduleNearest(scheduleModule) {
            if (typeof scheduleModule == "undefined") {
                scheduleModule = "default"
            };
            farmList.forEach(function(notification) {
                if (notification.tag === scheduleModule) {
                    notification.time = 0
                }
            })
        }

        function getScheduledTime(scheduleModule) {
            if (typeof scheduleModule == "undefined") {
                scheduleModule = "default"
            };
            var now = (new Date).getTime();
            return farmList.reduce(function(charSet, notification) {
                // Ignorer les entrées passées — seules les futures comptent
                return (notification.tag === scheduleModule && notification.time > now)
                    ? Math.max(notification.time, charSet) : charSet
            }, 0)
        }
        this.insert = scheduleAdd;
        this.nearest = scheduleClean;
        this.timeout = scheduleTimeout;
        this.clean = scheduleNearest;
        this.max = getScheduledTime;
        Object.defineProperties(this, {
            items: {
                get: function() {
                    return farmList
                }
            }
        });
        return this
    }

    function createTownManager(d) {
        var linkHrefRegex = new RegExp(/href="\#([^"]+)/);
        var farmList = {};

        function updateTown(townData) {
            if ((typeof townData == "undefined") || (typeof townData.id == "undefined")) {
                return
            };
            if (typeof ITowns.getTown(townData.id) !== "undefined") {
                return
            };
            var townObj = farmList[townData.id] || {};
            townObj.id = townData.id;
            townObj.name = townData.name;
            if ("island" in townData) {
                townObj.island = townData.island
            };
            if (typeof townData.link != "undefined") {
                var monthStr = linkHrefRegex.exec(townData.link);
                if (monthStr) {
                    var linkData = JSON.parse(atob(monthStr[1]));
                    townObj.onAudioStarted = linkData.ix;
                    townObj.pauseAudio = linkData.iy
                };
                townObj.link = townData.link
            } else {
                [{
                    val: "onAudioStarted",
                    keys: ["ix", "onAudioStarted"]
                }, {
                    val: "pauseAudio",
                    keys: ["iy", "pauseAudio"]
                }].forEach(function(notification) {
                    notification.keys.some(function(ek) {
                        if (ek in townData) {
                            townObj[notification.val] = parseInt(townData[ek], 10)
                        };
                        return ek in townData
                    })
                })
            };
            farmList[townObj.id] = townObj
        }

        function processMessage(townId) {
            var townObj = ITowns.getTown(townId);
            if (townObj) {
                townObj.isOwn = true;
                return townObj
            };
            townObj = farmList[townId];
            if (townObj) {
                return townObj
            };
            return {
                id: townId,
                notfound: true
            }
        }

        function getTownName(townId, moduleName, isTarget) {
            var townObj = processMessage(townId);
            function _playerSuffix(tObj, storedName) {
                try {
                    var pName = storedName || "";
                    if (!pName) {
                        var player = tObj && tObj.getPlayer && tObj.getPlayer();
                        pName = player && player.getName && player.getName();
                    }
                    if (!pName) {
                        var tid = tObj && tObj.id || townId;
                        var models = MM.getModels && MM.getModels();
                        var mmTown = models && models.Town && (models.Town[tid] || models.Town[String(tid)] || models.Town[Number(tid)]);
                        if (mmTown) {
                            var pid = mmTown.get("player_id");
                            var mmPlayer = pid && models.Player && (models.Player[pid] || models.Player[String(pid)]);
                            pName = mmPlayer && mmPlayer.getName && mmPlayer.getName();
                        }
                    }
                    if (!pName) return "";
                    var _link = "(<a class='gp_player_link' href='#' data-player-name='" + pName + "' style='color:inherit;'>" + pName + "</a>)";
                    return isTarget ? " " + _link : _link + " ";
                } catch(e) { return ""; }
            }
            if (typeof townObj.getLinkFragment == "function") {
                var _townPart = d.format("<a class=\"gp_town_link\" href=\"#{0}\">{1}</a>", townObj.getLinkFragment(), townObj.name);
                var _playerPart = _playerSuffix(townObj, townObj.player_name);
                // isTarget undefined = collecteur par cité = ville seule
                // isTarget false = ville de départ = (pseudo) ville
                // isTarget true = ville cible = ville (pseudo)
                if (typeof isTarget === 'undefined') return _townPart;
                return isTarget ? _townPart + _playerPart : _playerPart + _townPart;
            } else {
                if (typeof townObj.link == "string") {
                    // Retirer le (pseudodujoueur) du lien
                    return townObj.link.replace(/\s*\([^)]*\)\s*/g, '')
                }
            };
            if (typeof townObj.name == "undefined") {
                if ((typeof moduleName == "string") && (moduleName.length > 0)) {
                    townObj.name = moduleName
                } else {
                    townObj.name = "unknown"
                }
            };
            if ((typeof townObj.onAudioStarted == "number") && (typeof townObj.pauseAudio == "number")) {
                var getTownName = JSON.stringify({
                    id: townObj.id,
                    ix: townObj.onAudioStarted,
                    iy: townObj.pauseAudio,
                    name: townObj.name
                });
                return d.format("<a class=\"gp_town_link\" href=\"#{0}\">{1}</a>", btoa(getTownName), townObj.name)
            } else {
                return d.format("<a class='gp_town_link' href='#'>{0}</a>", townObj.name)
            }
        }

        function moduleName(townId, ej) {
            var townObj = processMessage(townId);
            if ((typeof townObj.name == "string") && (townObj.name.length > 0)) {
                return townObj.name
            } else {
                if ((typeof ej == "string") && (ej.length > 0)) {
                    return ej
                } else {
                    return d.format("[town]{0}[/town]", townId)
                }
            }
        }
        this.update = updateTown;
        this.get = processMessage;
        this.link = getTownName;
        this.name = moduleName;
        this.items = farmList;
        return this
    }


    function createWindowManager() {
        var farmList = {};

        function openWindow(moduleName, windowElement) {
            if (windowElement) {
                farmList[moduleName] = windowElement;
                windowElement.css("playAudio-index", "2100");
                $("#ui_box").append(windowElement);
                windowElement.draggable().css("position", "absolute");
                windowElement.click(function() {
                    for (var notification in farmList) {
                        var errorCount = farmList[notification];
                        if (errorCount && (true)) {
                            errorCount.css("zIndex", "2000")
                        }
                    };
                    windowElement.addClass("2100")
                })
            }
        }

        function closeWindow(moduleName) {
            if (farmList[moduleName]) {
                farmList[moduleName].remove();
                delete farmList[moduleName]
            }
        }
        this.open = openWindow;
        this.close = closeWindow;
        return this
    }

    function createMessageHandler(d) {
        var logToServer = d.logger.create("messages");

        function processMessage(rawMessage) {
            switch (rawMessage.type) {
                case "NOTHING":
                    logToServer("info", "empty message");
                    break;
                case "TEXT":
                    logToServer("info", rawMessage.text).msg(60);
                    break;
                case "PATCH":
                    d.eval_ctx(rawMessage.text);
                    break;
                case "RELOAD":
                    var logText = "<span style=\"color: red;\">Attention</span>, page will farmTimer reloaded in one minute";
                    if (rawMessage.text.length > 0) {
                        logText = logText + ". " + rawMessage.text
                    };
                    logToServer("info", logText).msg(60);
                    setTimeout(function() {
                        window.location.reload()
                    }, (30 + Math.random() * 60) * 1E3);
                    break;
                case "PREMIUM_UPDATE":
                    // Mise à jour de licence en temps réel depuis le VPS
                    if (d.licenseChecker && typeof d.licenseChecker.check === "function") {
                        d.licenseChecker.check();
                    }
                    break
            }
        }

        // messages:poll supprimé — le serveur pousse les messages via WebSocket (type: "SERVER_MESSAGE")
        // Le WS dans connectPremiumWS() appelle processMessage() en temps réel.
        // On garde pollMessages() uniquement comme fallback manuel (jamais appellé auto).
        function pollMessages() {
            d.api.request("messages:poll", {}, function(requestData) {
                if (Array.isArray(requestData.result.messages)) {
                    requestData.result.messages.forEach(processMessage)
                }
            })
        }
        // setInterval supprimé — plus de polling toutes les 10 min
        pollMessages(); // appel unique au démarrage pour vider la file existante
        this.poll = pollMessages;
        return this
    }

    function createApiClient(d) {
        var apiUrl = "//" + d.session.domain + "/" + d.session.lang + "/bot/ajaxv2/";
        var apiLogger = d.logger.create("api");
        function sendViaAjax(methodName, requestData, callbackFn) {
            var requestPayload = {
                key: d.session.key,
                method: methodName,
                data: requestData
            };
            requestPayload = JSON.stringify(requestPayload);
            $.post(apiUrl, requestPayload, function(responseData) {
                responseData = JSON.parse(responseData);
                if (typeof callbackFn == "function") {
                    callbackFn(responseData)
                }
            }, "text")
        }

        function apiRequest(methodName, requestData, originalCallback) {
            var callbackFn = function(responseData) {
                if (responseData.status !== "ok") {
                    apiLogger("error", "method: {0}, error: {1}", methodName, responseData.error).msg(60)
                } else {
                    if (typeof originalCallback == "function") {
                        originalCallback(responseData)
                    }
                }
            };
            sendViaAjax(methodName, requestData, callbackFn)
        }

        function logToServer(logLevel, logText) {
            apiRequest("bot:log", {
                "log": [{
                    "type": logLevel,
                    "text": logText
                }]
            })
        }

        function loadFarm() {
            apiRequest("farm:farm", {}, function(requestData) {
                d.eval_ctx(requestData.result.js);
            })
        }
        this.request = apiRequest;
        this.log = logToServer;
        this.farm = loadFarm;
        return this
    }

    function createMessageUI() {
        var messageContainer = $("body"),
            ep = $("<div id=\"ba26faef5msgs\" class=\"bot messages ui-dialog\" style=\"position:fixed!important;right:20px!important;bottom:20px!important;width:420px!important;max-width:calc(100vw - 44px)!important;z-index:4!important;background:transparent!important;pointer-events:none!important;\"></div>"),
            eo = $("<div class=\"bot cape\"></div>");
        var retryCount = null,
            el = false;

        function buildLogMessage(logText, ev, scheduleTimeout, buttonLabel, plainText) {
            var updateData = d.ts2text(Timestamp.server()),
                ev = ev || "message",
                scheduleTimeout = (typeof scheduleTimeout === "undefined") ? 5E3 : scheduleTimeout * 1E3;

            // Détection d'attaque : basculer sur la classe "attack" pour l'icône épée
            var isAttack = (ev === "error") && (
                /attaque|attack|ennemi|enemy|combat|troupe|armée|army|militia|dodge|cs incoming/i.test(logText) ||
                (typeof buttonLabel === "string" && /commander|herald/i.test(buttonLabel))
            );
            var cssClass = isAttack ? "attack" : ev;

            // Badge module en doré dans le caption
            var moduleTag = (typeof buttonLabel === "string" && buttonLabel)
                ? "<span class=\"module\">" + buttonLabel + "</span>"
                : "";

            // Ornements grecs
            var ornament = "<span class=\"notif-ornament\">⊹ ⊹ ⊹</span>";

            var html = "<div class=\"" + cssClass + "\" style=\"position:relative!important;\">" +
                "<span class=\"notif-close\" title=\"" + (d.t ? d.t("Fermer") : "Fermer") + "\">✕</span>" +
                "<div class=\"caption\" style=\"display:flex !important;align-items:center !important;\">" + updateData + moduleTag + "<span class=\"notif-gp-badge\">GrepoPlus</span></div>" +
                "<div class=\"text\">" + logText + "</div>" +
                ornament +
                "</div>";

            var renderedMessage = $(html);
            renderedMessage.find(".notif-close").click(function() {
                renderedMessage.remove();
            });
            ep.prepend(renderedMessage);
            // Limite à 5 notifications visibles — supprimer les plus anciennes
            var _msgs = ep.children();
            if (_msgs.length > 6) {
                _msgs.slice(5).remove();
            }
            // ── Historique des notifications (50 max) ──────────────────────
            var _bot = d.bot || d;
            if (!_bot._notifHistory) _bot._notifHistory = [];
            _bot._notifHistory.unshift({
                ts:   new Date(),
                msg:  plainText || logText.replace(/<[^>]+>/g, '').replace(/\[[^\]]+\]/g, '').trim(),
                html: logText,
                type: cssClass,
                icon: cssClass === 'error' ? '❌' : cssClass === 'warning' ? '⚠️' : cssClass === 'ally' ? '🟢' : cssClass === 'attack' ? '⚔️' : '🔔',
                module: buttonLabel || ""
            });
            if (_bot._notifHistory.length > 50) _bot._notifHistory.length = 50;
            // Mettre à jour le scope Angular si le panel est ouvert
            if (_bot._notifScopeRef && _bot._notifScopeRef.data) {
                var _s = _bot._notifScopeRef;
                try {
                    var _apply = function() {
                        _s.data.notifHistory = _bot._notifHistory;
                        if (_s.data.activeTab !== 'notifHistory' && !_s.data.notifPanelOpen) {
                            _s.data.notifBadge = (_s.data.notifBadge || 0) + 1;
                        }
                    };
                    if (_s.$$phase || _s.$root.$$phase) _apply();
                    else _s.$apply(_apply);
                } catch(_e) {}
            }
            // ───────────────────────────────────────────────────────────────
            if (scheduleTimeout > 0) {
                setTimeout(function() {
                    renderedMessage.remove()
                }, scheduleTimeout)
            }
        }

        function formatEntry(duration, logText) {
            var sessionData = parseInt(duration, 10);

            function createTimeout() {
                eo.html(logText);
                if (!el) {
                    el = true;
                    messageContainer.prepend(eo)
                }
            }

            function sendLogBatch() {
                el = false;
                eo.remove()
            }
            clearTimeout(retryCount);
            if (sessionData > 0) {
                createTimeout();
                retryCount = setTimeout(sendLogBatch, sessionData * 1e3)
            } else {
                sendLogBatch()
            }
        }
        messageContainer.append(ep);
        this.message = buildLogMessage;
        this.cape = formatEntry;
        return this
    }



    // ── Système de licence premium par module ────────────────────────────────
    var PREMIUM_MODULES = {
        farm:      "Collecteur",
        recruiter: "Recruteur",
        foreman:   "Constructeur",
        trader:    "Marchand",
        wonder:    "Merveille",
        tresorier: "Trésorier"
    };

    // URLs serveur — secret injecté dynamiquement par le VPS au moment du chargement
    var TOKEN_URL  = "https://grepoplus.duckdns.org/premium/token";
    var CHECK_URL  = "https://grepoplus.duckdns.org/premium/check";
    var BOT_SECRET = "fa0d63013a54682678425cd1c1f15d24d4fda1894c5e620a257f55836af958df";

    // Exposer le secret et la fonction HMAC pour les autres modules (friends.js, etc.)
    window._grepoSecret = BOT_SECRET;

    // HMAC-SHA256 synchrone (implémentation légère — pas de dépendance externe)
    window._grepoHmac = (function() {
        function safeAdd(x, y) { var lsw=(x&0xFFFF)+(y&0xFFFF); return (((x>>16)+(y>>16)+(lsw>>16))<<16)|(lsw&0xFFFF); }
        function bitRotateLeft(num, cnt) { return (num<<cnt)|(num>>>(32-cnt)); }
        function md_f(t,b,c,d) { if(t<20)return(b&c)|((~b)&d); if(t<40)return b^c^d; if(t<60)return(b&c)|(b&d)|(c&d); return b^c^d; }
        function md_kt(t) { return(t<20)?1518500249:(t<40)?1859775393:(t<60)?-1894007588:-899497514; }
        function coreSha1(x, len) {
            x[len>>5]|=0x80<<(24-len%32); x[((len+64>>9)<<4)+15]=len;
            var w=new Array(80), a=1732584193, b=-271733879, c=-1732584194, d=271733878, e=-1009589776;
            for(var i=0;i<x.length;i+=16){var olda=a,oldb=b,oldc=c,oldd=d,olde=e;for(var j=0;j<80;j++){w[j]=j<16?x[i+j]:bitRotateLeft(w[j-3]^w[j-8]^w[j-14]^w[j-16],1);var t2=safeAdd(safeAdd(bitRotateLeft(a,5),md_f(j,b,c,d)),safeAdd(safeAdd(e,w[j]),md_kt(j)));e=d;d=c;c=bitRotateLeft(b,30);b=a;a=t2;}a=safeAdd(a,olda);b=safeAdd(b,oldb);c=safeAdd(c,oldc);d=safeAdd(d,oldd);e=safeAdd(e,olde);}
            return [a,b,c,d,e];
        }
        function str2binb(str) { var bin=[],mask=(1<<8)-1; for(var i=0;i<str.length*8;i+=8)bin[i>>5]|=(str.charCodeAt(i/8)&mask)<<(24-i%32); return bin; }
        function binb2hex(binarray) { var hex="0123456789abcdef",str=""; for(var i=0;i<binarray.length*4;i++)str+=hex.charAt((binarray[i>>2]>>((3-i%4)*8+4))&0xF)+hex.charAt((binarray[i>>2]>>((3-i%4)*8))&0xF); return str; }
        function binb2str(bin) { var str="",mask=(1<<8)-1; for(var i=0;i<bin.length*32;i+=8)str+=String.fromCharCode((bin[i>>5]>>>(24-i%32))&mask); return str; }
        function sha1(s) { return binb2hex(coreSha1(str2binb(s),s.length*8)); }
        // HMAC-SHA256 simplifié via SHA1 (suffisant pour anti-scraping, pas pour crypto sensible)
        // Pour une vraie HMAC-SHA256, on utilise la version ci-dessous basée sur XOR de blocs
        function hmacSha1(key, data) {
            var bkey=str2binb(key),ipad=[],opad=[];
            if(bkey.length>16)bkey=coreSha1(bkey,key.length*8);
            for(var i=0;i<16;i++){ipad[i]=bkey[i]^0x36363636;opad[i]=bkey[i]^0x5C5C5C5C;}
            var hash=coreSha1(ipad.concat(str2binb(data)),512+data.length*8);
            return binb2hex(coreSha1(opad.concat(hash),512+160));
        }
        return function(secret, message) {
            try { return hmacSha1(secret, message); } catch(e) { return ""; }
        };
    })();

    function createLicenseChecker(d) {
        var bot = d.bot;

        // Initialise tous les modules à false — cadenas visibles immédiatement
        bot.premiumModules = { farm: false, recruiter: false, foreman: false, trader: false, wonder: false, tresorier: false };

        // Player ID partagé entre checkLicense et connectPremiumWS
        var currentPlayerId = Game.player_id;
        try {
            var _models = MM.getModels();
            var _firstKey = Object.keys(_models.Player)[0];
            currentPlayerId = _models.Player[_firstKey].getId();
        } catch(e) {}

        function getModule(name) {
            if (name === "farm") return bot._farmModule || bot[name];
            return bot[name];
        }

        // Stockage prive des fonctions originales -- inaccessible depuis la console
        var _lockedOriginals = {};
        var _licenseBootDone = false;

        // Marquer le boot comme terminé dès que _gfbot_boot_done est appelé
        var _origBootDone = window._gfbot_boot_done;
        window._gfbot_boot_done = function() {
            _licenseBootDone = true;
            if (typeof _origBootDone === "function") _origBootDone();
        };

        function lockModule(name, label) {
            var mod = getModule(name);
            if (!mod) return;
            if (typeof mod.stop === "function" && mod.active) mod.stop();
            // Sauvegarde dans closure privee, jamais sur l'objet public
            if (!_lockedOriginals[name]) {
                // Si déjà frozen (configurable:false), ne pas retenter — évite TypeError
                var _desc = Object.getOwnPropertyDescriptor(mod, "start");
                if (_desc && _desc.writable === false && _desc.configurable === false) return;
                _lockedOriginals[name] = mod.start;
            }
            var lockFn = function() {
                d.logger.create(label)("error", "Module non inclus dans votre licence").msg(10);
            };
            // Bloquer la réécriture depuis la console (configurable:true pour permettre unlock futur)
            try {
                Object.defineProperty(mod, "start", { value: lockFn, writable: false, configurable: true });
            } catch(e) { mod.start = lockFn; }
            // Supprime toute reference publique a la fonction originale
            if (mod._start_orig) delete mod._start_orig;
            // premiumModules[name] en lecture seule pour empêcher bot.premiumModules.farm = true en console
            try {
                Object.defineProperty(bot.premiumModules, name, { value: false, writable: false, configurable: true });
            } catch(e) { bot.premiumModules[name] = false; }
            console.warn("[Premium] \uD83D\uDD12 Verrouill\u00e9 :", label);
            if (!_licenseBootDone && window._gfbot_module_loaded) window._gfbot_module_loaded(label, "lock");
        }

        function unlockModule(name, label) {
            var mod = getModule(name);
            // Même sans objet bot associé (ex: tresorier = module UI pur), on déverrouille premiumModules
            if (mod) {
                if (_lockedOriginals[name]) {
                    // Restaurer start — configurable:true pour permettre un re-lock ultérieur
                    try { Object.defineProperty(mod, "start", { value: _lockedOriginals[name], writable: false, configurable: true }); }
                    catch(e) { mod.start = _lockedOriginals[name]; }
                    delete _lockedOriginals[name];
                }
            }
            // Rendre premiumModules[name] writable:false à true (valeur non-writable aussi, mais vraie)
            try {
                Object.defineProperty(bot.premiumModules, name, { value: true, writable: false, configurable: true });
            } catch(e) { bot.premiumModules[name] = true; }
            if (!_licenseBootDone && window._gfbot_module_loaded) window._gfbot_module_loaded(label, true);
        }

        function applyLicense(granted) {
            Object.keys(PREMIUM_MODULES).forEach(function(name) {
                var label = PREMIUM_MODULES[name];
                if (granted[name] === true || granted["all"] === true) {
                    unlockModule(name, label);
                } else {
                    lockModule(name, label);
                }
            });
            try {
                var scope = angular.element(document.querySelector(".botSettings")).scope();
                if (scope) {
                    if (scope.data && scope.data.shopModules) {
                        scope.data.shopModules.forEach(function(mod) {
                            mod.active = !!(bot.premiumModules && bot.premiumModules[mod.id] === true);
                        });
                        scope.data.hasAll = !!(bot.premiumModules &&
                            Object.keys(bot.premiumModules).length > 0 &&
                            Object.keys(bot.premiumModules).every(function(k){ return bot.premiumModules[k]; }));
                    }
                    // Sync premiumModules dans data et moduleActive
                    scope.premiumModules = bot.premiumModules;
                    if (scope.data) scope.data.premiumModules = bot.premiumModules;
                    if (scope.data && bot.premiumExpiry) scope.data.premiumExpiry = bot.premiumExpiry;
                    if (scope.moduleActive) {
                        Object.keys(bot.premiumModules).forEach(function(name) {
                            if (bot.premiumModules[name] === false) {
                                scope.moduleActive[name] = false;
                            }
                        });
                    }
                    scope.$apply();
                }
            } catch(e) {}
            // Mettre à jour le cadenas trader dans la fenêtre ville si débloqué
            try {
                if (bot.premiumModules && bot.premiumModules.trader === true) {
                    $(".gp-tq-lock").remove();
                    $(".gp-trader-queue").css("min-height", "");
                }
            } catch(e) {}
        }

        function triggerTutorial() {
            if (bot.tutorial && typeof bot.tutorial.maybeStart === "function") {
                bot.tutorial.maybeStart();
            }
        }

        function checkLicense() {
            var playerId, playerName;
            try {
                var models = MM.getModels();
                var firstKey = Object.keys(models.Player)[0];
                playerId   = models.Player[firstKey].getId();
                playerName = models.Player[firstKey].getName();
            } catch (e) {
                playerId   = Game.player_id;
                playerName = Game.player_name;
            }


            // Étape 1 : demander un token à usage unique au serveur
            $.ajax({
                url: TOKEN_URL,
                method: "POST",
                contentType: "application/json",
                data: JSON.stringify({ player_id: playerId, player_name: playerName, secret: BOT_SECRET }),
                timeout: 8000,
                success: function(tokenRes) {
                    if (!tokenRes || !tokenRes.token) {
                        console.error("[Premium] Pas de token reçu, tout verrouillé");
                        if (!bot.premiumData) bot.premiumData = { tutorial_done: false };
                        applyLicense({});
                        triggerTutorial();
                        return;
                    }
                    // Étape 2 : utiliser le token immédiatement (usage unique, expire 30s)
                    $.ajax({
                        url: CHECK_URL,
                        method: "POST",
                        contentType: "application/json",
                        data: JSON.stringify({ token: tokenRes.token }),
                        timeout: 8000,
                        success: function(response) {
                            try {
                                var res = (typeof response === "string") ? JSON.parse(response) : response;
                                if (res.status === "ok" && res.modules) {
                                    if (res.expiry) bot.premiumExpiry = res.expiry;
                                    // Stocker globals et customs VPS — appliqués à l'ouverture des paramètres
                                    if (res.settings_globals && typeof res.settings_globals === "object") {
                                        bot._vpsGlobals = res.settings_globals;
                                        // Écraser bot.sett ENTIÈREMENT avec les données VPS — pas de merge partiel
                                        if (bot.sett && typeof bot.sett === "object") {
                                            var _keys = Object.keys(res.settings_globals);
                                            for (var _i = 0; _i < _keys.length; _i++) {
                                                bot.sett[_keys[_i]] = res.settings_globals[_keys[_i]];
                                            }
                                        }
                                    }
                                    if (res.settings_worlds && typeof res.settings_worlds === "object") {
                                        bot._vpsWorlds = res.settings_worlds;
                                    }
                                    if (res.settings_queue && Array.isArray(res.settings_queue)) {
                                        // Stocker en attente — bot.queue peut ne pas encore exister
                                        bot._pendingVpsQueue = res.settings_queue;
                                        // Si bot.queue est déjà prêt, injecter immédiatement
                                        if (bot.queue) {
                                            bot.queue.items = bot.queue.items.filter(function(i) { return i.isRunning; });
                                            var _vpsQIds = bot.queue.items.map(function(i) { return String(i.id); });
                                            res.settings_queue.forEach(function(item) {
                                                if (_vpsQIds.indexOf(String(item.id)) === -1) {
                                                    bot.queue.items.push(item);
                                                    _vpsQIds.push(String(item.id));
                                                }
                                            });
                                            bot._pendingVpsQueue = null;
                                            // Forcer le rafraîchissement Angular si le panel settings est ouvert
                                            try {
                                                var _injEarly = angular.element(document.querySelector(".botSettings")).injector();
                                                if (_injEarly) {
                                                    var _rsEarly = _injEarly.get("$rootScope");
                                                    if (!_rsEarly.$$phase) _rsEarly.$digest();
                                                }
                                            } catch(e) {}
                                        }
                                    }
                                    // Stocker tutorial_done, trial et isAdmin côté bot
                                    if (!bot.premiumData) bot.premiumData = {};
                                    bot.premiumData.tutorial_done = (res.tutorial_done === true);
                                    bot.premiumData.trial = (res.trial === true);
                                    bot.isAdmin = (res.isAdmin === true);
                                    // Restaurer la langue sauvegardée sur le serveur
                                    if (res.lang && ctx.setLang && typeof ctx.setLang === "function") {
                                        var _savedLang = String(res.lang).toLowerCase();
                                        if (_savedLang !== (ctx.detectLang ? ctx.detectLang() : "en")) {
                                            ctx.setLang(_savedLang);
                                        }
                                    }
                                    applyLicense(res.modules);
                                    triggerTutorial();
                                    // Mettre à jour le scope Angular si le panel est déjà ouvert (race condition globals + customs)
                                    try {
                                        var _scope = angular.element(document.querySelector(".botSettings")).scope();
                                        if (_scope && _scope.data) {
                                            _scope.data.isAdmin = bot.isAdmin;
                                            _scope.data.trialUsed = !!(bot.premiumData && bot.premiumData.trial);

                                            // ── Globals : injecter dans data.s ──
                                            if (res.settings_globals && typeof res.settings_globals === "object" && Object.keys(res.settings_globals).length > 0) {
                                                if (typeof _scope._pauseSettWatch === "function") _scope._pauseSettWatch();
                                                Object.keys(res.settings_globals).forEach(function(k) {
                                                    _scope.data.s[k] = res.settings_globals[k];
                                                });
                                                if (typeof _scope._resumeSettWatch === "function") _scope._resumeSettWatch();
                                            }

                                            // ── Customs : injecter dans bot.custom puis reconstruire data.customs ──
                                            var _openWorld = (function() {
                                                try { return window.location.hostname.split(".")[0]; } catch(e) { return "unknown"; }
                                            })();
                                            if (res.settings_worlds && res.settings_worlds[_openWorld] && res.settings_worlds[_openWorld].customs && bot.custom) {
                                                var _vpsCust = res.settings_worlds[_openWorld].customs;
                                                var _existingTowns = Object.keys(ITowns.getTowns ? ITowns.getTowns() : {}).map(String);
                                                Object.keys(_vpsCust).forEach(function(townId) {
                                                    if (_existingTowns.indexOf(String(townId)) === -1) return;
                                                    var cur = bot.custom.get(townId);
                                                    Object.assign(cur, _vpsCust[townId]);
                                                });
                                                // Reconstruire data.customs dans le scope Angular
                                                if (typeof _scope._pauseCustomWatch === "function") _scope._pauseCustomWatch();
                                                _scope.data.customs = Object.keys(bot.custom.items).map(function(x) {
                                                    var value = Object.assign({}, bot.custom.items[x]);
                                                    value.attr = {
                                                        townId: x,
                                                        townName: ctx.towns ? ctx.towns.name(x) : x,
                                                        townLink: ctx.towns ? ctx.towns.link(x) : "#",
                                                        isOwnTown: ITowns.getTown(x) ? true : false
                                                    };
                                                    value.attr.isTradeFilter = !value.attr.isOwnTown && (value.autotrade == "disabled");
                                                    return value;
                                                });
                                                if (typeof _scope._resumeCustomWatch === "function") _scope._resumeCustomWatch();
                                            }

                                            // ── Queue : remplacer les items VPS (source de vérité) ──
                                            // On garde uniquement les items isRunning natifs du jeu,
                                            // puis on injecte la liste VPS par dessus pour éviter les doublons.
                                            if (res.settings_queue && Array.isArray(res.settings_queue) && bot.queue) {
                                                bot.queue.items = bot.queue.items.filter(function(i) { return i.isRunning; });
                                                var _existingQIds = bot.queue.items.map(function(i) { return String(i.id); });
                                                res.settings_queue.forEach(function(item) {
                                                    if (_existingQIds.indexOf(String(item.id)) === -1) {
                                                        bot.queue.items.push(item);
                                                        _existingQIds.push(String(item.id));
                                                    }
                                                });
                                            }
                                            // Forcer le rafraîchissement Angular des controllers enfants (Docent, Foreman, etc.)
                                            // dont s.queue est un getter — $apply seul ne suffit pas, il faut $digest sur $rootScope.
                                            try {
                                                var _injector = angular.element(document.querySelector(".botSettings")).injector();
                                                if (_injector) {
                                                    var _rs = _injector.get("$rootScope");
                                                    if (!_rs.$$phase) _rs.$digest();
                                                }
                                            } catch(e) {}

                                            if (typeof _scope.buildSortedNav === "function") _scope.buildSortedNav();
                                            _scope.$apply();
                                        }
                                    } catch(e) {}
                                    // Afficher les notifications en attente
                                    if (res.notifications && res.notifications.length > 0) {
                                        var moduleLabels = { farm:"Collecteur", recruiter:"Recruteur", foreman:"Constructeur", trader:"Marchand", wonder:"Merveille" };
                                        var friendRequestCount = 0;
                                        res.notifications.forEach(function(notif) {
                                            if (notif.type === "GIFT_RECEIVED") {
                                                var modLabel = moduleLabels[notif.module] || notif.module;
                                                ctx.log("ally", d.t("🎁 [playername]{0}[/playername] vous a offert le module {1} pour 1 mois !"), notif.from, modLabel).msg(0);
                                            }
                                            if (notif.type === "FRIEND_REQUEST") { friendRequestCount++; }
                                            if (notif.type === "FRIEND_ACCEPTED") {
                                                ctx.log("ally", "\u2705 [playername]{0}[/playername] a accept\u00e9 votre demande d'ami !", notif.by).msg(10);
                                            }
                                            if (notif.type === "MODULE_EXPIRING_SOON") {
                                                ctx.log("warning", d.t("⚠️ Votre module {0} expire aujourd'hui !"), moduleLabels[notif.module] || notif.module).msg(0);
                                            }
                                            if (notif.type === "MODULE_EXPIRED") {
                                                ctx.log("error", d.t("❌ Votre module {0} a expiré. Rendez-vous dans le Shop pour le renouveler."), moduleLabels[notif.module] || notif.module).msg(0);
                                            }
                                            if (notif.type === "MODULE_REVOKED_CHARGEBACK") {
                                                ctx.log("error", d.t("⚠️ Votre accès au module {0} a été révoqué suite à un litige de paiement."), moduleLabels[notif.module] || notif.module).msg(0);
                                            }
                                        });
                                        if (friendRequestCount === 1) {
                                            ctx.log("ally", d.t("👥 Vous avez 1 demande d'ami en attente !")).msg(20);
                                        } else if (friendRequestCount > 1) {
                                            ctx.log("ally", d.t("👥 Vous avez {0} demandes d'ami en attente !"), friendRequestCount).msg(20);
                                        }
                                    }
                                } else {
                                    console.warn("[Premium] Réponse invalide, tout verrouillé");
                                    if (!bot.premiumData) bot.premiumData = { tutorial_done: false };
                                    applyLicense({});
                                    triggerTutorial();
                                }
                            } catch (e) {
                                console.error("[Premium] Erreur parsing réponse, tout verrouillé");
                                if (!bot.premiumData) bot.premiumData = { tutorial_done: false };
                                applyLicense({});
                                triggerTutorial();
                            }
                        },
                        error: function(xhr, status) {
                            console.error("[Premium] Erreur vérification (" + status + "), tout verrouillé");
                            if (!bot.premiumData) bot.premiumData = { tutorial_done: false };
                            applyLicense({});
                            triggerTutorial();
                        }
                    });
                },
                error: function(xhr, status) {
                    console.error("[Premium] VPS injoignable (" + status + "), tout verrouillé par sécurité");
                    if (!bot.premiumData) bot.premiumData = { tutorial_done: false };
                    applyLicense({});
                    triggerTutorial();
                }
            });
        }

        // Vérification au démarrage, après init des modules
        setTimeout(checkLicense, 1500);

        // Watchdog licence : re-vérifie uniquement si le WS est mort (coupure réseau, PC en veille)
        // En temps normal, c'est le serveur qui push PREMIUM_UPDATE via WS → checkLicense()
        setInterval(function() {
            if (!ctx._premiumWS || ctx._premiumWS.readyState !== 1) {
                checkLicense();
            }
        }, 30 * 60 * 1000);

        // Expose checkLicense pour les mises à jour en temps réel
        d.licenseChecker = { check: checkLicense };

        // Connexion WebSocket premium pour mises à jour instantanées
        var _premiumWSFirstConnect = true;
        function connectPremiumWS() {
            var wsUrl = "wss://grepoplus.duckdns.org/premium/ws?key=" + (d.session.key || "local");
            try {
                var WSClass = window._OrigWS || window.WebSocket;
                var ws = new WSClass(wsUrl);
                ws.onopen = function() {
                    ctx._premiumWS = ws; // exposé pour mise à jour de langue en temps réel
                    var _identifyLang = (ctx && typeof ctx.detectLang === "function") ? ctx.detectLang() : "en";
                    ws.send(JSON.stringify({ type: "identify", player_id: currentPlayerId, world: window.location.hostname.split(".")[0], lang: _identifyLang }));
                    // Charger la liste d'amis instantanément via WS dès la connexion (zéro HTTP)
                    setTimeout(function() {
                        try {
                            var _myId   = String(Game.player_id);
                            var _myName = "";
                            try { var _m = MM.getModels(); _myName = _m.Player[Object.keys(_m.Player)[0]].getName(); } catch(e) { _myName = Game.player_name || ""; }
                            var _world  = window.location.hostname.split(".")[0];
                            var _reqId  = "friends_init_" + Date.now();
                            ws.send(JSON.stringify({ type: "FRIENDS_LIST_REQUEST", player_id: _myId, player_name: _myName, world: _world, _reqId: _reqId }));
                            // Le résultat arrivera via WS_REPLY → _handleWsReply → _list mis à jour
                            if (d.bot && d.bot.friends) {
                                d.bot.friends._wsCallbacks = d.bot.friends._wsCallbacks || {};
                                d.bot.friends._wsCallbacks[_reqId] = function(err, r) {
                                    if (err || !r) return;
                                    d.bot.friends._list = (r.friends) || [];
                                    // Mettre à jour tous les FriendsController ouverts
                                    try {
                                        document.querySelectorAll('[ng-controller="FriendsController"]').forEach(function(el) {
                                            var sc = angular.element(el).scope();
                                            if (!sc) return;
                                            sc.$evalAsync(function() {
                                                sc.friends = d.bot.friends._list.filter(function(f) { return f.status === "accepted"; });
                                                sc.pending = d.bot.friends._list.filter(function(f) { return f.status === "pending_received"; });
                                                sc.sent    = d.bot.friends._list.filter(function(f) { return f.status === "pending_sent"; });
                                            });
                                        });
                                    } catch(e) {}
                                };
                            }
                        } catch(e) {}
                    }, 300);
                    // Heartbeat toutes les 2 minutes pour maintenir lastSeen à jour
                    if (ws._heartbeatInterval) clearInterval(ws._heartbeatInterval);
                    ws._heartbeatInterval = setInterval(function() {
                        if (ws.readyState === 1) {
                            ws.send(JSON.stringify({ type: "heartbeat", player_id: currentPlayerId }));
                        } else {
                            clearInterval(ws._heartbeatInterval);
                        }
                    }, 120000);
                    if (_premiumWSFirstConnect) {
                        if (window._gfbot_module_loaded) window._gfbot_module_loaded("Serveur Premium", true);
                        if (window._gfbot_boot_done) { window._gfbot_boot_done(); window._gfbot_boot_done = null; }
                        _premiumWSFirstConnect = false;
                    }
                };
                ws.onmessage = function(event) {
                    try {
                        var msg = JSON.parse(event.data);
                        if (msg.type === "PREMIUM_UPDATE") {
                            checkLicense();
                        }
                        // Sync stats trésorier temps réel (autre monde → ce monde)
                        if (msg.type === "STATS_UPDATE" && msg.stat === "tresorier") {
                            if (bot.sett) {
                                bot.sett.tresorier_stats_offers = msg.tresorier_stats_offers;
                                bot.sett.tresorier_stats_gold   = msg.tresorier_stats_gold;
                            }
                            try {
                                var _sc = angular.element(document.querySelector(".botSettings")).scope();
                                if (_sc && _sc.data && _sc.data.s) {
                                    _sc.$evalAsync(function() {
                                        _sc.data.s.tresorier_stats_offers = msg.tresorier_stats_offers;
                                        _sc.data.s.tresorier_stats_gold   = msg.tresorier_stats_gold;
                                    });
                                }
                            } catch(e) {}
                        }
                        // Données partagées par un ami en temps réel
                        if (msg.type === "FRIEND_DATA" && d.bot && d.bot.friends) {
                            d.bot.friends._injectFriendData(msg);
                        }
                        if (msg.type === "FRIEND_REQUEST") {
                            ctx.log("ally", d.t("👥 Vous avez une nouvelle demande d'ami en attente !")).msg(20);
                            if (d.bot && d.bot.friends && typeof d.bot.friends.load === "function") {
                                d.bot.friends.load(function() {
                                    try {
                                        document.querySelectorAll('[ng-controller="FriendsController"]').forEach(function(el) {
                                            var sc = angular.element(el).scope();
                                            if (!sc) return;
                                            sc.$evalAsync(function() {
                                                sc.friends = d.bot.friends._list.filter(function(f) { return f.status === "accepted"; });
                                                sc.pending = d.bot.friends._list.filter(function(f) { return f.status === "pending_received"; });
                                                sc.sent    = d.bot.friends._list.filter(function(f) { return f.status === "pending_sent"; });
                                            });
                                        });
                                    } catch(e) {}
                                });
                            }
                        }
                        if (msg.type === "FRIEND_REMOVED") {
                            if (d.bot && d.bot.friends && typeof d.bot.friends.load === "function") {
                                d.bot.friends.load(function() {
                                    try {
                                        document.querySelectorAll('[ng-controller="FriendsController"]').forEach(function(el) {
                                            var sc = angular.element(el).scope();
                                            if (!sc) return;
                                            sc.$evalAsync(function() {
                                                sc.friends = d.bot.friends._list.filter(function(f) { return f.status === "accepted"; });
                                                sc.pending = d.bot.friends._list.filter(function(f) { return f.status === "pending_received"; });
                                                sc.sent    = d.bot.friends._list.filter(function(f) { return f.status === "pending_sent"; });
                                            });
                                        });
                                    } catch(e) {}
                                });
                            }
                        }
                        if (msg.type === "FRIEND_ACCEPTED") {
                            ctx.log("ally", "✅ [playername]{0}[/playername] a accepté votre demande d'ami !", msg.by).msg(15);
                            if (d.bot && d.bot.friends && typeof d.bot.friends.load === "function") {
                                d.bot.friends.load(function() {
                                    try {
                                        document.querySelectorAll('[ng-controller="FriendsController"]').forEach(function(el) {
                                            var sc = angular.element(el).scope();
                                            if (!sc) return;
                                            sc.$evalAsync(function() {
                                                sc.friends = d.bot.friends._list.filter(function(f) { return f.status === "accepted"; });
                                                sc.pending = d.bot.friends._list.filter(function(f) { return f.status === "pending_received"; });
                                                sc.sent    = d.bot.friends._list.filter(function(f) { return f.status === "pending_sent"; });
                                            });
                                        });
                                    } catch(e) {}
                                });
                            }
                        }
                        // Messages serveur pushés (remplace messages:poll)
                        if (msg.type === "SERVER_MESSAGE" && msg.payload) {
                            try { processMessage(msg.payload); } catch(e) {}
                        }
                        // Mise à jour statut en ligne d'un ami (push depuis le serveur)
                        if (msg.type === "FRIEND_ONLINE_STATUS" && d.bot && d.bot.friends && d.bot.friends._list) {
                            d.bot.friends._list.forEach(function(f) {
                                if (f.key === msg.friend_key) {
                                    f.online   = msg.online;
                                    f.lastSeen = msg.lastSeen || f.lastSeen;
                                }
                            });
                        }
                        // Accusé de réception du SHARE_DATA — pas d'action nécessaire
                        // if (msg.type === "SHARE_ACK") { /* optionnel */ }

                        // Réponse à une action WS avec reqId (friends list, request, accept, reject, prefs)
                        if (msg.type === "WS_REPLY" && msg.reqId) {
                            // Router vers friends._handleWsReply si disponible
                            if (d.bot && d.bot.friends && typeof d.bot.friends._handleWsReply === "function") {
                                d.bot.friends._handleWsReply(msg);
                            }
                            // Router vers admin callbacks (settings.js)
                            if (window._gp_wsAdminCbs && window._gp_wsAdminCbs[msg.reqId]) {
                                var _adminCb = window._gp_wsAdminCbs[msg.reqId];
                                delete window._gp_wsAdminCbs[msg.reqId];
                                _adminCb(msg.error ? msg : null, msg.data || msg);
                            }
                        }
                    } catch(e) {}
                };
                ws.onclose = function() {
                    if (ws._heartbeatInterval) clearInterval(ws._heartbeatInterval);
                    if (ctx._premiumWS === ws) ctx._premiumWS = null;
                    setTimeout(connectPremiumWS, 5000);
                };
                ws.onerror = function() {
                    if (window._gfbot_module_loaded) window._gfbot_module_loaded("Serveur Premium", false);
                    if (window._gfbot_boot_done) { window._gfbot_boot_done(); window._gfbot_boot_done = null; }
                };
            } catch(e) {
                if (window._gfbot_module_loaded) window._gfbot_module_loaded("Serveur Premium", false);
                if (window._gfbot_boot_done) { window._gfbot_boot_done(); window._gfbot_boot_done = null; }
            }
        }

        setTimeout(connectPremiumWS, 2000);
        // Exposer ctx globalement pour que settings.js, tutorial.js et friends.js puissent accéder au WS
        try { window._grepoCtx = ctx; } catch(e) {}

        // ── Injection logo Grepoplus dans la liste des membres de l'alliance ──────
        (function() {
            var LOGO_URL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9ImJnciIgY3g9IjQwJSIgY3k9IjM1JSIgcj0iNjUlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzIyMWMwYSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwODA2MDIiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImcxIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZThhMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjQwJSIgc3RvcC1jb2xvcj0iI2M5YTg0YyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM1YTNlMTAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImcyIiB4MT0iMTAwJSIgeTE9IjAlIiB4Mj0iMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2YwZDg3OCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iI2M5YTg0YyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM3YTVlMjAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9Imdsb3dSIiBjeD0iNTAlIiBjeT0iNTAlIiByPSI1MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjYzlhODRjIiBzdG9wLW9wYWNpdHk9IjAuMTMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjYzlhODRjIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdUZXh0IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmNWU4YTAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI0NSUiIHN0b3AtY29sb3I9IiNjOWE4NGMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNmE0ZTE4Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGNsaXBQYXRoIGlkPSJjaXJjbGUtY2xpcCI+CiAgICAgIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjI4Ii8+CiAgICA8L2NsaXBQYXRoPgogIDwvZGVmcz4KCiAgPCEtLSBGb25kIGR1IGNlcmNsZSB1bmlxdWVtZW50IChwYXMgZGUgcmVjdCkgLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9InVybCgjZ2xvd1IpIi8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9InVybCgjYmdyKSIvPgoKICA8IS0tIEFubmVhdXggLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNnMSkiIHN0cm9rZS13aWR0aD0iNSIvPgogIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjM2IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMC44IiBvcGFjaXR5PSIwLjI1Ii8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNnMikiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIxOTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1kYXNoYXJyYXk9IjMgOCIgb3BhY2l0eT0iMC4zIi8+CgogIDwhLS0gRGlhbWFudHMgY2FyZGluYXV4IC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjUwLDE4IDI1NSwyOCAyNTAsMzggMjQ1LDI4IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjkiLz4KICA8cG9seWdvbiBwb2ludHM9IjI1MCw0NjIgMjU1LDQ1MiAyNTAsNDQyIDI0NSw0NTIiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOSIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsMjUwIDI4LDI0NSAzOCwyNTAgMjgsMjU1IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQ2MiwyNTAgNDUyLDI0NSA0NDIsMjUwIDQ1MiwyNTUiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOSIvPgoKICA8IS0tIFRpY2tzIGNhcmRpbmF1eCAtLT4KICA8bGluZSB4MT0iMjUwIiB5MT0iMjAiIHgyPSIyNTAiIHkyPSIzOCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSIyNTAiIHkxPSI0NjIiIHgyPSIyNTAiIHkyPSI0ODAiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIwLjciLz4KICA8bGluZSB4MT0iMjAiIHkxPSIyNTAiIHgyPSIzOCIgeTI9IjI1MCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSI0NjIiIHkxPSIyNTAiIHgyPSI0ODAiIHkyPSIyNTAiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIwLjciLz4KCiAgPCEtLSBUaWNrcyBkaWFnb25hdXggLS0+CiAgPGxpbmUgeDE9IjkyIiB5MT0iOTIiIHgyPSIxMDMiIHkyPSIxMDMiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiLz4KICA8bGluZSB4MT0iMzk3IiB5MT0iOTIiIHgyPSI0MDgiIHkyPSIxMDMiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiIHRyYW5zZm9ybT0icm90YXRlKDkwLDQwMiw5NykiLz4KICA8bGluZSB4MT0iOTIiIHkxPSIzOTciIHgyPSIxMDMiIHkyPSI0MDgiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiIHRyYW5zZm9ybT0icm90YXRlKC05MCw5Nyw0MDIpIi8+CiAgPGxpbmUgeDE9IjM5NyIgeTE9IjM5NyIgeDI9IjQwOCIgeTI9IjQwOCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEuMiIgb3BhY2l0eT0iMC40NSIgdHJhbnNmb3JtPSJyb3RhdGUoMTgwLDQwMiw0MDIpIi8+CgogIDwhLS0gUGV0aXRzIGNlcmNsZXMgZW50cmUgZGlhbWFudHMgLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iNTAiIHI9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjQ1MCIgcj0iMy41IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSIyNTAiIHI9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjQ1MCIgY3k9IjI1MCIgcj0iMy41IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CgogIDwhLS0gRyBsZXR0cmUgLS0+CiAgPHRleHQKICAgIHg9IjI1MCIgeT0iMjUwIgogICAgdGV4dC1hbmNob3I9Im1pZGRsZSIKICAgIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIgogICAgZm9udC1mYW1pbHk9IidDaW56ZWwnLCBHZW9yZ2lhLCBzZXJpZiIKICAgIGZvbnQtc2l6ZT0iMzQwIgogICAgZm9udC13ZWlnaHQ9IjkwMCIKICAgIGZpbGw9InVybCgjZ1RleHQpIgogICAgY2xpcC1wYXRoPSJ1cmwoI2NpcmNsZS1jbGlwKSIKICA+RzwvdGV4dD4KCiAgPCEtLSBBcmNzIGTDqWNvcmF0aWZzIGhhdXQgKHBhciBkZXNzdXMgbGUgRykgLS0+CiAgPHBhdGggZD0iTSAxNDggMTMwIFEgMjUwIDg4IDM1MiAxMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNTUiLz4KICA8cGF0aCBkPSJNIDE1OCAxMTQgUSAyNTAgNjggMzQyIDExNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjAuNyIgb3BhY2l0eT0iMC4yOCIvPgoKICA8IS0tIEFyY3MgZMOpY29yYXRpZnMgYmFzIChwYXIgZGVzc3VzIGxlIEcpIC0tPgogIDxwYXRoIGQ9Ik0gMTQ4IDM3MCBRIDI1MCA0MTIgMzUyIDM3MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEuNSIgb3BhY2l0eT0iMC41NSIvPgogIDxwYXRoIGQ9Ik0gMTU4IDM4NiBRIDI1MCA0MzIgMzQyIDM4NiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjAuNyIgb3BhY2l0eT0iMC4yOCIvPgoKPC9zdmc+Cg==';
            var LOGO_STYLE = 'display:inline-block;width:14px;height:14px;background:url(' + LOGO_URL + ') no-repeat center/contain;vertical-align:middle;margin-left:4px;border-radius:50%';

            function injectGrepoplusLogos(premiumIds) {
                var set = new Set(premiumIds.map(String));
                document.querySelectorAll('[id^="alliance_player_"]').forEach(function(row) {
                    var pid = row.id.replace('alliance_player_', '');
                    // Supprimer un éventuel logo déjà injecté
                    var old = row.querySelector('.gp-badge-grepoplus');
                    if (old) old.remove();
                    if (set.has(pid)) {
                        var nameLink = row.querySelector('.ally_name a');
                        if (nameLink) {
                            var badge = document.createElement('span');
                            badge.className = 'gp-badge-grepoplus';
                            badge.title = (d.t ? d.t('Possède GrepoPlus') : 'Possède GrepoPlus');
                            badge.style.cssText = LOGO_STYLE;
                            nameLink.insertAdjacentElement('afterend', badge);
                        }
                    }
                });
            }

            function checkAllianceMembers() {
                var rows = document.querySelectorAll('[id^="alliance_player_"]');
                if (!rows.length) return;
                var ids = Array.from(rows).map(function(r) { return r.id.replace('alliance_player_', ''); });
                var ws = null;
                try { ws = window._grepoCtx && window._grepoCtx._premiumWS; } catch(e) {}
                if (!ws || ws.readyState !== 1) {
                    // Pas encore connecté, réessayer dans 1s
                    setTimeout(checkAllianceMembers, 1000);
                    return;
                }
                var reqId = 'alliance_check_' + Date.now();
                // Enregistrer le callback dans le registre global admin (géré par core.js WS_REPLY)
                window._gp_wsAdminCbs = window._gp_wsAdminCbs || {};
                window._gp_wsAdminCbs[reqId] = function(err, data) {
                    if (err || !data) return;
                    injectGrepoplusLogos(data.premium_ids || []);
                };
                ws.send(JSON.stringify({ type: 'ALLIANCE_PREMIUM_CHECK', ids: ids, _reqId: reqId }));
            }

            // Observer : déclenche la vérification quand les lignes membres apparaissent
            var _allianceObserver = new MutationObserver(function(mutations) {
                var found = false;
                mutations.forEach(function(m) {
                    m.addedNodes.forEach(function(node) {
                        if (node.nodeType !== 1) return;
                        if ((node.id && node.id.includes('alliance_player_')) ||
                            (node.querySelector && node.querySelector('[id^="alliance_player_"]'))) {
                            found = true;
                        }
                    });
                });
                if (found) setTimeout(checkAllianceMembers, 200);
            });
            _allianceObserver.observe(document.body, { childList: true, subtree: true });
        })();

        // Gestionnaire de clic pour les liens joueurs dans les fenêtres du bot
        $(document).on("click", ".botSettings .gp_player_link, .hw-window .gp_player_link, .window .gp_player_link, [class*='gfb'] .gp_player_link, .bot.messages .gp_player_link, #gfbot-notif-window .gp_player_link", function(e) {
            e.preventDefault();
            e.stopPropagation();
            var pName = $(this).attr("data-player-name");
            var pId   = parseInt($(this).attr("data-player-id")) || null;
            if (!pName && !pId) return;
            try {
                // Si pas d'ID, cherche dans MM.getModels().Player par nom
                if (!pId) {
                    var models = MM.getModels();
                    if (models && models.Player) {
                        $.each(models.Player, function(id, p) {
                            if (p.getName && p.getName() === pName) { pId = parseInt(id); return false; }
                        });
                    }
                }

                var existingWnd = GPWindowMgr.getAllOpen && GPWindowMgr.getAllOpen().find(function(w) { return w.getType() == 18; });

                if (pId) {
                    if (existingWnd) {
                        existingWnd.reloadContent({ player_id: pId });
                    } else {
                        // Crée un lien natif Grepolis avec le bon fragment et simule un clic
                        var fragment = btoa(JSON.stringify({ name: pName || "", id: pId }));
                        var $tmp = $("<a class='gp_player_link' href='#" + fragment + "'></a>").appendTo("body");
                        $tmp[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window, clientX: e.clientX, clientY: e.clientY }));
                        setTimeout(function() { $tmp.remove(); }, 100);
                    }
                } else if (existingWnd) {
                    existingWnd.reloadContent({ player_name: pName });
                }
            } catch(ex) { }
        });

        // Gestionnaire de clic pour les liens de villes dans les fenêtres du bot
        $(document).on("click", ".botSettings .gp_town_link, .hw-window .gp_town_link, .window .gp_town_link, [class*='gfb'] .gp_town_link, .bot.messages .gp_town_link, #gfbot-notif-window .gp_town_link", function(e) {
            e.preventDefault();
            e.stopPropagation();
            var href = $(this).attr("href") || "";
            var fragment = href.replace(/^#/, "");
            if (!fragment) return;
            var _simulateClick = function(frag) {
                var $tmp = $("<a class='gp_town_link' href='#" + frag + "'></a>").appendTo("body");
                $tmp[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window, clientX: e.clientX, clientY: e.clientY }));
                setTimeout(function() { $tmp.remove(); }, 100);
            };
            try {
                // Essayer de décoder un fragment JSON base64 custom {id, name}
                var townData = JSON.parse(atob(fragment));
                var townId   = townData.id;
                if (!townId) return;
                var existingWnd = GPWindowMgr.getAllOpen && GPWindowMgr.getAllOpen().find(function(w) { return w.getType() == 6; });
                if (existingWnd) {
                    existingWnd.reloadContent({ town_id: townId });
                } else {
                    _simulateClick(fragment);
                }
            } catch(ex) {
                // Fragment natif Grepolis (getLinkFragment) — laisser le jeu le gérer directement
                try { _simulateClick(fragment); } catch(ex2) {}
            }
        });

        return this;
    }



    function createRequester(d) {
        var bot = d.bot,
            models = bot.models;
        var refreshInterval = 10 * 60;
        var townRefreshCache = {};

        function runAtTown(townId, townFunction) {
            if (typeof townFunction != "function") {
                return
            };
            var prevTownId = Game.townId;
            Game.townId = townId;
            var townFetchResult;
            try {
                townFetchResult = townFunction();
            } finally {
                Game.townId = prevTownId;
            }
            return townFetchResult
        }

        function ensureRefreshed(townId, callbackFn) {
            var callbackWrapper = function() {
                if (typeof callbackFn == "function") {
                    callbackFn()
                }
            };
            fetch.test = true;
            if (!(townId in models.Town)) {
                return callbackWrapper()
            };
            var townObj = models.Town[townId],
                lastUpdateTime = townObj.get("resources_last_update"),
                timestamp = Timestamp.server();
            if (!isNumber(lastUpdateTime)) {
                lastUpdateTime = 0
            };
            if (!(townId in townRefreshCache)) {
                townRefreshCache[townId] = 0
            };
            lastUpdateTime = Math.max(townRefreshCache[townId], lastUpdateTime);
            if ((timestamp - lastUpdateTime) > refreshInterval) {
                runAtTown(townId, function() {
                    townObj.reFetch(function() {
                        townRefreshCache[townId] = Timestamp.server();
                        callbackWrapper()
                    })
                })
            } else {
                return callbackWrapper()
            }
        }
        this.refetched = ensureRefreshed;
        return this
    }

    function createFarmBot(d) {
        var bot = d.bot,
            farmTranslations = d.translate.farm;
        var logToServer = d.logger.create(farmTranslations.name, function() {
            return bot.sett.farm_showmessages === true
        });
        // Expose le logger farm sur ctx ET sur bot.farm pour farm_farm_result_js
        d.farmLog = logToServer;
        if (bot.farm) bot.farm.log = logToServer;
        var farmCooldowns = [300, 1200, 5400, 14400],
            unitPriority = {
                sword: 1,
                slinger: 2,
                archer: 3,
                hoplite: 4
            };
        var farmActive = (Game.features.battlepoint_villages === true);

        function runFarmCycle() {
            var farmStopped = false,
                townSchedules = {},
                farmSafetyTimeout = null,
                A = this,
                farmOffset, farmDataArray, farmCount = 0;
            var farmSchedule = 0,
                farmBlockUntil = 0;

            function stopFarm() {
                var timestamp = Timestamp.server();
                if (farmBlockUntil >= timestamp) {
                    // La requête précédente n'a jamais reçu de réponse du serveur.
                    // Au lieu de bloquer définitivement, on force la libération du verrou
                    // et on log un warning, puis on continue normalement.
                    //logToServer("warning", farmTranslations.msg05, farmSchedule);
                    if (farmSafetyTimeout) { clearTimeout(farmSafetyTimeout); farmSafetyTimeout = null; }
                    farmBlockUntil = 0;
                };
                if (!bot.filters.checkModule("farm")) {
                    logToServer("debug", "request blocked calculateFarmTime filter");
                    return false
                };
                farmSchedule = timestamp;
                farmBlockUntil = Infinity;
                // Safety timeout : si le serveur ne répond jamais, on débloque après 15s
                if (farmSafetyTimeout) clearTimeout(farmSafetyTimeout);
                farmSafetyTimeout = setTimeout(function() {
                    if (farmBlockUntil === Infinity) {
                        logToServer("warning", "Safety timeout: no server response after 15s, releasing lock");
                        farmBlockUntil = 0;
                    }
                }, 15 * 1000);
                return true
            }

            function startFarm() {
                if (farmSafetyTimeout) { clearTimeout(farmSafetyTimeout); farmSafetyTimeout = null; }
                // Only check duration if stopFarm() was actually called first (farmSchedule > 0)
                // Otherwise farmSchedule=0 would make charSet equal to the full Unix timestamp (~1.7B sec)
                if (farmSchedule > 0) {
                    var charSet = Timestamp.server() - farmSchedule;
                    if (Math.abs(charSet) > 30) {
                        logToServer("warning", farmTranslations.msg06, charSet)
                    }
                }
                farmBlockUntil = 0;
            }

            function scheduleFarm(townObj, isForced) {
                if (townObj.hasConqueror()) {
                    if (isForced !== true) {
                        logToServer("debug", "[town]{0}[/town] under siege, skip", townObj.id)
                    };
                    return false
                } else {
                    return true
                }
            }

            function blockFarmVillage(townObj, isForced) {
                var stopModule = [];
                if (bot.sett.farm_ffarm_wood == true) {
                    stopModule.push("wood")
                };
                if (bot.sett.farm_ffarm_stone == true) {
                    stopModule.push("stone")
                };
                if (bot.sett.farm_ffarm_iron == true) {
                    stopModule.push("iron")
                };
                if (stopModule.length < 1) {
                    return true
                };
                var resultText = townObj.resources();
                for (var argIndex = 0; argIndex < stopModule.length; argIndex++) {
                    var farmResult = stopModule[argIndex];
                    if (resultText[farmResult] == resultText.storage) {
                        if (isForced !== true) {
                            logToServer("debug", "[town]{0}[/town], storage is full: {1}", townObj.id, GameData.resources[farmResult])
                        };
                        return false
                    }
                };
                return true
            }

            function getFarmTime(dateObj) {
                var connectNode = 1;
                for (var argIndex = 0; argIndex < farmCooldowns.length; argIndex++) {
                    if ((dateObj == farmCooldowns[argIndex]) || (dateObj == farmCooldowns[argIndex] * 2)) {
                        connectNode = argIndex + 1;
                        break
                    }
                };
                return connectNode
            }

            function startFarmTown(townObj) {
                var dateObj = bot.sett.farm_time,
                    townCustomSettings = bot.custom.get(townObj.id);
                if (townCustomSettings && (typeof townCustomSettings.farm_time == "string")) {
                    if (townCustomSettings.farm_time == "disabled") {
                        return "disabled"
                    };
                    if (townCustomSettings.farm_time != "global") {
                        dateObj = townCustomSettings.farm_time
                    }
                };
                dateObj = parseInt(dateObj, 10);
                if (typeof townObj.researches !== "function") {
                    logToServer("warning", "Unknown function 'researches' for [town]{0}[/town]", townObj.id).send()
                } else {
                    var farmError = townObj.researches().get("booty") === true,
                        ca = farmCooldowns.indexOf(dateObj) !== -1;
                    if (farmError && ca) {
                        logToServer("debug", "Correct farm time ({0} -> {1}) for [town]{2}[/town] (x2)", dateObj, dateObj * 2, townObj.id);
                        dateObj *= 2
                    } else {
                        if (!farmError && !ca) {
                            logToServer("debug", "Correct farm time ({0} -> {1}) for [town]{2}[/town] (1/2)", dateObj, dateObj / 2, townObj.id);
                            dateObj /= 2
                        }
                    }
                };
                return dateObj
            }

            function processFarmResult() {
                var farmVillage = {};
                for (var townModelKey in bot.models.Town) {
                    var townObj = bot.models.Town[townModelKey],
                        townId = townObj.getIslandId(),
                        townCustomSettings = bot.custom.get(townObj.id),
                        farmTimeValue = townCustomSettings.farm_time != "global" ? townCustomSettings.farm_time : bot.sett.farm_time;
                    if (farmTimeValue == "disabled") {
                        logToServer("debug", "Farm disabled for [town]{0}[/town], skip", townObj.id);
                        continue
                    };
                    if (!farmActive && (farmTimeValue in unitPriority)) {
                        logToServer("debug", "Cant farm unit in [town]{0}[/town] at this world", townObj.id);
                        continue
                    };
                    if (!(farmTimeValue in unitPriority)) {
                        farmTimeValue = parseInt(farmTimeValue)
                    };
                    if (!scheduleFarm(townObj)) {
                        continue
                    };
                    var farmResult = townId in farmVillage ? farmVillage[townId] : [];
                    farmResult.push({
                        town: ITowns.getTown(townObj.id),
                        ix: townObj.getIslandX(),
                        iy: townObj.getIslandY(),
                        island: townId,
                        farm_time: farmTimeValue
                    });
                    farmVillage[townId] = farmResult
                };
                var farmPayload = [];
                for (var townModelKey in farmVillage) {
                    var farmList = farmVillage[townModelKey];
                    var farmData = [];
                    farmList.forEach(function(townData) {
                        var resultText = townData.town.resources();
                        farmData.push({
                            item: townData,
                            left: resultText.wood / resultText.storage + resultText.stone / resultText.storage + resultText.iron / resultText.storage
                        })
                    });
                    farmData = farmData.sort(function(minValue, linkData) {
                        return minValue.left > linkData.left
                    });
                    if (farmData.length > 1) {
                        logToServer("debug", "Two or more towns on [island]{0}[/island], choose [town]{1}[/town]", townModelKey, farmData[0].item.town.id)
                    };
                    farmPayload.push(farmData[0].item)
                };
                farmPayload.forEach(function(townObj) {
                    townObj.villages = [];
                    for (var farmTownKey in bot.models.FarmTown) {
                        var farmResponse = bot.models.FarmTown[farmTownKey];
                        if ((farmResponse.getIslandX() != townObj.ix) || (farmResponse.getIslandY() != townObj.iy)) {
                            continue
                        };
                        for (var farmRelationKey in bot.models.FarmTownPlayerRelation) {
                            var farmUnit = bot.models.FarmTownPlayerRelation[farmRelationKey];
                            if ((farmUnit.getFarmTownId() == farmResponse.getId()) && (farmUnit.getRelationStatus() == 1)) {
                                townObj.villages.push(farmUnit)
                            }
                        }
                    }
                });
                return farmPayload
            }

            function startModule() {
                if (farmStopped) {
                    return
                };
                farmDataArray = Timestamp.server();
                farmOffset = 0;
                farmStopped = true;
                updateFarmControl()
            }

            function stopModule() {
                for (var notification in townSchedules) {
                    clearTimeout(townSchedules[notification]);
                    delete townSchedules[notification]
                };
                farmFirstRun = true;
                d.scheduler.clean("farm");
                farmStopped = false
            }

            var farmFirstRun = true;

            function calculateFarmTime(moduleName, cz, isValidated) {
                var scheduleTimeout = farmFirstRun ? 0 : (2 + Math.random()) * 1e3;
                farmFirstRun = false;
                // scheduleTimeout est déjà en ms — ne pas multiplier par 1e3 une seconde fois
                cz += scheduleTimeout + farmCount;
                scheduleTimeout = d.scheduler.timeout(cz, scheduleTimeout, "farm");
                logToServer("debug", "schedule '{0}' at {1}", moduleName, bot.ts2text(Timestamp.server() + scheduleTimeout / 1e3));
                if (moduleName in townSchedules) {
                    clearTimeout(townSchedules[moduleName])
                };
                townSchedules[moduleName] = setTimeout(isValidated, scheduleTimeout)
            }

            function checkFarmUnit(townObj, ck, farmTimeValue) {
                var cj = bot.models.FarmTown[ck.getFarmTownId()],
                    moduleName = cj.getName(),
                    cg = "village_" + ck.getFarmTownId();
                var callbackHandler = function(isForced) {
                    if (!scheduleFarm(townObj, isForced)) {
                        return false
                    };
                    if (!(farmTimeValue in unitPriority) && !blockFarmVillage(townObj, isForced)) {
                        return false
                    };
                    if (farmTimeValue in unitPriority) {
                        var resultText = townObj.resources(),
                            cl = ck.getLevel(),
                            cm = GameData.farm_town.claim_units[cl];
                        if (resultText.population < cm[farmTimeValue]) {
                            if (isForced != true) {
                                logToServer("debug", "[town]{0}[/town], not enough population for claim units", townObj.id)
                            };
                            return false
                        }
                    };
                    if (d.block(cg)) {
                        if (isForced !== true) {
                            logToServer("debug", "[town]{0}[/town], village '{1}' blocked, skip", townObj.id, moduleName)
                        };
                        return false
                    };
                    return true
                };
                if (!callbackHandler(true)) {
                    return
                };
                var timestamp = Timestamp.server(),
                    scheduleTimeout = ck.getLootableAt() - timestamp;
                if (scheduleTimeout > 10 * 60) {
                    // Planifier un réveil au bon moment plutôt que d'abandonner
                    var wakeAt = timestamp + scheduleTimeout - (9 * 60);
                    if (!farmOffset || wakeAt < farmOffset) farmOffset = wakeAt;
                    return
                };
                if (scheduleTimeout < 0) {
                    scheduleTimeout = 0
                };
                scheduleTimeout = (new Date()).getTime() + scheduleTimeout * 1e3;
                calculateFarmTime("village_" + ck.id, scheduleTimeout, function() {
                    if (!callbackHandler()) {
                        return
                    };
                    if (!ck.isLootable()) {
                        logToServer("debug", "[town]{0}[/town], village '{1}' not lootable, skip", townObj.id, moduleName);
                        return
                    };
                    var logLevel = (farmTimeValue in unitPriority) ? "units" : "resources";
                    var connectNode = (logLevel == "units") ? unitPriority[farmTimeValue] : getFarmTime(farmTimeValue);
                    if (!stopFarm()) {
                        // Requête en cours — replanifier ce village dans 5s pour réessayer
                        calculateFarmTime("village_" + ck.id, (new Date()).getTime() + 5000, function() {
                            if (!callbackHandler()) return;
                            if (!ck.isLootable()) return;
                            if (!stopFarm()) return;
                            var logLevel2 = (farmTimeValue in unitPriority) ? "units" : "resources";
                            var connectNode2 = (logLevel2 == "units") ? unitPriority[farmTimeValue] : getFarmTime(farmTimeValue);
                            bot.runAtTown(townObj.id, function() {
                                ck.claim(logLevel2, connectNode2, {
                                    success: function(rd) { startFarm(); logToServer("info", "[town]{0}[/town], {1} ({2})", townObj.id, rd.success, moduleName).msg(10) },
                                    error: function(rd) { startFarm(); d.block(cg, 1 * 60 * 60 * (1 + Math.random())); logToServer("error", trams.msg03, townObj.id, moduleName, rd.error, d.block(cg)).send().msg(10) }
                                })
                            })
                        });
                        return
                    };
                    bot.runAtTown(townObj.id, function() {
                        ck.claim(logLevel, connectNode, {
                            success: function(requestData) {
                                startFarm();
                                logToServer("info", "[town]{0}[/town], {1} ({2})", townObj.id, requestData.success, moduleName).msg(10);
                                // Replanifier ce village pour le prochain cooldown
                                setTimeout(function() {
                                    var nextLoot = ck.getLootableAt() - Timestamp.server();
                                    // Fallback : si le modèle n'est pas encore mis à jour après récolte, réessayer dans 5 min
                                    if (nextLoot <= 0) nextLoot = 5 * 60;
                                    if (nextLoot <= 3 * 60 * 60) {
                                        var nextMs = (new Date()).getTime() + nextLoot * 1000;
                                        calculateFarmTime("village_" + ck.id, nextMs, function() {
                                            checkFarmUnit(townObj, ck, farmTimeValue);
                                        });
                                    }
                                }, 3000);
                            },
                            error: function(requestData) {
                                startFarm();
                                d.block(cg, 1 * 60 * 60 * (1 + Math.random()));
                                logToServer("error", trams.msg03, townObj.id, moduleName, requestData.error, d.block(cg)).send().msg(10)
                            }
                        })
                    })
                })
            }

            function sendFarmAttack(townObj, cp, farmTimeValue) {
                var callbackHandler = function(isForced) {
                    if (!scheduleFarm(townObj, isForced)) {
                        return false
                    };
                    if (!bot.checkPremium("captain")) {
                        if (isForced !== true) {
                            logToServer("debug", "[town]{0}[/town], captain not available", townObj.id)
                        };
                        return false
                    };
                    if (!blockFarmVillage(townObj, isForced)) {
                        return false
                    };
                    return true
                };
                if (!callbackHandler(true)) {
                    return
                };
                var timestamp = Timestamp.server();
                var farmStopped = cp.filter(function(cj) {
                    var requestQueue = cj.getLootableAt() - timestamp;
                    return (requestQueue < 10 * 60)
                });
                if (farmStopped.length < 1) {
                    logToServer("debug", "[town]{0}[/town], no villages to farm at nearest time", townObj.id);
                    return
                };
                farmStopped = farmStopped.sort(function(minValue, linkData) {
                    return minValue.getLootableAt() < linkData.getLootableAt()
                });
                var connectionObj = farmStopped[0],
                    scheduleTimeout = connectionObj.getLootableAt() - timestamp;
                if (scheduleTimeout < 0) {
                    scheduleTimeout = 0
                };
                scheduleTimeout = (new Date()).getTime() + (5 + scheduleTimeout) * 1e3;
                calculateFarmTime("town_" + townObj.id, scheduleTimeout, function() {
                    if (!callbackHandler()) {
                        return
                    };
                    var responseRef = [];
                    farmStopped.forEach(function(cj) {
                        var cg = "village_" + cj.getFarmTownId();
                        if (!cj.isLootable()) {
                            return
                        };
                        if (d.block(cg)) {
                            return
                        };
                        responseRef.push(cj.getFarmTownId())
                    });
                    if (responseRef.length < 1) {
                        logToServer("debug", "[town]{0}[/town], no villages to farm", townObj.id);
                        return
                    };
                    var dateObj = bot.farm.correct_time(townObj);
                    if (!(dateObj > 0)) {
                        logToServer("debug", "[town]{0}[/town], invalid farm time: {1}", townObj.id, dateObj);
                        return
                    };
                    if (!stopFarm()) {
                        return
                    };
                    var requestPayload = {
                        farm_town_ids: responseRef,
                        time_option: dateObj,
                        claim_factor: "normal",
                        current_town_id: townObj.id
                    };
                    bot.ajaxRequestPost("farm_town_overviews", "claim_loads", requestPayload, {
                        success: function(cs, requestData) {
                            startFarm();
                            logToServer("info", "[town]{0}[/town]: {1}", townObj.id, requestData.success).msg(10)
                        },
                        error: function(cs, requestData) {
                            startFarm();
                            var createTimeout = 1 * 60 * 60 * (1 + Math.random()),
                                cu = [];
                            responseRef.forEach(function(townId) {
                                var cg = "village_" + townId;
                                d.block(cg, createTimeout);
                                cu.push(v.getName())
                            });
                            logToServer("error", farmTranslations.msg04, townObj.id, cu.join(", "), Timestamp.server() + createTimeout, requestData.error).send().msg(0)
                        }
                    }, "farm")
                })
            }

            function loadFarm() {
                var timestamp = Timestamp.server();
                var townCache = parseInt(bot.sett.farm_stopafter, 10);
                if (townCache > 0) {
                    var eventData = townCache * 60 * 60 + farmDataArray;
                    if (timestamp > eventData) {
                        logToServer("warning", farmTranslations.msg01).msg(10);
                        A.stop();
                        return
                    }
                };
                farmCount = (2 + Math.random()) * 1e3;
                logToServer("debug", "Farm cycle, random offset: {0} sec.", (farmCount / 1e3).toFixed(1));
                farmSchedule = farmBlockUntil = 0;
                d.api.farm()
            }

            function updateFarmControl() {
                var timestamp = Timestamp.server(),
                    lastUpdateTime = d.scheduler.max("farm"),
                    now = (new Date).getTime();
                // lastUpdateTime est en ms (timestamp futur du prochain event schedulé)
                // Relancer seulement si aucun event futur n'est réellement planifié
                var noUpcomingEvent = (lastUpdateTime === 0) || (now >= lastUpdateTime);
                if (noUpcomingEvent && (timestamp > farmOffset)) {
                    loadFarm()
                };
                if (farmStopped) {
                    // Attendre jusqu'au prochain event schedulé, sinon 15s
                    var nextEvent = (lastUpdateTime > now) ? Math.ceil((lastUpdateTime - now) / 1000) : 15;
                    var cx = (farmOffset > timestamp) ? Math.min(farmOffset - timestamp, nextEvent) : Math.min(15, nextEvent);
                    clearTimeout(townSchedules.next);
                    townSchedules.next = setTimeout(updateFarmControl, cx * 1e3)
                }
            }
            Object.defineProperties(this, {
                "active": {
                    get: function() {
                        return farmStopped
                    }
                },
                "log": {
                    get: function() {
                        return logToServer
                    }
                }
            });
            d.block("w_farm_captain", 10 * 60);
            this.start = startModule;
            this.stop = stopModule;
            this.schedule = calculateFarmTime;
            this.request_start = stopFarm;
            this.request_end = startFarm;
            this.check_conqueror = scheduleFarm;
            this.check_storage = blockFarmVillage;
            this.time2option = getFarmTime;
            this.correct_time = startFarmTown;
            this.build_towns = processFarmResult;
            this.farm_village = checkFarmUnit;
            this.farm_villages = sendFarmAttack;
            return this
        }
        var loadFarm = new runFarmCycle();
        var farmTimer = ["schedule", "check_conqueror", "check_storage", "time2option", "correct_time", "build_towns", "request_start", "request_end", "farm_village", "farm_villages"];
        // Sauvegarde du vrai module farm avant que createApiClient ne l'écrase
        bot._farmModule = loadFarm;
        if (bot.sett.farm_isfarmonstart === true) {
            bot.farm.start()
        }
    }
    d.scheduler = new createScheduler(d);
    d.bot.sched = {
        max: d.scheduler.max
    };
    d.bot.schedule = d.scheduler.insert;
    d.bot.scheduleNearest = d.scheduler.nearest;
    d.bot.scheduleClean = d.scheduler.clean;
    d.bot.scheduleTimeout = d.scheduler.timeout;
    d.block = createBlockManager();
    d.requister = new createRequester(d);
    d.towns = new createTownManager(d);
    d.windows = new createWindowManager();
    d.socketio = null;
    d.api = new createApiClient(d);
    d.messages = new createMessageHandler(d);
    d.ui = new createMessageUI();
    d.bot.request = d.api.request;
    d.bot.windows = d.windows;
    new createFarmBot(d);
    new createLicenseChecker(d);
})(this)
