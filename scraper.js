var request = require('request');
var cheerio = require('cheerio');
var sqlite3 = require('sqlite3').verbose();
var async = require('async');

var db = new sqlite3.Database('data.sqlite');
db.exec("DROP TABLE IF EXISTS AMENITIES");
db.exec("CREATE TABLE AMENITIES(zipCity TEXT, openingHours TEXT PRIMARY KEY, street TEXT, name TEXT, googleMapsLink TEXT)");

request('https://www.heilbronn.de/bue_rat/virtuell/entsorgung/recyclinghoefe/adressen_recyclinghoefe/', function (error, response, html) {
    if (!error && response.statusCode == 200) {
        var statement = db.prepare("INSERT INTO AMENITIES VALUES (?, ?, ?, ?, ?)");
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
                openingHours: '',
                name: '',
                street: '',
                zipCity: '',
                googleMapsLink: ''
            };

            amenity.name = tr.find('td a').first().text().trim();
            amenity.street = tr.find('td').first().text().trim().replace(amenity.name, '');

            if (amenity.street.charAt(0) == " ") {
                amenity.street = amenity.street.trim();
            }

            var stringForMaps = (amenity.street + " " + amenity.name);

            //Ugly, but there was no other way. The Code failed for some reason on this point. I should change this
            if (stringForMaps == "Wartberg Deponie Vogelsang")
                stringForMaps = "Wartberg 1B Heilbronn"

            var temp = encodeURI("https://maps.googleapis.com/maps/api/geocode/json?address=" + stringForMaps + "&key=" + process.env.MORPH_API_KEY);

            async.parallel([function (callback) {

                    request(temp, function (error2, response2, html2) {
                        if (!error2) {
                            var tempObj = JSON.parse(html2);
                            amenity.zipCity = tempObj.results[0].address_components[6].long_name;
                            var lat = tempObj.results[0].geometry.location.lat;
                            var lng = tempObj.results[0].geometry.location.lng;
                            amenity.googleMapsLink = 'http://maps.google.com/maps?q=' + lat + "," + lng;
                            callback();
                        }
                    });
                },
                    function (callback) {
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
                        callback();
                    }],
                function (err) {
                    statement.run(amenity.zipCity + " Heilbronn", amenity.openingHours, amenity.street, "Recyclinghof " + amenity.name, amenity.googleMapsLink);
                });
        });
    }
});