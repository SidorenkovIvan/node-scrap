let needle = require("needle");
let cheerio = require("cheerio");
let tress = require("tress");
let sqlite3 = require("sqlite3").verbose();
let fs = require("fs");
let siteUrl = "https://tea4u.by";
let results = [];
let category = {};
let product = {};
let prodId = 0;

function start() {
    needle.get(siteUrl, (err, res) => {
        if (err) throw err;
        let $ = cheerio.load(res.body);
        let id = 0;
        $("#menu ul li a[href^='https']").each((ind, el) => {
            let h = $(el).attr("href");
            q.push(h);
            category[h] = {
                id: ++id,
                title: $(el).text().replace(/[^А-Яа-я0-9,Ёё]/g, ' ').trim(),
                url: h
            };
        });
        //console.log(category);
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
        // в товаре внутри
        if ($("#content").attr("itemtype") === "https://schema.org/Product") {
            let code = $("meta[itemprop='model']").attr("content");
            console.log(code);
            if (!("description" in product[code])) {
                product[code].description = $("#tab-description > div").text();
                let imgs = [];
                let first = $(".thumbnails.image-thumb > a").attr("href");
                if (first != null) imgs.push(first);
                $(".thumbnails.image-additional a.item.thumbnail").each(function (i,e) {
                    imgs.push( $(e).attr("href") );
                });
                product[code].images = imgs;
            }
        }
        else {
            // товар
            // если использовать здесь функцию-стрелку () => {} , то $(this) работать не будет! (this - эквивалент el в данном случае)
            $(".product-thumb").each(function (i, el) {
                let imgUrl = $(el).find(".image > a > img").attr("src");
                let a = $(el).find(".caption > a");
                let productTitle = a.text();
                let productUrl = a.attr("href");
                let categoryURL = productUrl.substr(0, productUrl.lastIndexOf('/'));
                let categoryTitle = category[categoryURL].title;
                results.push([
                    imgUrl,
                    productTitle,
                    productUrl,
                    categoryURL,
                    categoryTitle
                ]);
                let productCode = $(el).find(".additional .code > span").text();
                let p = {imgUrl, productTitle, productUrl, categoryURL, categoryTitle};
                if (!(productCode in product)) {
                    product[productCode] = {id: ++prodId, prods: [p]};
                } else {
                    product[productCode].prods.push(p);
                }
                q.push(productUrl);
            });
            // паджинатор
            let pli = $("ul.pagination li");
            if (pli.length >= 4 && !pli.eq(-1).hasClass("active")) {
                q.push(pli.eq(-2).children("a").attr("href"));
            }
        }
        callback(); //вызываем callback в конце
    });
}, 10); // запускаем 10 параллельных потоков

// эта функция выполнится, когда в очереди закончатся ссылки
q.drain = function () {
    let dataBase = new sqlite3.Database('data.sqlite');
    dataBase.serialize(() => {
       dataBase.run('DROP TABLE IF EXISTS category');
       dataBase.run('CREATE TABLE category (' +
           ' "category_id" INTEGER NOT NULL UNIQUE, ' +
           ' "title" TEXT, ' +
           ' "url" TEXT UNIQUE, ' +
           ' PRIMARY KEY("category_id") );');
       let stmt = dataBase.prepare('INSERT INTO category VALUES (?, ?, ?)');
       for (const u in category)
           stmt.run(category[u].id, category[u].title, category[u].url);
       stmt.finalize();
       dataBase.run('DROP TABLE IF EXISTS product');
       dataBase.run('CREATE TABLE product (' +
        ' "product_id" INTEGER NOT NULL UNIQUE, ' +
        ' "imgUrl" TEXT, ' +
        ' "productTitle" TEXT, ' +
        ' "productUrl" TEXT, ' +
        ' "description"	TEXT, ' +
        ' "images" TEXT, ' +
        ' "code" TEXT, ' +
        ' PRIMARY KEY("product_id") );');
       let stmt1 = dataBase.prepare('INSERT INTO product VALUES (?, ?, ?, ?, ?, ?, ?)');
       let foreign = [];
       for (const c in product) {
           for (let p of product[c].prods) {
               foreign.push([category[p.categoryURL].id, product[c].id]);
           }
           stmt1.run(product[c].id,
               product[c].prods[0].imgUrl,
               product[c].prods[0].productTitle,
               product[c].prods[0].productUrl,
               product[c].description,
               product[c].images.join('|'),
               c);
       }
       stmt1.finalize();
       dataBase.run('DROP TABLE IF EXISTS category_product');
       dataBase.run('CREATE TABLE category_product (' +
           ' "category_id" INTEGER NOT NULL, ' +
           ' "product_id" INTEGER NOT NULL, ' +
           ' FOREIGN KEY("product_id") REFERENCES "product"("product_id"), ' +
           ' PRIMARY KEY("category_id","product_id"), ' +
           ' FOREIGN KEY("category_id") REFERENCES "category"("category_id") );');
       let stmt2 = dataBase.prepare('INSERT INTO category_product VALUES (?, ?)');
       for (const f of foreign)
           stmt2.run(f[0], f[1]);
       stmt2.finalize();
       dataBase.close();
    });
    fs.writeFileSync('./data.json', JSON.stringify(product, null, 4));
    //console.log("total unique products " + prodId);
};

// добавляем в очередь ссылки на категории из меню
start();
