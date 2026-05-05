/**
 * boot.js  â€” GFBot bootstrap (tourne dans le contexte PAGE)
 * PlacÃ© sur le VPS : https://grepoplus.duckdns.org/bot/boot.js
 *
 * ReÃ§oit depuis le loader (via window globals injectÃ©s avant exÃ©cution) :
 *   window._GFBOT_BRIDGE_ID  â€” prÃ©fixe des CustomEvents GM bridge
 *   window._GFBOT_VPS_BASE   â€” URL de base du VPS (sans slash final)
 */
// Patch: supprime les warnings "[Violation] Added non-passive event listener to a scroll-blocking event"
// causÃ©s par jQuery UI (draggable, sortable, resizable) qui n'utilise pas { passive: true }
(function() {
    var _orig = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, fn, options) {
        if (['touchstart', 'touchmove', 'wheel', 'mousewheel'].includes(type)) {
            if (typeof options === 'boolean' || options === undefined) {
                options = { passive: true, capture: options || false };
            } else if (typeof options === 'object' && options !== null && options.passive === undefined) {
                options.passive = true;
            }
        }
        return _orig.call(this, type, fn, options);
    };
})();

(function () {
    var BRIDGE_ID = window._GFBOT_BRIDGE_ID;
    var VPS_BASE  = window._GFBOT_VPS_BASE;
    var EVT_REQ   = BRIDGE_ID + '_req';
    var EVT_RES   = BRIDGE_ID + '_res';

    var BOT_HASH      = '1i5j12klopn';
    var BOT_EVT_REQ   = BOT_HASH + 'request';
    var BOT_EVT_RES   = BOT_HASH + 'response';

    var CDN_ANGULAR = 'https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.6.4/angular.min.js';
    var CDN_LESS    = 'https://cdnjs.cloudflare.com/ajax/libs/less.js/2.5.0/less.min.js';

    // â”€â”€ DÃ©tection Adblocker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Teste si le WebSocket vers le VPS est bloquÃ© (signe d'un adblocker actif).
    // Si bloquÃ©, affiche un overlay plein-Ã©cran bloquant et arrÃªte le chargement.
    function checkAdblock(onClear) {
        var OVERLAY_ID = '_gfbot_adblock_overlay';

        // Traductions du message adblocker
        var LANGS = {
            fr: {
                title  : 'ðŸ›¡ï¸ Adblocker dÃ©tectÃ©',
                body   : 'GrepoPlus nÃ©cessite une connexion internet. Votre adblocker bloque cette connexion.',
                step1  : 'DÃ©sactivez votre adblocker sur ce site',
                step2  : 'Rechargez la page',
                btn    : 'âœ“ J\'ai dÃ©sactivÃ© mon adblocker â€” Recharger',
                check  : 'VÃ©rification en coursâ€¦'
            },
            en: {
                title  : 'ðŸ›¡ï¸ Adblocker Detected',
                body   : 'GrepoPlus requires an internet connection. Your adblocker is blocking this connection.',
                step1  : 'Disable your adblocker on this site',
                step2  : 'Reload the page',
                btn    : 'âœ“ I disabled my adblocker â€” Reload',
                check  : 'Checkingâ€¦'
            },
            de: {
                title  : 'ðŸ›¡ï¸ Adblocker erkannt',
                body   : 'GrepoPlus benÃ¶tigt eine Internetverbindung. Dein Adblocker blockiert diese Verbindung.',
                step1  : 'Deaktiviere deinen Adblocker auf dieser Seite',
                step2  : 'Seite neu laden',
                btn    : 'âœ“ Adblocker deaktiviert â€” Neu laden',
                check  : 'ÃœberprÃ¼fungâ€¦'
            },
            es: {
                title  : 'ðŸ›¡ï¸ Bloqueador detectado',
                body   : 'GrepoPlus necesita conexiÃ³n a internet. Tu bloqueador estÃ¡ bloqueando esta conexiÃ³n.',
                step1  : 'Desactiva tu bloqueador en este sitio',
                step2  : 'Recarga la pÃ¡gina',
                btn    : 'âœ“ He desactivado el bloqueador â€” Recargar',
                check  : 'Verificandoâ€¦'
            },
            it: {
                title  : 'ðŸ›¡ï¸ Adblocker rilevato',
                body   : 'GrepoPlus richiede una connessione internet. Il tuo adblocker sta bloccando questa connessione.',
                step1  : 'Disabilita il tuo adblocker su questo sito',
                step2  : 'Ricarica la pagina',
                btn    : 'âœ“ Ho disabilitato l\'adblocker â€” Ricarica',
                check  : 'Verifica in corsoâ€¦'
            },
            nl: {
                title  : 'ðŸ›¡ï¸ Adblocker gedetecteerd',
                body   : 'GrepoPlus heeft een internetverbinding nodig. Je adblocker blokkeert deze verbinding.',
                step1  : 'Schakel je adblocker uit op deze site',
                step2  : 'Herlaad de pagina',
                btn    : 'âœ“ Adblocker uitgeschakeld â€” Herladen',
                check  : 'Controlerenâ€¦'
            },
            pt: {
                title  : 'ðŸ›¡ï¸ Adblocker detectado',
                body   : 'GrepoPlus precisa de uma conexÃ£o com a internet. Seu adblocker estÃ¡ bloqueando essa conexÃ£o.',
                step1  : 'Desative seu adblocker neste site',
                step2  : 'Recarregue a pÃ¡gina',
                btn    : 'âœ“ Desativei o adblocker â€” Recarregar',
                check  : 'Verificandoâ€¦'
            },
            ru: {
                title  : 'ðŸ›¡ï¸ ÐžÐ±Ð½Ð°Ñ€ÑƒÐ¶ÐµÐ½ Ð±Ð»Ð¾ÐºÐ¸Ñ€Ð¾Ð²Ñ‰Ð¸Ðº',
                body   : 'GrepoPlus Ñ‚Ñ€ÐµÐ±ÑƒÐµÑ‚ Ð¿Ð¾Ð´ÐºÐ»ÑŽÑ‡ÐµÐ½Ð¸Ñ Ðº Ð¸Ð½Ñ‚ÐµÑ€Ð½ÐµÑ‚Ñƒ. Ð’Ð°Ñˆ Ð±Ð»Ð¾ÐºÐ¸Ñ€Ð¾Ð²Ñ‰Ð¸Ðº Ñ€ÐµÐºÐ»Ð°Ð¼Ñ‹ Ð±Ð»Ð¾ÐºÐ¸Ñ€ÑƒÐµÑ‚ ÑÑ‚Ð¾ ÑÐ¾ÐµÐ´Ð¸Ð½ÐµÐ½Ð¸Ðµ.',
                step1  : 'ÐžÑ‚ÐºÐ»ÑŽÑ‡Ð¸Ñ‚Ðµ Ð±Ð»Ð¾ÐºÐ¸Ñ€Ð¾Ð²Ñ‰Ð¸Ðº Ð½Ð° ÑÑ‚Ð¾Ð¼ ÑÐ°Ð¹Ñ‚Ðµ',
                step2  : 'ÐŸÐµÑ€ÐµÐ·Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚Ðµ ÑÑ‚Ñ€Ð°Ð½Ð¸Ñ†Ñƒ',
                btn    : 'âœ“ ÐžÑ‚ÐºÐ»ÑŽÑ‡Ð¸Ð» Ð±Ð»Ð¾ÐºÐ¸Ñ€Ð¾Ð²Ñ‰Ð¸Ðº â€” ÐŸÐµÑ€ÐµÐ·Ð°Ð³Ñ€ÑƒÐ·Ð¸Ñ‚ÑŒ',
                check  : 'ÐŸÑ€Ð¾Ð²ÐµÑ€ÐºÐ°â€¦'
            },
            pl: {
                title  : 'ðŸ›¡ï¸ Wykryto Adblocker',
                body   : 'GrepoPlus wymaga poÅ‚Ä…czenia z internetem. TwÃ³j adblocker blokuje to poÅ‚Ä…czenie.',
                step1  : 'WyÅ‚Ä…cz adblocker na tej stronie',
                step2  : 'OdÅ›wieÅ¼ stronÄ™',
                btn    : 'âœ“ WyÅ‚Ä…czyÅ‚em adblocker â€” OdÅ›wieÅ¼',
                check  : 'Sprawdzanieâ€¦'
            },
            uk: {
                title  : 'ðŸ›¡ï¸ Ð’Ð¸ÑÐ²Ð»ÐµÐ½Ð¾ Ð±Ð»Ð¾ÐºÑƒÐ²Ð°Ð»ÑŒÐ½Ð¸Ðº',
                body   : 'GrepoPlus Ð¿Ð¾Ñ‚Ñ€ÐµÐ±ÑƒÑ” Ð¿Ñ–Ð´ÐºÐ»ÑŽÑ‡ÐµÐ½Ð½Ñ Ð´Ð¾ Ñ–Ð½Ñ‚ÐµÑ€Ð½ÐµÑ‚Ñƒ. Ð’Ð°Ñˆ Ð±Ð»Ð¾ÐºÑƒÐ²Ð°Ð»ÑŒÐ½Ð¸Ðº Ñ€ÐµÐºÐ»Ð°Ð¼Ð¸ Ð±Ð»Ð¾ÐºÑƒÑ” Ñ†Ðµ Ð·\'Ñ”Ð´Ð½Ð°Ð½Ð½Ñ.',
                step1  : 'Ð’Ð¸Ð¼ÐºÐ½Ñ–Ñ‚ÑŒ Ð±Ð»Ð¾ÐºÑƒÐ²Ð°Ð»ÑŒÐ½Ð¸Ðº Ð½Ð° Ñ†ÑŒÐ¾Ð¼Ñƒ ÑÐ°Ð¹Ñ‚Ñ–',
                step2  : 'ÐŸÐµÑ€ÐµÐ·Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶Ñ‚Ðµ ÑÑ‚Ð¾Ñ€Ñ–Ð½ÐºÑƒ',
                btn    : 'âœ“ Ð’Ð¸Ð¼ÐºÐ½ÑƒÐ² Ð±Ð»Ð¾ÐºÑƒÐ²Ð°Ð»ÑŒÐ½Ð¸Ðº â€” ÐŸÐµÑ€ÐµÐ·Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶Ð¸Ñ‚Ð¸',
                check  : 'ÐŸÐµÑ€ÐµÐ²Ñ–Ñ€ÐºÐ°â€¦'
            },
            ro: {
                title  : 'ðŸ›¡ï¸ Adblocker detectat',
                body   : 'GrepoPlus necesitÄƒ o conexiune la internet. Adblocker-ul tÄƒu blocheazÄƒ aceastÄƒ conexiune.',
                step1  : 'DezactiveazÄƒ adblocker-ul pe acest site',
                step2  : 'ReÃ®ncarcÄƒ pagina',
                btn    : 'âœ“ Am dezactivat adblocker-ul â€” ReÃ®ncarcÄƒ',
                check  : 'Verificareâ€¦'
            },
            cs: {
                title  : 'ðŸ›¡ï¸ DetekovÃ¡n Adblocker',
                body   : 'GrepoPlus vyÅ¾aduje pÅ™ipojenÃ­ k internetu. VÃ¡Å¡ adblocker toto pÅ™ipojenÃ­ blokuje.',
                step1  : 'Deaktivujte adblocker na tomto webu',
                step2  : 'Znovu naÄtÄ›te strÃ¡nku',
                btn    : 'âœ“ Deaktivoval jsem adblocker â€” Znovu naÄÃ­st',
                check  : 'Kontrolaâ€¦'
            },
            sk: {
                title  : 'ðŸ›¡ï¸ ZistenÃ½ Adblocker',
                body   : 'GrepoPlus vyÅ¾aduje pripojenie na internet. VÃ¡Å¡ adblocker blokuje toto pripojenie.',
                step1  : 'Deaktivujte adblocker na tejto strÃ¡nke',
                step2  : 'Znovu naÄÃ­tajte strÃ¡nku',
                btn    : 'âœ“ Deaktivoval som adblocker â€” Znovu naÄÃ­taÅ¥',
                check  : 'Kontrolaâ€¦'
            },
            hu: {
                title  : 'ðŸ›¡ï¸ Adblocker Ã©szlelve',
                body   : 'A GrepoPlus internetkapcsolatot igÃ©nyel. Az adblocker blokkolja ezt a kapcsolatot.',
                step1  : 'Kapcsolja ki az adblockerÃ©t ezen az oldalon',
                step2  : 'TÃ¶ltse Ãºjra az oldalt',
                btn    : 'âœ“ Kikapcsoltam az adblockerÃ©t â€” ÃšjratÃ¶ltÃ©s',
                check  : 'EllenÅ‘rzÃ©sâ€¦'
            },
            el: {
                title  : 'ðŸ›¡ï¸ Î•Î½Ï„Î¿Ï€Î¯ÏƒÏ„Î·ÎºÎµ Adblocker',
                body   : 'Î¤Î¿ GrepoPlus Î±Ï€Î±Î¹Ï„ÎµÎ¯ ÏƒÏÎ½Î´ÎµÏƒÎ· ÏƒÏ„Î¿ Î´Î¹Î±Î´Î¯ÎºÏ„Ï…Î¿. Î¤Î¿ adblocker ÏƒÎ±Ï‚ Î¼Ï€Î»Î¿ÎºÎ¬ÏÎµÎ¹ Î±Ï…Ï„Î® Ï„Î· ÏƒÏÎ½Î´ÎµÏƒÎ·.',
                step1  : 'Î‘Ï€ÎµÎ½ÎµÏÎ³Î¿Ï€Î¿Î¹Î®ÏƒÏ„Îµ Ï„Î¿ adblocker ÏƒÎ±Ï‚ ÏƒÎµ Î±Ï…Ï„ÏŒÎ½ Ï„Î¿Î½ Î¹ÏƒÏ„ÏŒÏ„Î¿Ï€Î¿',
                step2  : 'Î‘Î½Î±Î½ÎµÏŽÏƒÏ„Îµ Ï„Î· ÏƒÎµÎ»Î¯Î´Î±',
                btn    : 'âœ“ Î‘Ï€ÎµÎ½ÎµÏÎ³Î¿Ï€Î¿Î¯Î·ÏƒÎ± Ï„Î¿ adblocker â€” Î‘Î½Î±Î½Î­Ï‰ÏƒÎ·',
                check  : 'ÎˆÎ»ÎµÎ³Ï‡Î¿Ï‚â€¦'
            },
            tr: {
                title  : 'ðŸ›¡ï¸ Adblocker Tespit Edildi',
                body   : 'GrepoPlus bir internet baÄŸlantÄ±sÄ± gerektiriyor. Adblocker\'Ä±nÄ±z bu baÄŸlantÄ±yÄ± engelliyor.',
                step1  : 'Bu sitede adblocker\'Ä±nÄ±zÄ± devre dÄ±ÅŸÄ± bÄ±rakÄ±n',
                step2  : 'SayfayÄ± yenileyin',
                btn    : 'âœ“ Adblocker\'Ä± kapattÄ±m â€” Yenile',
                check  : 'Kontrol ediliyorâ€¦'
            },
            fi: {
                title  : 'ðŸ›¡ï¸ Adblocker havaittu',
                body   : 'GrepoPlus vaatii internet-yhteyden. Adblockerisi estÃ¤Ã¤ tÃ¤mÃ¤n yhteyden.',
                step1  : 'Poista adblocker kÃ¤ytÃ¶stÃ¤ tÃ¤llÃ¤ sivustolla',
                step2  : 'Lataa sivu uudelleen',
                btn    : 'âœ“ Poistin adblocker kÃ¤ytÃ¶stÃ¤ â€” Lataa uudelleen',
                check  : 'Tarkistetaanâ€¦'
            },
            da: {
                title  : 'ðŸ›¡ï¸ Adblocker registreret',
                body   : 'GrepoPlus krÃ¦ver en internetforbindelse. Din adblocker blokerer denne forbindelse.',
                step1  : 'Deaktiver din adblocker pÃ¥ dette websted',
                step2  : 'GenindlÃ¦s siden',
                btn    : 'âœ“ Jeg deaktiverede min adblocker â€” GenindlÃ¦s',
                check  : 'Kontrollererâ€¦'
            },
            nb: {
                title  : 'ðŸ›¡ï¸ Adblocker oppdaget',
                body   : 'GrepoPlus krever en internettforbindelse. Adblocker-en din blokkerer denne forbindelsen.',
                step1  : 'Deaktiver adblocker-en din pÃ¥ dette nettstedet',
                step2  : 'Last inn siden pÃ¥ nytt',
                btn    : 'âœ“ Jeg deaktiverte adblocker-en â€” Last inn pÃ¥ nytt',
                check  : 'Kontrollererâ€¦'
            },
            sv: {
                title  : 'ðŸ›¡ï¸ Adblocker upptÃ¤ckt',
                body   : 'GrepoPlus krÃ¤ver en internetanslutning. Din adblocker blockerar denna anslutning.',
                step1  : 'Inaktivera din adblocker pÃ¥ den hÃ¤r webbplatsen',
                step2  : 'Ladda om sidan',
                btn    : 'âœ“ Jag inaktiverade min adblocker â€” Ladda om',
                check  : 'Kontrollerarâ€¦'
            },
            hr: {
                title  : 'ðŸ›¡ï¸ Otkriven Adblocker',
                body   : 'GrepoPlus zahtijeva internetsku vezu. VaÅ¡ adblocker blokira ovu vezu.',
                step1  : 'OnemoguÄ‡ite adblocker na ovoj stranici',
                step2  : 'OsvjeÅ¾ite stranicu',
                btn    : 'âœ“ OnemoguÄ‡io sam adblocker â€” OsvjeÅ¾i',
                check  : 'Provjeraâ€¦'
            }
        };

        function getLang() {
            try {
                var n = (navigator.language || 'en').toLowerCase().split('-')[0];
                return LANGS[n] ? LANGS[n] : LANGS['en'];
            } catch(e) { return LANGS['en']; }
        }

        function showOverlay() {
            if (document.getElementById(OVERLAY_ID)) return;
            var L = getLang();

            var css =
                '#' + OVERLAY_ID + '{' +
                    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;' +
                    'background:rgba(10,12,16,0.97);display:flex;align-items:center;justify-content:center;' +
                    'font-family:"Segoe UI",Arial,sans-serif;' +
                '}' +
                '#' + OVERLAY_ID + ' ._ab_box{' +
                    'background:linear-gradient(160deg,#1a1d24,#12151b);' +
                    'border:1px solid #c9a84c55;border-radius:12px;padding:40px 48px;' +
                    'max-width:520px;width:90%;text-align:center;' +
                    'box-shadow:0 0 60px rgba(201,168,76,0.12),0 20px 60px rgba(0,0,0,0.6);' +
                    'animation:_ab_pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;' +
                '}' +
                '@keyframes _ab_pop{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}' +
                '#' + OVERLAY_ID + ' ._ab_title{' +
                    'font-size:22px;font-weight:700;color:#c9a84c;margin-bottom:14px;letter-spacing:0.5px;' +
                '}' +
                '#' + OVERLAY_ID + ' ._ab_body{' +
                    'font-size:14px;color:#b0b8c8;line-height:1.6;margin-bottom:24px;' +
                '}' +
                '#' + OVERLAY_ID + ' ._ab_steps{' +
                    'background:rgba(255,255,255,0.04);border-radius:8px;padding:16px 20px;' +
                    'margin-bottom:28px;text-align:left;' +
                '}' +
                '#' + OVERLAY_ID + ' ._ab_step{' +
                    'display:flex;align-items:center;gap:12px;font-size:13px;color:#d0d8e8;margin-bottom:8px;' +
                '}' +
                '#' + OVERLAY_ID + ' ._ab_step:last-child{margin-bottom:0}' +
                '#' + OVERLAY_ID + ' ._ab_num{' +
                    'width:24px;height:24px;border-radius:50%;background:#c9a84c;color:#1a1405;' +
                    'font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
                '}' +
                '#' + OVERLAY_ID + ' ._ab_btn{' +
                    'background:linear-gradient(135deg,#c9a84c,#a8863a);color:#1a1405;' +
                    'border:none;border-radius:8px;padding:14px 28px;font-size:14px;font-weight:700;' +
                    'cursor:pointer;width:100%;transition:opacity 0.2s,transform 0.1s;' +
                    'letter-spacing:0.3px;' +
                '}' +
                '#' + OVERLAY_ID + ' ._ab_btn:hover{opacity:0.9;transform:translateY(-1px)}' +
                '#' + OVERLAY_ID + ' ._ab_btn:active{transform:translateY(0)}' +
                '#' + OVERLAY_ID + ' ._ab_btn:disabled{opacity:0.5;cursor:default;transform:none}' +
                '#' + OVERLAY_ID + ' ._ab_logo{width:56px;height:56px;margin:0 auto 10px;display:block;border-radius:50%;}' +
                '#' + OVERLAY_ID + ' ._ab_brand{' +
                    'font-family:Georgia,"Times New Roman",serif;font-size:28px;font-weight:900;' +
                    'letter-spacing:6px;text-transform:uppercase;margin-bottom:6px;' +
                    'background:linear-gradient(135deg,#f5e8a0,#c9a84c,#7a5e20);' +
                    '-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;' +
                '}' +
                '#' + OVERLAY_ID + ' ._ab_discord{' +
                    'display:inline-flex;align-items:center;gap:5px;margin-top:16px;' +
                    'background:rgba(88,101,242,0.12);color:#8b9cf4;' +
                    'border:1px solid rgba(88,101,242,0.35);border-radius:5px;' +
                    'padding:3px 10px;font-size:7.5pt;font-weight:700;text-decoration:none;' +
                    'transition:all 0.15s;cursor:pointer;font-family:Arial,sans-serif;' +
                    'letter-spacing:0.3px;text-transform:uppercase;' +
                '}' +
                '#' + OVERLAY_ID + ' ._ab_discord:hover{' +
                    'background:rgba(88,101,242,0.25);border-color:rgba(88,101,242,0.6);color:#aab4f8;' +
                '}';

            var styleEl = document.createElement('style');
            styleEl.textContent = css;
            document.head.appendChild(styleEl);

            var overlay = document.createElement('div');
            overlay.id  = OVERLAY_ID;
            overlay.innerHTML =
                '<div class="_ab_box">' +
                    '<img class="_ab_logo" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9ImJnciIgY3g9IjQwJSIgY3k9IjM1JSIgcj0iNjUlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzIyMWMwYSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwODA2MDIiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImcxIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZThhMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjQwJSIgc3RvcC1jb2xvcj0iI2M5YTg0YyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM1YTNlMTAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImcyIiB4MT0iMTAwJSIgeTE9IjAlIiB4Mj0iMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2YwZDg3OCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iI2M5YTg0YyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM3YTVlMjAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9Imdsb3dSIiBjeD0iNTAlIiBjeT0iNTAlIiByPSI1MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjYzlhODRjIiBzdG9wLW9wYWNpdHk9IjAuMTMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjYzlhODRjIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdUZXh0IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmNWU4YTAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI0NSUiIHN0b3AtY29sb3I9IiNjOWE4NGMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNmE0ZTE4Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGNsaXBQYXRoIGlkPSJjaXJjbGUtY2xpcCI+CiAgICAgIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjI4Ii8+CiAgICA8L2NsaXBQYXRoPgogIDwvZGVmcz4KCiAgPCEtLSBGb25kIGR1IGNlcmNsZSB1bmlxdWVtZW50IChwYXMgZGUgcmVjdCkgLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9InVybCgjZ2xvd1IpIi8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9InVybCgjYmdyKSIvPgoKICA8IS0tIEFubmVhdXggLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNnMSkiIHN0cm9rZS13aWR0aD0iNSIvPgogIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjM2IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMC44IiBvcGFjaXR5PSIwLjI1Ii8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNnMikiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIxOTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1kYXNoYXJyYXk9IjMgOCIgb3BhY2l0eT0iMC4zIi8+CgogIDwhLS0gRGlhbWFudHMgY2FyZGluYXV4IC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjUwLDE4IDI1NSwyOCAyNTAsMzggMjQ1LDI4IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjkiLz4KICA8cG9seWdvbiBwb2ludHM9IjI1MCw0NjIgMjU1LDQ1MiAyNTAsNDQyIDI0NSw0NTIiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOSIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsMjUwIDI4LDI0NSAzOCwyNTAgMjgsMjU1IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQ2MiwyNTAgNDUyLDI0NSA0NDIsMjUwIDQ1MiwyNTUiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOSIvPgoKICA8IS0tIFRpY2tzIGNhcmRpbmF1eCAtLT4KICA8bGluZSB4MT0iMjUwIiB5MT0iMjAiIHgyPSIyNTAiIHkyPSIzOCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSIyNTAiIHkxPSI0NjIiIHgyPSIyNTAiIHkyPSI0ODAiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIwLjciLz4KICA8bGluZSB4MT0iMjAiIHkxPSIyNTAiIHgyPSIzOCIgeTI9IjI1MCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSI0NjIiIHkxPSIyNTAiIHgyPSI0ODAiIHkyPSIyNTAiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIwLjciLz4KCiAgPCEtLSBUaWNrcyBkaWFnb25hdXggLS0+CiAgPGxpbmUgeDE9IjkyIiB5MT0iOTIiIHgyPSIxMDMiIHkyPSIxMDMiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiLz4KICA8bGluZSB4MT0iMzk3IiB5MT0iOTIiIHgyPSI0MDgiIHkyPSIxMDMiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiIHRyYW5zZm9ybT0icm90YXRlKDkwLDQwMiw5NykiLz4KICA8bGluZSB4MT0iOTIiIHkxPSIzOTciIHgyPSIxMDMiIHkyPSI0MDgiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiIHRyYW5zZm9ybT0icm90YXRlKC05MCw5Nyw0MDIpIi8+CiAgPGxpbmUgeDE9IjM5NyIgeTE9IjM5NyIgeDI9IjQwOCIgeTI9IjQwOCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEuMiIgb3BhY2l0eT0iMC40NSIgdHJhbnNmb3JtPSJyb3RhdGUoMTgwLDQwMiw0MDIpIi8+CgogIDwhLS0gUGV0aXRzIGNlcmNsZXMgZW50cmUgZGlhbWFudHMgLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iNTAiIHI9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjQ1MCIgcj0iMy41IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSIyNTAiIHI9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjQ1MCIgY3k9IjI1MCIgcj0iMy41IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CgogIDwhLS0gRyBsZXR0cmUgLS0+CiAgPHRleHQKICAgIHg9IjI1MCIgeT0iMjUwIgogICAgdGV4dC1hbmNob3I9Im1pZGRsZSIKICAgIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIgogICAgZm9udC1mYW1pbHk9IidDaW56ZWwnLCBHZW9yZ2lhLCBzZXJpZiIKICAgIGZvbnQtc2l6ZT0iMzQwIgogICAgZm9udC13ZWlnaHQ9IjkwMCIKICAgIGZpbGw9InVybCgjZ1RleHQpIgogICAgY2xpcC1wYXRoPSJ1cmwoI2NpcmNsZS1jbGlwKSIKICA+RzwvdGV4dD4KCiAgPCEtLSBBcmNzIGTDqWNvcmF0aWZzIGhhdXQgKHBhciBkZXNzdXMgbGUgRykgLS0+CiAgPHBhdGggZD0iTSAxNDggMTMwIFEgMjUwIDg4IDM1MiAxMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNTUiLz4KICA8cGF0aCBkPSJNIDE1OCAxMTQgUSAyNTAgNjggMzQyIDExNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjAuNyIgb3BhY2l0eT0iMC4yOCIvPgoKICA8IS0tIEFyY3MgZMOpY29yYXRpZnMgYmFzIChwYXIgZGVzc3VzIGxlIEcpIC0tPgogIDxwYXRoIGQ9Ik0gMTQ4IDM3MCBRIDI1MCA0MTIgMzUyIDM3MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEuNSIgb3BhY2l0eT0iMC41NSIvPgogIDxwYXRoIGQ9Ik0gMTU4IDM4NiBRIDI1MCA0MzIgMzQyIDM4NiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjAuNyIgb3BhY2l0eT0iMC4yOCIvPgoKPC9zdmc+Cg==" alt="GrepoPlus" />' +
                    '<div class="_ab_brand">GrepoPlus</div>' +
                    '<div class="_ab_title">' + L.title + '</div>' +
                    '<div class="_ab_body">' + L.body + '</div>' +
                    '<div class="_ab_steps">' +
                        '<div class="_ab_step"><div class="_ab_num">1</div><span>' + L.step1 + '</span></div>' +
                        '<div class="_ab_step"><div class="_ab_num">2</div><span>' + L.step2 + '</span></div>' +
                    '</div>' +
                    '<button class="_ab_btn" id="_ab_reload_btn">' + L.btn + '</button>' +
                    '<a class="_ab_discord" href="https://discord.gg/VWeEWQFUFE" target="_blank">' +
                        '<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z\"/></svg> Support' +
                    '</a>' +
                '</div>';

            document.body ? document.body.appendChild(overlay) : document.documentElement.appendChild(overlay);

            document.getElementById('_ab_reload_btn').addEventListener('click', function () {
                window.location.reload();
            });
        }

        function removeOverlay() {
            var el = document.getElementById(OVERLAY_ID);
            if (el) el.parentNode.removeChild(el);
        }

        // Teste le WebSocket vers le VPS. callback(true) = bloquÃ©, callback(false) = OK.
        function testWS(callback) {
            var done = false;
            var timeout = setTimeout(function() {
                if (!done) { done = true; callback(true); }
            }, 5000);
            try {
                var ws = new window.WebSocket('wss://grepoplus.duckdns.org/premium/ws?key=adblock_check');
                ws.onopen = function() {
                    if (!done) { done = true; clearTimeout(timeout); ws.close(); callback(false); }
                };
                ws.onerror = function() {
                    if (!done) { done = true; clearTimeout(timeout); callback(true); }
                };
                ws.onclose = function(ev) {
                    // code 1000 = fermeture normale (server a reÃ§u et fermÃ© proprement)
                    if (!done) { done = true; clearTimeout(timeout); callback(ev.code === 1006 || ev.wasClean === false); }
                };
            } catch(e) {
                clearTimeout(timeout);
                callback(true);
            }
        }

        // Attendre que le body soit dispo pour injecter l'overlay si nÃ©cessaire
        function waitBodyThen(fn) {
            if (document.body) { fn(); return; }
            var obs = new MutationObserver(function() {
                if (document.body) { obs.disconnect(); fn(); }
            });
            obs.observe(document.documentElement, { childList: true });
        }

        // On vÃ©rifie d'abord si notre serveur WebSocket est bien up.
        // Si le serveur est down, on ne peut pas distinguer adblocker d'une panne :
        // on laisse passer et on boot normalement.
        // Si le serveur est up mais que le client ne peut pas s'y connecter â†’ adblocker.
        fetch('https://grepoplus.duckdns.org/premium/ws-status', { method: 'GET', cache: 'no-store' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (!data || !data.ws) {
                    // Serveur down ou rÃ©ponse inattendue â†’ on boot normalement, pas d'overlay
                    onClear();
                    return;
                }
                // Serveur confirmÃ© UP â†’ on teste si le client peut s'y connecter
                testWS(function(blocked) {
                    if (!blocked) {
                        onClear();
                    } else {
                        // Serveur up mais client bloquÃ© â†’ c'est l'adblocker
                        waitBodyThen(showOverlay);
                    }
                });
            })
            .catch(function() {
                // Impossible de joindre le serveur (down, rÃ©seau, etc.) â†’ on boot normalement
                onClear();
            });
    }

    var CACHE_TS = Math.floor(Date.now() / 60000);
    var origAppendChild = Element.prototype.appendChild;

    // â”€â”€ Callbacks en attente de rÃ©ponse GM bridge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var _pending = {};
    var _reqId   = 0;

    document.addEventListener(EVT_RES, function (e) {
        var d  = (typeof e.detail === 'object') ? e.detail : JSON.parse(e.detail);
        var cb = _pending[d.id];
        if (!cb) return;
        delete _pending[d.id];
        cb(d.status === 200 ? null : 'HTTP ' + d.status, d.text);
    });

    function gmFetch(url, cb) {
        var id = ++_reqId;
        _pending[id] = cb;
        var payload = { id: id, method: 'GET', url: url.indexOf('cdnjs.cloudflare.com') !== -1 ? url : url + '?v=' + CACHE_TS };
        var ev = new CustomEvent(EVT_REQ, {
            detail : (typeof cloneInto === 'function') ? cloneInto(payload, document) : payload,
            bubbles: true
        });
        document.dispatchEvent(ev);
    }

    // â”€â”€ Injection helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function injectCSS(f) {
        [f.gfbotCss, f.grepoCss, f.botCss, f.tutorialCss].forEach(function (css) {
            var s = document.createElement('style');
            s.type = 'text/css';
            s.textContent = css;
            origAppendChild.call(document.head, s);
        });
    }

    function injectBlob(code, label, cb) {
        var blob = new Blob([code], { type: 'application/javascript' });
        var url  = URL.createObjectURL(blob);
        var s    = document.createElement('script');
        s.src    = url;
        s.onload = function () {
            URL.revokeObjectURL(url);
            if (cb) cb();
        };
        s.onerror = function () {
            URL.revokeObjectURL(url);
            console.error('[GFBot] Erreur blob:', label);
            if (cb) cb();
        };
        origAppendChild.call(document.head, s);
    }

    // â”€â”€ Chargement de tous les fichiers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function loadAll(callback) {
        var toLoad = {
            bot        : VPS_BASE + '/bot.js',
            botCss     : VPS_BASE + '/css/bot.css',
            gfbotCss   : VPS_BASE + '/css/gfbot.css',
            grepoCss   : VPS_BASE + '/css/grepo.css',
            tutorialCss: VPS_BASE + '/css/tutorial.css',
            angular    : CDN_ANGULAR
        };
        var result = {}, total = Object.keys(toLoad).length, done = 0, errors = 0;

        function finish() {
            if (++done === total) {
                errors > 0 ? console.error('[GFBot] Abandon.') : callback(result);
            }
        }

        Object.keys(toLoad).forEach(function (key) {
            gmFetch(toLoad[key], function (err, text) {
                if (err) { console.error('[GFBot] Erreur ' + key + ':', err); errors++; }
                else { result[key] = text; }
                finish();
            });
        });

        // responses.json + rÃ©solution des __FILE__:...
        total++;
        gmFetch(VPS_BASE + '/responses.json', function (err, text) {
            if (err) { console.error('[GFBot] Erreur responses.json:', err); errors++; return finish(); }
            var index;
            try { index = JSON.parse(text); } catch (e) {
                console.error('[GFBot] responses.json invalide:', e); errors++; return finish();
            }

            var fileRefs = [];
            function collectRefs(obj, setter) {
                if (typeof obj === 'string' && obj.indexOf('__FILE__:') === 0) {
                    fileRefs.push({ path: obj.slice(9), setter: setter });
                } else if (Array.isArray(obj)) {
                    obj.forEach(function (v, i) { collectRefs(v, function (val) { obj[i] = val; }); });
                } else if (obj && typeof obj === 'object') {
                    Object.keys(obj).forEach(function (k) { collectRefs(obj[k], function (val) { obj[k] = val; }); });
                }
            }
            collectRefs(index, function () {});

            if (fileRefs.length === 0) {
                result['responses'] = JSON.stringify(index);
                return finish();
            }

            var fileDone = 0;
            fileRefs.forEach(function (ref) {
                gmFetch(VPS_BASE + '/' + ref.path, function (ferr, ftext) {
                    if (ferr) { console.error('[GFBot] Erreur fichier externe ' + ref.path + ':', ferr); errors++; }
                    else { ref.setter(ftext); }
                    if (++fileDone === fileRefs.length) {
                        var flat = {};
                        Object.keys(index).forEach(function (k) {
                            var v = index[k];
                            flat[k] = (typeof v === 'string') ? v : JSON.stringify(v);
                        });
                        result['responses'] = JSON.stringify(flat);
                        finish();
                    }
                });
            });
        });
    }

    // â”€â”€ GM listener (events bot.js <-> GM bridge) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Compteur d'ID unique â€” basÃ© sur timestamp + index pour Ã©viter toute collision
    var _cmdIdCounter = Date.now() * 1000;

    function setupGMListener(RESPONSES) {
        document.addEventListener(BOT_EVT_REQ, function (e) {
            var params;
            try { params = typeof e.detail === 'object' ? e.detail : JSON.parse(e.detail); }
            catch (ex) { console.error('[GFBot] Parse error:', ex); return; }

            var method, reqData;
            try { var parsed = JSON.parse(params.data); method = parsed.method; reqData = parsed.data; } catch (ex) { return; }
            if (!method) return;

            var resp;

            // commander:save â€” retourner un ID unique Ã  chaque fois
            if (method === 'commander:save') {
                var newId = _cmdIdCounter++;
                resp = JSON.stringify({ status: 'ok', result: { id: newId } });
            }
            // commander:delete â€” acquitter sans rien faire (la suppression se fait via _pushShared)
            else if (method === 'commander:delete') {
                resp = '{"status":"ok","result":null}';
            }
            else {
                var raw = RESPONSES[method] || '{"status":"ok","result":null}';
                try { resp = JSON.stringify(JSON.parse(raw)); } catch (ex) { resp = raw; }
            }

            setTimeout(function () {
                var out    = { id: params.id, status: 200, text: resp };
                var cloned = typeof cloneInto === 'function' ? cloneInto(out, document) : out;
                document.dispatchEvent(new CustomEvent(BOT_EVT_RES, { detail: cloned, bubbles: true }));
            }, 50);
        });
    }

    // â”€â”€ jQuery / Ajax patch (injectÃ© dans le scope page) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function buildJqueryPatch(RESPONSES) {
        return '(function(){' +
            'if(window._gfbot_patched)return;window._gfbot_patched=true;' +

            // Bloquer WebSocket vers domaine fictif "local"
            'var _OrigWS=window.WebSocket;' +
            'window.WebSocket=function(url,protocols){' +
            '  if(url&&url.indexOf("//local")!==-1){' +
            '    ' +
            '    var _f={send:function(){},close:function(){},readyState:3,' +
            '      addEventListener:function(t,fn){' +
            '        if(t==="error"&&typeof fn==="function")' +
            '          setTimeout(function(){try{fn(new Event("error"));}catch(e){}},10);' +
            '      },removeEventListener:function(){},' +
            '      onclose:null,onerror:null,onmessage:null,onopen:null};' +
            '    setTimeout(function(){' +
            '      if(typeof _f.onclose==="function")_f.onclose({code:1006,reason:"local"});' +
            '    },20);return _f;' +
            '  }' +
            '  return new _OrigWS(url,protocols);' +
            '};' +

            // Helper _makeResp
            'function _makeResp(jsonStr){' +
            '  var obj;try{obj=JSON.parse(jsonStr);}catch(e){obj={status:"ok",result:null};}' +
            '  var w=new String(jsonStr);' +
            '  if(obj&&typeof obj==="object"){Object.keys(obj).forEach(function(k){w[k]=obj[k];});}' +
            '  return w;' +
            '}' +

            'var R=' + JSON.stringify(RESPONSES) + ';' +

            // Patch jQuery.fn (persistant car Grepolis recharge jQuery)
            'function _patchJqueryFn(jq){' +
            '  if(!jq||!jq.fn||jq.fn["_gfbot_fn_patched"])return;' +
            '  jq.fn["_gfbot_fn_patched"]=true;' +
            '  jq.fn["z-index"]=function(val){' +
            '    if(val===undefined)return this.css("z-index");' +
            '    var n=parseInt(val,10);' +
            '    if(!isNaN(n))return this.css("z-index",String(n));' +
            '    if(val==="active")return this.addClass("active");' +
            '    if(val==="start")return this.addClass("start");' +
            '    if(val===""||val==="stop")return this.removeClass("active start");' +
            '    return this.css("z-index",val);' +
            '  };' +
            '  jq.fn["control round16"]=function(fn){return(typeof fn==="function")?this.on("click",fn):this;};' +
            '  jq.fn["control"]=function(){return this;};' +
            '  jq.fn.live=function(e,f){return this.on(e,f);};' +
            '  jq.fn.die=function(e,f){return this.off(e,f);};' +
            '  jq.fn.size=function(){return this.length;};' +
            '  jq.fn.error=function(f){return this.on("error",f);};' +
            '  if(jq.fn.addBack)jq.fn.andSelf=jq.fn.addBack;' +
            '  jq.sub=function(){return jq;};' +
            '  ' +
            '}' +
            'var _lastJQ=null;' +
            'setInterval(function(){' +
            '  var jq=window.jQuery||window.$;if(!jq||!jq.fn)return;' +
            '  if(jq!==_lastJQ||!jq.fn["_gfbot_fn_patched"]){_lastJQ=jq;_patchJqueryFn(jq);}' +
            '  if(window.$&&window.$!==jq&&window.$.fn&&!window.$.fn["_gfbot_fn_patched"])_patchJqueryFn(window.$);' +
            '},2000);' +

            // Patch $.ajax
            'var _ajaxPatched=false;' +
            'setInterval(function(){' +
            '  if(typeof $==="undefined"||!$.ajax)return;' +
            '  if(_ajaxPatched&&$.ajax._gfbot_ajax)return;' +
            '  _ajaxPatched=true;' +
            '  var _orig=$.ajax;' +
            '  var _patched=function(o){' +
            '    if(!o||!o.url)return _orig.apply(this,arguments);' +
            '    var _isBot=o.url.indexOf("ajaxv2")!==-1||o.url.indexOf("/local/")!==-1;' +
            '    if(_isBot){' +
            '      try{' +
            '        var _m,_d;' +
            '        try{var _p=JSON.parse(o.data);_m=_p.method;_d=_p.data;}catch(_e){_m=null;_d={};}' +

            // herald:plan â€” calcul local auto-dodge
            '        if(_m==="herald:plan"&&_d){' +
            '          var _planOrder=null;' +
            '          try{' +
            '            var _units=[];var _ud=(_d.data&&_d.data.units)?_d.data.units:{};' +
            '            var _isNav=(_d.type==="naval");var _maxDur=0;' +
            '            Object.keys(_ud).forEach(function(uid){' +
            '              var u=_ud[uid];var cnt=u.count||0;if(cnt<1)return;' +
            '              var _gd=GameData.units[uid];' +
            '              var isN=_gd?!!_gd.is_naval:false;' +
            '              if(_isNav&&!isN)return;if(!_isNav&&isN)return;' +
            '              var dur=u.duration||300;if(dur>_maxDur)_maxDur=dur;' +
            '              _units.push({id:uid,count:cnt});' +
            '            });' +
            '            if(_units.length>0)_planOrder={action:"support",strategy:"support",town:{id:_d.town.id,name:_d.town.name},target:{id:_d.target.id,name:_d.target.name},units:_units,duration:_maxDur||300};' +
            '          }catch(_pe){console.error("[GFBot] herald:plan err:",_pe);}' +
            '          var _pr={status:"ok",result:{order:_planOrder}};' +
            '          var _pw=new String(JSON.stringify(_pr));Object.keys(_pr).forEach(function(k){_pw[k]=_pr[k];});' +
            '          setTimeout(function(){if(o.success)o.success(_pw);},50);' +
            '          return{always:function(f){setTimeout(function(){try{f(_pw);}catch(e){}},0);return this;},' +
            '                done:function(f){setTimeout(function(){try{f(_pw);}catch(e){}},0);return this;},' +
            '                fail:function(){return this;},then:function(f){setTimeout(function(){try{f(_pw);}catch(e){}},0);return this;},' +
            '                promise:function(){return this;}};' +
            '        }' +

            // Echo methods
            '        var _ECHO=["foreman:add","recruiter:add","docent:add","sorciere:add","trader:add"];' +
            '        if(_m&&_ECHO.indexOf(_m)!==-1&&_d){' +
            '          if(!window._gfbot_order_id)window._gfbot_order_id=1;' +
            '          var _order=Object.assign({id:window._gfbot_order_id++,module:_m.split(":")[0]},_d);' +
            '          var _er={status:"ok",result:_order};' +
            '          var _ew=new String(JSON.stringify(_er));Object.keys(_er).forEach(function(k){_ew[k]=_er[k];});' +
            '          setTimeout(function(){if(o.success)o.success(_ew);},50);' +
            '          return{always:function(f){setTimeout(function(){try{f(_ew);}catch(e){}},0);return this;},' +
            '                done:function(f){setTimeout(function(){try{f(_ew);}catch(e){}},0);return this;},' +
            '                fail:function(){return this;},then:function(f){setTimeout(function(){try{f(_ew);}catch(e){}},0);return this;},' +
            '                promise:function(){return this;}};' +
            '        }' +

            '        var _raw=(_m&&R[_m])?R[_m]:\'{"status":"ok","result":null}\';' +
            '        var _resp=_makeResp(_raw);' +
            '        ' +
            '        setTimeout(function(){if(o.success)o.success(_resp);},50);' +
            '        return{always:function(f){setTimeout(function(){try{f(_resp);}catch(e){}},0);return this;},' +
            '              done:function(f){setTimeout(function(){try{f(_resp);}catch(e){}},0);return this;},' +
            '              fail:function(){return this;},then:function(f){setTimeout(function(){try{f(_resp);}catch(e){}},0);return this;},' +
            '              promise:function(){return this;}};' +
            '      }catch(_err){console.error("[GFBot] jQuery err:",_err);}' +
            '    }' +
            '    return _orig.apply(this,arguments);' +
            '  };' +
            '  _patched._gfbot_ajax=true;$.ajax=_patched;' +
            '  if(window.jQuery&&window.jQuery.ajax!==_patched)window.jQuery.ajax=_patched;' +
            '  ' +
            '},2000);' +
            '})()';
    }

    // â”€â”€ UI de dÃ©marrage (toast de chargement) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function injectBootUI() {
        // DÃ©lÃ©guÃ© Ã  un script injectÃ© dans le DOM pour avoir accÃ¨s au document visuel
        var s = document.createElement('script');
        s.src = VPS_BASE + '/boot-ui.js?v=' + CACHE_TS;
        origAppendChild.call(document.head, s);
    }

    // â”€â”€ Point d'entrÃ©e â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // VÃ©rifie d'abord qu'aucun adblocker ne bloque le WebSocket premium.
    // Si tout est OK, on lance le bot normalement. Sinon, un overlay bloquant
    // est affichÃ© et le bot ne dÃ©marre pas.
    checkAdblock(function () {
    injectBootUI();

    loadAll(function (f) {

        var notif = document.createElement('script');
        notif.textContent = 'if(window._gfbot_module_loaded){' +
            'window._gfbot_module_loaded("Injection",null);' +
            'window._gfbot_module_loaded("TÃ©lÃ©chargement",true);}';
        origAppendChild.call(document.head, notif);

        var RESPONSES = JSON.parse(f.responses);
        setupGMListener(RESPONSES);
        injectCSS(f);

        // Patch jQuery.fn prÃ©pendÃ© directement dans bot.js
        var botFnPatch = '(function(){' +
            'var _applyFn=function(jq){' +
            '  if(!jq||!jq.fn||jq.fn["_gfbot_fn_ok"])return;' +
            '  jq.fn["_gfbot_fn_ok"]=true;' +
            '  jq.fn["z-index"]=function(v){' +
            '    if(v===undefined)return this.css("z-index");' +
            '    var n=parseInt(v,10);if(!isNaN(n))return this.css("z-index",String(n));' +
            '    if(v==="active")return this.addClass("active");' +
            '    if(v==="start")return this.addClass("start");' +
            '    return this.removeClass("active start");' +
            '  };' +
            '  jq.fn["control round16"]=function(fn){return(typeof fn==="function")?this.on("click",fn):this;};' +
            '  jq.fn["control"]=function(){return this;};' +
            '  ' +
            '};' +
            '_applyFn(window.jQuery);_applyFn(window.$);' +
            'setInterval(function(){_applyFn(window.jQuery);if(window.$!==window.jQuery)_applyFn(window.$);},300);' +
            'setInterval(function(){' +
            '  if(window.BuildingWindowFactory&&typeof BuildingWindowFactory.refresh!=="function")BuildingWindowFactory.refresh=function(){};' +
            '  if(window.HumanMessage){' +
            '    if(typeof HumanMessage.error!=="function")HumanMessage.error=function(){};' +
            '    if(typeof HumanMessage.success!=="function")HumanMessage.success=function(){};' +
            '  }' +
            '},500);' +
            // Patch getAllUnitListTooltips : filtre les icÃ´nes d'unitÃ©s inconnues avant
            // que le jeu tente de lire unit.name_plural et crashe.
            // On scanne tous les objets globaux pour trouver getAllUnitListTooltips,
            // puis on wrappe la fonction pour neutraliser les Ã©lÃ©ments DOM hors GameData.units.
            '(function(){' +
            '  var _maxWait=15000,_start=Date.now();' +
            '  function _uid(el){var cls=(el.className||"").split(" ");for(var i=0;i<cls.length;i++){if(cls[i]&&cls[i]!=="unit_icon40x40"&&cls[i]!=="unit_icon228x165"&&/^[a-z]/.test(cls[i]))return cls[i];}return null;}' +
            '  var _candidates=["GPNotificationMgr","NotificationSystem","GPWindowMgr","window"];' +
            '  function _findOwner(){for(var i=0;i<_candidates.length;i++){var o=window[_candidates[i]];if(o&&typeof o.getAllUnitListTooltips==="function")return o;}try{for(var k in window){try{var o=window[k];if(o&&typeof o==="object"&&typeof o.getAllUnitListTooltips==="function")return o;}catch(e){}}}catch(e){}return null;}' +
            '  function _wrap(owner){' +
            '    var _orig=owner.getAllUnitListTooltips.bind(owner);' +
            '    owner.getAllUnitListTooltips=function(){' +
            '      var units=window.GameData&&window.GameData.units;' +
            '      if(!units)return;' +
            '      var jq=window.jQuery||window.$;' +
            '      if(!jq||!jq.fn)return;' +
            '      var $all=jq(".unit_icon40x40,.unit_icon228x165");' +
            '      var $hidden=$all.filter(function(){var id=_uid(this);return id&&!units[id];});' +
            '      $hidden.removeClass("unit_icon40x40 unit_icon228x165").addClass("_gfbot_hidden_icon");' +
            '      try{return _orig();}catch(e){if(!e||!/each|undefined/.test(e.message))throw e;}finally{' +
            '        $hidden.removeClass("_gfbot_hidden_icon").addClass("unit_icon40x40");' +
            '      }' +
            '    };' +
            '  }' +
            '  var _lastOwner=null;' +
            '  function _patch(){' +
            '    var owner=_findOwner();' +
            '    if(owner&&owner!==_lastOwner){_lastOwner=owner;owner._gfbot_patched=true;_wrap(owner);}' +
            '    if(Date.now()-_start<_maxWait)setTimeout(_patch,500);' +
            '  }' +
            '  _patch();' +
            '})();' +
            '})();\n';

        f.bot = botFnPatch + f.bot;

        injectBlob(f.angular, 'angular.js', function () {
            injectBlob(buildJqueryPatch(RESPONSES), 'jquery-patch', function () {
                injectBlob(f.bot, 'bot.js', function () {
                    var done = document.createElement('script');
                    done.textContent = 'if(window._gfbot_module_loaded)window._gfbot_module_loaded("Injection",true);';
                    origAppendChild.call(document.head, done);
                });
            });
        });
    }); // fin loadAll

    }); // fin checkAdblock

})();
