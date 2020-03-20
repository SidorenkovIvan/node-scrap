let needle = require("needle");
let cheerio = require("cheerio");
let tress = require("tress");
let fs = require("fs");

let siteUrl = "https://tea4u.by";
let results = [];

function start() {
    needle.get(siteUrl, (err, res) => {
        if (err) throw err;
        let $ = cheerio.load(res.body);
        $("#menu ul li a[href^='https']").each((ind, el) => {
            q.push($(el).attr("href"));
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
        $(".product-thumb").each(function(i, el) {
            let imgUrl = $(el).find(".image > a > img").attr("src");
            let a = $(el).find(".caption > a");
            let title = a.text();
            let productUrl = a.attr("href");
            results.push({
                imageURL: imgUrl,
                title : title,
                productURL: productUrl
            });
        });

        // паджинатор
        let pli = $("ul.pagination li");
        if (pli.length >= 4 && !pli.eq(-1).hasClass("active")) {
            // console.log(url + " : paginator length = " + pli.length);
            // console.log("next page " + pli.eq(-2).children("a").attr("href"));
            q.push(pli.eq(-2).children("a").attr("href"));
        }
        

        callback(); //вызываем callback в конце
    });
});

// эта функция выполнится, когда в очереди закончатся ссылки
q.drain = function () {
    fs.writeFileSync('./data.json', JSON.stringify(results, null, 4));
};

// добавляем в очередь ссылки на категории из меню
start();