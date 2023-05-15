import officers from './officers.json' assert { type : 'json' };
import { config } from 'dotenv';

config();

const DATABASE_ID = process.env.DATABASE_ID;
const NOTION_KEY = process.env.NOTION_KEY;

const OFFICERS = new Map(officers);

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
        for (let task of temp) {
            let name = task.properties.Name.title[0].text.content;
            let status = task.properties.Status.select.name;
            let assignees = [];
            for (let assignee of task.properties.Assignee.people) {
                if (!OFFICERS.has(assignee.id)) {
                    assignees.push(undefined);
                } else {
                    assignees.push(assignee.id);
                }
            }
            let dueDate = undefined;
            if (task.properties['Due Date'].date != null) {
                dueDate = task.properties['Due Date'].date.start;
            }
            let priority = undefined;
            if (task.properties.Priority.select != null) {
                priority = task.properties.Priority.select.name;
            }
            let tags = [];
            for (let tag of task.properties.Tags.multi_select) {
                tags.push(tag.name);
            }
            let notes = undefined;
            if (task.properties.Notes.rich_text.length > 0) {
                notes = task.properties.Notes.rich_text[0].plain_text;
            }
            let value = {
                'Name': name,
                'Status': status,
                'Assignees': assignees, 
                'Due Date': dueDate,
                'Priority': priority,
                'Tags': tags,
                'Notes': notes,
                'Link': task.url
            }
            database.set(task.id, value);
        }
        console.log(database);
    });
}