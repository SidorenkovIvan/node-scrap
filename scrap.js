// var request = require("request"),
//     cheerio = require("cheerio"),
//     url = "https://tea4u.by/puer/shen";
// request(url, function (error, response, body) {
//     if (!error) {
//         var $ = cheerio.load(body),
//             url = $("div.product-thumb:nth-child(1) div.caption>a"),
//             title = $("div.product-thumb:nth-child(1) a>img"),
//             image = $("div.product-thumb:nth-child(1) a>img");
//         console.log(url.attr("href") + '\n'
//             + title.attr("title") + '\n'
//             + image.attr("src"));
//     } else {
//         console.log("Произошла ошибка: " + error);
//     }
// });

var request = require("request"),
    cheerio = require("cheerio"),
    siteUrl = "https://tea4u.by",
    products = [];

/*requestForCategoruUrls(urlOfSite, function (error, response, body) {
    if (!error) {
        var $ = cheerio1.load(body);
        $("#menu ul.navbar-nav li > a").each((i,elem) => {
            var href = $(elem).attr("href");
            if (href.search("javascript") == -1) {
                categoryUrls.push({
                    urls: href
                });
            }
        });
        console.log(categoryUrls);
    }
    console.log(categoryUrls.length);
});

var urlZel = "https://tea4u.by/puer/shen";
requestForProducts(urlZel, function (error, response, body) {
    if (!error) {
        var $ = cheerio1.load(body);
        $("div.product-thumb").each((i, el) => {
            products.push({
                url: $(el).find("div.caption>a").attr("href"),
                imageUrl: $(el).find("a>img").attr("src"),
                title: $(el).find("div.caption>a").text()
            });
        });
        console.log(products);
    }
});*/
var catCount = 0;
var prodCount = 0;

request(siteUrl, function (err, response, body) {
    if (err) throw err;
    var $ = cheerio.load(body);

    $("#menu ul.navbar-nav li > a").each((i, elem) => {
        var href = $(elem).attr("href");
        if (href.search("javascript") === -1) {
            console.log(href);
            request(href, catCallback);
        }
    });
});

var catCallback = function (err, response, body) {
    catCount++;
    if (err) throw err;
    var $ = cheerio.load(body);
    $("div.product-thumb").each((i, el) => {
        var p = {
            url: $(el).find("div.caption>a").attr("href"),
            imageUrl: $(el).find("a>img").attr("src"),
            title: $(el).find("div.caption>a").text()
        };
        products.push(p);
        console.log(p);
        ++prodCount;
    });
    console.log(prodCount);
    console.log(catCount);
};