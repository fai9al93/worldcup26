// يولّد ملف matches.ics محدّثاً بنتائج ومواعيد كأس العالم 2026
// المصدر: openfootball (مجاني). يعمل على Node 18+ (fetch مدمج).
const fs = require("fs");
const SRC = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// أكواد -> أسماء عربية
const AR = {
  MEX:"المكسيك",RSA:"جنوب أفريقيا",KOR:"كوريا الجنوبية",CZE:"التشيك",
  CAN:"كندا",BIH:"البوسنة",QAT:"قطر",SUI:"سويسرا",
  BRA:"البرازيل",MAR:"المغرب",HAI:"هايتي",SCO:"إسكتلندا",
  USA:"أمريكا",PAR:"باراغواي",AUS:"استراليا",TUR:"تركيا",
  GER:"ألمانيا",CUW:"كوراساو",CIV:"ساحل العاج",ECU:"الاكوادور",
  NED:"هولندا",JPN:"اليابان",SWE:"السويد",TUN:"تونس",
  BEL:"بلجيكا",EGY:"مصر",IRN:"إيران",NZL:"نيوزيلاندا",
  ESP:"اسبانيا",CPV:"الرأس الأخضر",KSA:"السعودية",URU:"أوروغواي",
  FRA:"فرنسا",SEN:"السنغال",IRQ:"العراق",NOR:"النرويج",
  ARG:"الأرجنتين",ALG:"الجزائر",AUT:"النمسا",JOR:"الأردن",
  POR:"البرتغال",COD:"الكونغو",UZB:"أوزباكستان",COL:"كولومبيا",
  ENG:"إنجلترا",CRO:"كرواتيا",GHA:"غانا",PAN:"بنما"
};
// أسماء/خانات openfootball -> أكواد
const OF = {
  "mexico":"MEX","south africa":"RSA","south korea":"KOR","korea republic":"KOR","uefa path d winner":"CZE","czechia":"CZE","czech republic":"CZE",
  "canada":"CAN","uefa path a winner":"BIH","bosnia":"BIH","bosnia and herzegovina":"BIH","bosnia & herzegovina":"BIH","qatar":"QAT","switzerland":"SUI",
  "brazil":"BRA","morocco":"MAR","haiti":"HAI","scotland":"SCO",
  "usa":"USA","united states":"USA","paraguay":"PAR","australia":"AUS","uefa path c winner":"TUR","turkey":"TUR","türkiye":"TUR","turkiye":"TUR",
  "germany":"GER","curaçao":"CUW","curacao":"CUW","ivory coast":"CIV","côte d'ivoire":"CIV","cote d'ivoire":"CIV","ecuador":"ECU",
  "netherlands":"NED","japan":"JPN","uefa path b winner":"SWE","sweden":"SWE","tunisia":"TUN",
  "belgium":"BEL","egypt":"EGY","iran":"IRN","ir iran":"IRN","new zealand":"NZL",
  "spain":"ESP","cape verde":"CPV","cabo verde":"CPV","saudi arabia":"KSA","uruguay":"URU",
  "france":"FRA","senegal":"SEN","ic path 2 winner":"IRQ","iraq":"IRQ","norway":"NOR",
  "argentina":"ARG","algeria":"ALG","austria":"AUT","jordan":"JOR",
  "portugal":"POR","ic path 1 winner":"COD","dr congo":"COD","democratic republic of the congo":"COD","uzbekistan":"UZB","colombia":"COL",
  "england":"ENG","croatia":"CRO","ghana":"GHA","panama":"PAN"
};
const ROUND_AR = {
  "round of 32":"دور الـ32","round of 16":"دور الـ16","quarter-final":"ربع النهائي",
  "semi-final":"نصف النهائي","match for third place":"تحديد المركز الثالث","final":"النهائي"
};
function ar(name){
  if(!name) return null;
  const c = OF[String(name).trim().toLowerCase()];
  if(c) return AR[c];
  // خانات مثل 2A / 1E / W74 / L101 / 3A/B/C/D/F
  const s = String(name).trim();
  if(/^1[A-L]$/.test(s)) return "أول "+s[1];
  if(/^2[A-L]$/.test(s)) return "ثاني "+s[1];
  if(/^3/.test(s)) return "ثالث ("+s.slice(1)+")";
  if(/^W\d+$/.test(s)) return "الفائز م"+s.slice(1);
  if(/^L\d+$/.test(s)) return "الخاسر م"+s.slice(1);
  return s;
}
function score(om){
  if(typeof om.score1==="number"&&typeof om.score2==="number") return [om.score1,om.score2];
  if(om.score&&Array.isArray(om.score.ft)&&om.score.ft.length===2) return om.score.ft;
  return null;
}
function toUTC(date,time){
  // time مثل "13:00 UTC-6"
  const m = String(time||"").match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  if(!m) return null;
  const off = parseInt(m[3],10);
  const sign = off<0?"-":"+";
  const pad = String(Math.abs(off)).padStart(2,"0");
  const iso = `${date}T${m[1].padStart(2,"0")}:${m[2]}:00${sign}${pad}:00`;
  const d = new Date(iso);
  return isNaN(d) ? null : d;
}
function stamp(d){ return d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""); }
function esc(s){ return String(s).replace(/([,;\\])/g,"\\$1").replace(/\n/g,"\\n"); }

(async () => {
  const res = await fetch(SRC, {headers:{"User-Agent":"wc26-ics"}});
  if(!res.ok) throw new Error("fetch "+res.status);
  const data = await res.json();
  const now = stamp(new Date());
  const recs = [];
  (data.matches||[]).forEach((om,i)=>{
    const start = toUTC(om.date, om.time);
    if(!start) return;
    const end = new Date(start.getTime()+120*60000);
    const c1 = OF[String(om.team1||"").trim().toLowerCase()] || null;
    const c2 = OF[String(om.team2||"").trim().toLowerCase()] || null;
    const a = ar(om.team1), b = ar(om.team2);
    const sc = score(om);
    const grp = om.group ? String(om.group).replace(/group/i,"").trim() : null;
    const ctx = grp ? ("مجموعة "+grp) : (ROUND_AR[String(om.round||"").toLowerCase()] || om.round || "");
    const summary = sc ? `${a} ${sc[0]}-${sc[1]} ${b}` + (ctx?` (${ctx})`:"")
                       : `${a} × ${b}` + (ctx?` (${ctx})`:"");
    const uid = "wc26-"+(om.num || ((om.group||"").replace(/\s+/g,"")+"-"+i))+"@worldcup26";
    const lines = ["BEGIN:VEVENT","UID:"+uid,"DTSTAMP:"+now,"SEQUENCE:"+(sc?2:1),
      "DTSTART:"+stamp(start),"DTEND:"+stamp(end),
      "SUMMARY:"+esc("كأس العالم: "+summary),
      "DESCRIPTION:"+esc("كأس العالم 2026"+(om.ground?(" — "+om.ground):"")),
      om.ground?("LOCATION:"+esc(om.ground)):null,
      "BEGIN:VALARM","TRIGGER:-PT30M","ACTION:DISPLAY","DESCRIPTION:تذكير بالمباراة","END:VALARM",
      "END:VEVENT"].filter(Boolean);
    recs.push({ lines, grp, codes:[c1,c2].filter(Boolean) });
  });
  function wrap(name, list){
    return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//worldcup26//AR//","CALSCALE:GREGORIAN","METHOD:PUBLISH",
      "X-WR-CALNAME:"+name,"X-WR-TIMEZONE:UTC","REFRESH-INTERVAL;VALUE=DURATION:PT3H","X-PUBLISHED-TTL:PT3H"]
      .concat(...list.map(r=>r.lines)).concat(["END:VCALENDAR"]).join("\r\n")+"\r\n";
  }
  fs.mkdirSync("ics",{recursive:true});
  fs.writeFileSync("matches.ics", wrap("كأس العالم 2026", recs), "utf8");        // الشامل
  "ABCDEFGHIJKL".split("").forEach(g=>{                                          // كل مجموعة
    const list = recs.filter(r=>r.grp===g);
    if(list.length) fs.writeFileSync("ics/group-"+g+".ics", wrap("كأس العالم — مجموعة "+g, list), "utf8");
  });
  Object.keys(AR).forEach(code=>{                                                // كل منتخب
    const list = recs.filter(r=>r.codes.includes(code));
    if(list.length) fs.writeFileSync("ics/team-"+code+".ics", wrap("كأس العالم — "+AR[code], list), "utf8");
  });
  console.log("wrote matches.ics ("+recs.length+" events) + 12 groups + "+Object.keys(AR).length+" teams");
})();
