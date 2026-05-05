/**
 * boot-ui.js  â€” GFBot : toast de chargement avec suivi des modules
 * PlacÃ© sur le VPS : https://grepoplus.duckdns.org/bot/boot-ui.js
 *
 * Expose sur window :
 *   window._gfbot_module_loaded(name, status)
 *     status : null     = en cours (spinner)
 *              true     = OK (âœ“)
 *              false    = erreur (âœ—)
 *              "lock"   = verrouillÃ© (ðŸ”’)
 *              undefined / "pending" = en attente (â€”)
 *
 *   window._gfbot_boot_done()
 *     AppelÃ© quand tous les modules sont chargÃ©s : affiche "Chargement effectuÃ©"
 *     puis ferme le toast aprÃ¨s 4 secondes.
 */
(function () {
    if (window._gfbot_boot_ui) return;
    window._gfbot_boot_ui = true;

    var G  = '#c9a84c';   // or Grepolis
    var OK = '#4caf6e';   // vert
    var KO = '#e05555';   // rouge
    var GR = '#888';      // gris

    // â”€â”€ Traductions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var TRANS = {
        'Chargement'         : { en:'Loading',            de:'Laden',             es:'Cargando',          it:'Caricamento',       nl:'Laden',          pt:'Carregando',          ru:'Ð—Ð°Ð³Ñ€ÑƒÐ·ÐºÐ°',           uk:'Ð—Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶ÐµÐ½Ð½Ñ',         ro:'Se Ã®ncarcÄƒ',      pl:'Åadowanie',         cs:'NaÄÃ­tÃ¡nÃ­',         sk:'NaÄÃ­tanie',        hu:'BetÃ¶ltÃ©s',        el:'Î¦ÏŒÏÏ„Ï‰ÏƒÎ·',             tr:'YÃ¼kleniyor',        fi:'Ladataan',        da:'IndlÃ¦ser',        nb:'Laster',           sv:'Laddar',           hr:'UÄitavanje'        },
        'Chargement effectuÃ©': { en:'Loading complete',   de:'Laden abgeschlossen',es:'Carga completada',  it:'Caricamento completato',nl:'Laden voltooid',pt:'Carregamento concluÃ­do',ru:'Ð—Ð°Ð³Ñ€ÑƒÐ·ÐºÐ° Ð·Ð°Ð²ÐµÑ€ÑˆÐµÐ½Ð°',uk:'Ð—Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶ÐµÐ½Ð½Ñ Ð·Ð°Ð²ÐµÑ€ÑˆÐµÐ½Ð¾',ro:'ÃŽncÄƒrcare completÄƒ',pl:'Åadowanie zakoÅ„czone',cs:'NaÄÃ­tÃ¡nÃ­ dokonÄeno',sk:'NaÄÃ­tanie dokonÄenÃ©',hu:'BetÃ¶ltÃ©s kÃ©sz',el:'Î¦ÏŒÏÏ„Ï‰ÏƒÎ· Î¿Î»Î¿ÎºÎ»Î·ÏÏŽÎ¸Î·ÎºÎµ',tr:'YÃ¼kleme tamamlandÄ±',fi:'Lataus valmis',da:'IndlÃ¦sning fuldfÃ¸rt',nb:'Lasting fullfÃ¸rt',sv:'Laddning klar',hr:'UÄitavanje zavrÅ¡eno'},
        'TÃ©lÃ©chargement'     : { en:'Download',           de:'Download',           es:'Descarga',          it:'Download',          nl:'Download',       pt:'Download',            ru:'Ð—Ð°Ð³Ñ€ÑƒÐ·ÐºÐ° Ñ„Ð°Ð¹Ð»Ð¾Ð²',    uk:'Ð—Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶ÐµÐ½Ð½Ñ Ñ„Ð°Ð¹Ð»Ñ–Ð²',  ro:'DescÄƒrcare',      pl:'Pobieranie',        cs:'StahovÃ¡nÃ­',        sk:'SÅ¥ahovanie',       hu:'LetÃ¶ltÃ©s',        el:'Î›Î®ÏˆÎ·',                tr:'Ä°ndirme',           fi:'Lataus',          da:'Download',        nb:'Nedlasting',       sv:'Nedladdning',      hr:'Preuzimanje'       },
        'Injection'          : { en:'Injection',          de:'Injektion',          es:'InyecciÃ³n',         it:'Iniezione',         nl:'Injectie',       pt:'InjeÃ§Ã£o',             ru:'Ð˜Ð½ÑŠÐµÐºÑ†Ð¸Ñ',           uk:'Ð†Ð½\'Ñ”ÐºÑ†Ñ–Ñ',            ro:'InjecÈ›ie',        pl:'WstrzykniÄ™cie',     cs:'Injekce',          sk:'Injekcia',         hu:'InjekciÃ³',        el:'ÎˆÎ³Ï‡Ï…ÏƒÎ·',              tr:'Enjeksiyon',        fi:'Injektio',        da:'Injektion',       nb:'Injeksjon',        sv:'Injektion',        hr:'Injekcija'         },
        'Commandant'         : { en:'Commander',          de:'Kommandant',         es:'Comandante',        it:'Comandante',        nl:'Commandant',     pt:'Comandante',          ru:'ÐšÐ¾Ð¼Ð°Ð½Ð´Ð¸Ñ€',           uk:'ÐšÐ¾Ð¼Ð°Ð½Ð´Ð¸Ñ€',             ro:'Comandant',       pl:'DowÃ³dca',           cs:'Velitel',          sk:'VeliteÄ¾',          hu:'Parancsnok',      el:'Î”Î¹Î¿Î¹ÎºÎ·Ï„Î®Ï‚',           tr:'Komutan',           fi:'Komentaja',       da:'Kommandant',      nb:'Kommandant',       sv:'Kommendant',       hr:'Zapovjednik'       },
        'HÃ©raut'             : { en:'Herald',             de:'Herold',             es:'Heraldo',           it:'Araldo',            nl:'Heraut',         pt:'Arauto',              ru:'Ð“Ð»Ð°ÑˆÐ°Ñ‚Ð°Ð¹',           uk:'Ð’Ñ–ÑÐ½Ð¸Ðº',               ro:'Crainic',         pl:'Herold',            cs:'Herold',           sk:'Herold',           hu:'HÃ­rnÃ¶k',          el:'ÎšÎ®ÏÏ…ÎºÎ±Ï‚',             tr:'Haberci',           fi:'Sanansaattaja',   da:'Herold',          nb:'Herold',           sv:'Herold',           hr:'Glasnik'           },
        'Amis'               : { en:'Friends',            de:'Freunde',            es:'Amigos',            it:'Amici',             nl:'Vrienden',       pt:'Amigos',              ru:'Ð”Ñ€ÑƒÐ·ÑŒÑ',             uk:'Ð”Ñ€ÑƒÐ·Ñ–',                ro:'Prieteni',        pl:'Przyjaciele',       cs:'PÅ™Ã¡telÃ©',          sk:'Priatelia',        hu:'BarÃ¡tok',         el:'Î¦Î¯Î»Î¿Î¹',               tr:'ArkadaÅŸlar',        fi:'YstÃ¤vÃ¤t',         da:'Venner',          nb:'Venner',           sv:'VÃ¤nner',           hr:'Prijatelji'        },
        'Queue'              : { en:'Queue',              de:'Warteschlange',      es:'Cola',              it:'Coda',              nl:'Wachtrij',       pt:'Fila',                ru:'ÐžÑ‡ÐµÑ€ÐµÐ´ÑŒ',            uk:'Ð§ÐµÑ€Ð³Ð°',                ro:'CoadÄƒ',           pl:'Kolejka',           cs:'Fronta',           sk:'Rad',               hu:'Sor',              el:'ÎŸÏ…ÏÎ¬',                tr:'Kuyruk',            fi:'Jono',            da:'KÃ¸',              nb:'KÃ¸',               sv:'KÃ¶',               hr:'Red Äekanja'       },
        'Troupes'            : { en:'Troops',             de:'Truppen',            es:'Tropas',            it:'Truppe',            nl:'Troepen',        pt:'Tropas',              ru:'Ð’Ð¾Ð¹ÑÐºÐ°',             uk:'Ð’Ñ–Ð¹ÑÑŒÐºÐ°',              ro:'Trupe',           pl:'Wojska',            cs:'Vojska',           sk:'Vojaci',           hu:'Csapatok',        el:'Î£Ï„ÏÎ±Ï„ÎµÏÎ¼Î±Ï„Î±',         tr:'Birlikler',         fi:'Joukot',          da:'Tropper',         nb:'Tropper',          sv:'Trupper',          hr:'Postrojbe'         },
        'Remparts'           : { en:'Wall Kills',         de:'Mauerabrechungen',   es:'Bajas Murallas',    it:'Perdite Mura',      nl:'Muurtreffers',   pt:'Baixas Muralhas',     ru:'Ð£Ñ€Ð¾Ð½ ÑÑ‚ÐµÐ½',          uk:'Ð’Ñ‚Ñ€Ð°Ñ‚Ð¸ ÑÑ‚Ñ–Ð½',          ro:'Pierderi Ziduri',  pl:'Straty murÃ³w',     cs:'ZtrÃ¡ty zdÃ­',       sk:'Straty mÃºrov',     hu:'Fal vesztesÃ©g',   el:'Î‘Ï€ÏŽÎ»ÎµÎ¹ÎµÏ‚ Ï„ÎµÎ¯Ï‡Î¿Ï…Ï‚', tr:'Duvar KayÄ±plarÄ±',   fi:'SeinÃ¤tappiot',    da:'Muurtab',         nb:'Murvertap',        sv:'MurfÃ¶rluster',     hr:'Gubici zidova'     },
        'Chercheur'          : { en:'Researcher',         de:'Forscher',           es:'Investigador',      it:'Ricercatore',       nl:'Onderzoeker',    pt:'Pesquisador',         ru:'Ð˜ÑÑÐ»ÐµÐ´Ð¾Ð²Ð°Ñ‚ÐµÐ»ÑŒ',      uk:'Ð”Ð¾ÑÐ»Ñ–Ð´Ð½Ð¸Ðº',            ro:'CercetÄƒtor',      pl:'Badacz',            cs:'VÃ½zkumnÃ­k',        sk:'VÃ½zkumnÃ­k',        hu:'KutatÃ³',          el:'Î•ÏÎµÏ…Î½Î·Ï„Î®Ï‚',           tr:'AraÅŸtÄ±rmacÄ±',       fi:'Tutkija',         da:'Forsker',         nb:'Forsker',          sv:'Forskare',         hr:'IstraÅ¾ivaÄ'        },
        'SorciÃ¨re'           : { en:'Witch',               de:'Hexe',               es:'Bruja',             it:'Strega',            nl:'Heks',           pt:'Bruxa',               ru:'ÐšÐ¾Ð»Ð´ÑƒÐ½ÑŒÑ',           uk:'Ð’Ñ–Ð´ÑŒÐ¼Ð°',               ro:'VrÄƒjitoare',      pl:'Czarownica',        cs:'ÄŒarodÄ›jnice',      sk:'ÄŒarodejnica',      hu:'BoszorkÃ¡ny',      el:'ÎœÎ¬Î³Î¹ÏƒÏƒÎ±',             tr:'CadÄ±',              fi:'Noita',           da:'Heks',            nb:'Heks',             sv:'HÃ¤xa',             hr:'VjeÅ¡tica'          },
        'Marchand'           : { en:'Trader',             de:'HÃ¤ndler',            es:'Mercader',          it:'Mercante',          nl:'Handelaar',      pt:'Comerciante',         ru:'Ð¢Ð¾Ñ€Ð³Ð¾Ð²ÐµÑ†',           uk:'Ð¢Ð¾Ñ€Ð³Ð¾Ð²ÐµÑ†ÑŒ',            ro:'Negustor',        pl:'Handlarz',          cs:'ObchodnÃ­k',        sk:'ObchodnÃ­k',        hu:'KereskedÅ‘',       el:'ÎˆÎ¼Ï€Î¿ÏÎ¿Ï‚',             tr:'TÃ¼ccar',            fi:'Kauppias',        da:'Handelsmand',     nb:'Handelsmann',      sv:'Handelsman',       hr:'Trgovac'           },
        'Constructeur'       : { en:'Builder',            de:'Baumeister',         es:'Constructor',       it:'Costruttore',       nl:'Bouwer',         pt:'Construtor',          ru:'Ð¡Ñ‚Ñ€Ð¾Ð¸Ñ‚ÐµÐ»ÑŒ',          uk:'Ð‘ÑƒÐ´Ñ–Ð²ÐµÐ»ÑŒÐ½Ð¸Ðº',          ro:'Constructor',     pl:'Budowniczy',        cs:'Stavitel',         sk:'StaviteÄ¾',         hu:'Ã‰pÃ­tÃ©sz',         el:'ÎšÏ„Î¯ÏƒÏ„Î·Ï‚',             tr:'Ä°nÅŸaatÃ§Ä±',          fi:'Rakentaja',       da:'Bygmester',       nb:'Byggherre',        sv:'ByggmÃ¤stare',      hr:'Graditelj'         },
        'Recruteur'          : { en:'Recruiter',          de:'Rekrutierer',        es:'Reclutador',        it:'Reclutatore',       nl:'Werver',         pt:'Recrutador',          ru:'Ð’ÐµÑ€Ð±Ð¾Ð²Ñ‰Ð¸Ðº',          uk:'Ð’ÐµÑ€Ð±ÑƒÐ²Ð°Ð»ÑŒÐ½Ð¸Ðº',         ro:'Recrutor',        pl:'Rekruter',          cs:'NÃ¡borÃ¡Å™',          sk:'NÃ¡borÃ¡r',          hu:'ToborzÃ³',         el:'Î£Ï„ÏÎ±Ï„Î¿Î»ÏŒÎ³Î¿Ï‚',         tr:'Ä°ÅŸe AlÄ±m',          fi:'Rekrytoija',      da:'Rekrutterer',     nb:'Rekrutterer',      sv:'Rekryterare',      hr:'Regrutar'          },
        'Merveille'          : { en:'Wonder',             de:'Wunder',             es:'Maravilla',         it:'Meraviglia',        nl:'Wonder',         pt:'Maravilha',           ru:'Ð§ÑƒÐ´Ð¾',               uk:'Ð”Ð¸Ð²Ð¾',                 ro:'Minune',          pl:'Cud',               cs:'Div',               sk:'ZÃ¡zrak',           hu:'Csoda',           el:'Î˜Î±ÏÎ¼Î±',               tr:'Harika',            fi:'Ihme',            da:'Under',           nb:'Under',            sv:'Under',            hr:'ÄŒudo'              },
        'TrÃ©sorier'          : { en:'Treasurer',          de:'Schatzmeister',      es:'Tesorero',          it:'Tesoriere',         nl:'Penningmeester', pt:'Tesoureiro',          ru:'ÐšÐ°Ð·Ð½Ð°Ñ‡ÐµÐ¹',           uk:'Ð¡ÐºÐ°Ñ€Ð±Ð½Ð¸Ðº',             ro:'Trezorier',       pl:'Skarbnik',          cs:'PokladnÃ­k',        sk:'PokladnÃ­k',        hu:'KincstÃ¡rnok',     el:'Î¤Î±Î¼Î¯Î±Ï‚',              tr:'Hazinedar',         fi:'Rahastonhoitaja', da:'Kasserer',        nb:'Kasserer',         sv:'KassÃ¶r',           hr:'RizniÄar'          },
        'Collecteur'         : { en:'Farmer',             de:'Sammler',            es:'Recolector',        it:'Raccoglitore',      nl:'Verzamelaar',    pt:'Coletor',             ru:'Ð¡Ð±Ð¾Ñ€Ñ‰Ð¸Ðº',            uk:'Ð—Ð±Ð¸Ñ€Ð°Ñ‡',               ro:'Colector',        pl:'Zbieracz',          cs:'SbÄ›raÄ',           sk:'ZberaÄ',           hu:'GyÅ±jtÅ‘',          el:'Î£Ï…Î»Î»Î­ÎºÏ„Î·Ï‚',           tr:'ToplayÄ±cÄ±',         fi:'KerÃ¤Ã¤jÃ¤',         da:'Samleren',        nb:'Samler',           sv:'Samlare',          hr:'SkupljaÄ'          },
        'Serveur Premium'    : { en:'Premium Server',     de:'Premium-Server',     es:'Servidor Premium',  it:'Server Premium',    nl:'Premium Server', pt:'Servidor Premium',    ru:'ÐŸÑ€ÐµÐ¼Ð¸ÑƒÐ¼-ÑÐµÑ€Ð²ÐµÑ€',     uk:'ÐŸÑ€ÐµÐ¼Ñ–ÑƒÐ¼-ÑÐµÑ€Ð²ÐµÑ€',       ro:'Server Premium',  pl:'Serwer Premium',    cs:'Premium Server',   sk:'Premium Server',   hu:'PrÃ©mium szerver', el:'Premium Server',      tr:'Premium Sunucu',    fi:'Premium-palvelin',da:'Premium Server',  nb:'Premium Server',   sv:'Premium-server',   hr:'Premium posluÅ¾itelj'}
    };

    var MODULES = [
        'TÃ©lÃ©chargement', 'Injection', 'Commandant', 'HÃ©raut', 'Amis',
        'Queue', 'Troupes', 'Remparts', 'Chercheur', 'SorciÃ¨re', 'Marchand', 'Constructeur',
        'Recruteur', 'Merveille', 'TrÃ©sorier', 'Collecteur', 'Serveur Premium'
    ];

    // â”€â”€ Langue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function getLang() {
        try {
            var n = (navigator.language || 'en').toLowerCase().split('-')[0];
            var valid = ['en','fr','de','es','it','nl','pt','ru','uk','ro','pl','cs','sk','hu','el','tr','fi','da','nb','sv','hr'];
            if (valid.indexOf(n) !== -1) return n;
            if (n === 'no') return 'nb';
        } catch (e) {}
        return 'en';
    }

    function tr(key) {
        var lang = getLang();
        if (lang === 'fr') return key;
        var t = TRANS[key];
        if (t && t[lang]) return t[lang];
        if (t && t['en']) return t['en'];
        return key;
    }

    // â”€â”€ Ã‰tat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var loaded = {};
    MODULES.forEach(function (m) { loaded[m] = 'pending'; });

    var done = false, wrap = null, body = null, timer = null, dots = 0;

    // â”€â”€ CSS injectÃ© une seule fois â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var CSS =
        '@keyframes _gfb_spin{to{transform:rotate(360deg)}}' +
        '@keyframes _gfb_in{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}' +
        '@keyframes _gfb_rowIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}' +
        '#_gfb_boot::before{content:\'\';position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:2px 0 0 2px;background:linear-gradient(180deg,#4caf6e,#2d7a48)}' +
        '#_gfb_boot::after{content:\'\';position:absolute;top:0;left:4px;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)}' +
        '._gfb_row{display:flex;align-items:center;gap:7px;font-size:8pt;line-height:2;border-radius:3px;padding:0 5px;margin-bottom:1px;transition:background 0.3s,color 0.3s;animation:_gfb_rowIn 0.25s ease both}' +
        '._gfb_ic{width:14px;text-align:center;flex-shrink:0}' +
        '._gfb_spinner{display:inline-block;width:10px;height:10px;border:1.5px solid rgba(201,168,76,0.25);border-top-color:#c9a84c;border-radius:50%;animation:_gfb_spin 0.7s linear infinite}' +
        '._gfb_check{font-size:10px;font-weight:bold;line-height:1}' +
        '._gfb_label{flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}';

    if (!document.getElementById('_gfb_st')) {
        var k = document.createElement('style');
        k.id = '_gfb_st';
        k.textContent = CSS;
        document.head.appendChild(k);
    }

    // â”€â”€ Rendu des icÃ´nes / styles par Ã©tat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function getIcon(s) {
        if (s === undefined || s === 'pending') return '<span class="_gfb_ic" style="color:rgba(150,170,160,0.3);font-size:9px">â€”</span>';
        if (s === null)    return '<span class="_gfb_ic"><span class="_gfb_spinner"></span></span>';
        if (s === true)    return '<span class="_gfb_ic _gfb_check" style="color:' + OK + '">âœ“</span>';
        if (s === 'lock')  return '<span class="_gfb_ic" style="color:' + GR + ';font-size:9px">ðŸ”’</span>';
        return '<span class="_gfb_ic _gfb_check" style="color:' + KO + '">âœ—</span>';
    }

    function getRowStyle(s) {
        if (s === undefined || s === 'pending') return 'color:rgba(150,170,160,0.3);background:transparent';
        if (s === true)   return 'color:' + OK + ';background:rgba(76,175,110,0.07)';
        if (s === 'lock') return 'color:' + GR + ';background:transparent';
        if (s === false)  return 'color:' + KO + ';background:rgba(224,85,85,0.07)';
        return 'color:rgba(200,220,210,0.6);background:transparent';   // null = en cours
    }

    // â”€â”€ Mise Ã  jour du titre â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function updateTitle() {
        if (!wrap) return;
        var t = wrap.querySelector('#_gfb_title');
        if (!t) return;
        if (done) { t.textContent = tr('Chargement effectuÃ©'); t.style.color = OK; }
        else      { t.textContent = tr('Chargement') + ['Â·','Â·Â·','Â·Â·Â·'][dots % 3]; t.style.color = G; }
    }

    // â”€â”€ Rendu des lignes de modules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function render() {
        if (!body) return;
        MODULES.forEach(function (m) {
            var s     = loaded[m];
            var rowId = '_gfb_row_' + m.replace(/[^a-z0-9]/gi, '_');
            var existing = body.querySelector('#' + rowId);

            if (!existing) {
                var d = document.createElement('div');
                d.id = rowId;
                d.className = '_gfb_row';
                d.innerHTML = getIcon(s) + '<span class="_gfb_label">' + tr(m) + '</span>';
                d.setAttribute('style', getRowStyle(s));
                body.appendChild(d);
            } else {
                var prevS = existing.getAttribute('data-s');
                var curS  = String(s);
                if (prevS !== curS) {
                    existing.setAttribute('style', getRowStyle(s));
                    var ic = existing.querySelector('._gfb_ic');
                    if (ic) ic.outerHTML = getIcon(s);
                }
            }

            existing = body.querySelector('#' + rowId);
            if (existing) existing.setAttribute('data-s', String(s));
        });

        updateTitle();
    }

    // â”€â”€ CrÃ©ation du toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function show() {
        wrap = document.createElement('div');
        wrap.id = '_gfb_boot';
        wrap.style.cssText =
            'position:fixed!important;bottom:20px!important;right:20px!important;width:240px!important;' +
            'z-index:2147483647!important;font-family:Georgia,serif!important;pointer-events:all!important;' +
            'background:rgba(8,35,20,0.97)!important;border:1px solid rgba(76,175,110,0.35)!important;' +
            'border-left:none!important;border-radius:2px 12px 12px 2px!important;' +
            'padding:14px 14px 16px 50px!important;box-shadow:0 8px 32px rgba(0,0,0,0.85)!important;' +
            'animation:_gfb_in 0.4s cubic-bezier(0.22,1,0.36,1) both!important;color:#b8e8ca!important;overflow:hidden!important;';

        // IcÃ´ne "i"
        var ic = document.createElement('div');
        ic.style.cssText =
            'position:absolute!important;left:14px!important;top:14px!important;width:26px!important;height:26px!important;' +
            'border-radius:50%!important;border:1.4px solid #4caf6e!important;background:rgba(76,175,110,0.15)!important;' +
            'display:flex!important;align-items:center!important;justify-content:center!important;' +
            'font-style:italic!important;color:#4caf6e!important;font-size:13px!important;' +
            'font-family:Georgia,serif!important;font-weight:bold!important;';
        ic.textContent = 'i';
        wrap.appendChild(ic);

        // Bouton fermer âœ•
        var cx = document.createElement('span');
        cx.textContent = 'âœ•';
        cx.style.cssText =
            'position:absolute!important;top:10px!important;right:10px!important;cursor:pointer!important;' +
            'color:#4caf6e!important;font-size:11px!important;opacity:0.5!important;font-family:Arial,sans-serif!important;';
        cx.addEventListener('mouseover', function () { cx.style.opacity = '1'; });
        cx.addEventListener('mouseout',  function () { cx.style.opacity = '0.5'; });
        cx.addEventListener('click', function () {
            wrap.remove();
            clearInterval(timer);
            wrap = null; body = null;
        });
        wrap.appendChild(cx);

        // Header (spinner + titre)
        var hd = document.createElement('div');
        hd.style.cssText =
            'border-bottom:1px solid rgba(255,255,255,0.07)!important;margin-bottom:6px!important;' +
            'padding-bottom:5px!important;display:flex!important;align-items:center!important;gap:6px!important;';

        var sp = document.createElement('span');
        sp.id = '_gfb_spin';
        sp.style.cssText =
            'display:inline-block!important;animation:_gfb_spin 1s linear infinite!important;' +
            'color:#c9a84c!important;font-size:12px!important;';
        sp.textContent = 'âŸ³';
        hd.appendChild(sp);

        var ti = document.createElement('span');
        ti.id = '_gfb_title';
        ti.style.cssText =
            'font-weight:700!important;font-size:8.5pt!important;text-transform:uppercase!important;' +
            'letter-spacing:1.2px!important;color:#c9a84c!important;font-family:Georgia,serif!important;';
        ti.textContent = tr('Chargement') + 'Â·';
        hd.appendChild(ti);
        wrap.appendChild(hd);

        // Corps (liste des modules)
        body = document.createElement('div');
        wrap.appendChild(body);

        // Ornement bas
        var orn = document.createElement('span');
        orn.textContent = 'âŠ¹ âŠ¹ âŠ¹';
        orn.style.cssText =
            'position:absolute!important;bottom:5px!important;right:14px!important;font-size:7px!important;' +
            'letter-spacing:2px!important;opacity:0.18!important;color:#4caf6e!important;pointer-events:none!important;';
        wrap.appendChild(orn);

        (document.body || document.documentElement).appendChild(wrap);
        render();
        timer = setInterval(function () { dots++; if (!done) updateTitle(); }, 500);
    }

    // â”€â”€ File d'attente pour les transitions d'Ã©tat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    var _mlQueue = [], _mlRunning = false;

    function _mlFlush() {
        if (!_mlQueue.length) { _mlRunning = false; return; }
        _mlRunning = true;
        var item = _mlQueue.shift();
        var n = item[0], s = item[1];

        // Activer automatiquement le module suivant (passage Ã  "null" = en cours)
        // Ne pas Ã©craser un Ã©tat terminal dÃ©jÃ  reÃ§u (race condition possible)
        var isDone = (s === true || s === false || s === 'lock');
        if (isDone) {
            var idx = MODULES.indexOf(n);
            if (idx !== -1 && idx + 1 < MODULES.length) {
                var next = MODULES[idx + 1];
                var nextState = loaded[next];
                var nextIsTerminal = (nextState === true || nextState === false || nextState === 'lock');
                if (nextState === 'pending' && !nextIsTerminal) loaded[next] = null;
            }
        }

        loaded[n] = s;
        if (!wrap) show(); else render();
        setTimeout(_mlFlush, 80);
    }

    // â”€â”€ API publique â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Signale l'Ã©tat d'un module.
     * @param {string} name   - Nom du module (doit Ãªtre dans MODULES)
     * @param {null|true|false|"lock"} status
     */
    window._gfbot_module_loaded = function (name, status) {
        var isDone = (status === true || status === false || status === 'lock');
        if (!isDone) {
            // Mise Ã  jour immÃ©diate (spinner ou pending)
            loaded[name] = status;
            if (!wrap) show(); else render();
            return;
        }
        // Ã‰tats terminaux : passer par la file pour animer proprement
        _mlQueue.push([name, status]);
        if (!_mlRunning) _mlFlush();
    };

    /**
     * AppelÃ© quand le bot est entiÃ¨rement chargÃ©.
     * Affiche "Chargement effectuÃ©" puis ferme le toast au bout de 4 s.
     */
    window._gfbot_boot_done = function () {
        if (done) return;
        done = true;
        clearInterval(timer);
        if (wrap) {
            var sp2 = document.getElementById('_gfb_spin');
            if (sp2) sp2.style.display = 'none';
            render();
            setTimeout(function () {
                if (wrap) { wrap.remove(); wrap = null; body = null; }
            }, 4000);
        }
    };

    // SÃ©curitÃ© : fermeture automatique aprÃ¨s 25 s si boot_done n'est pas appelÃ©
    setTimeout(function () {
        if (window._gfbot_boot_done) { window._gfbot_boot_done(); window._gfbot_boot_done = null; }
    }, 25000);

    // DÃ©marrer immÃ©diatement avec "TÃ©lÃ©chargement" en cours
    window._gfbot_module_loaded('TÃ©lÃ©chargement', null);

})();
