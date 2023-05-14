require('dotenv').config();

const DATABASE_ID = process.env.DATABASE_ID;
const NOTION_KEY = process.env.NOTION_KEY;

var database = undefined;

setInterval(getUpdatesToDB, 5000);

function getUpdatesToDB() {
    var oldDatabase = undefined;
    if (database != undefined) {
        oldDatabase = JSON.parse(JSON.stringify(database));
    }
    getNotionDBInfo();
    if (oldDatabase == database) { // change way this is checked for, check every attribute in every task
        console.log("no changes");
        return undefined;
    }
    console.log("changes");
}

function reportUpdatesToDB(updates) {

}

function getNotionDBInfo() {
    fetch("https://api.notion.com/v1/databases/" + DATABASE_ID + "/query", {
        method: "POST",
        headers: {
            'Authorization': 'Bearer ' + NOTION_KEY,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(response => {
        let temp = response.results;
        if (temp == undefined) {
            database = undefined;
            return;
        }
        database = new Map();
        for (task of temp) {
            value = {
                'Name': task.properties.Name.title[0].text.content,
                'Status': task.properties.Status.select.name,
                'Assignees': [/* task.properties.Assignee.people is list to pull from */], // need to find way to iterate through and set all assignees. Also assignee ID to discord ID for ping
                // 'Due Date': task.properties['Due Date'].date.start, (does not consider case where there is no due date)
                // 'Priority': task.properties.Priority.select.name, (does not consider case where priority is null)
                'Tags': [/* task.propertiest.Tags.multi_select is list to pull from */], // need to find a way to iterate through and set all tags.
                // 'Notes': task.properties.Notes.rich_text[0].plain_text (does notconsider case where there are no notes)
            }
            database.set(task.id, value);
        }
        console.log(database);
    });
}