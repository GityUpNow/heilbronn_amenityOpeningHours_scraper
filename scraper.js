var request = require('request');
var cheerio = require('cheerio');
var sqlite3 = require("sqlite3").verbose();


function initDatabase(callback) {
    // Set up sqlite database.
    var db = new sqlite3.Database("data.sqlite");
    db.serialize(function () {
        db.run("CREATE TABLE IF NOT EXISTS data (name TEXT)");
        callback(db);
    });
}

function updateRow(db, value) {
    // Insert some data.
    var statement = db.prepare("INSERT INTO data VALUES (?)");
    statement.run(value);
    statement.finalize();
}

function readRows(db) {
    // Read some data.
    db.each("SELECT rowid AS id, name FROM data", function (err, row) {
        console.log(row.id + ": " + row.name);
    });
}

function fetchPage(url, callback) {
    // Use request to read in pages.
    request(url, function (error, response, body) {
        if (error) {
            console.log("Error requesting page: " + error);
            return;
        }

        callback(body);
    });
}

function run(db) {
    // Use request to read in pages.
    fetchPage("https://morph.io", function (body) {
        // Use cheerio to find things in the page with css selectors.
        var $ = cheerio.load(body);

        var elements = $("div.media-body span.p-name").each(function () {
            var value = $(this).text().trim();
            updateRow(db, value);
        });

        readRows(db);

        db.close();
    });
}

initDatabase(run);


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

            amenity.name = tr.find('td a').first().text().trim();
            amenity.street = tr.find('td').first().text().trim().replace(amenity.name, '');

            if (amenity.street.charAt(0) == " ") {
                amenity.street = amenity.street.trim();
            }

            var stringForMaps = (amenity.street + " " + amenity.name);

            //Ugly, but there was no other way. The Code failed for some reason on this point
            if (stringForMaps == "Wartberg Deponie Vogelsang")
                stringForMaps = "Wartberg 1B Heilbronn"

            var MORPH_API_KEY = 'AIzaSyDOCJd4Jh9NIE3WkIX9cf4RTRjUg1U6jKU';

            var temp = encodeURI("https://maps.googleapis.com/maps/api/geocode/json?address=" + stringForMaps + "&key=" + MORPH_API_KEY);

            request(temp, function (error2, response2, html2) {
                if (!error2) {
                    var tempObj = JSON.parse(html2);
                    amenity.zipCity = tempObj.results[0].address_components[6].long_name;
                    var lat = tempObj.results[0].geometry.location.lat;
                    lng = tempObj.results[0].geometry.location.lng;
                    amenity.googleMapsLink = 'http://maps.google.com/maps?q=' + lat + "," + lng;
                }
            });


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

        //TODO: Über Google Position herausfinden (und Postleitzahl) (kann ich über Straßennamen suchen)
        //TODO: Google Map Link

        //console.log(data);
    }

});