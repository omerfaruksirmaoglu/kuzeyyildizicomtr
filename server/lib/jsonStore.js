import fs from 'fs/promises';
import path from 'path';

const CONTENT_DIR = 'content';
const CONFIG_FILE = path.join(CONTENT_DIR, 'config.json');
const SCHEDULE_FILE = path.join(CONTENT_DIR, 'schedule.json');

// Ensure content directory exists
async function ensureContentDir() {
  try {
    await fs.access(CONTENT_DIR);
  } catch {
    await fs.mkdir(CONTENT_DIR, { recursive: true });
    await fs.mkdir(path.join(CONTENT_DIR, 'media'), { recursive: true });
  }
}

// Atomic write with backup
async function atomicWrite(filePath, data) {
  await ensureContentDir();
  
  const tempPath = `${filePath}.tmp`;
  const backupPath = `${filePath}.bak`;
  
  // Create backup if file exists
  try {
    await fs.access(filePath);
    await fs.copyFile(filePath, backupPath);
  } catch {
    // File doesn't exist, no backup needed
  }
  
  // Write to temp file
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');
  
  // Atomic rename
  await fs.rename(tempPath, filePath);
}

// Default configuration
const DEFAULT_CONFIG = {
  timezone: "Europe/Istanbul",
  requireUserLogin: true,
  requireAdminLogin: true,
  startAtIso: "2025-09-28T00:00:00+03:00",
  endAtIso: "2025-09-29T23:59:59+03:00",
  giftMessage: "Hediyeni almak için gece 12'yi beklemen gerekecek… 💖"
};

export async function readConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
  } catch {
    await writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config) {
  await atomicWrite(CONFIG_FILE, config);
}

export async function readSchedule() {
  try {
    const data = await fs.readFile(SCHEDULE_FILE, 'utf8');
    const schedule = JSON.parse(data);
    return schedule.sort((a, b) => new Date(a.atIso) - new Date(b.atIso));
  } catch {
    const defaultSchedule = await createDefaultSchedule();
    await writeSchedule(defaultSchedule);
    return defaultSchedule;
  }
}

export async function writeSchedule(schedule) {
  // Sort by time before saving
  const sorted = [...schedule].sort((a, b) => new Date(a.atIso) - new Date(b.atIso));
  await atomicWrite(SCHEDULE_FILE, sorted);
}

async function createDefaultSchedule() {
  return [
    {
      "atIso": "2025-09-28T00:00:00+03:00",
      "type": "message",
      "message": "❤️ Aşkın Şifresi ❤️\nMacera başlıyor…\nÖnünde, çözülmeyi bekleyen 18 harften oluşan gizemli bir şifre var.\nBu şifre, sadece kelimelerden ibaret değil; kalbime giden gizli bir kapının anahtarı.\nSabır senin en güçlü silahın olacak.\nHer harfi çözdükçe, seni bana ve seni bekleyen sürprize biraz daha yaklaştıracaksın.\nAma unutma: ne kadar hızlı ilerlersen, ödülüne o kadar hızlı kavuşacaksın.\nBu yolculuk senin için hazırlandı, her adımı sadece sana özel.\nVe finalde, seni bekleyen şey yalnızca bir hediye değil…\nBenim sevgimle hazırlanmış, kalbine dokunacak bir sürpriz olacak. ✨\nHazır mısın bebeğimm?\nOyun başlıyor…",
      "media": [],
      "question": "Soru:\nGeceleri sana ışık olan,\nKaranlıkta yanında duran…\nKüçük ama kalpten gelen bir armağan,\nAdını sen koydun: sana özel bir can.\nBana doğru yolu gösteren,\nSeninle birlikteyken en parlak görünen…\nO nedir?",
      "answer": "kuzeycik",
      "hints": ["K harfi ile başlıyor.", "Onun minik ayakları var."],
      "postAnswerMessage": "Karanlığın küçük yıldızı bulundu: Kuzeycik. Sanırım Kuzeyciğin poposuna bir şey yapışmış, kontrol etmek istersin diye düşünüyorum."
    },
    {
      "atIso": "2025-09-28T07:00:00+03:00",
      "type": "media",
      "message": "Yolculuğun bir sonraki durağı, kendi krallığın: evin…\nOrada, gözlerden saklı küçük bir hazine bekliyor…\nOnu bulmanın anahtarı ise karşındaki videoda…\nVideoyu dikkatle izle; her saniye, saklı yeri ele veren minik bir iz taşıyor.\nBulduğunda, acele etme.\nPuzzle'ın her parçası, sevgimden bir iz gibi yerine oturacak.\nParçalar bir araya geldikçe, hikâyemizin resmi netleşecek—tıpkı ikimizin fotoğrafları gibi.\nSon hamle çok önemli:\nPuzzle tamamlandığında, arkasındaki yazıyı oku ve aklında tut.\nBu yazı, bir sonraki kapının şifresi olacak.\n(İpucu: Notu yazmana gerek yok; kalbin güçlü bir hafıza kasasıdır. 😉)\nUnutma… ne kadar hızlı tamamlarsan, hediyene o kadar hızlı kavuşursun.\nAma en güzeli, bu anların keyfini çıkarmak. Çünkü bu oyun, bizim hikâyemizin başka bir sayfası. ❤️",
      "media": [
        { "kind": "video", "src": "/content/media/0700.mp4", "poster": "/content/media/0700.jpg" }
      ],
      "question": null,
      "answer": null,
      "hints": []
    },
    {
      "atIso": "2025-09-28T12:00:00+03:00",
      "type": "message",
      "message": "Yolculuğunda yeni bir kapı açılıyor…\nBu kez ipucu seni geçmişimize götürüyor.\nBir zamanlar sana verdiğim, yüzeyinde birlikteki en mutlu anılarımızı taşıyan küçük bir küp hatırlıyor musun? ✨\nO, sadece bir süs değil… içinde saklı sırrı olan bir hatıra sandığı.\nKüpün içinde, sana özel gizli bir şey saklı. Onu bulmak için tek yapman gereken şey:\n👉 Küpü bulmak.\n👉 Ve içindekileri keşfetmek.\nUnutma sevgilim, bu küpün her yüzü seninle yaşadığım anların bir yansıması.\nVe kalbimin sana sakladığı sürpriz, tam da o anıların içinde gizleniyor.\nHazır mısın?\nKüp seni bekliyor… ve içinde gizlenen küçük sır da.",
      "media": [],
      "question": null,
      "answer": null,
      "hints": []
    },
    {
      "atIso": "2025-09-28T17:00:00+03:00",
      "type": "message",
      "message": "Her yolculuk biraz da köklere inmektir…\nŞimdi sıradaki görev seni, birlikte inşa ettiğimiz bir hatıraya götürüyor: aile ağacı temalı legomuz. 🧱✨\nDallarında fotoğraflarımız asılı; her yaprak, her kare, birlikte yazdığımız bir hikâyeyi saklıyor.\nAma hepsi göründüğü kadar basit değil…\nBazılarının arkasında sana özel gizli mesajlar gizledim. 🕵️‍♀️💌\nGörevin çok açık:\n👉 Ağacın dallarındaki fotoğrafları tek tek çevir.\n👉 Gizli mesajları bul ve dikkatle oku.\n👉 Onları aklında tut, çünkü sonraki adımda kapıyı açan anahtar olacaklar. 🔑\nUnutma sevgilim, bu sadece bir oyun değil…\nHer mesaj, sana olan sevgimin küçük bir yansıması.\nVe her satır seni, sürprizine biraz daha yaklaştıracak.\nHazırsan: ağaç köklerini fısıldasın, dallar sana sırlarını versin.",
      "media": [],
      "question": null,
      "answer": null,
      "hints": []
    },
    {
      "atIso": "2025-09-28T17:00:10+03:00",
      "type": "question",
      "message": "Bugün yol boyunca birçok sırrı çözdün… Şimdi 18 harften oluşan büyük şifreyi girme zamanı. 🔐\nİpucu 1: Şifre için beni arayıp benden yardım alabilirsin.",
      "media": [],
      "question": "Şifreyi yaz:",
      "answer": "İYİ Kİ DOĞDUN SEVGİLİM",
      "hints": ["Hepsi büyük harf olabilir", "Türkçe harfler ve boşluklar", "Anlamı: 'Happy birthday my love'"],
      "postAnswerMessage": "Senin zekân ve sabrın sayesinde yolculuğun ilk büyük sırrı çözüldü.\nKapı açıldı… ama yol henüz burada bitmedi.\n🕛 Gece yarısına kadar beklemek. 🕛\nZaman ilerledikçe, sürpriz de sana yaklaşacak.\nVe 12 olduğunda… seni en parlak ışık ve en tatlı sürpriz karşılayacak. 🌌💝\nSabır, bu oyunun en değerli anahtarı."
    },
    {
      "atIso": "2025-09-29T00:00:00+03:00",
      "type": "media",
      "message": "Birinci yolculuğun bitti… Ama seninle olan maceram asla bitmez.\nŞimdi seni ikinci yolculuğuna davet ediyorum.\nBu kez daha özel, daha romantik ve sana daha çok ait bir hazine bekliyor…\nEvinin içinde gizlenmiş, ama her an sana daha da yakın.\nKalbimin sana attığı her adım gibi. ♥️\nHazır ol sevgilim… Çünkü ikinci yolculuğun tam şimdi başlıyor. 🌙✨",
      "preContentNote": "Hediyeni bulduktan sonra sakın **HEDİYEMİ BULDUM** butonuna basmadan kutuyu açma.",
      "media": [
        { "kind": "video", "src": "/content/media/0000-day2.mp4", "poster": "/content/media/0000-day2.jpg" }
      ],
      "cta": {
        "label": "HEDİYEMİ BULDUM",
        "afterCtaMessage": "Yolculuğunun bu adımında seni çok özel bir sır bekliyor…\nKarşında duran şey bir Da Vinci Cryptex. 🗝️\nİçinde sana ait, çok değerli ve hassas bir hediye saklı.\nAma sevgilim, bu cryptex asla zorlanmamalı…\nŞifre deneme-yanılma ile bulunmayacak; doğru zamanı gelmeden açılmayacak.\nVe lütfen unutma: Cryptex seninle işe gitmemeli. Onu evde bırak.\nİşe götürmen gereken şeyler zamanı gelince bildirilecek.\nSabırlı ol… Sabah 05:30'da her şey biraz daha netleşecek :) ✨"
      },
      "question": null, "answer": null, "hints": []
    },
    {
      "atIso": "2025-09-29T05:30:00+03:00",
      "type": "message",
      "message": "Şimdi sırada kalbimin sana en özel armağanlarından biri var…\nZamanında aşkımızı anlatmak için sana yazdığım kitabı hatırlıyor musun? 📖\nBu kitabı şimdi açmanı istiyorum… ama yalnızca **son sayfasına** bak.\nOrada seni bir sonraki adıma götürecek ipucu var.\nVe çok önemli: Bu kitabı yanında taşımalısın.\nBugün işe giderken mutlaka yanında olmalı.\nÇünkü yolculuğunun devamı, o kitap seninle birlikte olduğunda mümkün olacak.\nKalbimle yazdım, şimdi kalbine rehberlik etsin… 💫",
      "media": [],
      "question": null, "answer": null, "hints": []
    },
    {
      "atIso": "2025-09-29T09:00:00+03:00",
      "type": "media",
      "message": "Bu videonun içinde seni bekleyen gizli bir işaret var…\nBir harf sakladım. 🔠\nVideoyu dikkatle izle; hiçbir ayrıntı kaçmasın.\nHarfi öğrendiğinde, yolculuğunun kilit parçalarından birine sahip olacaksın.\nNot et ve aklında tut: zamanı gelince kapılar açacak. 🌹✨",
      "media": [
        { "kind": "video", "src": "/content/media/0900.mp4", "poster": "/content/media/0900.jpg" }
      ],
      "question": null, "answer": null, "hints": []
    },
    {
      "atIso": "2025-09-29T12:00:00+03:00",
      "type": "question",
      "message": "Soru:",
      "media": [],
      "question": "uğpkpoğ ıkvvkikökc ökeiğokp bjogjcoj tğuvrtçpjp çgj pğbgk ?",
      "answer": "Od Urla",
      "hints": ["+3", "Türk alfabesi", "Harfleri 3 defa ileriye kaydır"],
      "postAnswerMessage": "(39.89422496988025, 32.87189206679238)"
    },
    {
      "atIso": "2025-09-29T14:00:00+03:00",
      "type": "message",
      "message": "Sevgilim…\nSana çok yakın, her an yanında taşıdığın bir yerde küçük bir sürpriz sakladım.\nCevabı bulmak için yapman gereken tek şey: **cüzdanına bakmak**. ✨",
      "media": [],
      "question": null, "answer": null, "hints": []
    },
    {
      "atIso": "2025-09-29T16:30:00+03:00",
      "type": "question",
      "message": "Sevgilim, yolculuğun burada biraz daha derinleşiyor…\nZamanında sana yazdığım kitabı eline al. 📖\nAma bu defa yalnızca okumak yetmeyecek… Sayfaları dikkatlice incelemen gerekiyor.\nHer satırda, her sayfada seni bekleyen küçük bir iz saklı.\nDikkatli gözlerin onu fark edecek… ve bu seni bir şifreye götürecek. 🔐\nUnutma; anahtar satırlarda gizli…",
      "media": [],
      "question": "İşaretli harfleri sırayla birleştir. Şifre nedir?",
      "answer": "seni çok seviyorum",
      "hints": ["İşaretli harflere bak", "Sırayla birleştir"],
      "postAnswerMessage": "",
      "mediaAfterAnswer": [
        { "kind": "video", "src": "/content/media/1630-after.mp4", "poster": "/content/media/1630-after.jpg" }
      ]
    },
    {
      "atIso": "2025-09-29T18:00:00+03:00",
      "type": "media",
      "message": "Yavrum…\nBugün yolculuğunun her adımında sabrınla, dikkatle ve kalbinle ilerledin.\nArtık oyunun sonuna geldin… ve seni bekleyen ödül yalnızca bir hediye değil.\nBu geceyi seninle en özel şekilde tamamlamak istiyorum.\nO yüzden seni, bizim için özel bir yerde ayırdığım masaya davet ediyorum.\nRezervasyonumuz hazır… Ve tek yapman gereken, kalbinle bana eşlik etmek.\nİYİ Kİ DOĞDUN SEVGİLİM",
      "media": [
        { "kind": "image", "src": "/content/media/1800.jpg", "alt": "final invite" }
      ],
      "question": null, "answer": null, "hints": []
    }
  ];
}