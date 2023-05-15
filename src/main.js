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
            if (task.properties.Name.title[0] == undefined) {
                continue;
            }
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
        var contentBody = "";

        if (update.task.Assignees.length > 0) {
            for (let assignee of update.task.Assignees) {
                if (assignee != undefined) {
                    let pingID = OFFICERS.get(assignee).discord;
                    contentBody += "<@" + pingID + "> ";
                }
            }
        }

        if (update.update == "status") {
            let newStatus = update.task.Status.toUpperCase();
            contentBody += "The status of the following task has changed to **" + newStatus + "**:\n\n";
            contentBody += "\t**Name**: " + update.task.Name + "\n";
            if (update.task["Due Date"] != undefined) {
                contentBody += "\t**Due Date**: " + update.task["Due Date"] + "\n";
            }
            if (update.task.Priority != undefined) {
                contentBody += "\t**Priority**: " + update.task.Priority + "\n";
            }
            contentBody += "\n" + update.task.Link;
        } else if (update.update == "priority") {
            let newPriority = undefined;
            if (update.task.Priority == undefined) {
                newPriority = "The priority of the following task has been removed:\n\n";
            } else {
                newPriority = "The status of the following task has been changed to **" + update.task.Priority.toUpperCase() + "**:\n\n";
            }
            contentBody += newPriority;
            contentBody += "\t**Name**: " + update.task.Name + "\n";
            contentBody += "\t**Status**: " + update.task.Status + "\n";
            if (update.task["Due Date"] != undefined) {
                contentBody += "\t**Due Date**: " + update.task["Due Date"] + "\n";
            }
            contentBody += "\n" + update.task.Link;
        } else if (update.update == "due date") {
            let newDueDate = undefined;
            if (update.task["Due Date"] == undefined) {
                newDueDate = "The due date of the following task has been removed:\n\n";
            } else {
                newDueDate = "The due date of the following task has been changed to **" + update.task["Due Date"] + "**:\n\n";
            }
            contentBody += newDueDate;
            contentBody += "\t**Name**: " + update.task.Name + "\n";
            contentBody += "\t**Status**: " + update.task.Status + "\n";
            if (update.task.Priority != undefined) {
                contentBody += "\t**Priority**: " + update.task.Priority + "\n";
            }
            contentBody += "\n" + update.task.Link;
        // } else if (update.update == "created") {
        //     contentBody += "The following task has been **created**:\n\n";
        //     contentBody += "\t**Name**: " + update.task.Name + "\n";
        //     contentBody += "\t**Status**: " + update.task.Status + "\n";
        //     if (update.task["Due Date"] != undefined) {
        //         contentBody += "\t**Due Date**: " + update.task["Due Date"] + "\n";
        //     }
        //     if (update.task.Priority != undefined) {
        //         contentBody += "\t**Priority**: " + update.task.Priority + "\n";
        //     }
        //     contentBody += "\n" + update.task.Link;
        } else if (update.update == "removed") {
            contentBody += "The following task has been **removed**:\n\n";
            contentBody += "\t**Name**: " + update.task.Name + "\n";
            contentBody += "\t**Status**: " + update.task.Status + "\n";
            if (update.task["Due Date"] != undefined) {
                contentBody += "\t**Due Date**: " + update.task["Due Date"] + "\n";
            }
            if (update.task.Priority != undefined) {
                contentBody += "\t**Priority**: " + update.task.Priority + "\n";
            }
        }

        api.createMessage(CHANNEL_ID, 
            {
                "content": contentBody,
                "tts": false
            }
        );
    }

}