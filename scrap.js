let needle = require("needle");
let cheerio = require("cheerio");
let tress = require("tress");
let sqlite3 = require("sqlite3").verbose();
let fs = require("fs");
let siteUrl = "https://tea4u.by";
let results = [];
let category = [];
function start() {
    needle.get(siteUrl, (err, res) => {
        if (err) throw err;
        let $ = cheerio.load(res.body);
        $("#menu ul li a[href^='https']").each((ind, el) => {
            //q.push($(el).attr("href"));
            console.log($(el).text().replace(/-/g, '').trim());
        });
    });
}

// `tress` последовательно вызывает наш обработчик для каждой ссылки в очереди
let q = tress(function(url, callback) {
    //тут мы обрабатываем страницу с адресом url
    needle.get(url, function (err, res) {
        if (err) throw err;
        // здесь делаем парсинг страницы из res.body
        let $ = cheerio.load(res.body);
        // делаем results.push для данных о товаре
        // делаем q.push для ссылок на обработку
        // товар
        // если использовать здесь функцию-стрелку () => {} , то $(this) работать не будет! (this - эквивалент el в данном случае)
        $(".product-thumb").each(function (i, el) {
            let imgUrl = $(el).find(".image > a > img").attr("src");
            let a = $(el).find(".caption > a");
            let title = a.text();
            let productUrl = a.attr("href");
            results.push([
                imgUrl,
                title,
                productUrl,

            ]);
        });
        // паджинатор
        let pli = $("ul.pagination li");
        if (pli.length >= 4 && !pli.eq(-1).hasClass("active")) {
            q.push(pli.eq(-2).children("a").attr("href"));
        }
        callback(); //вызываем callback в конце
    });
});

// эта функция выполнится, когда в очереди закончатся ссылки
q.drain = function () {
    let dataBase = new sqlite3.Database('scraper.sqlite');
    dataBase.serialize(() => {
       dataBase.run('DROP TABLE IF EXISTS scraper');
       dataBase.run('CREATE TABLE scraper (imageURL TEXT, title TEXT, productURL TEXT)');
       let stmt = dataBase.prepare('INSERT INTO scraper VALUES (?, ?, ?)');
       for (let i = 0; i < results.length; i++) {
           stmt.run(results[i]);
       }
       stmt.finalize();
       dataBase.close();
    });
    fs.writeFileSync('./data.json', JSON.stringify(results, null, 4));
};

// добавляем в очередь ссылки на категории из меню
start(); 