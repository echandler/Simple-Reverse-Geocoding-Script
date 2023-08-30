// ==UserScript==
// @name         Simple Reverse Geocoding Script v8.3
// @description  Simple reverse geocoding script for Geoguessr players. 
// @namespace    geoguessr scripts 
// @version      8.3
// @author       echandler
// @include      /^(https?)?(\:)?(\/\/)?([^\/]*\.)?geoguessr\.com($|\/.*)/
// @downloadURL  https://github.com/echandler/Simple-Reverse-Geocoding-Script/raw/main/reverseGeocodingScript.user.js
// ==/UserScript==

(() => { 
var usw = window;
if (window.unsafeWindow){
    usw = unsafeWindow;
}

let pending = [];

usw.sgs = {};

if (window.GM_info){ 
    usw.sgs = {GM_info : window.GM_info};
} else {
    window.GM_info = {
        script: {
            version: "8.3"
        }
    };
    usw.sgs = {GM_info : window.GM_info};
}

usw.sgs.ready = false;

let ls = localStorage["sgs"];

if (!ls){
   ls = { version: parseFloat(GM_info.script.version) };
   localStorage["sgs"] = JSON.stringify(ls);
} else {
    ls = JSON.parse(ls);
}

usw.sgs.pointInPolygon = function(y,x, poly){
        let num = poly.length;
        let j = num - 1;
        let c = false;
        let i = 0;

        for (i = 0; i < num; i++){
            if ((x == poly[i][0]) && (y == poly[i][1])){
               // # point is a corner
                return true;
            }
            if ((poly[i][1] > y) !== (poly[j][1] > y)){
                let slope = (x-poly[i][0])*(poly[j][1]-poly[i][1])-(poly[j][0]-poly[i][0])*(y-poly[i][1]);
                if (slope == 0){
                    //# point is on boundary
                    return true
                }
                if ((slope < 0) != (poly[j][1] < poly[i][1])){
                    c = !c;
                }
            }
            j = i
        }

        return c;
};

usw.sgs.customFindIt = function($y, $x, coordObj){

    let pip = usw.sgs.pointInPolygon;
    let keys = Object.keys(coordObj);

    for (let n = 0; n < keys.length; n++){

        let len = coordObj[keys[n]].length;

        for (let j = 0; j < len; j++){
            if(pip($y, $x, coordObj[keys[n]][j]) == true){
                return keys[n];
            };
        }
    }

    return false;
}

usw.sgs.findIt = function($y, $x){

	let t = usw.sgs.compiledPolygons;
	let p = usw.sgs.quadTreeFastLookUp;
	let pip = usw.sgs.pointInPolygon;
	let tt = null;

	if ($y >= 16){
		if ($x <= 24){
			if ($x < -42){
				tt = p.nw.w;
			} else {
				tt = p.nw.e;
			}            
		} else {
			tt = p.ne;
		}
	} else {
		if ($x <= 24){
			tt = p.sw;
		} else {
			tt = p.se;
		}
	}

	for (let n = 0; n < tt.length; n++){
		if (t[tt[n]] === undefined){
			console.warn(tt[n]);
			return
		}
		let len = t[tt[n]].length;
		for (let j = 0; j < len; j++){
			if(pip($y, $x, t[tt[n]][j]) == true){
				return tt[n];
			};
		}
	}

	return false;
}

usw.sgs.compileBorders = function(){
    let r = usw.sgs.customBorders;
    let countries = Object.keys(r); 
    let country = null;

    for (let name = 0; name < countries.length; name++){
        let coords = [];
        let country = r[countries[name]];
        for (let borders = 0; borders < country.length; borders++){
            coords.push([]);
            for (let border = 0; border < country[borders].length; border++){
                let _border = country[borders][border][0];

                if (country[borders][border][1] !== 'r'){
                   coords[borders] = coords[borders].concat(_border); 
                } else {
                   if(_border === undefined) debugger;
                   for (let o = _border.length-1; o > -1 ; o--){
                       coords[borders].push(_border[o]);
                   }
                }
             }
        } 

        usw.sgs.compiledPolygons[countries[name]] = coords;
    }
}

usw.sgs.customReverse = async function({lat, lng}, coordObj){
    if (usw.sgs.ready === false){

       return new Promise((res)=>{

           pending.push(()=> res(usw.sgs.customReverse({lat, lng}, coordObj)));

       });
    }

    let response = usw.sgs.customFindIt(lat, lng, coordObj);

    if (!response){
        return { error: "Key not found." };
    }

    return {lat, lng, response};
}

usw.sgs.reverse = async function({lat, lng}){
    if (usw.sgs.ready === false){

       return new Promise((res)=>{

           pending.push(()=> res(usw.sgs.reverse({lat, lng})));

       });
    }

    let countryCode = usw.sgs.findIt(lat, lng);

    if (!countryCode){
        return { error: "Country not found." };
    }

    countryCode = countryCode.toUpperCase();

    let country_name = usw.sgs.country_code_to_name_index[countryCode];
    let admin_country_code = usw.sgs.admin_country_index[countryCode];
    let admin_country_name = usw.sgs.country_code_to_name_index[admin_country_code];

    return {
        lat,
        lng,
        country:{
            country_code: countryCode,
            country_name: country_name,
            admin_country_code: admin_country_code,
            admin_country_name: admin_country_name,
        },
    };
}

usw.sgs.admin_country_index = { AF: 'AF', AX: 'FI', AL: 'AL', DZ: 'DZ', AS: 'US', AD: 'AD', AO: 'AO',
                    AI: 'GB', AQ: 'AQ', AG: 'AG', AR: 'AR', AM: 'AM', AW: 'NL', AU: 'AU',
                    AT: 'AT', AZ: 'AZ', BS: 'BS', BH: 'BH', BD: 'BD', BB: 'BB', BY: 'BY',
                    BE: 'BE', BZ: 'BZ', BJ: 'BJ', BM: 'GB', BT: 'BT', BO: 'BO', BQ: 'NL',
                    BA: 'BA', BW: 'BW', BV: 'NO', BR: 'BR', IO: 'GB', BN: 'BN', BG: 'BG',
                    BF: 'BF', BI: 'BI', KH: 'KH', CM: 'CM', CA: 'CA', CV: 'CV', KY: 'UK',
                    CF: 'CF', TD: 'TD', CL: 'CL', CN: 'CN', CX: 'AU', CC: 'AU', CO: 'CO',
                    KM: 'KM', CG: 'CG', CD: 'CD', CK: 'NZ', CR: 'CR', CI: 'CI', HR: 'HR',
                    CU: 'CU', CY: 'CY', CZ: 'CZ', DK: 'DK', DJ: 'DJ', DM: 'DM', DO: 'DO',
                    EC: 'EC', EG: 'EG', SV: 'SV', GQ: 'GQ', ER: 'ER', EE: 'EE', ET: 'ET',
                    FK: 'GB', FO: 'DK', FJ: 'FJ', FI: 'FI', FR: 'FR', GF: 'FR', PF: 'FR',
                    TF: 'FR', GA: 'GA', GM: 'GM', GE: 'GE', DE: 'DE', GH: 'GH', GI: 'GI',
                    GR: 'GR', GL: 'DK', GD: 'GD', GP: 'FR', GU: 'US', GT: 'GT', GG: 'GB',
                    GN: 'GN', GW: 'GW', GY: 'GY', HT: 'HT', HM: 'AU', VA: 'VA', HN: 'HN',
                    HK: 'CN', HU: 'HU', IS: 'IS', IN: 'IN', ID: 'ID', IR: 'IR', IQ: 'IQ',
                    IE: 'IE', IM: 'GB', IL: 'IL', IT: 'IT', JM: 'JM', JP: 'JP', JE: 'GB',
                    JO: 'JO', KZ: 'KZ', KE: 'KE', KI: 'KI', KR: 'KR', KW: 'KW', KG: 'KG',
                    LA: 'LA', LV: 'LV', LB: 'LB', LS: 'LS', LR: 'LR', LY: 'LY', LI: 'LI',
                    LT: 'LT', LU: 'LU', MO: 'CN', MK: 'MK', MG: 'MG', MW: 'MW', MY: 'MY',
                    MV: 'MV', ML: 'ML', MT: 'MT', MH: 'MH', MQ: 'FR', MR: 'MR', MU: 'MU',
                    YT: 'FR', MX: 'MX', FM: 'FM', MD: 'MD', MC: 'MC', MN: 'MN', ME: 'ME',
                    MS: 'GB', MA: 'MA', MZ: 'MZ', MM: 'MM', NA: 'NA', NR: 'NR', NP: 'NP',
                    NL: 'NL', AN: 'NL', NC: 'FR', NZ: 'NZ', NI: 'NI', NE: 'NE', NG: 'NG',
                    NU: 'NZ', NF: 'AU', MP: 'US', NO: 'NO', OM: 'OM', PK: 'PK', PW: 'PA',
                    PS: 'IL', PA: 'PA', PG: 'PG', PY: 'PY', PE: 'PE', PH: 'PH', PN: 'GB',
                    PL: 'PL', PT: 'PT', PR: 'US', QA: 'QA', RE: 'FR', RO: 'RO', RU: 'RU',
                    RW: 'RW', BL: 'FR', SH: 'GB', KN: 'KN', LC: 'LC', MF: 'FR', PM: 'FR',
                    VC: 'VC', WS: 'WS', SM: 'SM', ST: 'ST', SA: 'SA', SN: 'SN', RS: 'RS',
                    SC: 'SC', SL: 'SL', SG: 'SG', SK: 'SK', SI: 'SI', SB: 'SB', SO: 'SO',
                    ZA: 'ZA', GS: 'GB', ES: 'ES', LK: 'LK', SD: 'SD', SR: 'SR', SJ: 'NO',
                    SZ: 'SZ', SE: 'SE', CH: 'CH', SY: 'SY', TW: 'TW', TJ: 'TJ', TZ: 'TZ',
                    TH: 'TH', TL: 'TL', TG: 'TG', TK: 'NZ', TO: 'TO', TT: 'TT', TN: 'TN',
                    TR: 'TR', TM: 'TM', TC: 'GB', TV: 'TV', UG: 'UG', UA: 'UA', AE: 'AE',
                    GB: 'GB', US: 'US', UM: 'US', UY: 'UY', UZ: 'UZ', VU: 'VU', VE: 'VE',
                    VN: 'VN', VG: 'GB', VI: 'US', WF: 'FR', EH: 'MA', YE: 'YE', ZM: 'ZM',
                    ZW: 'ZW', SX: 'NL', CW: 'NL', IAE: 'AE', CW:'NL', MI:'US',  EA:'ES', 
                    RE:'FR', INL:'NL', EH:'EH', SS:'SS',"ES-CE":'ES', "ES-ML":'ES',BQ:'NL'};

// what is this svg?
//"<svg id=\"tk\" width=\"21\" height=\"15\" xmlns=\"http://www.w3.org/2000/svg\" version=\"1.0\" width=\"600\" height=\"300\"> <rect width=\"600\" height=\"150\" fill=\"#000\"/> <rect y=\"150\" width=\"600\" height=\"150\" fill=\"#007a3d\"/> <rect y=\"100\" width=\"600\" height=\"100\" fill=\"#fff\"/> <path d=\"M 0,0 200,150 0,300 z\" fill=\"#c4111b\"/> <circle cx=\"300\" cy=\"150\" r=\"40\" fill=\"#c4111b\"/> <circle cx=\"315\" cy=\"150\" r=\"40\" fill=\"#fff\"/> <path d=\"m 289.26294,174.2204 17.05633,-12.19273 16.92296,12.37709 -6.32527,-19.98928 17.00081,-12.26999 -20.96556,-0.16131 -6.41591,-19.96036 -6.63215,19.88957 -20.96606,-0.0661 16.86669,12.45373 -6.54184,19.91946 z\" fill=\"#c4111b\"/> </svg>"

usw.sgs.quadTreeFastLookUp = {"ne":["af","bh","bd","bt","bg","td","cy","er","ee","no","fi","ax","gr","iae","om","ae","in","il","jp","jo","kp","kr","ru","kw","kg","la","lv","lb","lt","md","mn","np","pk","ph","pl","qa","tr","ro","sa","sd","se","sy","tw","tj","th","tm","ua","uz","vn","hk","mo","cn","ye","ge","mm","by", "sj","az","kz","ly","ir","am","iq","us","eg"],
           "nw":{//45 x
                "w":["us","ca","mx","gt","bz","hn","cu","ky","jm","ht","do","tc","pr","bs","bm","gp","ms","ag","kn","ai","sx","mf","vi","vg","mi","gl"],
                "e":["mc","va","sm","it","al","ad","es","fr","gb","im","mk","ba","at","by","bg","cv","td","hr","cz","dk","gl","ee","fi","ax","ga","gr","je","gg","hu","is","ie","fo","lv","li","lt","lu","ml","mt","mr","tn","me","gi","es-ce","es-ml","ma","inl","be","nl","ne","no","pl","pt","ro","ru","sn","rs","sk","si","sd","se","ch","ua","de","sj", "tc","ly","dz","eh"],
	   },
           "se":["nz","ao","au","bn","bi","kh","td","km","dj","tl","er","et","in","id","ke","om","iae","ae","la","ls","mg","mw","my","mv","mh","mu","fm","mz","nr","pw","pg","ph","sc","sg","re","sb","so","za","bw","na","gu","mp","ss","lk","sd","sz","tz","th","tv","ug","vu","vn","ye","zm","zw","fj","mm","cd","cf","nc","rw","aq","yt","ki","us","cx","cc","fr","io","nf"],
           "sw":["nz","br","mx","ao","ar","bb","bz","bo","cw","bq","tt","vc","cv","td","cl","co","cg","cr","dm","ec","sv","ga","gm","gh","ci","ng","gd","gt","gn","gw","gy","gf","hn","lr","ml","mr","ni","ne","pa","py","pe","ws","pf","pn","ki","ck","sn","sl","za","bw","na","fk","as","tk","ss","lc","mq","gp","sd","sr","tg","to","uy","ve","zm","cd","cf","aw","bf","bj","cm","nu","gs","aq","fj","wf","us","sh","st","gq","bv"]};

function compilePolygons(ggPolygons){
    let _t = ggPolygons;

    usw.sgs.compiledPolygons = {"tw":_t['tw'],"ad":_t['ad'],"ae":_t['ae'],"af":_t['af'],"ag":_t['ag'],"ai":_t['ai'],"al":_t['al'],"am":_t['am'],"ao":_t['ao'],"ar":_t['ar'],"as":_t['as'],"at":_t['at'],"bw":_t['bw'],"cg":_t['cg'],"ch":_t['ch'],"ci":_t['ci'],"ck":_t['ck'],"by":_t['by'],"bz":_t['bz'],"bj":_t['bj'],"bl":_t['bl'],"bm":_t['bm'],"bn":_t['bn'],"bo":_t['bo'],"bq":_t['bq'],"bt":_t['bt'],"bv":_t['bv'],"br":_t['br'],"bs":_t['bs'],
                                "ca":_t['ca'],
                                "au":_t['au'],"aw":_t['aw'],"az":_t['az'],"ba":_t['ba'],"bb":_t['bb'],"bd":_t['bd'],"be":_t['be'],"bf":_t['bf'],"bg":_t['bg'],"bh":_t['bh'],"bi":_t['bi'],"cc":_t['cc'],"cd":_t['cd'],"cf":_t['cf'],"cl":_t['cl'],"cm":_t['cm'],"de":_t['de'],"dj":_t['dj'],"dm":_t['dm'],"dz":_t['dz'],"dk":_t['dk'],"cn":_t['cn'],"do":_t['do'],"co":_t['co'],"cr":_t['cr'],"cu":_t['cu'],"cv":_t['cv'],"cw":_t['cw'],"cx":_t['cx'],"cy":_t['cy'],"cz":_t['cz'],"fi":_t['fi'],"er":_t['er'],
                                "gr":_t['gr'],"et":_t['et'],"fm":_t['fm'],"fo":_t['fo'],"ga":_t['ga'],"gd":_t['gd'],"ge":_t['ge'],"gg":_t['gg'],"gh":_t['gh'],"gi":_t['gi'],"es":_t['es'],"fr":_t['fr'],"fj":_t['fj'],"fk":_t['fk'],
                                "ec":_t['ec'],"ee":_t['ee'],"eg":_t['eg'],"gy":_t['gy'],"gf":null,"hm":_t['hm'],"hn":_t['hn'],"hr":_t['hr'],"ht":_t['ht'],"hu":_t['hu'],"lc":_t['lc'],"mq":null,"li":_t['li'],"gm":_t['gm'],"gn":_t['gn'],"gq":_t['gq'],"gs":_t['gs'],"gt":_t['gt'],"gu":_t['gu'],"gw":_t['gw'],"kh":_t['kh'],"ki":_t['ki'],"km":_t['km'],"kn":_t['kn'],"kp":_t['kp'],"kw":_t['kw'],"ky":_t['ky'],"np":_t['np'],"nr":_t['nr'],"nu":_t['nu'],"sm":_t['sm'],"va":_t['va'],"it":_t['it'],"mr":_t['mr'],"kr":_t['kr'],"la":_t['la'],"ms":_t['ms'],"jp":_t['jp'],"kg":_t['kg'],"id":_t['id'],"ie":_t['ie'],"il":_t['il'],"im":_t['im'],"io":_t['io'],"in":_t['in'],"iq":_t['iq'],"is":_t['is'],"je":_t['je'],"jm":_t['jm'],"jo":_t['jo'],"ir":_t['ir'],"ke":_t['ke'],"om":_t['om'],"lb":_t['lb'],"ls":_t['ls'],"lt":_t['lt'],"lu":_t['lu'],"lv":_t['lv'],"ly":_t['ly'],"ma":_t['ma'],"mc":_t['mc'],"mm":_t['mm'],
                                "no":null,
                                "pa":_t['pa'],"lk":_t['lk'],"lr":_t['lr'],"ml":_t['ml'],"mn":_t['mn'],"mp":_t['mp'],"ne":_t['ne'],"md":_t['md'],"me":_t['me'],"mg":_t['mg'],"mh":_t['mh'],
                                "mk":null,
                                "mt":[[[14.14342,36.058049],[14.477703,35.735981],[14.639865,35.832357],[14.251223,36.106328]]],
                                "mu":_t['mu'],"mv":_t['mv'],"kz":_t['kz'],"mw":_t['mw'],
                                "nz":null,"eh": null, "pe":_t['pe'],"pf":_t['pf'],"nf":_t['nf'],"mx":_t['mx'],
                                "my":_t['my'],"mz":_t['mz'],"na":_t['na'],"nc":_t['nc'],"ng":_t['ng'],"ni":_t['ni'],"nl":_t['nl'],"pg":_t['pg'],"pt":_t['pt'],"pw":_t['pw'],"py":_t['py'],"qa":_t['qa'],"ro":_t['ro'],"ph":_t['ph'],"pk":_t['pk'],"pl":_t['pl'],"pm":_t['pm'],"pn":_t['pn'],"pr":_t['pr'],"rs":_t['rs'],"th":_t['th'],"tj":_t['tj'],"tk":_t['tk'],"tl":_t['tl'],"ru":_t['ru'],"rw":_t['rw'],"sa":_t['sa'],"tf":_t['tf'],"tg":_t['tg'],"ss":_t['ss'],"st":_t['st'],"sv":_t['sv'],"sx":_t['sx'],"sy":_t['sy'],"sz":_t['sz'],"tc":_t['tc'],"td":_t['td'],"sc":_t['sc'],"sb":_t['sb'],"sd":_t['sd'],"se":_t['se'],"sg":_t['sg'],"sh":_t['sh'],"si":_t['si'],"sk":_t['sk'],"sl":_t['sl'],"sn":_t['sn'],"tt":_t['tt'],"tv":_t['tv'],"tr":_t['tr'],"tz":_t['tz'],"tm":_t['tm'],"tn":_t['tn'],"to":_t['to'],"so":_t['so'],"sr":_t['sr'],"sj":_t['sj'],"ua":_t['ua'],"ug":_t['ug'],"gb":_t['gb'],"um":_t['um'],"ye":_t['ye'],"za":_t['za'],"zm":_t['zm'],"zw":_t['zw'],"us":_t['us'],"uy":_t['uy'],"uz":_t['uz'],"vc":_t['vc'],"ve":_t['ve'],"vg":_t['vg'],"vi":_t['vi'],"vu":_t['vu'],"wf":_t['wf'],"vn":_t['vn'],"ws":_t['ws']};
}

let _customBorders = null;

function customBorders(rawBorders){
    let _x = rawBorders;
    let t = null;
    usw.sgs.customBorders = eval("t="+_customBorders.replace(/\\n.*?'/g, "'").replace(/\\t.*?'/g, "'").replace(/\\n.*?}/g, "}"));
}

async function db(type, id, data){
            return new Promise(function(res, reg){
                var request = indexedDB.open('sgs', 1);

                request.onupgradeneeded = async function(){
                    let db = request.result;
                    let store = db.createObjectStore("sgs_object_store", {keyPath:"id"});
                    store.createIndex("sgs_index", ["json"], {unique: false});
                }

                request.onsuccess = async function(){
                    const db = request.result;
                    const transact = db.transaction("sgs_object_store", "readwrite");
                    const store = transact.objectStore("sgs_object_store");

                    if (type == "get"){
                        let getIt = store.get(+id);
                        getIt.onsuccess = function(){
                            res(getIt);

                        db.close();
                        }
                        getIt.onerror = function(){
                            res(getIt);
                        db.close();
                        }
                      //  res(store.get(id));

                        return;
                    }

                    if (type == 'put'){
                        store.put({id: id, json:data})
                        res();
                        db.close();
                        return;
                    }
                    if (type == 'add'){
                        store.add({id: id, json: data});
                        db.close();
                    }
                }

                request.onerror = function(){
                    db.close();
                }

            });
        };

async function init(){
    let done = 0;
    let doUpdate = parseFloat(GM_info.script.version) !== ls.version;

    if (doUpdate){
        ls.version = parseFloat(GM_info.script.version);
        localStorage["sgs"] = JSON.stringify(ls);
    }

    usw.sgs.countryFlags = await db('get', 0);

    if (!doUpdate && usw.sgs.countryFlags?.result?.json){

        usw.sgs.countryFlags = JSON.parse(usw.sgs.countryFlags.result.json);

        done++;

    } else {

        fetch('https://raw.githubusercontent.com/echandler/Simple-Reverse-Geocoding-Script/main/countryFlags.json').then(function(res){

            return res.text();

        }).then(function(res){

            usw.sgs.countryFlags = JSON.parse(res.replace(/\\\\/g,'\\').replace(/'/g, ''));

            db('put', 0, JSON.stringify(usw.sgs.countryFlags));

            done++;

        });
    }

    usw.sgs.rawBorders = await db('get', 1);

    if (!doUpdate && usw.sgs.rawBorders?.result?.json){

        usw.sgs.rawBorders = JSON.parse(usw.sgs.rawBorders.result.json);

        done++;

    } else {

        fetch('https://raw.githubusercontent.com/echandler/Simple-Reverse-Geocoding-Script/main/rawborders.json').then(function(res){

            return res.text();

        }).then(function(res){

            usw.sgs.rawBorders = JSON.parse(res.replace(/\\\\/g,'\\').replace(/'/g, ''));

            db('put', 1, JSON.stringify(usw.sgs.rawBorders));

            done++;

        });
    }

    _customBorders = await db('get', 2);

    if (!doUpdate && _customBorders?.result?.json){

        _customBorders = JSON.parse(_customBorders.result.json);

        customBorders(usw.sgs.rawBorders);

        done++;

    } else {

        fetch('https://raw.githubusercontent.com/echandler/Simple-Reverse-Geocoding-Script/main/customBorders.json').then(function(res){

            return res.text();

        }).then(function(res){

            _customBorders = JSON.parse(res);

            db('put', 2, JSON.stringify(_customBorders));

            let waitingForRawBorders = setInterval(()=>{

                if(usw?.sgs?.rawBorders?.constructor?.name === "IDBRequest") return;

                clearInterval(waitingForRawBorders);

                customBorders(usw.sgs.rawBorders);

                done++;

            }, 10);

        });
    }

    usw.sgs.countryCentroids = await db('get', 3);

    if (!doUpdate && usw.sgs.countryCentroids?.result?.json){

        usw.sgs.countryCentroids = JSON.parse(usw.sgs.countryCentroids.result.json);

        done++;

    } else {

        fetch('https://raw.githubusercontent.com/echandler/Simple-Reverse-Geocoding-Script/main/countryCentroids.json').then(function(res){

            return res.text();

        }).then(function(res){

            usw.sgs.countryCentroids = JSON.parse(res.replace(/'/g,''));

            db('put', 3, JSON.stringify(usw.sgs.countryCentroids));

            done++;

        });
    }

    usw.sgs.ggPolygons = await db('get', 4);

    if (!doUpdate && usw.sgs.ggPolygons?.result?.json){

        usw.sgs.ggPolygons = JSON.parse(usw.sgs.ggPolygons.result.json);

        compilePolygons(usw.sgs.ggPolygons);

        done++;

    } else {

        fetch('https://raw.githubusercontent.com/echandler/Simple-Reverse-Geocoding-Script/main/ggPolygons.json').then(function(res){

            return res.text();

        }).then(function(res){

            usw.sgs.ggPolygons = JSON.parse(res);

            db('put', 4, JSON.stringify(usw.sgs.ggPolygons));

            compilePolygons(usw.sgs.ggPolygons);

            done++;

        });
    }

    usw.sgs.country_code_to_name_index = await db('get', 5);

    if (!doUpdate && usw.sgs.country_code_to_name_index?.result?.json){

        usw.sgs.country_code_to_name_index = JSON.parse(usw.sgs.country_code_to_name_index.result.json);

        done++;

    } else {

        fetch('https://raw.githubusercontent.com/echandler/Simple-Reverse-Geocoding-Script/main/country_code_to_name_index.json').then(function(res){

            return res.text();

        }).then(function(res){

            usw.sgs.country_code_to_name_index = JSON.parse(res);

            db('put', 5, JSON.stringify(usw.sgs.country_code_to_name_index));

            done++;

        });
    }

    let int = setInterval(function(){
        if (done !== 6) return;

        clearInterval(int);

        usw.sgs.compileBorders();

        usw.sgs.ready = true;

        pending.forEach((fn)=> fn());
        pending = [];
    }, 10);
}

init();

})();
