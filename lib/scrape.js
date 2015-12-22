var request = require('request');
var cheerio = require('cheerio');

request('https://www.heilbronn.de/bue_rat/virtuell/entsorgung/recyclinghoefe/adressen_recyclinghoefe/', function (error, response, html) {
    if (!error && response.statusCode == 200) {
        var $ = cheerio.load(html);
        var data = [];

        var days = [
            'montags',
            'dienstags',
            'mittwochs',
            'donnerstags',
            'freitags',
            'samstags'
        ];

        $('.tabelle_linien tbody tr').each(function (i, element) {
            var tr = $(this);
            var amenity = {
                openingHours: ''
            };

            amenity.name = tr.find('td').first().text().trim();

            tr.find('td').each(function (i) {
                if (i != 0) {
                    var textParent = $(this).find('p');
                    if (textParent.text().trim().length > 0) {
                        if (amenity.openingHours.length > 0) {
                            amenity.openingHours += '; ';
                        }
                        amenity.openingHours += days[i - 1] + " ";
                        textParent.contents().filter(function () {
                            return $(this).text().trim().length > 0
                        }).each(function (j) {
                            if (j > 0) {
                                amenity.openingHours += ' und ';
                            }
                            amenity.openingHours += $(this).text().trim();
                        });
                    }
                }
            });

            data.push(amenity);
        });

        console.log(data);
    }

});