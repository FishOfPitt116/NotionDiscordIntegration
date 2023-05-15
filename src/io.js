import { readFileSync, writeFile } from 'fs';

export function writeDatabase(database) {
    if (database == undefined) {
        return undefined;
    }

    var json = JSON.stringify(Object.fromEntries(database));

    writeFile('db/db.json', json, 'utf8', function () {});
}

export function readDatabase() {
    var obj = JSON.parse(readFileSync('db/db.json', 'utf8'));

    if (obj == undefined) {
        return undefined;
    }

    return new Map(Object.entries(obj));
}