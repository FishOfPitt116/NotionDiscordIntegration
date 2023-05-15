import officers from './static/officers.json' assert { type : 'json' };
import { config } from 'dotenv';
import { findUpdates } from './compare.js';
import { readDatabase, writeDatabase } from './io.js';
import { ChannelsAPI } from '@discordjs/core'
import { REST } from '@discordjs/rest'

config();

const DATABASE_ID = process.env.DATABASE_ID;
const NOTION_KEY = process.env.NOTION_KEY;

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const APP_ID = process.env.APP_ID;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const CHANNEL_ID = process.env.CHANNEL_ID;

const OFFICERS = new Map(officers);

var database = readDatabase();

const rest = new REST({ version : '10'}).setToken(DISCORD_TOKEN);
const api = new ChannelsAPI(rest);

setInterval(getUpdatesToDB, 5000);

function getUpdatesToDB() {
    console.log("Checking Notion for updates...");
    getNotionDBInfo();
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
    .then(response => {
        try {
            return response.json();
        } catch (SynaxError) {
            return undefined;
        }
    })
    .then(response => {
        if (response == undefined) {
            return;
        }
        let temp = response.results;
        if (temp == undefined) {
            database = undefined;
            return;
        }
        let db = new Map();
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
            db.set(task.id, value);
        }
        let updates = findUpdates(database, db);
        if (updates.length > 0) {
            reportUpdatesToDiscord(findUpdates(database, db));
            database = db;
            writeDatabase(database);
        }
    });
}

function reportUpdatesToDiscord(updates) {
    for (let update of updates) {
        console.log(update);
        api.createMessage(CHANNEL_ID, 
            {
                "content": update.update,
                "tts": false
            }
        );
    }

}